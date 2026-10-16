import { and, eq, sql } from "drizzle-orm"
import { bigint, pgTable, primaryKey, text } from "drizzle-orm/pg-core"
import { z } from "zod"

import type { LoomDatabase } from "@jam-overture/loom/postgres"
import { projectIdSchema, type ProjectId } from "@jam-overture/loom/store"

import {
  actorSchema,
  type Account,
  type AccountStore,
  type AccountStoreError,
} from "./accounts"
import { roleSchema, type Membership, type MembershipStore, type Role } from "./roles"

/**
 * The accounts and their memberships, backed by the same Postgres the store and
 * the journal use — one handle, one pool (0022, and `database.ts`).
 *
 * These tables belong to the portal rather than to the runtime, on exactly the
 * terms the attempt log took: the runtime takes an actor on an intent and never
 * asks how a host established it, and a users table shipped from
 * `@jam-overture/loom` would be the framework asserting that its consumers
 * authenticate people — which 0018 spent a record saying it does not get to do.
 *
 * `created_at` is milliseconds in a `bigint` for the reason the attempt log's
 * timestamps are: the portal's clock arithmetic is in milliseconds because
 * `Date.now()` is, and a column that round-trips through a `Date` puts a
 * conversion between the number written and the number read.
 */

export const loomPortalAccounts = pgTable("loom_portal_accounts", {
  actor: text("actor").primaryKey(),
  /** SHA-256 of the minted key, hex. One way, and the only copy (0285). */
  keyDigest: text("key_digest").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
})

export const loomPortalMemberships = pgTable(
  "loom_portal_memberships",
  {
    actor: text("actor").notNull(),
    projectId: text("project_id").notNull(),
    role: text("role").notNull(),
  },
  (table) => [primaryKey({ columns: [table.actor, table.projectId] })]
)

/** One statement per entry, for the reason the store's and the journal's DDL is a list. */
export const PORTAL_ACCOUNTS_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS loom_portal_accounts (
    actor text PRIMARY KEY,
    key_digest text NOT NULL,
    created_at bigint NOT NULL
  )`,
  /**
   * The lookup sign-in performs, and the only one: a presented key becomes a
   * digest and the digest finds its actor. Unique rather than merely indexed,
   * because two accounts sharing a digest is two people holding one credential
   * — which cannot happen while keys are minted, and would be unresolvable if
   * it ever did.
   */
  `CREATE UNIQUE INDEX IF NOT EXISTS loom_portal_accounts_digest_idx
     ON loom_portal_accounts (key_digest)`,
  `ALTER TABLE loom_portal_accounts ENABLE ROW LEVEL SECURITY`,
  `CREATE TABLE IF NOT EXISTS loom_portal_memberships (
    actor text NOT NULL,
    project_id text NOT NULL,
    role text NOT NULL,
    PRIMARY KEY (actor, project_id)
  )`,
  /** The workspace's read: every project one actor holds a role in. */
  `CREATE INDEX IF NOT EXISTS loom_portal_memberships_actor_idx
     ON loom_portal_memberships (actor)`,
  /**
   * The same rule the runtime's DDL applies to its own tables, and these two
   * have the least excuse to be exempt: one holds the credentials this portal
   * is reached by.
   */
  `ALTER TABLE loom_portal_memberships ENABLE ROW LEVEL SECURITY`,
]

export const ensurePortalAccountsSchema = async (db: LoomDatabase): Promise<void> => {
  for (const statement of PORTAL_ACCOUNTS_DDL) {
    await db.execute(sql.raw(statement))
  }
}

const failure = (cause: unknown, detail: string): AccountStoreError => ({
  code: "unavailable",
  detail: `${detail}: ${cause instanceof Error ? cause.message : String(cause)}`,
})

/**
 * Rows are parsed rather than trusted, like every other row this portal reads.
 *
 * It matters most on `role`: a column holding a word this build does not know
 * would otherwise reach `ceilingOf`, which is a `switch` over three cases, and
 * a fourth would fall out of it as `undefined` — a ceiling nothing is above.
 * Parsing turns that into a store that says it cannot answer.
 */
const accountRowSchema = z.object({
  actor: actorSchema,
  createdAt: z.number().int().nonnegative(),
})

const membershipRowSchema = z.object({
  actor: actorSchema,
  projectId: projectIdSchema,
  role: roleSchema,
})

export const postgresAccountStore = (db: LoomDatabase): AccountStore => ({
  actorWithDigest: async (digest) => {
    try {
      const rows = await db
        .select({ actor: loomPortalAccounts.actor, createdAt: loomPortalAccounts.createdAt })
        .from(loomPortalAccounts)
        .where(eq(loomPortalAccounts.keyDigest, digest))
        .limit(1)

      const [row] = rows
      if (row === undefined) return { ok: true, value: null }

      const parsed = accountRowSchema.safeParse(row)

      return parsed.success
        ? { ok: true, value: parsed.data.actor }
        : {
            ok: false,
            error: {
              code: "unavailable",
              detail: `a stored account did not parse: ${
                parsed.error.issues[0]?.path.join(".") ?? "unknown"
              }`,
            },
          }
    } catch (cause) {
      return { ok: false, error: failure(cause, "could not read the account for a key") }
    }
  },

  put: async (actor, digest, at) => {
    try {
      await db
        .insert(loomPortalAccounts)
        .values({ actor, keyDigest: digest, createdAt: at })
        /** Minting a second key for an actor ends the first (0285). */
        .onConflictDoUpdate({
          target: loomPortalAccounts.actor,
          set: { keyDigest: digest, createdAt: at },
        })

      return { ok: true, value: undefined }
    } catch (cause) {
      return { ok: false, error: failure(cause, `could not write the account for ${actor}`) }
    }
  },
})

export const postgresMembershipStore = (db: LoomDatabase): MembershipStore => ({
  roleIn: async (actor, projectId) => {
    try {
      const rows = await db
        .select()
        .from(loomPortalMemberships)
        .where(
          and(
            eq(loomPortalMemberships.actor, actor),
            eq(loomPortalMemberships.projectId, projectId)
          )
        )
        .limit(1)

      const [row] = rows
      if (row === undefined) return { ok: true, value: null }

      const parsed = membershipRowSchema.safeParse(row)

      return parsed.success
        ? { ok: true, value: parsed.data.role }
        : {
            ok: false,
            error: {
              code: "unavailable",
              detail: `a stored membership did not parse: ${
                parsed.error.issues[0]?.path.join(".") ?? "unknown"
              }`,
            },
          }
    } catch (cause) {
      return { ok: false, error: failure(cause, "could not read a role") }
    }
  },

  projectsOf: async (actor) => {
    try {
      const rows = await db
        .select()
        .from(loomPortalMemberships)
        .where(eq(loomPortalMemberships.actor, actor))

      const parsed = z.array(membershipRowSchema).safeParse(rows)

      return parsed.success
        ? { ok: true, value: parsed.data as readonly Membership[] }
        : {
            ok: false,
            error: {
              code: "unavailable",
              detail: `a stored membership did not parse: ${
                parsed.error.issues[0]?.path.join(".") ?? "unknown"
              }`,
            },
          }
    } catch (cause) {
      return { ok: false, error: failure(cause, `could not read the projects of ${actor}`) }
    }
  },

  put: async ({ actor, projectId, role }) => {
    try {
      await db
        .insert(loomPortalMemberships)
        .values({ actor, projectId, role })
        .onConflictDoUpdate({
          target: [loomPortalMemberships.actor, loomPortalMemberships.projectId],
          set: { role },
        })

      return { ok: true, value: undefined }
    } catch (cause) {
      return { ok: false, error: failure(cause, `could not write a role for ${actor}`) }
    }
  },

  remove: async (actor, projectId) => {
    try {
      await db
        .delete(loomPortalMemberships)
        .where(
          and(
            eq(loomPortalMemberships.actor, actor),
            eq(loomPortalMemberships.projectId, projectId)
          )
        )

      return { ok: true, value: undefined }
    } catch (cause) {
      return { ok: false, error: failure(cause, `could not remove a role for ${actor}`) }
    }
  },
})

export type { Account, ProjectId, Role }
