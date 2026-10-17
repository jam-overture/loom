import type { ApplicationStore, ApplicationStoreError } from "../application/store.js"
import { err, ok, type Result } from "../result.js"

import type { ProjectId } from "./project.js"
import { describeProjectStoreError, type ProjectStore, type ProjectStoreError } from "./store.js"

/**
 * Closing a project, and the applications it holds.
 *
 * **Above the two stores rather than inside either**
 * ([0289](../../decisions/0289-a-project-is-closed-rather-than-deleted-and-closing-is-a-column-and-a-filter.md)).
 * A project store that reached into an application store to finish its own
 * write would be the coupling both are shaped to avoid — nothing is stored
 * *under* a project, which is why they are two stores and not one.
 *
 * ## What it is instead of
 *
 * A delete, which three stores refuse and
 * [0268](../../decisions/0268-a-page-is-put-back-by-proposing-the-change-that-puts-it-back-and-a-store-never-deletes.md)
 * argued: a project's rows are its applications' trees, revisions, holds and
 * policy history, and removing them destroys the account of what changed that
 * Loom exists to keep. A delete would have cascaded through all of it. This
 * cascades too, and reversibly.
 */

export type ClosingError =
  | ProjectStoreError
  /**
   * The project closed and an application under it did not.
   *
   * Reported rather than swallowed, and **the project stays closed**: a partial
   * close is recoverable by running it again, where rolling the project back
   * open would make the failure invisible and leave somebody believing their
   * project is still collecting when most of it has stopped.
   */
  | { readonly code: "partly-closed"; readonly projectId: ProjectId; readonly detail: string }

export const describeClosingError = (error: ClosingError): string =>
  error.code === "partly-closed"
    ? `project ${error.projectId} was closed and an application in it was not: ${error.detail}`
    : describeProjectStoreError(error)

/**
 * Why a listing or a close failed, in one string.
 *
 * `ApplicationStoreError` carries a detail on one member and an id on two, so
 * there is no field common to all of them — the code is the part every member
 * has, and it is what a caller of this can act on.
 */
const detailOf = (error: ApplicationStoreError): string =>
  "detail" in error ? error.detail : error.code

/**
 * Close the project, then every application in it.
 *
 * **The project first.** If it fails there is nothing to undo, and the
 * applications are still reachable through a project that is still open —
 * which is the state the caller started in. The other order would close
 * applications under a project that then refused to close, leaving a live
 * project full of stopped applications and no record of why.
 *
 * Idempotent, because both `close` calls are: running it again after a partial
 * failure closes what is left and moves nothing that already closed.
 */
export const closeProject = async (
  projects: ProjectStore,
  applications: ApplicationStore,
  projectId: ProjectId,
  at: string
): Promise<Result<undefined, ClosingError>> => {
  const closed = await projects.close(projectId, at)
  if (!closed.ok) return err(closed.error)

  /**
   * Every application, open or closed, rather than the open ones: the listing
   * is a separate read and a row that closed between the two would otherwise
   * be missed. `close` leaves an already-closed one exactly as it was.
   */
  const held = await applications.list({ closed: "all" })
  if (!held.ok) {
    return err({ code: "partly-closed", projectId, detail: detailOf(held.error) })
  }

  for (const application of held.value) {
    if (application.projectId !== projectId) continue

    const stopped = await applications.close(application.applicationId, at)

    if (!stopped.ok) {
      return err({
        code: "partly-closed",
        projectId,
        detail: `${application.applicationId}: ${detailOf(stopped.error)}`,
      })
    }
  }

  return ok(undefined)
}
