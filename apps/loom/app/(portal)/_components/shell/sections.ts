import { WHAT_IF_NAME } from "@/app/(portal)/_lib/levers"
import type { NavItem } from "@/app/(portal)/_lib/nav"
import { screenName } from "@/app/(portal)/_lib/screen-names"

/**
 * The portal's navigation, as two levels of data.
 *
 * ## What this replaces, and why it is not a restyle
 *
 * Until now the rail was **one** level: twelve destinations in four named
 * groups, inside a 56px aside that widened to 275px on hover or focus. The
 * labels were written, they were tested, and at rest **none of them was on the
 * screen** — twelve identical glyphs, so the only way to tell `Readers` from
 * `Trust` from `Checkup` was to point at each one in turn.
 *
 * The audit of 12 October photographed all fourteen screens signed in and put
 * that first of the four things no test could have found:
 *
 * > **The rail has no words on it.** Twelve icons, no labels, no grouping
 * > headings […] This is the first thing anybody meets and it is unreadable.
 *
 * It is also the maintainer's own first complaint — *"I can't even make heads
 * or tails of what I should be looking at"* — and the one he wrote the remedy
 * for himself: *"There should be a second left rail that can act as a
 * submenu."*
 *
 * ## The shape
 *
 * > **The icon rail is the sections. The second rail is one section's screens.
 * > Both carry their words at rest.**
 *
 * Two levels and no third. Twelve flat destinations is past what anybody reads
 * as a list, and the four groups were already the admission of that — a group
 * heading is a level that has not been given a rail yet.
 *
 * It is the information architecture of the prototype at `/portal/preview`,
 * which is where it was drawn and photographed first, pointed at the screens
 * that actually exist instead of at invented ones. The prototype keeps its own
 * copy for now because its paths carry a project and these do not; that
 * duplication ends when the project shell lands and there is one chrome again.
 *
 * ## What is deliberately not here
 *
 * **No `soon` items.** The prototype has them, because a prototype is arguing
 * for a shape. A rail on the real portal is a claim that a route exists, and
 * `sections.test.ts` checks every href against the filesystem — three of four
 * items pointed at 404s on a deployed portal once, which is why that test
 * exists.
 *
 * **No submenu of one.** A section whose only screen is itself has no second
 * rail: `Pages`, `Pieces` and `Sign-ins` are each one screen, and inventing a
 * list of one to fill a rail is the same mistake as a portal geared to one app.
 *
 * **No new names.** The section labels are new, because a section is a new
 * thing. Every *screen* in the second rail keeps the name it already had —
 * read from `screen-names.ts` where it has a declared one, and otherwise the
 * short form of its own heading that it has carried all along. A nav label
 * renamed ahead of the screen it points at is a promise the screen does not
 * keep, and the screens below are not what this change rewrites.
 */

/** A glyph the rail knows how to draw. The drawing is `rails.tsx`'s. */
export type SectionIcon = "home" | "pages" | "pieces" | "rules" | "logs" | "lock"

export type SectionGroup = {
  readonly name: string
  readonly items: readonly NavItem[]
}

export type Section = {
  /** Stable, for the active comparison. Never shown to anybody. */
  readonly key: string
  /** What the icon rail says under the glyph. */
  readonly label: string
  readonly icon: SectionIcon
  /** Where the glyph leads, which is the section's first screen. */
  readonly href: string
  /**
   * The second rail, absent for a section that is one screen.
   *
   * `undefined` rather than an empty list, so a section with no submenu is a
   * different thing from one whose submenu came back empty — the first is the
   * honest shape for `Pieces` and the second would be a bug.
   */
  readonly groups?: readonly SectionGroup[]
}

export const SECTIONS: readonly Section[] = [
  {
    key: "overview",
    label: "Overview",
    icon: "home",
    href: "/portal",
    groups: [
      {
        name: "This deployment",
        items: [
          /*
           * `exact`, and it is the same reason it has always been: `/portal` is
           * the prefix of every other href in this portal, so without it the
           * front door is the active item on every screen and the rail stops
           * distinguishing anything.
           */
          { label: screenName("/portal"), href: "/portal", exact: true },
          { label: "Your app", href: "/portal/app" },
          /*
           * A verb among nouns, and it earns the place: registering an
           * application is what the maintainer called this portal's primary
           * purpose, and `/portal/new` is a route a reader can type. The
           * workspace screen's own button is the path most people will take;
           * a rail that omitted the screen anyway would be hiding the main
           * thing this portal is for behind one button on one screen.
           *
           * The label is the screen's heading rather than a shorter invention,
           * which is this file's rule for every item in a second rail.
           */
          { label: "Register an application", href: "/portal/new" },
        ],
      },
    ],
  },
  { key: "pages", label: "Pages", icon: "pages", href: "/portal/pages" },
  { key: "pieces", label: "Pieces", icon: "pieces", href: "/portal/pieces" },
  {
    key: "rules",
    label: "Rules",
    icon: "rules",
    href: "/portal/rules",
    groups: [
      {
        name: "Policy",
        items: [
          { label: "Rules", href: "/portal/rules", exact: true },
          { label: WHAT_IF_NAME, href: "/portal/rules/what-if" },
        ],
      },
    ],
  },
  {
    key: "logs",
    label: "Logs",
    icon: "logs",
    /*
     * The section leads with what was asked rather than with what changed,
     * because a request that was refused leaves no trace in any repository,
     * log or diff — it is the half of this subject that only Loom has.
     */
    href: "/portal/activity",
    groups: [
      {
        name: "What happened",
        items: [
          { label: screenName("/portal/activity"), href: "/portal/activity" },
          { label: screenName("/portal/history"), href: "/portal/history" },
        ],
      },
      {
        name: "What came of it",
        items: [
          { label: "Readers", href: "/portal/readers" },
          { label: "Trust", href: "/portal/trust" },
          /*
           * Not `exact`. `/portal/checkup/everything` is this screen's own
           * second half rather than a destination of its own, so a reader who
           * is on it is still in `Checkup` and the rail should say so.
           */
          { label: "Checkup", href: "/portal/checkup" },
        ],
      },
    ],
  },
  { key: "sign-ins", label: "Sign-ins", icon: "lock", href: "/portal/sign-ins" },
]

/** Every href the rail offers, at either level, with the section it belongs to. */
const DESTINATIONS: readonly { readonly href: string; readonly section: Section }[] =
  SECTIONS.flatMap((section) => [
    { href: section.href, section },
    ...(section.groups ?? []).flatMap((group) =>
      group.items.map((item) => ({ href: item.href, section }))
    ),
  ])

/** The portal's own root, which is a destination and also the prefix of all of them. */
const ROOT = "/portal"

/**
 * Whether a path is this href or something inside it, respecting segments.
 *
 * `_lib/nav.ts` answers the same question for an *item*, where the answer is a
 * highlight and `exact` is part of it. This one is about a *section*, which
 * claims everything beneath its screens — that is what keeps `Pages` lit while
 * a reader is three levels down inside one page, and what will light `Rules`
 * on a rules screen nobody has written yet.
 *
 * **`/portal` is the one href that claims only itself**, and it has to be: it
 * is the front door *and* the prefix of every other path on this surface, so a
 * prefix reading of it would put the sign-in page, the prototype and every
 * screen in the portal inside `Overview`. The front door's own rail entry
 * carries `exact` for the same reason, one level down.
 */
const within = (pathname: string, href: string): boolean =>
  href === ROOT
    ? pathname === ROOT
    : pathname === href || pathname.startsWith(`${href}/`)

/**
 * The section a path is in, by longest match.
 *
 * Longest rather than first, and that is load bearing once a section owns more
 * than one screen: `Overview` holds `/portal` and `/portal/app`, and `Logs`
 * holds five, so the href that matches furthest along the path is the most
 * specific claim on it — which is the one a reader means.
 *
 * `undefined` for a path no section claims — the sign-in page, the prototype,
 * a route somebody adds and forgets to put in the rail. The rail draws nothing
 * as active rather than guessing, because a rail that highlights the wrong
 * place is worse than one that highlights none.
 */
export const sectionFor = (pathname: string): Section | undefined =>
  [...DESTINATIONS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((destination) => within(pathname, destination.href))?.section

/** Every item in a section's second rail, flattened. For tests and for a phone. */
export const sectionItems = (section: Section): readonly NavItem[] =>
  (section.groups ?? []).flatMap((group) => group.items)
