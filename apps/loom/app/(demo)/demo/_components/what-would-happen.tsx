import type { PlainChange } from "@/app/(demo)/_lib/plain-change"

/**
 * What the change in front of you would do, directly above the buttons that
 * decide it.
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
 * answer, in the tone of a change that has not happened yet.
 *
 * The left rule is `answerNote`'s device in the other colour, and the two can
 * never be on one card: a held change has no answer, and an answered one is no
 * longer held. Amber is the colour of the ring around the band on the stage, so
 * the sentence and the mark it describes are the same colour in two places at
 * once — the teaching this rail does everywhere rather than a legend.
 */
export const WhatWouldHappen = ({ lines }: { readonly lines: readonly PlainChange[] }) => {
  if (lines.length === 0) return null

  return (
    <ul className="border-awaiting-ink flex flex-col gap-2 border-l-2 pl-2.5">
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
