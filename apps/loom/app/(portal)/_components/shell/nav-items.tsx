import type { ReactNode } from "react"

import type { NavItem } from "@/app/(portal)/_lib/nav"

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
 * Three groups. What the runtime holds — the pages themselves, the catalogue a
 * model is told it may build from (0013), and the policy every change is judged
 * against before it reaches one (0002). Then the record of how they got that
 * way: what the runtime was asked to do and what became of it (0023), what was
 * accepted into a tree (0016), whether the model's own confidence has been worth
 * anything (0031), and whether the log still produces the snapshot.
 *
 * Then the deployment itself, which is a different subject and reads as one. A
 * lockout is not something the runtime did — it is something this portal did to
 * somebody trying to reach it — and filing it beside the runtime's own history
 * would suggest the two are answerable from the same log. They are not, which is
 * the whole of why the sign-in table belongs to the portal (0018).
 *
 * The labels are what a person would call these things rather than what the
 * runtime calls them: `trees` was the data structure, and `Pages` is what is
 * actually in it. `Calibration` was a statistical property, and `Trust` is what
 * somebody is trying to find out by reading it. `Audit` was a compliance word
 * for checking that a page still adds up, and `Checkup` is what that is.
 * `Primitives` was the framework's word for one of the things a page is built
 * from, and `Pieces` is the word the rest of this portal already uses in the
 * middle of a sentence about one. Each label moved on the run that rewrote its
 * page, never before it — a nav label renamed ahead of the screen it points at
 * is a promise the screen does not keep.
 *
 * `audit` was here from day 10 with no route behind it, and a nav is a claim
 * about what a thing can do. It came back once its page did — and the page keeps
 * the claim honest, because a tree whose seed this host cannot reproduce is
 * listed as uncheckable rather than quietly passing (0028).
 *
 * `Demo` is the one entry that leaves this route group. The demo moved to a
 * public `/demo` of its own on 21 August; `/portal/demo` is now a 308 kept for
 * old links, and a nav that routes a signed-in reviewer through a redirect is a
 * nav pointing at where something used to be.
 */
export const NAV_GROUPS: readonly (readonly ShellNavItem[])[] = [
  [
    {
      label: "Pages",
      href: "/portal/pages",
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
      /**
       * The one public route, listed here anyway: a reviewer looking at what
       * this deployment holds should be able to reach the surface anyone else
       * can see, without having to be told the path.
       */
      label: "Demo",
      href: "/demo",
      icon: (
        <svg {...strokeProps}>
          <rect x="3" y="4" width="18" height="14" rx="2" />
          <path d="M8 21h8" />
          <path d="M10 9l4 2-4 2z" />
        </svg>
      ),
    },
    {
      label: "Pieces",
      href: "/portal/pieces",
      icon: (
        <svg {...strokeProps}>
          <rect x="2" y="7" width="20" height="14" />
          <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
          <line x1="12" y1="12" x2="12" y2="16" />
          <line x1="10" y1="14" x2="14" y2="14" />
        </svg>
      ),
    },
    {
      /**
       * Beside `Pieces` rather than in the record group, because the two are one
       * question asked twice: what the AI may *build* from, and what it may
       * *do*. Both are true before anything has happened, which is what makes
       * them the pair a new arrival reads first — every entry in the group below
       * is empty on a deployment nothing has been asked of.
       */
      label: "Rules",
      href: "/portal/rules",
      icon: (
        <svg {...strokeProps}>
          <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      ),
    },
  ],
  [
    {
      label: "Activity",
      href: "/portal/activity",
      icon: (
        <svg {...strokeProps}>
          <path d="M3 12h4l2.5-6 4 12 2.5-6h5" />
        </svg>
      ),
    },
    {
      label: "History",
      href: "/portal/history",
      icon: (
        <svg {...strokeProps}>
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 16 14" />
        </svg>
      ),
    },
    {
      label: "Trust",
      href: "/portal/trust",
      icon: (
        <svg {...strokeProps}>
          <line x1="4" y1="20" x2="20" y2="4" />
          <path d="M4 16h4v4H4zM10 12h4v8h-4zM16 6h4v14h-4z" />
        </svg>
      ),
    },
    {
      label: "Checkup",
      href: "/portal/checkup",
      icon: (
        <svg {...strokeProps}>
          <path d="M20 12V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h6" />
          <path d="M8 9h8M8 13h5" />
          <polyline points="15 18 17 20 21 16" />
        </svg>
      ),
    },
  ],
  [
    {
      label: "Sign-ins",
      href: "/portal/sign-ins",
      icon: (
        <svg {...strokeProps}>
          <rect x="4" y="10" width="16" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 018 0v3" />
        </svg>
      ),
    },
  ],
]
