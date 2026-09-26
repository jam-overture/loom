import { assertNever, type TreeId } from "@loom/runtime"
import type { StoreError } from "@loom/runtime/store"

import type { AuditReport } from "./audit-view"
import type { OutcomeTone } from "./outcome"
import { nameFrom, type PageName } from "./page-name"
import { inPageOrder } from "./page-order"

/**
 * One press, every page: whether the deployment as a whole still adds up.
 *
 * ## The screen this exists for
 *
 * `/portal/checkup` answers one page at a time and only when asked. That is the
 * right shape for the fold — 0016 introduced the snapshot precisely so nothing
 * on a request path has to replay a log — and it is the wrong shape for the
 * question a person actually has. Nobody wakes up wanting to check a page. They
 * want to know whether *anything* has gone wrong, and a screen that can only
 * answer that by being opened once per page never gets asked.
 *
 * So the check stays on demand and the *unit* of it grows: a reviewer presses
 * once and gets one verdict over everything, with a row per page underneath.
 *
 * ## The rule this module is mostly made of
 *
 * > **A check that did not happen is never counted as a check that passed.**
 *
 * There are four different ways a page can fail to produce a verdict — its
 * history could not be replayed, its history could not be read, this deployment
 * has no record of the shape it started as, or the listing stopped before
 * reaching it — and a sweep that folded any of them into the green count would
 * be telling somebody everything is fine on the strength of pages it never
 * looked at. Every arm below is a separate state for that reason, and the
 * headline refuses the word *everything* whenever one of them is non-zero.
 *
 * Pure, and no React. What a sweep *says* is the part worth testing, and a
 * component that both ran the folds and decided the wording could only be
 * checked by standing a store up.
 */

/**
 * What a sweep found out about one page.
 *
 * Carrying the whole `AuditReport` on the three arms that have one is
 * deliberate: the row shows a plain word, and the page it links to shows the
 * account. Nothing here is a summary that replaces the full reading — the same
 * `describeAudit` result is one click away on every one of them.
 */
export type PageStanding =
  | { readonly state: "adds-up"; readonly report: AuditReport }
  | { readonly state: "does-not-add-up"; readonly report: AuditReport }
  /** The replay stopped partway, so there was never a second page to compare. */
  | { readonly state: "could-not-be-finished"; readonly report: AuditReport }
  /** This deployment cannot reproduce the shape the page started as (0028). */
  | { readonly state: "nothing-to-check-against" }
  /** The store did not answer. Not a fault in the page, and not a pass either. */
  | { readonly state: "could-not-be-read"; readonly error: StoreError }

export type PageCheck = {
  readonly treeId: TreeId
  readonly standing: PageStanding
}

export type StandingState = PageStanding["state"]

/**
 * The plain word for one page's standing, and the sentence under it.
 *
 * `label` is short because it sits at the end of a row beside a page's name and
 * has to be readable at a glance; `meaning` is the sentence that makes it
 * actionable. Both are shown unasked, so neither may use a runtime word — the
 * technical reading of the same standing is the verdict panel on that page's own
 * checkup, which this row links to.
 *
 * Typed as a total record, so a standing added above fails the build here rather
 * than rendering a row with no words in it.
 */
export type StandingWord = {
  readonly label: string
  readonly meaning: string
  readonly tone: OutcomeTone
}

const STANDING_WORDS: Readonly<Record<StandingState, StandingWord>> = {
  "adds-up": {
    label: "Adds up",
    tone: "applied",
    meaning:
      "Everything on this page is accounted for by the record of what was done to it.",
  },
  "does-not-add-up": {
    label: "Doesn’t add up",
    tone: "rejected",
    meaning:
      "The page people are being served is not the page its own history produces. Something here is unexplained.",
  },
  "could-not-be-finished": {
    label: "Couldn’t be checked",
    tone: "uninterpreted",
    meaning:
      "This page’s history has a break in it, so there was nothing to compare the page against. That is not the same as the page being wrong.",
  },
  "nothing-to-check-against": {
    label: "Nothing to check against",
    tone: "inapplicable",
    meaning:
      "This deployment doesn’t know the shape this page started as, so a check would only compare the page with itself and agree every time.",
  },
  "could-not-be-read": {
    label: "Couldn’t be read",
    tone: "uninterpreted",
    meaning:
      "This page’s history didn’t come back just now, so nothing about it was checked. Try again in a moment.",
  },
}

export const plainStanding = (state: StandingState): StandingWord => STANDING_WORDS[state]

/**
 * The one number a row would otherwise drop.
 *
 * A standing is a word, and a word is the same width whether one part of a page
 * disagrees with its history or forty do. The report is already in hand — the
 * row carries it so the page behind the link cannot describe a different fold —
 * so the size of the problem costs nothing to say and is the difference between
 * *something is wrong here* and *this is the page to open first*.
 *
 * The recycled names are the other half, and they are the case that makes this
 * a function rather than a field. A page can agree with its own history and
 * still have names that point at two parts (0038); its own checkup says so
 * under a green verdict, and a row that printed only *Adds up* would be the one
 * place in the portal where that finding vanishes. Nothing is ever removed —
 * so the row says there is something to look at, and the page says what.
 *
 * `null` where there is nothing extra to say, rather than an empty string: a
 * row with an empty line in it is a row somebody will later fill by accident.
 */
export const rowNote = (standing: PageStanding): string | null => {
  switch (standing.state) {
    case "does-not-add-up": {
      const parts = standing.report.differences.length + standing.report.omitted

      return parts === 1 ? "1 part disagrees." : `${parts} parts disagree.`
    }

    case "adds-up": {
      const names = standing.report.recycled.length + standing.report.recyclingOmitted

      if (names === 0) return null

      return names === 1
        ? "One name here is used for more than one part of the page."
        : `${names} names here are each used for more than one part of the page.`
    }

    default:
      return null
  }
}

/**
 * Worst first, and the order is an argument rather than an alphabet.
 *
 * A reviewer presses *check every page* to find the one that is wrong. Sorting
 * by name, or by the order the store happened to list them in, buries the row
 * that is the entire reason the screen was opened underneath every row that has
 * nothing to say.
 *
 * The two *could not* states rank above *nothing to check against* because they
 * are conditions of the moment — a read that failed may succeed on the next
 * press — where a page with no recorded starting shape is a standing property of
 * the deployment, and nothing a reviewer does today will change it.
 */
const SEVERITY: Readonly<Record<StandingState, number>> = {
  "does-not-add-up": 0,
  "could-not-be-finished": 1,
  "could-not-be-read": 2,
  "nothing-to-check-against": 3,
  "adds-up": 4,
}

/** Where one standing sits before the tiebreak, for `inPageOrder`. */
export const worstFirstRank = (state: StandingState): number => SEVERITY[state]

/**
 * Worst first, and then by name like every other list of pages in this portal.
 *
 * The tail used to be the order the store listed them in, defended on the
 * ground that *two pages that add up stay in the order the store listed them,
 * so pressing the button twice cannot reshuffle the quiet half of the screen
 * under a reader.* That reason was right and is kept — `byName` is a total
 * order, so two presses against one store still produce one list — and it was
 * one screen's answer to a question five screens were answering differently. A
 * cursor order is what a store needs to resume a listing, not an arrangement
 * anybody chose, so the quiet half of this screen disagreed with the quiet half
 * of both choosers for no reason a reader could find. See `_lib/page-order.ts`.
 *
 * The names are a parameter because they are read alongside the checks and this
 * module must not read anything.
 */
export const inWorstFirstOrder = (
  checks: readonly PageCheck[],
  names: ReadonlyMap<string, PageName>
): readonly PageCheck[] =>
  inPageOrder(checks, (check) => ({
    rank: worstFirstRank(check.standing.state),
    page: nameFrom(names, check.treeId),
  }))

/** One page's standing, read off the report its own checkup would show. */
export const standingOf = (report: AuditReport): PageStanding => {
  switch (report.tone) {
    case "agrees":
      return { state: "adds-up", report }
    case "diverged":
      return { state: "does-not-add-up", report }
    case "unreplayable":
      return { state: "could-not-be-finished", report }
    default:
      return assertNever(report.tone, "standingOf")
  }
}

/**
 * What a whole sweep comes to.
 *
 * The counts are on the surface rather than behind the disclosure, because they
 * are the sentence's own evidence: *"2 of your 9 pages don't add up"* is only
 * checkable by a reader who can see the nine.
 */
export type SweepReading = {
  readonly tone: OutcomeTone
  /** The answer, in one line. Shown unasked; never a runtime word. */
  readonly label: string
  /** Why that is the answer, for somebody who has read nothing. */
  readonly meaning: string
  /** What to do now. Every screen owes a reader this one. */
  readonly next: string
  /** Pages a verdict was actually reached for — the only ones any claim covers. */
  readonly checked: number
  readonly addUp: number
  readonly problems: number
  /** Pages that were tried and produced no verdict, for either reason. */
  readonly unanswered: number
  /** Pages with no recorded starting shape, so never attempted. */
  readonly skipped: number
  readonly total: number
  /** How many accepted changes went into the verdicts, for the record. */
  readonly changesReplayed: number
}

const pages = (count: number): string => `${count} ${count === 1 ? "page" : "pages"}`

const countIn = (checks: readonly PageCheck[], state: StandingState): number =>
  checks.filter((check) => check.standing.state === state).length

/**
 * Accepted changes are only counted where one was replayed. An unfinished
 * replay saw part of a history, and part of a history is not one — the same
 * reason `describeAudit` reports no revision for it.
 */
const replayed = (checks: readonly PageCheck[]): number =>
  checks.reduce(
    (total, check) =>
      check.standing.state === "adds-up" || check.standing.state === "does-not-add-up"
        ? total + (check.standing.report.revision ?? 0)
        : total,
    0
  )

/**
 * The verdict over everything, and the one sentence a reader takes away.
 *
 * `everyPage` is the listing's own honesty. A sweep reads one page of the
 * store's listing, and on a deployment with more pages than that there is a
 * remainder nothing looked at — so the word *everything* is withdrawn and the
 * headline says how far it got instead. A screen that claimed a clean bill of
 * health over pages it never listed would be wrong in exactly the way this
 * whole module is built to avoid.
 */
export const sweepReading = (
  checks: readonly PageCheck[],
  { everyPage }: { readonly everyPage: boolean }
): SweepReading => {
  const total = checks.length
  const addUp = countIn(checks, "adds-up")
  const problems = countIn(checks, "does-not-add-up")
  const skipped = countIn(checks, "nothing-to-check-against")
  const unanswered =
    countIn(checks, "could-not-be-finished") + countIn(checks, "could-not-be-read")
  const checked = addUp + problems
  const counts = { checked, addUp, problems, unanswered, skipped, total, changesReplayed: replayed(checks) }

  if (total === 0) {
    return {
      ...counts,
      tone: "inapplicable",
      label: "There are no pages to check.",
      meaning:
        "Loom isn’t looking after anything on this deployment yet, so there is nothing that could add up or fail to.",
      next: "This screen answers for itself as soon as Loom is looking after a page. There is nothing to set up.",
    }
  }

  if (problems > 0) {
    return {
      ...counts,
      tone: "rejected",
      label:
        problems === 1
          ? "One of your pages doesn’t match its own history."
          : `${problems} of your pages don’t match their own history.`,
      meaning:
        "What people are being served is not what the record of changes produces. Until you know which of the two is wrong, the history can’t explain what is on screen.",
      next: "Open the first page below. It names the parts the two disagree about.",
    }
  }

  if (checked === 0) {
    return {
      ...counts,
      tone: "uninterpreted",
      label: `Nothing could be checked, so nothing here says your ${pages(total)} ${total === 1 ? "is" : "are"} fine.`,
      meaning:
        unanswered === 0
          ? "None of your pages has a starting shape this deployment can reproduce, and a check that started from the page being served would agree with itself every time."
          : "Every page was either unreadable just now or has a history that couldn’t be replayed all the way through. No verdict was reached about any of them.",
      next: "Open a page below to see which of the two it was.",
    }
  }

  if (unanswered > 0) {
    return {
      ...counts,
      tone: "uninterpreted",
      label: `${unanswered} of your pages couldn’t be checked.`,
      meaning: `The other ${pages(checked)} add up. These ones reached no verdict at all, which is not the same as passing — a page nobody could check is a page nobody has checked.`,
      next: "Open the first page below. It says what stopped the check.",
    }
  }

  if (skipped > 0) {
    return {
      ...counts,
      tone: "applied",
      label: `All ${pages(checked)} that could be checked ${checked === 1 ? "adds" : "add"} up.`,
      meaning: `${skipped === 1 ? "One other page has" : `${skipped} other pages have`} nothing to check against: this deployment doesn’t know the shape ${skipped === 1 ? "it" : "they"} started as, so ${skipped === 1 ? "it was" : "they were"} left out rather than passed.`,
      next: "Nothing to do.",
    }
  }

  return {
    ...counts,
    tone: "applied",
    label: everyPage
      ? "Everything adds up."
      : `The first ${pages(checked)} all add up, and there are more than that.`,
    meaning: everyPage
      ? `Loom started from the shape it has on record for each of your ${pages(total)}, replayed every change it has recorded since, and got back exactly the page people are being served.`
      : `Loom replayed the recorded changes to each of these and got back exactly the page people are being served. The rest weren’t listed here, so nothing on this screen speaks for them.`,
    next: everyPage ? "Nothing to do." : "Check the rest one at a time, from the page list.",
  }
}
