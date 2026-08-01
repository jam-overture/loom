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
 * `primitives` and `audit` were here from day 10 with no route behind them, and
 * a nav is a claim about what a thing can do. They come back the day their pages
 * do — one entry each, and the icons are in the history of this file.
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
