import type { Result } from "../result.js"

import type { Project, ProjectId } from "./project.js"

/**
 * Custody of the projects a deployment has — the grouping, not the thing
 * grouped.
 *
 * A project holds applications and nothing else, which is what makes this the
 * shorter of the two stores: there is no host, because a project is not
 * deployed anywhere, and no scope type, because nothing is stored *under* a
 * project — the five scoped tables name their application, and the application
 * names its project.
 *
 * It has the same four methods and the same refusal to delete, for a reason
 * that is one step removed but no weaker: deleting a project would orphan or
 * cascade through every application in it, and each of those owns a governance
 * record. *The project says it was closed* beats *the project is gone* here too.
 */

export type ProjectStoreError =
  /** No project under this id. */
  | { readonly code: "not-found"; readonly projectId: ProjectId }
  | { readonly code: "already-exists"; readonly projectId: ProjectId }
  /** A row the current code cannot parse, which is a row an older one wrote. */
  | { readonly code: "unreadable"; readonly projectId: ProjectId; readonly detail: string }
  | { readonly code: "unavailable"; readonly detail: string }

export type ProjectStoreErrorCode = ProjectStoreError["code"]

/**
 * The four codes, in the order a deployment meets them, for the same reason
 * `storeErrorCodes` exists: anything that walks the taxonomy rather than
 * reacting to one member otherwise keeps a copy that is silently wrong the day
 * a fifth lands.
 */
export const projectStoreErrorCodes: readonly ProjectStoreErrorCode[] = [
  "not-found",
  "already-exists",
  "unreadable",
  "unavailable",
]

export const describeProjectStoreError = (error: ProjectStoreError): string => {
  switch (error.code) {
    case "not-found":
      return `no project ${error.projectId}`
    case "already-exists":
      return `project ${error.projectId} already exists`
    case "unreadable":
      return `project ${error.projectId} could not be read: ${error.detail}`
    case "unavailable":
      return `the project store is unavailable: ${error.detail}`
  }
}

/**
 * Four methods, and **no delete**.
 *
 * That is the same refusal `TreeStore` makes and for a stronger reason here: a
 * project's rows are its trees, its revisions, its holds, its policy history
 * and its journal, and a delete would either orphan all of them or cascade
 * through the governance record this product exists to keep. *The project says
 * it was closed* is a better answer than *the project is gone* — and closing is
 * not built here either, because nothing can close what nothing has yet opened.
 * When it is wanted it is a column and a filter, not a `DELETE`.
 */
export type ProjectStore = {
  /**
   * Record a project. Refuses an id already taken rather than overwriting,
   * because the thing under that id owns rows.
   */
  readonly create: (project: Project) => Promise<Result<Project, ProjectStoreError>>

  /** One project. */
  readonly get: (projectId: ProjectId) => Promise<Result<Project, ProjectStoreError>>

  /**
   * Every project, oldest first.
   *
   * Unpaginated, and that is a judgement rather than an oversight: this is the
   * list a person scans on one screen, and a deployment whose project count
   * needs a cursor has a different screen's problem. `TreeStore.list` takes a
   * limit because pages are unbounded in a way projects are not.
   */
  readonly list: () => Promise<Result<readonly Project[], ProjectStoreError>>

  /** Change what a person calls it. */
  readonly rename: (
    projectId: ProjectId,
    to: { readonly name: string }
  ) => Promise<Result<Project, ProjectStoreError>>
}
