import type { NavItem } from "./nav"

/**
 * The screens one project has, in the order a person meets them, as the tabs
 * every screen under `/portal/[project]` carries.
 *
 * The plan's *Project* surface ([`docs/portal.md`](../../../../../docs/portal.md),
 * *Three surfaces*) names its tabs, and these are the ones that exist so far.
 * A tab is drawn only for a screen that is built, so the row grows with the
 * plan rather than pointing at routes that 404.
 *
 * - **Signals** first, because *is anything arriving* is the question a
 *   person opens a project to ask, and it is where the project's own address
 *   lands them.
 * - **Pages**, what the site last published (0312), and what Loom proposes
 *   for each page (0329).
 * - **Waiting**, the changes Loom proposed that need a person to say yes (0329).
 * - **Connect your site**, the key and the snippet.
 * - **Settings**, everything an owner changes about the project.
 */
export const projectTabs = (projectId: string): readonly NavItem[] => [
  { label: "Signals", href: `/portal/${projectId}/signals` },
  { label: "Pages", href: `/portal/${projectId}/pages` },
  { label: "Waiting", href: `/portal/${projectId}/waiting` },
  { label: "Connect your site", href: `/portal/${projectId}/connect` },
  { label: "Settings", href: `/portal/${projectId}/settings` },
]

/** Where a project's own address, and its name on the workspace, take a person. */
export const projectHome = (projectId: string): string => `/portal/${projectId}/signals`
