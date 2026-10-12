import type { Result } from "../result.js"

import type { Application, ApplicationId } from "./application.js"

/**
 * Custody of the applications a deployment has.
 *
 * Five tables carry an application's id, so a tree, a hold, a policy revision
 * and a journal entry each know which application they belong to — and for a
 * day nothing stored the application itself. `Application` was a type nothing
 * wrote and `DEFAULT_APPLICATION_ID` was the only one that could be named, so a
 * portal whose first screen lists the applications you have had nothing to
 * list. The maintainer's own sentence — *"the whole portal is geared toward one
 * app when I can have many"* — stayed true of the data after it had stopped
 * being true of the schema.
 *
 * This is the row that makes an application nameable, and it is deliberately
 * thin for the reason `applicationSchema` gives: the registry, the policy and
 * the ingest credential are each already somebody's, so this says only that the
 * application exists, what a person calls it, and which project it is in
 * ([0269](../../decisions/0269-an-application-is-the-unit-loom-governs-and-a-project-groups-them.md)).
 */

export type ApplicationStoreError =
  /** No application under this id. */
  | { readonly code: "not-found"; readonly applicationId: ApplicationId }
  | { readonly code: "already-exists"; readonly applicationId: ApplicationId }
  /** A row the current code cannot parse, which is a row an older one wrote. */
  | { readonly code: "unreadable"; readonly applicationId: ApplicationId; readonly detail: string }
  | { readonly code: "unavailable"; readonly detail: string }

export type ApplicationStoreErrorCode = ApplicationStoreError["code"]

/**
 * The four codes, in the order a deployment meets them, for the same reason
 * `storeErrorCodes` exists: anything that walks the taxonomy rather than
 * reacting to one member otherwise keeps a copy that is silently wrong the day
 * a fifth lands.
 */
export const applicationStoreErrorCodes: readonly ApplicationStoreErrorCode[] = [
  "not-found",
  "already-exists",
  "unreadable",
  "unavailable",
]

export const describeApplicationStoreError = (error: ApplicationStoreError): string => {
  switch (error.code) {
    case "not-found":
      return `no application ${error.applicationId}`
    case "already-exists":
      return `application ${error.applicationId} already exists`
    case "unreadable":
      return `application ${error.applicationId} could not be read: ${error.detail}`
    case "unavailable":
      return `the application store is unavailable: ${error.detail}`
  }
}

/**
 * Four methods, and **no delete**.
 *
 * That is the same refusal `TreeStore` makes and for a stronger reason here: a
 * application's rows are its trees, its revisions, its holds, its policy history
 * and its journal, and a delete would either orphan all of them or cascade
 * through the governance record this product exists to keep. *The application says
 * it was closed* is a better answer than *the application is gone* — and closing is
 * not built here either, because nothing can close what nothing has yet opened.
 * When it is wanted it is a column and a filter, not a `DELETE`.
 */
export type ApplicationStore = {
  /**
   * Record an application. Refuses an id already taken rather than overwriting,
   * because the thing under that id owns rows.
   */
  readonly create: (application: Application) => Promise<Result<Application, ApplicationStoreError>>

  /** One application. */
  readonly get: (applicationId: ApplicationId) => Promise<Result<Application, ApplicationStoreError>>

  /**
   * Every application, oldest first.
   *
   * Unpaginated, and that is a judgement rather than an oversight: this is the
   * list a person scans on one screen, and a deployment whose application count
   * needs a cursor has a different screen's problem. `TreeStore.list` takes a
   * limit because pages are unbounded in a way applications are not.
   */
  readonly list: () => Promise<Result<readonly Application[], ApplicationStoreError>>

  /** Change what a person calls it, and where they say it lives. */
  readonly rename: (
    applicationId: ApplicationId,
    to: { readonly name?: string; readonly host?: string }
  ) => Promise<Result<Application, ApplicationStoreError>>
}
