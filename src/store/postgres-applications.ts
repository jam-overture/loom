import { and, asc, eq, isNull } from "drizzle-orm"

import { applicationSchema, type Application, type ApplicationId } from "../application/application.js"
import type { ApplicationStore, ApplicationStoreError } from "../application/store.js"
import { applyPatch } from "../patch.js"
import { matchesListing, type Listing } from "../project/store.js"
import { err, ok, type Result } from "../result.js"

import type { LoomDatabase } from "./database.js"
import { isUniqueViolation, unavailable } from "./driver.js"
import { loomApplications } from "./schema.js"

/**
 * The projects a deployment has, backed by Postgres (0022).
 *
 * The one store here that is not scoped by a project, for the obvious reason:
 * it holds them. Every other store takes a `StoreScope` and filters on it; this
 * one is what that scope's id refers to, so a handle for it would have nothing
 * to be scoped by.
 *
 * Like the others, the database handle is injected rather than opened here —
 * choosing a driver, a pooler and a connection lifetime belongs to the host,
 * and injecting it is what lets the tests run this exact code against an
 * embedded Postgres rather than against a double that agrees with them.
 */

/**
 * A row on the way out, checked rather than cast.
 *
 * `host` is nullable in the column and optional in the type, which is the one
 * place the two shapes genuinely differ: SQL has no way to say *absent*, so the
 * null is dropped here rather than handed to a schema that would refuse it.
 */
const toProject = (row: typeof loomApplications.$inferSelect): Result<Application, ApplicationStoreError> => {
  const parsed = applicationSchema.safeParse({
    applicationId: row.applicationId,
    projectId: row.projectId,
    name: row.name,
    createdAt: row.createdAt,
    ...(row.host === null ? {} : { host: row.host }),
    /** Absent rather than `null`, so *this is open* has one spelling (0289). */
    ...(row.closedAt === null ? {} : { closedAt: row.closedAt }),
  })

  return parsed.success
    ? ok(parsed.data)
    : err({
        code: "unreadable",
        applicationId: row.applicationId as ApplicationId,
        detail: parsed.error.issues[0]?.message ?? "invalid",
      })
}

export const postgresApplicationStore = (db: LoomDatabase): ApplicationStore => ({
  create: async (application) => {
    try {
      await db.insert(loomApplications).values({
        applicationId: application.applicationId,
        projectId: application.projectId,
        name: application.name,
        createdAt: application.createdAt,
        host: application.host ?? null,
      })
      return ok(application)
    } catch (cause) {
      /**
       * The key is what makes *already taken* a fact the database establishes
       * rather than a check this code races against — the same argument the
       * hold store makes about its primary key, and it matters more here: the
       * loser of a race between two people registering the same project would
       * otherwise silently take ownership of the winner's rows.
       */
      if (isUniqueViolation(cause)) {
        return err({ code: "already-exists", applicationId: application.applicationId })
      }
      return err(unavailable(cause, `could not create project ${application.applicationId}`))
    }
  },

  get: async (applicationId) => {
    try {
      const rows = await db
        .select()
        .from(loomApplications)
        .where(eq(loomApplications.applicationId, applicationId))
        .limit(1)

      const row = rows[0]
      return row === undefined ? err({ code: "not-found", applicationId }) : toProject(row)
    } catch (cause) {
      return err(unavailable(cause, `could not read project ${applicationId}`))
    }
  },

  list: async (listing?: Listing) => {
    try {
      /**
       * Ordered in the statement rather than after it, so the order is the
       * database's job and an index can serve it. `created_at` is an ISO string,
       * which sorts lexicographically into chronological order — that is the
       * property the format is chosen for, and `applicationSchema` requires it.
       */
      const rows = await db.select().from(loomApplications).orderBy(asc(loomApplications.createdAt))

      const projects: Application[] = []
      for (const row of rows) {
        const project = toProject(row)
        if (!project.ok) return project
        /** One rule about what `closed` means, called by both stores (0289). */
        if (matchesListing(project.value.closedAt, listing)) projects.push(project.value)
      }
      return ok(projects)
    } catch (cause) {
      return err(unavailable(cause, "could not list projects"))
    }
  },

  /**
   * Read, merge, parse, write — rather than setting the columns given.
   *
   * The first draft set them directly, and the shared contract caught what that
   * costs: `text` accepts an empty string and `applicationSchema` does not, so a
   * rename to `""` was written happily and then could not be read back at all.
   * The row was corrupt, and the store that had refused the same call was the
   * one in a `Map`. Parsing the merged project is what makes the two stores
   * agree about what a project is, rather than about what fits in a column.
   *
   * The read and the write are not in one transaction, which is a real race and
   * an acceptable one: two people renaming one project at the same instant get
   * last-write-wins on a display name. Nothing downstream keys on it.
   *
   * A cleared host reaches the column as `NULL` by the same route an absent one
   * always did: `applyPatch` removes the key, so the parsed application has no
   * host, and the write already coalesced a missing one.
   */
  rename: async (applicationId, to) => {
    try {
      const rows = await db
        .select()
        .from(loomApplications)
        .where(eq(loomApplications.applicationId, applicationId))
        .limit(1)

      const row = rows[0]
      if (row === undefined) return err({ code: "not-found", applicationId })

      const current = toProject(row)
      if (!current.ok) return current

      const next = applicationSchema.safeParse(applyPatch(current.value, to))
      if (!next.success) {
        return err({
          code: "unreadable",
          applicationId,
          detail: next.error.issues[0]?.message ?? "invalid",
        })
      }

      await db
        .update(loomApplications)
        .set({ name: next.data.name, host: next.data.host ?? null })
        .where(eq(loomApplications.applicationId, applicationId))

      return ok(next.data)
    } catch (cause) {
      return err(unavailable(cause, `could not rename project ${applicationId}`))
    }
  },

  /** Idempotent in the statement — see the project store's note (0289). */
  close: async (applicationId, at) => {
    try {
      await db
        .update(loomApplications)
        .set({ closedAt: at })
        .where(
          and(
            eq(loomApplications.applicationId, applicationId),
            isNull(loomApplications.closedAt)
          )
        )

      const rows = await db
        .select()
        .from(loomApplications)
        .where(eq(loomApplications.applicationId, applicationId))
        .limit(1)

      const row = rows[0]
      return row === undefined ? err({ code: "not-found", applicationId }) : toProject(row)
    } catch (cause) {
      return err(unavailable(cause, `could not close application ${applicationId}`))
    }
  },

  reopen: async (applicationId) => {
    try {
      await db
        .update(loomApplications)
        .set({ closedAt: null })
        .where(eq(loomApplications.applicationId, applicationId))

      const rows = await db
        .select()
        .from(loomApplications)
        .where(eq(loomApplications.applicationId, applicationId))
        .limit(1)

      const row = rows[0]
      return row === undefined ? err({ code: "not-found", applicationId }) : toProject(row)
    } catch (cause) {
      return err(unavailable(cause, `could not reopen application ${applicationId}`))
    }
  },
})
