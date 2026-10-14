import { applyPatch } from "../patch.js"
import { err, ok, type Result } from "../result.js"

import { applicationSchema, type Application, type ApplicationId } from "./application.js"
import type { ApplicationStore, ApplicationStoreError } from "./store.js"

/**
 * A `ApplicationStore` in a `Map`, for a test and for a deployment with no database.
 *
 * The counterpart to `memoryStore`, and it carries the same warning: a `Map`
 * keeps nothing across a process, so on the serverless hosts §3 targets it
 * keeps nothing at all. What it is honestly for is the suite, a lesson, and the
 * first run of an application that has not been given a `DATABASE_URL` yet —
 * where seeing one application called *your application* beats seeing an error.
 *
 * The listing sorts, and the first draft of this file did not — its comment
 * claimed insertion order "happens to be oldest first", which confuses the
 * order rows were *written* with the order they were *created*. An application
 * recorded today with yesterday's `createdAt` is ordinary: it is what importing
 * one, or seeding the default beside applications that already exist, produces. The
 * shared contract writes three out of order and caught it.
 */

export const memoryApplicationStore = (seed: readonly Application[] = []): ApplicationStore => {
  const applications = new Map<string, Application>(seed.map((application) => [application.applicationId, application]))

  const read = (applicationId: ApplicationId): Result<Application, ApplicationStoreError> => {
    const found = applications.get(applicationId)
    return found === undefined ? err({ code: "not-found", applicationId }) : ok(found)
  }

  return {
    create: async (application) => {
      if (applications.has(application.applicationId)) {
        return err({ code: "already-exists", applicationId: application.applicationId })
      }
      applications.set(application.applicationId, application)
      return ok(application)
    },

    get: async (applicationId) => read(applicationId),

    list: async () =>
      ok(
        [...applications.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      ),

    rename: async (applicationId, to) => {
      const found = read(applicationId)
      if (!found.ok) return found

      /**
       * Parsed rather than spread, so a name this store would accept and the
       * database would refuse cannot be told apart by which one you used. The
       * two stores agree about what an application is because they both ask
       * `applicationSchema`, and they agree about what a patch means because
       * they both apply it with `applyPatch`.
       */
      const next = applicationSchema.safeParse(applyPatch(found.value, to))
      if (!next.success) {
        return err({ code: "unreadable", applicationId, detail: next.error.issues[0]?.message ?? "invalid" })
      }

      applications.set(applicationId, next.data)
      return ok(next.data)
    },
  }
}
