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
 * Three sections, each one a route that exists: the stored trees, what the
 * runtime was asked to do and what became of it (0023), and what was accepted
 * into a tree (0016).
 *
 * `audit` was here from day 10 with no route behind it, and a nav is a claim about
 * what a thing can do. It comes back the day its page does: `auditSnapshot` needs
 * a seed to fold from, so only a tree whose revision 0 is still known can be
 * audited at all (0016), and a page claiming otherwise would overstate the
 * runtime.
 *
 * `primitives` came back when its page did — the catalogue a model is told it may
 * build from (0013).
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
  ],
  [
    {
      label: "activity",
      href: "/activity",
      icon: (
        <svg {...strokeProps}>
          <path d="M3 12h4l2.5-6 4 12 2.5-6h5" />
        </svg>
      ),
    },
    {
      label: "history",
      href: "/history",
      icon: (
        <svg {...strokeProps}>
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 16 14" />
        </svg>
      ),
    },
  ],
]
