import type { NavItem } from "./nav"

/**
 * The two groups of a project's rail, drawn with a divider between them
 * (`docs/portal-wireframes.md`, *The chrome*): the screens a person works in,
 * then the ones that set the project up.
 */
export type ProjectTabGroup = "work" | "setup"

export type ProjectTab = NavItem & {
  readonly group: ProjectTabGroup
  /** The tab that carries the count of changes waiting for a person. */
  readonly counts?: "waiting"
}

/**
 * The screens one project has, in the order the wireframes' rail lists them,
 * as the rail every screen under `/portal/[project]` carries.
 *
 * Each answers one question (`docs/portal-wireframes.md`, *The chrome*), and
 * a tab is drawn only for a screen that is built, so the rail grows with the
 * plan rather than pointing at routes that 404. *Segments* is not here: it
 * has no unit yet (9), and a rail item for it would be a surface without one.
 *
 * - **Signals** first, because *is anything arriving* is the question a
 *   person opens a project to ask, and it is where the project's own address
 *   lands them.
 * - **For review**, what Loom wants to change and whether the person agrees
 *   (0329), with a count of what waits.
 * - **Pages**, what is live and whether each change helped (0312, 8c).
 * - **Goals**, what the project is trying to get readers to do (0350).
 * - Then, below the divider, **Connect your site** (the key, the snippet, the
 *   publish key) and **Settings** (everything an owner changes).
 */
export const projectTabs = (projectId: string): readonly ProjectTab[] => [
  { label: "Signals", href: `/portal/${projectId}/signals`, group: "work" },
  { label: "For review", href: `/portal/${projectId}/review`, group: "work", counts: "waiting" },
  { label: "Pages", href: `/portal/${projectId}/pages`, group: "work" },
  { label: "Goals", href: `/portal/${projectId}/goals`, group: "work" },
  { label: "Connect your site", href: `/portal/${projectId}/connect`, group: "setup" },
  { label: "Settings", href: `/portal/${projectId}/settings`, group: "setup" },
]

/** Where a project's own address, and its name on the workspace, take a person. */
export const projectHome = (projectId: string): string => `/portal/${projectId}/signals`

/**
 * Where the rail asks how many changes wait for a person, read on every move
 * between a project's screens because the rail itself is not re-drawn by one.
 */
export const waitingCountHref = (projectId: string): string => `/portal/${projectId}/review/waiting`
