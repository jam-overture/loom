import { asc, eq } from "drizzle-orm"

import { projectSchema, type Project, type ProjectId } from "../project/project.js"
import type { ProjectStore, ProjectStoreError } from "../project/store.js"
import { err, ok, type Result } from "../result.js"

import type { LoomDatabase } from "./database.js"
import { isUniqueViolation, unavailable } from "./driver.js"
import { loomProjects } from "./schema.js"

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
 * Three columns and no nullable one, which is the whole difference from the
 * application store next door: a project has an identity and a name, and
 * nothing that can be absent.
 */
const toProject = (row: typeof loomProjects.$inferSelect): Result<Project, ProjectStoreError> => {
  const parsed = projectSchema.safeParse({
    projectId: row.projectId,
    name: row.name,
    createdAt: row.createdAt,
  })

  return parsed.success
    ? ok(parsed.data)
    : err({
        code: "unreadable",
        projectId: row.projectId as ProjectId,
        detail: parsed.error.issues[0]?.message ?? "invalid",
      })
}

export const postgresProjectStore = (db: LoomDatabase): ProjectStore => ({
  create: async (project) => {
    try {
      await db.insert(loomProjects).values({
        projectId: project.projectId,
        name: project.name,
        createdAt: project.createdAt,
      })
      return ok(project)
    } catch (cause) {
      /**
       * The key is what makes *already taken* a fact the database establishes
       * rather than a check this code races against — the same argument the
       * hold store makes about its primary key, and it matters more here: the
       * loser of a race between two people registering the same project would
       * otherwise silently take ownership of the winner's rows.
       */
      if (isUniqueViolation(cause)) {
        return err({ code: "already-exists", projectId: project.projectId })
      }
      return err(unavailable(cause, `could not create project ${project.projectId}`))
    }
  },

  get: async (projectId) => {
    try {
      const rows = await db
        .select()
        .from(loomProjects)
        .where(eq(loomProjects.projectId, projectId))
        .limit(1)

      const row = rows[0]
      return row === undefined ? err({ code: "not-found", projectId }) : toProject(row)
    } catch (cause) {
      return err(unavailable(cause, `could not read project ${projectId}`))
    }
  },

  list: async () => {
    try {
      /**
       * Ordered in the statement rather than after it, so the order is the
       * database's job and an index can serve it. `created_at` is an ISO string,
       * which sorts lexicographically into chronological order — that is the
       * property the format is chosen for, and `projectSchema` requires it.
       */
      const rows = await db.select().from(loomProjects).orderBy(asc(loomProjects.createdAt))

      const projects: Project[] = []
      for (const row of rows) {
        const project = toProject(row)
        if (!project.ok) return project
        projects.push(project.value)
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
   * costs: `text` accepts an empty string and `projectSchema` does not, so a
   * rename to `""` was written happily and then could not be read back at all.
   * The row was corrupt, and the store that had refused the same call was the
   * one in a `Map`. Parsing the merged project is what makes the two stores
   * agree about what a project is, rather than about what fits in a column.
   *
   * The read and the write are not in one transaction, which is a real race and
   * an acceptable one: two people renaming one project at the same instant get
   * last-write-wins on a display name. Nothing downstream keys on it.
   */
  rename: async (projectId, to) => {
    try {
      const rows = await db
        .select()
        .from(loomProjects)
        .where(eq(loomProjects.projectId, projectId))
        .limit(1)

      const row = rows[0]
      if (row === undefined) return err({ code: "not-found", projectId })

      const current = toProject(row)
      if (!current.ok) return current

      const next = projectSchema.safeParse({
        ...current.value,
        ...(to.name === undefined ? {} : { name: to.name }),
      })
      if (!next.success) {
        return err({
          code: "unreadable",
          projectId,
          detail: next.error.issues[0]?.message ?? "invalid",
        })
      }

      await db
        .update(loomProjects)
        .set({ name: next.data.name })
        .where(eq(loomProjects.projectId, projectId))

      return ok(next.data)
    } catch (cause) {
      return err(unavailable(cause, `could not rename project ${projectId}`))
    }
  },
})
