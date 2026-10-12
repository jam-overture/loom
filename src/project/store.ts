import type { Result } from "../result.js"

import type { Project, ProjectId } from "./project.js"

/**
 * Custody of the projects a deployment has.
 *
 * [0260](../../decisions/0260-a-project-is-the-unit-loom-stores-governs-and-measures-under.md)
 * decided what a project is and five tables carry its id, so a tree, a hold, a
 * policy revision and a journal entry each know which project they belong to.
 * Nothing stored the project itself: `Project` was a type nothing wrote, and
 * `DEFAULT_PROJECT_ID` was the only one that could be named. A portal whose
 * first screen lists the projects you have therefore had nothing to list, and
 * the maintainer's own sentence — *"the whole portal is geared toward one app
 * when I can have many"* — stayed true of the data even after it stopped being
 * true of the schema.
 *
 * This is the row that makes a project nameable. It is deliberately thin, for
 * the reason `projectSchema` gives: the registry, the policy and the ingest
 * credential are each already somebody's, and this says only that the project
 * exists and what a person calls it.
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

  /** Change what a person calls it, and where they say it lives. */
  readonly rename: (
    projectId: ProjectId,
    to: { readonly name?: string; readonly host?: string }
  ) => Promise<Result<Project, ProjectStoreError>>
}
