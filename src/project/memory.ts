import { applyPatch } from "../patch.js"
import { err, ok, type Result } from "../result.js"

import { projectSchema, type Project, type ProjectId } from "./project.js"
import { matchesListing, type Listing, type ProjectStore, type ProjectStoreError } from "./store.js"

/**
 * A `ProjectStore` in a `Map`, for a test and for a deployment with no database.
 *
 * The counterpart to `memoryStore`, and it carries the same warning: a `Map`
 * keeps nothing across a process, so on the serverless hosts §3 targets it
 * keeps nothing at all. What it is honestly for is the suite, a lesson, and the
 * first run of an project that has not been given a `DATABASE_URL` yet —
 * where seeing one project called *your project* beats seeing an error.
 *
 * The listing sorts, and the first draft of this file did not — its comment
 * claimed insertion order "happens to be oldest first", which confuses the
 * order rows were *written* with the order they were *created*. A project
 * recorded today with yesterday's `createdAt` is ordinary: it is what importing
 * one, or seeding the default beside projects that already exist, produces. The
 * shared contract writes three out of order and caught it.
 */

export const memoryProjectStore = (seed: readonly Project[] = []): ProjectStore => {
  const projects = new Map<string, Project>(seed.map((project) => [project.projectId, project]))

  const read = (projectId: ProjectId): Result<Project, ProjectStoreError> => {
    const found = projects.get(projectId)
    return found === undefined ? err({ code: "not-found", projectId }) : ok(found)
  }

  return {
    create: async (project) => {
      if (projects.has(project.projectId)) {
        return err({ code: "already-exists", projectId: project.projectId })
      }
      projects.set(project.projectId, project)
      return ok(project)
    },

    get: async (projectId) => read(projectId),

    list: async (listing?: Listing) =>
      ok(
        [...projects.values()]
          .filter((project) => matchesListing(project.closedAt, listing))
          .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      ),

    rename: async (projectId, to) => {
      const found = read(projectId)
      if (!found.ok) return found

      /**
       * Parsed rather than spread, so a name this store would accept and the
       * database would refuse cannot be told apart by which one you used. The
       * two stores agree about what a project is because they both ask
       * `projectSchema`, and they agree about what a patch means because they
       * both apply it with `applyPatch`.
       *
       * Nothing here is clearable, and that is a property of the record rather
       * than of this call: a project is an id, a name and a date, and all three
       * are required. The first optional field it gains is clearable on the day
       * it is added, with no second spelling of nothing to invent.
       */
      const next = projectSchema.safeParse(applyPatch(found.value, to))
      if (!next.success) {
        return err({ code: "unreadable", projectId, detail: next.error.issues[0]?.message ?? "invalid" })
      }

      projects.set(projectId, next.data)
      return ok(next.data)
    },

    /**
     * Idempotent, and the instant does not move (0289): pressing the button
     * twice must not change the answer to *when did this stop*.
     */
    close: async (projectId, at) => {
      const found = read(projectId)
      if (!found.ok) return found
      if (found.value.closedAt !== undefined) return ok(found.value)

      const next = { ...found.value, closedAt: at }
      projects.set(projectId, next)

      return ok(next)
    },

    reopen: async (projectId) => {
      const found = read(projectId)
      if (!found.ok) return found

      /** Spelled as a removal rather than `closedAt: undefined`, which a strict parse refuses. */
      const { closedAt: _was, ...open } = found.value
      projects.set(projectId, open)

      return ok(open)
    },
  }
}
