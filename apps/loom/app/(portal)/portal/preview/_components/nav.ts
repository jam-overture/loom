/**
 * The information architecture, as data.
 *
 * Two levels and no more. The icon rail is the project's sections; the second
 * rail is one section's screens, grouped. That is the maintainer's first
 * complaint answered — *"There should be a second left rail that can act as a
 * submenu, and the tabs in the second level of Pages should be populated
 * there"* — and it is what every one of the seven tabs on the page inspector
 * was standing in for.
 *
 * **The rail at rest shows words.** The one it replaces is 56px of unlabelled
 * icons that widen on hover, so twelve destinations look identical until you
 * point at them one by one.
 */

export type SubItem = { readonly label: string; readonly href: string; readonly soon?: boolean }
export type SubGroup = { readonly name: string; readonly items: readonly SubItem[] }

export type Section = {
  readonly key: string
  readonly label: string
  /** Appended to `/portal/preview/<project>`; "" is the section's own root. */
  readonly path: string
  readonly icon: string
  readonly groups?: readonly SubGroup[]
}

/**
 * Paths are relative to the project. A section with no `groups` has no second
 * rail, which is the honest shape for a screen that is one screen — inventing
 * a submenu of one is the same mistake as a list of one app (0220).
 */
export const SECTIONS: readonly Section[] = [
  { key: "overview", label: "Overview", path: "", icon: "home" },
  {
    key: "pages",
    label: "Pages",
    path: "/pages",
    icon: "pages",
    groups: [
      {
        name: "This project",
        items: [
          { label: "All pages", href: "/pages" },
          { label: "The front door", href: "/pages/t_home1" },
          { label: "Waiting on you", href: "/pages?filter=waiting" },
          { label: "Changed recently", href: "/pages?filter=changed" },
        ],
      },
    ],
  },
  { key: "pieces", label: "Pieces", path: "/pieces", icon: "pieces" },
  {
    key: "rules",
    label: "Rules",
    path: "/rules",
    icon: "rules",
    groups: [
      {
        name: "Policy",
        items: [
          { label: "Settings", href: "/rules" },
          { label: "Try a change", href: "/rules/what-if" },
          { label: "Previous versions", href: "/rules/versions", soon: true },
        ],
      },
    ],
  },
  {
    key: "logs",
    label: "Logs",
    path: "/logs",
    icon: "logs",
    groups: [
      {
        name: "Explore",
        items: [
          { label: "All events", href: "/logs" },
          { label: "Signals", href: "/logs?kind=signal" },
          { label: "Errors", href: "/logs?kind=error" },
          { label: "Changes", href: "/logs?kind=change" },
          { label: "Gate decisions", href: "/logs?kind=gate" },
        ],
      },
      {
        name: "Reports",
        items: [
          { label: "What readers did", href: "/logs/readers", soon: true },
          { label: "Audit", href: "/logs/audit", soon: true },
        ],
      },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    path: "/settings",
    icon: "settings",
    groups: [
      {
        name: "Project",
        items: [
          { label: "General", href: "/settings" },
          { label: "Credentials", href: "/settings/credentials" },
        ],
      },
      {
        name: "Access",
        items: [
          { label: "Members", href: "/settings/members", soon: true },
          { label: "Sign-ins", href: "/settings/sign-ins", soon: true },
        ],
      },
    ],
  },
]

/** The section a path belongs to, longest match first so "" cannot win. */
export const sectionFor = (rest: string): Section => {
  const matched = [...SECTIONS]
    .filter((section) => section.path !== "")
    .sort((a, b) => b.path.length - a.path.length)
    .find((section) => rest === section.path || rest.startsWith(`${section.path}/`))

  return matched ?? SECTIONS[0]!
}
