import type { ReactNode } from "react"

import type { NavItem } from "@/lib/nav"

export type ShellNavItem = NavItem & {
  readonly icon: ReactNode
}

const strokeProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  className: "h-[18px] w-[18px] shrink-0",
} as const

/**
 * Only sections that exist.
 *
 * This list previously carried `history` and `audit`, which had no routes behind
 * them — three of four items led to 404s on a deployed portal. The comment here
 * said "a section with no data behind it would be a promise in a nav bar" while
 * being exactly that, which is the useful lesson: a nav item is a claim, and the
 * claim is cheap to make and invisible to break.
 *
 * Both belong in the portal eventually, and neither belongs *here*. A tree's log
 * is per-tree, so history is a view inside `/trees/[treeId]` rather than a
 * top-level section. `auditSnapshot` needs a seed to fold from, and only a tree
 * whose revision 0 is still known can be audited at all (0016).
 */
export const NAV_GROUPS: readonly (readonly ShellNavItem[])[] = [
  [
    {
      label: "trees",
      href: "/trees",
      icon: (
        <svg {...strokeProps}>
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
      ),
    },
    {
      label: "primitives",
      href: "/primitives",
      icon: (
        <svg {...strokeProps}>
          <rect x="2" y="7" width="20" height="14" />
          <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
          <line x1="12" y1="12" x2="12" y2="16" />
          <line x1="10" y1="14" x2="14" y2="14" />
        </svg>
      ),
    },
  ]
]
