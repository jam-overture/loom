import { PGlite } from "@electric-sql/pglite"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/pglite"
import { describe, expect, it, vi } from "vitest"

import type { LoomDatabase } from "@jam-overture/loom/postgres"
import { projectIdSchema } from "@jam-overture/loom/store"

import { actorSchema } from "./accounts"
import {
  describeAccountStoreContract,
  describeMembershipStoreContract,
} from "./accounts.contract"
import {
  ensurePortalAccountsSchema,
  postgresAccountStore,
  postgresMembershipStore,
} from "./accounts-postgres"

/**
 * Against PGlite — Postgres compiled to WebAssembly — for the reason the
 * attempt log's suite uses it: real Postgres semantics with no external
 * database, so `pnpm verify` stays green offline.
 *
 * It earns it twice here. The unique index on the digest and the `ON CONFLICT
 * DO UPDATE` that replaces a key are both things a fake would wave through, and
 * both are the difference between rotation that ends the old key and rotation
 * that does not.
 */
vi.setConfig({ testTimeout: 30_000 })

const freshDatabase = async (): Promise<LoomDatabase> => {
  const db = drizzle(new PGlite())
  await ensurePortalAccountsSchema(db)

  return db
}

describeAccountStoreContract("postgresAccountStore", async () =>
  postgresAccountStore(await freshDatabase())
)

describeMembershipStoreContract("postgresMembershipStore", async () =>
  postgresMembershipStore(await freshDatabase())
)

describe("the portal's account tables — Postgres specifics", () => {
  it("runs its migration twice without complaining", async () => {
    const db = await freshDatabase()

    await expect(ensurePortalAccountsSchema(db)).resolves.toBeUndefined()
  })

  /**
   * Read from the catalogue rather than inferred from having run the
   * statement, the way `row-security.ts` reads it for the runtime's tables.
   * `db.execute` hands back `{ rows }` on both drivers Loom runs on.
   */
  const rowSecurityOn = async (db: LoomDatabase, table: string): Promise<boolean> => {
    const result = await db.execute(
      sql`SELECT relrowsecurity FROM pg_class WHERE relname = ${table}`
    )

    const rows = (result as unknown as { readonly rows?: readonly { relrowsecurity?: unknown }[] })
      .rows

    return rows?.[0]?.relrowsecurity === true
  }

  it("protects both with row level security", async () => {
    const db = await freshDatabase()

    expect({
      accounts: await rowSecurityOn(db, "loom_portal_accounts"),
      memberships: await rowSecurityOn(db, "loom_portal_memberships"),
    }).toEqual({ accounts: true, memberships: true })
  })

  /**
   * Two accounts cannot share a digest, which is two people holding one
   * credential. It cannot happen while keys are minted from 128 bits, and if it
   * ever did there would be no answer to *whose key is this* — so the database
   * refuses rather than the lookup picking one.
   */
  it("refuses to let two accounts hold the same key", async () => {
    const db = await freshDatabase()
    const store = postgresAccountStore(db)

    await store.put(actorSchema.parse("ana@example.com"), "one-digest", 1)
    const second = await store.put(actorSchema.parse("bruno@example.com"), "one-digest", 2)

    expect(second.ok).toBe(false)
  })

  /**
   * A role this build does not know reaches `ceilingOf`, which is a `switch`
   * over three cases — a fourth would fall out of it as `undefined`, a ceiling
   * nothing is above, and the actor holding it would be able to accept
   * anything. Parsing turns a row written by a newer deployment into a store
   * that says it cannot answer.
   */
  it("refuses to hand back a role that is not one", async () => {
    const db = await freshDatabase()

    await db.execute(
      sql.raw(
        `INSERT INTO loom_portal_memberships (actor, project_id, role)
         VALUES ('ana@example.com', 'prj_alpha', 'administrator')`
      )
    )

    const read = await postgresMembershipStore(db).roleIn(
      actorSchema.parse("ana@example.com"),
      projectIdSchema.parse("prj_alpha")
    )

    expect(read.ok).toBe(false)
    expect(!read.ok && read.error.detail).toContain("did not parse")
  })
})
