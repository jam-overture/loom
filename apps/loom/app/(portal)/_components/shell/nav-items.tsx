import type { ReactNode } from "react"

import type { NavItem } from "@/app/(portal)/_lib/nav"
import { screenName } from "@/app/(portal)/_lib/screen-names"

export type ShellNavItem = NavItem & {
  readonly icon: ReactNode
}

/**
 * A named group of places, which is the change of 1 October.
 *
 * The groups were unnamed until now — three runs of icons separated by a rule —
 * and that is most of what made the rail unreadable. A divider says *these are
 * not the same kind of thing* and cannot say what kind either of them is, so a
 * reader met twelve nouns in three heaps and had to infer the model from the
 * nouns. The maintainer's words were *"I don't know what I should be looking
 * for. I don't know what I should be looking at."*
 */
export type ShellNavGroup = {
  readonly name: string
  readonly items: readonly ShellNavItem[]
}

const strokeProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  className: "h-[18px] w-[18px] shrink-0",
} as const

/**
 * The rail, arranged as the governance model rather than as a list of nouns.
 *
 * ## What changed, and why it is the whole fix
 *
 * Loom is a governance framework: **something is governed, by rules, producing
 * decisions, judged against evidence.** Every screen in this portal belongs to
 * exactly one of those four, and until 1 October the rail said so nowhere. The
 * groups existed — the previous arrangement had three of them and argued for
 * each — but they were unnamed, and an unnamed group is a shape a reader has to
 * reverse-engineer from its contents.
 *
 * So the groups carry their names now, and the first of them has the screen it
 * was missing: **Your app**, the subject all of this is about. A tool whose
 * first screen is a queue assumes you already know what you have.
 *
 * | group | the question it answers |
 * | --- | --- |
 * | Your app | what Loom is looking after, what it may build with, what it may do |
 * | Changes | what was asked, what was allowed, what landed |
 * | Evidence | what came of it — readers, calibration, whether the record adds up |
 * | This portal | the tool itself, which is a different subject and reads as one |
 *
 * The fourth is the one that was already right and is kept for its original
 * reason: a lockout is not something the runtime did, it is something this portal
 * did to somebody trying to reach it, and filing it beside the runtime's own
 * history would suggest the two are answerable from the same log. They are not
 * (0018).
 *
 * ## The front door is no longer first, and that is deliberate
 *
 * It led the rail because it is the screen with something urgent on it, and that
 * argument was right while the portal was a review queue with screens around it.
 * It is wrong for a governance surface: a reader who does not know what they have
 * cannot read a queue of changes to it, and the queue is empty on every
 * deployment nobody has asked anything of — which is every deployment on its
 * first day.
 *
 * It keeps `exact`, for the reason it always did: `/portal` is the prefix of
 * every other href in this rail, so without it the front door is the active item
 * on every screen in the portal and the rail stops distinguishing anything.
 *
 * ## The labels are still nouns, and still read from one place
 *
 * A rail is a list of places and a noun names a place. The three screens with
 * declared names read them from `_lib/screen-names.ts` rather than carrying a
 * copy — `Activity` and `History` were synonyms sitting next to each other, and
 * the front door's `Waiting on you` had stopped describing its own screen the day
 * that screen grew a second half. Both defects were a rail label typed
 * independently of the heading it points at.
 *
 * The rest are each the short form of their own screen's heading: `Pages` was
 * `trees`, which is the data structure; `Trust` was `Calibration`, which is a
 * statistical property; `Checkup` was `Audit`, which is a compliance word;
 * `Pieces` was `Primitives`, which is the framework's word for one of the things
 * a page is built from. Each moved on the run that rewrote its screen, never
 * before it — a nav label renamed ahead of the screen it points at is a promise
 * the screen does not keep.
 *
 * `Sign-ins` is the one that deliberately did not move. The word the rest of the
 * industry would use — `Security` — is a claim four sizes larger than the screen:
 * it reports failed sign-ins to this portal and nothing else.
 *
 * `Demo` is the one entry that leaves this route group, and it is in the first
 * group because it is a thing this deployment *has*: the surface anyone can see
 * without a key.
 */
export const NAV_GROUPS: readonly ShellNavGroup[] = [
  {
    name: "Your app",
    items: [
      {
        label: "Your app",
        href: "/portal/app",
        icon: (
          <svg {...strokeProps}>
            <path d="M12 3l9 5-9 5-9-5z" />
            <path d="M3 12l9 5 9-5" />
            <path d="M3 16.5l9 5 9-5" />
          </svg>
        ),
      },
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
         * Beside `Pieces`, because the two are one question asked twice: what the
         * AI may *build* from, and what it may *do*. Both are true before
         * anything has happened, which is what makes them the pair a new arrival
         * reads first — every entry in the two groups below is empty on a
         * deployment nothing has been asked of.
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
    ],
  },
  {
    name: "Changes",
    items: [
      {
        label: screenName("/portal"),
        href: "/portal",
        exact: true,
        icon: (
          <svg {...strokeProps}>
            <path d="M6 3h12M6 21h12" />
            <path d="M8 3v3.5a4 4 0 002 3.4l2 1.1 2-1.1a4 4 0 002-3.4V3" />
            <path d="M8 21v-3.5a4 4 0 012-3.4l2-1.1 2 1.1a4 4 0 012 3.4V21" />
          </svg>
        ),
      },
      {
        label: screenName("/portal/activity"),
        href: "/portal/activity",
        icon: (
          <svg {...strokeProps}>
            <path d="M3 12h4l2.5-6 4 12 2.5-6h5" />
          </svg>
        ),
      },
      {
        label: screenName("/portal/history"),
        href: "/portal/history",
        icon: (
          <svg {...strokeProps}>
            <circle cx="12" cy="12" r="9" />
            <polyline points="12 7 12 12 16 14" />
          </svg>
        ),
      },
    ],
  },
  {
    name: "Evidence",
    items: [
      {
        /**
         * First in this group because it is evidence rather than a judgement, and
         * it is the only question here whose answer moves while nobody is asking
         * anything.
         *
         * `Readers` rather than `Signals`. A signal is the runtime's word for one
         * anonymous report from a page, and there is no sense in which a person
         * opens a portal to look at signals.
         */
        label: "Readers",
        href: "/portal/readers",
        icon: (
          <svg {...strokeProps}>
            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
            <circle cx="12" cy="12" r="2.5" />
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
  },
  {
    name: "This portal",
    items: [
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
  },
]
