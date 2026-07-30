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
 * Four sections, each one a thing the runtime already produces: the stored trees,
 * the registry a model may build from (0013), the delta log (0016), and the
 * snapshot audit. Nothing here is aspirational — a section with no data behind it
 * would be a promise in a nav bar.
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
      label: "history",
      href: "/history",
      icon: (
        <svg {...strokeProps}>
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 16 14" />
        </svg>
      ),
    },
    {
      label: "audit",
      href: "/audit",
      icon: (
        <svg {...strokeProps}>
          <path d="M12 3l8 3v6c0 4.5-3.2 7.9-8 9-4.8-1.1-8-4.5-8-9V6z" />
          <polyline points="9 12 11.5 14.5 16 10" />
        </svg>
      ),
    },
  ],
]
