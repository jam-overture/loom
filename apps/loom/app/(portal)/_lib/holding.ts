import {
  WINDOW_LENGTH,
  type KeptReaderWindow,
  type ReaderWindow,
} from "@/app/_lib/pages/reader-windows"

/**
 * Whether returning readers were kept on a page as it was after a change to
 * it went live, and until when (0383 clauses 4 and 6). Pure: the screens read
 * the records and this says what they come to.
 *
 * **A window holds the readers who came before the change.** A reader's pin
 * runs out the window after their first page view, never later (clause 3), so
 * the last reader who saw the page before the change went live is held at the
 * latest until the window after it went live.
 *
 * **What withdraws held pages ends the hold early** (clause 4): the site
 * publishing a newer version of any of the project's pages, which starts a
 * copy again, or a change taken back going live. Each raises the floor the
 * door hands the site, and every pin below it reads the newest pages.
 *
 * **Only the window kept now is known.** *Settings* keeps one choice, and a
 * second replaces the first. A window chosen at or before the change went
 * live is the one it went live under. One chosen since leaves the window it
 * went live under unknown, and that is said rather than guessed. A window
 * that cannot be read, or that nobody chose, is *Off*, as the read door reads
 * it, since the door then handed the site nothing to hold a reader with.
 */

/** A window that holds readers. */
export type HoldingWindow = Exclude<ReaderWindow, "off">

/** What withdraws held pages, as `held.until` says it ended early. */
export type Withdrawal = "newer-version" | "taken-back"

export type Holding =
  /** Nobody was held: the window was *Off* when it went live, or none was ever chosen. */
  | { readonly kind: "none" }
  /** The window was changed after it went live, so the one it went live under is not known. */
  | { readonly kind: "changed"; readonly since: number }
  | {
      readonly kind: "held"
      readonly window: HoldingWindow
      /** When the last returning reader was given the page as it was, at the latest. */
      readonly until: number
      /** What ended the hold before the window ran out, if anything did. */
      readonly endedBy?: Withdrawal
    }

/** When each kind of withdrawal happened across the project, in epoch milliseconds. */
export type Withdrawals = {
  /** Every copy Loom started of any of the project's pages. */
  readonly newerVersions: readonly number[]
  /** Every change taken back that went live, on any page. */
  readonly takenBack: readonly number[]
}

const firstAfter = (at: number, moments: readonly number[]): number =>
  Math.min(Number.POSITIVE_INFINITY, ...moments.filter((moment) => moment > at))

/** How a change that went live at `liveAt` held returning readers, from the window kept now. */
export const holdingOf = (
  liveAt: number,
  kept: KeptReaderWindow | null,
  withdrawals: Withdrawals
): Holding => {
  if (kept === null) return { kind: "none" }
  if (kept.setAt > liveAt) return { kind: "changed", since: kept.setAt }
  if (kept.window === "off") return { kind: "none" }

  const runsOut = liveAt + WINDOW_LENGTH[kept.window]
  const newer = firstAfter(liveAt, withdrawals.newerVersions)
  const takenBack = firstAfter(liveAt, withdrawals.takenBack)
  const withdrawn = Math.min(newer, takenBack)

  if (withdrawn >= runsOut) return { kind: "held", window: kept.window, until: runsOut }

  return {
    kind: "held",
    window: kept.window,
    until: withdrawn,
    endedBy: newer <= takenBack ? "newer-version" : "taken-back",
  }
}

/** The moment the after side may start from: when the hold ended, if there was one. */
export const heldUntilOf = (holding: Holding): number | undefined =>
  holding.kind === "held" ? holding.until : undefined
