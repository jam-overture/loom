import type { PlainChange } from "@/app/(demo)/_lib/plain-change"

/**
 * What the change is about to do to the page, or what it did — in the words on
 * the page, either way.
 *
 * The card already said everything except this. It quotes the ask, names the
 * state, gives the Gate's rule in the rule's own words, and offers two buttons —
 * and the only answer to *what would actually happen to the page* was the review
 * tool's: **`delete` `loom.stat-grid` · `loom.page` · *and 3 nodes under it***,
 * above the disclosure, unasked, in a route group whose entire design is that
 * the technical record sits one click down.
 *
 * On a wide screen a stranger has a second answer and it is a good one: the band
 * is ringed in amber on the page beside them with *This would be removed* on it.
 * **On a phone they do not.** The two panes stack, `SpotlightScroll` deliberately
 * declines to carry a held change's scroller to the mark — it would carry the
 * visitor away from these very buttons — and `AnswerInView` brings the card up
 * instead. Both are right, and together they produce the demo's worst frame: a
 * stranger at 390px is asked to allow `delete loom.stat-grid` with the page
 * nowhere on the screen.
 *
 * So this says it in the words on the page. `plain-change.ts` owns which words
 * and why; what this file owes them is a position — under the rule, above the
 * answer or the undo — and a color.
 *
 * **Two tones, because this line now outlives the question that raised it.** It
 * was `WhatWouldHappen`, and it rendered only while a change was waiting: the
 * page recomputes that reading per render against the tree on the stage, and
 * the moment the visitor pressed **Apply this change** the reading became
 * impossible to compute and the sentence went away. A card that had just told a
 * stranger *this comes off the page, and everything under it goes too* stopped
 * saying what the change was at the exact press that made it true. So the
 * record now carries its own copy in the past tense (`record.did`) and this
 * renders both.
 *
 * The left rule is `answerNote`'s device, in the color of the state it belongs
 * to. Amber is the ring around the band on the stage while the question is
 * open; green is the ring once it has landed — so the sentence and the mark it
 * describes are the same color in two places at once, which is the teaching
 * this rail does everywhere rather than a legend.
 */
export const PlainReading = ({
  lines,
  tone = "awaiting",
}: {
  readonly lines: readonly PlainChange[]
  /**
   * Which state this reading belongs to. Defaulted to the one it was written
   * for, so the held card — the only caller for six runs — reads unchanged.
   */
  readonly tone?: "awaiting" | "applied"
}) => {
  if (lines.length === 0) return null

  return (
    <ul
      className={`flex flex-col gap-2 border-l-2 pl-2.5 ${
        tone === "applied" ? "border-applied-ink" : "border-awaiting-ink"
      }`}
    >
      {lines.map((line, position) => (
        <li key={`${line.sentence}-${position}`} className="flex flex-col gap-1">
          <p className="text-ink-secondary text-xs">{line.sentence}</p>

          {line.words.length > 0 && (
            /*
              * The words themselves, quoted, so it is plain they are the page's
              * and not this surface's. Wrapping rather than truncating: a
              * stranger recognising one of the three is the whole purpose, and
              * `plain-change` has already cut each one to a length that fits.
              */
            <p className="text-ink-muted flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-2xs">
              {line.words.map((word) => (
                <span key={word}>“{word}”</span>
              ))}
              {line.more > 0 && (
                <span className="text-ink-placeholder">and {line.more} more</span>
              )}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}
