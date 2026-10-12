import { err, ok, type Result } from "../result.js"

import { projectSchema, type Project, type ProjectId } from "./project.js"
import type { ProjectStore, ProjectStoreError } from "./store.js"

/**
 * A `ProjectStore` in a `Map`, for a test and for a deployment with no database.
 *
 * The counterpart to `memoryStore`, and it carries the same warning: a `Map`
 * keeps nothing across a process, so on the serverless hosts §3 targets it
 * keeps nothing at all. What it is honestly for is the suite, a lesson, and the
 * first run of an application that has not been given a `DATABASE_URL` yet —
 * where seeing one project called *your application* beats seeing an error.
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

    list: async () =>
      ok(
        [...projects.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      ),

    rename: async (projectId, to) => {
      const found = read(projectId)
      if (!found.ok) return found

      /**
       * Parsed rather than spread, so a name this store would accept and the
       * database would refuse cannot be told apart by which one you used. The
       * two stores agree about what a project is because they both ask
       * `projectSchema`.
       */
      const next = projectSchema.safeParse({
        ...found.value,
        ...(to.name === undefined ? {} : { name: to.name }),
        ...(to.host === undefined ? {} : { host: to.host }),
      })
      if (!next.success) {
        return err({ code: "unreadable", projectId, detail: next.error.issues[0]?.message ?? "invalid" })
      }

      projects.set(projectId, next.data)
      return ok(next.data)
    },
  }
}
