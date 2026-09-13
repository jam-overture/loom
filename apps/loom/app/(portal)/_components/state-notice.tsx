import type { ReactNode } from "react"

/**
 * The four things a page has to say when it has no rows to show.
 *
 * Before this, all of them were the same `<p className="text-ink-muted text-sm">`.
 * That made a *failed read* and an *empty store* indistinguishable — "no trees
 * stored" and "the database refused the connection" arrived as the same grey
 * sentence in the same position, and the only way to tell which one you were
 * looking at was to read it carefully. A reader who mistakes the second for the
 * first concludes the portal is working and their data is gone.
 *
 * So the tone is a prop and it changes the shape, not only the wording:
 *
 * - `empty` — there is nothing here *yet*. Dashed, because a dashed edge reads
 *   as a space something goes in. The body's job is to say what would put
 *   something there, which is the part these states usually omit — and there is
 *   always something, which is why `action` is required for this tone.
 * - `settled` — Loom looked, and the answer is a good one. See below.
 * - `failure` — the read did not happen. Solid and marked in the refusal
 *   colour, so it cannot be skimmed as emptiness. What is on screen is not the
 *   absence of data; it is the absence of an answer.
 * - `notice` — a condition worth knowing that is not a failure, like an
 *   ephemeral store. Quiet on purpose: it must not compete with the page.
 *
 * ## Why `settled` had to exist
 *
 * Three notices in this portal said a *good result* inside the dashed box that
 * means "nothing here yet": **"You're all caught up."**, **"Nothing is waiting
 * for you."** and **"It was never wrong by more than a coin flip."** None of
 * those is an absence. Every one of them is Loom having done its job and having
 * something to report.
 *
 * The tell was in the copy, which had started arguing with its own container —
 * the calibration one reads *"That is the result, not an empty section"*, and
 * the review queue's disclosure is headed *"What an empty queue does and
 * doesn't mean"*. A component that makes a writer explain away its border is
 * the wrong component, and the reader who does not open the disclosure is left
 * with a blank slot where a clean bill of health should be.
 *
 * So `settled` is solid rather than dashed and carries the same green the
 * portal already uses for a change that went through. It is the one tone with
 * nothing to do: a person who is caught up is not being asked for anything,
 * and inventing a button for them would be inventing work.
 */
export type NoticeTone = "empty" | "settled" | "failure" | "notice"

const TONE_CLASSES: Readonly<Record<NoticeTone, string>> = {
  empty: "border-edge-subtle border-dashed bg-surface-base",
  settled: "border-edge-subtle bg-applied",
  failure: "border-refuse-edge bg-rejected",
  notice: "border-edge-subtle bg-surface-hover",
}

const TITLE_CLASSES: Readonly<Record<NoticeTone, string>> = {
  empty: "text-ink",
  settled: "text-applied-ink",
  failure: "text-rejected-ink",
  notice: "text-ink-secondary",
}

/**
 * `failure` is announced. The others are not: an empty list is already
 * described by the heading above it, and a live region that fires on every
 * navigation to a page that happens to be empty is noise. A read that failed is
 * the one a reader has to be told about, because it looks like success.
 *
 * `settled` is not announced either, and for the sharper version of the same
 * reason: it *is* success, and a screen reader that interrupted with it on
 * every navigation would be reading out good news nobody asked for.
 */
const TONE_ROLE: Readonly<Record<NoticeTone, "status" | undefined>> = {
  empty: undefined,
  settled: undefined,
  failure: "status",
  notice: undefined,
}

/**
 * An empty state is where a new person actually starts, and "what do I do now?"
 * is the question it exists to answer — so `action` is not optional on it.
 *
 * This is a discriminated union rather than a test for one reason: a test can
 * only see the screens somebody remembered to write one for, and the screen that
 * ships an actionless dead end is by definition the one nobody thought about.
 * `tone="empty"` without an `action` is a type error, on every screen, forever.
 *
 * `title` comes with it. A dashed box whose only words are a paragraph of
 * explanation has buried the state it is announcing.
 */
type NoticeProps = {
  /** Why the page is in this state, and — for `empty` — what would end it. */
  readonly children: ReactNode
} & (
  | {
      readonly tone: "empty"
      /** One line naming the state. */
      readonly title: string
      /** The one thing to do about it. Required: see above. */
      readonly action: ReactNode
    }
  | {
      readonly tone: Exclude<NoticeTone, "empty">
      /** One line naming the state. Omitted for `notice`, which has no headline. */
      readonly title?: string
      /** The one thing to do about it, if there is one. */
      readonly action?: ReactNode
    }
)

export const StateNotice = ({ tone, title, children, action }: NoticeProps) => (
  <div
    role={TONE_ROLE[tone]}
    data-tone={tone}
    className={"flex flex-col gap-2 rounded-md border p-4 " + TONE_CLASSES[tone]}
  >
    {title !== undefined && (
      <p className={"text-sm " + TITLE_CLASSES[tone]}>{title}</p>
    )}
    <div className="text-ink-muted flex flex-col gap-2 text-xs">{children}</div>
    {action !== undefined && <div className="flex flex-wrap gap-3 text-xs">{action}</div>}
  </div>
)
