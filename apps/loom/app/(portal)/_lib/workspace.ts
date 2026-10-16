import type { Application, Project } from "@jam-overture/loom/store"

import type { Membership, Role } from "./auth/roles"

/**
 * The first screen: every application this deployment governs, under the
 * project it is grouped in.
 *
 * It replaces a screen called *What Loom has been doing*, which the maintainer
 * named among eight complaints on 12 October and which was wrong twice over. It
 * overlapped `/portal/pages` — both led with *Your pages* — and it assumed one
 * application, which is the complaint that mattered: *"the whole portal is
 * geared toward one app when I can have many"*.
 *
 * ## Why the grouping is a heading rather than a screen
 *
 * The hierarchy is account > project > application
 * ([0269](../../../../../decisions/0269-an-application-is-the-unit-loom-governs-and-a-project-groups-them.md)),
 * and the literal reading of it gives a project its own screen with the
 * applications inside. That is the right shape for somebody with forty
 * applications and the wrong one for everybody else: **a project owns nothing
 * yet**, so its screen would carry a name and a count, and a deployment with one
 * project and one application would have two screens to walk through before
 * reaching anything.
 *
 * So the grouping is a heading on this screen. Nothing about that forecloses the
 * other: when a project owns members or inherited policy, it has something to
 * put on a screen and earns one, and `/portal/[project]` can be added beside
 * these routes rather than instead of them — a project id cannot collide with a
 * static segment, because it wears `prj_`.
 */

/** What one row knows. */
export type ApplicationSummary = {
  readonly application: Application
  /** Pages the store holds for it. */
  readonly pages: number
  /**
   * Changes the Gate declined to decide alone, which is the one number that
   * decides whether somebody opens the portal tomorrow — the sentence
   * `/portal/pages` already leads with, kept because it is the most useful
   * thing this screen can say about a row.
   */
  readonly waiting: number
  /** Rows the store placed and this build cannot read. Reported, never hidden. */
  readonly unreadable: number
}

export type ProjectGroup = {
  readonly project: Project
  /**
   * What the person looking at it may do here (0285).
   *
   * On the group rather than looked up again by the screen, because a card that
   * said *waiting on you* to somebody who cannot release anything would be a
   * screen telling a viewer to do something the Gate will not let them do.
   */
  readonly role: Role
  readonly applications: readonly ApplicationSummary[]
}

export type Workspace = {
  readonly groups: readonly ProjectGroup[]
  /**
   * Applications whose project is not in the list.
   *
   * It should be empty, and a screen that silently dropped them would be a
   * screen that stops showing you an application because a row somewhere else
   * is missing. They are shown under their own heading instead.
   */
  readonly ungrouped: readonly ApplicationSummary[]
}

/**
 * The grouping, as a function of what the stores returned and nothing else.
 *
 * Projects keep the order they arrive in, which is oldest first from both
 * stores; applications are ordered within a project by what is waiting, then by
 * name. **Waiting leads the sort for the same reason it leads the row**: a
 * screen whose job is *what do I do now* should put the thing that needs
 * answering at the top, and alphabetical order is the arrangement that most
 * reliably buries it.
 */
/**
 * Copied before sorting, because `sort` is in place and the array handed in is
 * the caller's. `toSorted` says this in one word and is not in the application's
 * TypeScript lib, which the root typecheck does not notice and `next build`
 * does.
 */
const byUrgency = (applications: readonly ApplicationSummary[]): readonly ApplicationSummary[] =>
  [...applications].sort(
    (left, right) =>
      right.waiting - left.waiting || left.application.name.localeCompare(right.application.name)
  )

/**
 * The workspace one person has, which is the only kind there is now.
 *
 * `workspaceOf` below answers *what does this deployment hold*. This answers
 * *what is mine*, and the difference is the whole of 0285 arriving on a screen:
 * a project you hold no role in is not a project you are shown.
 *
 * **Projects are filtered by membership, not by ownership of their rows.** An
 * application whose project is not in the list does not appear, and there is no
 * `ungrouped` escape hatch here — the one on `workspaceOf` exists so a
 * deployment-wide view cannot silently drop an orphan, and reusing it here
 * would show somebody every application whose project row is missing.
 *
 * Order follows the memberships, which arrive oldest first.
 */
export const workspaceFor = (
  memberships: readonly Membership[],
  projects: readonly Project[],
  applications: readonly ApplicationSummary[]
): Workspace => {
  const roles = new Map(memberships.map((membership) => [membership.projectId, membership.role]))
  const mine = projects.filter((project) => roles.has(project.projectId))

  const inProject = (projectId: string): readonly ApplicationSummary[] =>
    byUrgency(applications.filter((summary) => summary.application.projectId === projectId))

  return {
    groups: mine.flatMap((project) => {
      const role = roles.get(project.projectId)

      /**
       * Unreachable — `mine` is filtered by the same map — and spelled as a
       * skip rather than a cast so that a future caller which builds `mine`
       * some other way cannot land a group with no role on a screen.
       */
      return role === undefined
        ? []
        : [{ project, role, applications: inProject(project.projectId) }]
    }),
    ungrouped: [],
  }
}

export const workspaceOf = (
  projects: readonly Project[],
  applications: readonly ApplicationSummary[]
): Workspace => {
  const known = new Set(projects.map((project) => project.projectId))

  const inProject = (projectId: string): readonly ApplicationSummary[] =>
    byUrgency(applications.filter((summary) => summary.application.projectId === projectId))

  return {
    groups: projects.map((project) => ({
      project,
      /**
       * The deployment-wide view is not somebody's workspace, so there is no
       * role to carry — `owner` is what a screen that shows everything is
       * already assuming about its reader.
       */
      role: "owner" as Role,
      applications: inProject(project.projectId),
    })),
    ungrouped: byUrgency(applications.filter((summary) => !known.has(summary.application.projectId))),
  }
}

/** Everything on the screen, for the sentence above the list. */
export const workspaceTotals = (
  workspace: Workspace
): { readonly applications: number; readonly waiting: number; readonly pages: number } => {
  const every = [...workspace.groups.flatMap((group) => group.applications), ...workspace.ungrouped]

  return {
    applications: every.length,
    waiting: every.reduce((sum, summary) => sum + summary.waiting, 0),
    pages: every.reduce((sum, summary) => sum + summary.pages, 0),
  }
}
