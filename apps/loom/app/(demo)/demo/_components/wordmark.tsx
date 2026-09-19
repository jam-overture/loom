"use client"

import Link from "next/link"

import { HOME } from "@/app/(marketing)/_lib/site"

import { useFramed } from "./use-framed"

/**
 * The bar's Loom mark: a way home at the top level, and a label in a box.
 *
 * The mark answers *whose page this is*, which it has to do either way — the
 * page on the stage belongs to a clinic that does not exist, and the one thing
 * a stranger must not conclude is that Loom is a physiotherapist. So the words
 * and the square never move. What moves is whether they are a door.
 *
 * At the top level they are, and `Loom marketing` filed for exactly that on
 * 22 August: this route group held one anchor and it was the skip link, while
 * the front door had begun offering `/demo` from six places, every one of them
 * a one-way trip.
 *
 * Inside a frame the same anchor is the absurd one. Its destination is the page
 * the visitor is already looking at, so the only thing it can do is render the
 * front door inside the front door's own embed — measured in Chromium and filed
 * by the same lane on 18 September. `framed.ts` has the table of what the other
 * three targets do, and the short version is that there is nowhere for this
 * link to go.
 *
 * **Withdrawn silently, which is this surface's idiom rather than a new one.**
 * `availablePresets` withdraws an ask with nothing to do without a word, and
 * `stillToAsk` withdrew the second copy of an open question the same way on
 * 17 September. A disabled-looking link, or a line explaining that the box has
 * no exit, would be the demonstration talking about its own plumbing on the
 * one bar that exists to say three short things.
 */
export const Wordmark = () => {
  const framed = useFramed()

  /*
   * One definition, rendered by both branches, because the two must be
   * pixel-identical: the whole claim of the withdrawal is that nothing about
   * the bar changes except whether it can be clicked.
   */
  const mark = (
    <>
      <span aria-hidden="true" className="bg-accent h-3.5 w-3.5 rounded-sm" />
      <span className="text-md tracking-tight">Loom</span>
    </>
  )

  if (framed) {
    /*
     * A `p` rather than a `span`, so a screen reader meets the name of the
     * thing it is looking at as a line of the bar rather than as an unlabelled
     * run of text beside one. It is not a heading: the rail below carries the
     * `h1`, and a demonstration in a box must not claim the document's outline
     * away from the page that framed it.
     */
    return <p className="flex items-center gap-2">{mark}</p>
  }

  return (
    <Link
      href={HOME.path}
      className="hover:text-ink-secondary flex items-center gap-2 transition-colors"
      aria-label="Loom — back to the front page"
    >
      {mark}
    </Link>
  )
}
