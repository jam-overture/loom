import type { TreeId } from "@loom/runtime"

/**
 * The one place a screen is named — and the one place it says what it is *not*.
 *
 * ## The defect this closes
 *
 * `_lib/vocabulary.ts` made a *state* impossible to call two things on two
 * screens. Nothing did the same for a *screen*, and by 7 September
 * `/portal/activity` was being called four different things by four different
 * parts of this portal:
 *
 * | Where | What it called the screen |
 * | --- | --- |
 * | the rail | `Activity` |
 * | its own heading | `Activity` |
 * | the strip on every scoped screen | `What's been asked` |
 * | the link at the foot of the front door | `Everything anyone has asked for →` |
 *
 * `/portal/history` had three. A reader who follows "What's changed" from one
 * screen and then looks for it in the rail finds `History` and has to work out
 * for themselves that they are the same place.
 *
 * The front door's was worse than a synonym, because the two names named
 * different subjects. Its rail entry said `Waiting on you` and its heading said
 * `What Loom has been doing` — and the heading is right: on 7 September that
 * screen grew a second half, *what Loom changed without asking*. The comment
 * that run left above the heading argues the case exactly:
 *
 * > *"A heading that names one of two sections is worse than either a wrong
 * > heading or a missing one: a reader who takes it at face value reads the
 * > second section as more of the first."*
 *
 * The rail entry it did not touch was still doing that, one file over, and the
 * rail is what a reader meets first. `Waiting on you` also names two other
 * things on this surface — the front door's first section, and the state of a
 * change on every badge in the portal (`vocabulary.ts`) — so a person meeting
 * it in the rail has no way to know which of the three they are being offered.
 *
 * ## The rule
 *
 * > **A screen has one name. The rail, the heading and every link that leads
 * > there all read it from here.**
 *
 * `every-screen.test.ts` enforces it from both ends: a declared name may not
 * appear as a literal anywhere in this route group, and neither may a name a
 * screen used to have. The first stops a second copy being written; the second
 * stops the old one surviving in prose nobody grepped, which is exactly what
 * happened to `_lib/waiting.ts` — see `formerly` below.
 *
 * ## Why only three screens are here
 *
 * The same discipline the rail's labels were renamed under: **a name moves on
 * the run that rewrites its screen, never before it.** These three are the ones
 * with the defect — `Pages`, `Pieces`, `Rules`, `Trust`, `Checkup` and
 * `Sign-ins` are each a short form of their own heading rather than a different
 * subject, and none of them is interchangeable with the one beside it. A run
 * that rewrites one of those screens adds it here; a sweeping rename of all
 * nine at once would be a diff nobody can review.
 *
 * ## Why a screen says what it is not
 *
 * `Activity` and `History` are synonyms in ordinary English. In Loom they are
 * nearly opposites: one is every request *including the ones that changed
 * nothing*, the other is only what was actually accepted. That distinction is
 * the single most valuable thing on either screen — a refusal leaves no trace
 * in any repository, log or diff — and it is not guessable from either name, at
 * any length. So each screen carries one line naming its neighbour and the
 * difference, which is cheaper than a name long enough to carry it and is the
 * only place a reader is actually confused.
 */

export type PortalRoute = "/portal" | "/portal/activity" | "/portal/history"

/**
 * The screen a reader most often means instead, and the difference between them.
 *
 * The clause ends where the link begins, so it reads as one sentence with the
 * neighbour's name as its last words — the name being the link is what makes it
 * followable without a second "see also".
 */
export type Elsewhere = {
  readonly route: PortalRoute
  readonly clause: string
}

export type Screen = {
  readonly route: PortalRoute
  /** What the rail calls it, what its heading says, and what a link to it reads. */
  readonly name: string
  readonly elsewhere: Elsewhere
  /**
   * What this screen used to be called, kept so it cannot be written again.
   *
   * A rename that only adds the new name leaves the old one in whatever prose
   * nobody grepped. `_lib/waiting.ts` was the case: "What was asked for stays
   * in Activity, so nothing is lost", printed at the moment a person decides
   * whether to throw a change away, found by looking at a screenshot rather
   * than by any of the four tests this unit had already written.
   *
   * `every-screen.test.ts` forbids each of these as a standalone word, which is
   * what lets `ActivityPage` and `/portal/activity` stay exactly as they are: a
   * route is an address and a symbol is a symbol, and neither is a thing a
   * reader is shown.
   */
  readonly formerly: readonly string[]
}

/**
 * `What's been asked` and `What's changed` are the words the strip has used for
 * these two screens since 29 August. They are not invented here — they are the
 * portal's own, promoted from the one place that had them right to the place
 * every other part of the portal reads.
 *
 * The apostrophes are typographic. A heading is prose and prose is set in a
 * person's punctuation; the straight quote is a programmer's.
 */
const SCREENS: readonly Screen[] = [
  {
    route: "/portal",
    name: "What Loom has been doing",
    elsewhere: {
      route: "/portal/activity",
      clause:
        "This is what has happened lately. Every request anyone has ever made — including the ones that changed nothing — is in",
    },
    /*
     * Empty, and not an oversight. `Waiting on you` was this screen's rail label
     * and is still the heading of its first section and the state of a change on
     * every badge in the portal — forbidding the string would forbid two correct
     * uses to catch one that has already gone. What was wrong was never the
     * words; it was one screen carrying two subjects under them.
     */
    formerly: [],
  },
  {
    route: "/portal/activity",
    name: "What’s been asked",
    elsewhere: {
      route: "/portal/history",
      clause:
        "Asking for a change is not making one. Only the changes that actually went through are in",
    },
    formerly: ["Activity"],
  },
  {
    route: "/portal/history",
    name: "What’s changed",
    elsewhere: {
      route: "/portal/activity",
      clause:
        "A change Loom turned down, or never understood, changed nothing — so it is not here. Every request, including those, is in",
    },
    formerly: ["History"],
  },
]

const screenFor = (route: PortalRoute): Screen => SCREENS.find((screen) => screen.route === route)!

/** Every screen named here, for a guard that must not depend on a list of its own. */
export const namedScreens = (): readonly Screen[] => SCREENS

/** What this screen is called, everywhere it is called anything. */
export const screenName = (route: PortalRoute): string => screenFor(route).name

/** What this screen does not answer, and where that answer is. */
export const elsewhereFrom = (route: PortalRoute): Elsewhere => screenFor(route).elsewhere

/**
 * A link to a screen, carrying the page the reader is already looking at.
 *
 * A reader who is on one page's history and is told the requests are elsewhere
 * wants *that page's* requests, not the deployment's. Both scoped screens read
 * the same `tree` parameter, so the scope survives the crossing.
 *
 * The front door takes no scope — it is a queue over every page — so a `treeId`
 * offered to it is dropped rather than appended as a parameter nothing reads. A
 * URL carrying a filter that does not apply is a claim the screen will not keep.
 */
export const screenHref = (route: PortalRoute, treeId?: TreeId): string =>
  route === "/portal" || treeId === undefined
    ? route
    : `${route}?tree=${encodeURIComponent(treeId)}`
