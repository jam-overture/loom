"use client"

import { secondLookOf } from "../_lib/calibration"
import { questionLabel } from "../_lib/slugs"
import * as style from "./style"
import { useProgress } from "./store"

/**
 * How the questions that came back went.
 *
 * `Your calibration` answers *is a 4 of yours actually a 4* over every question
 * the reader has been asked once. This answers the same question over the
 * questions they were asked again, and it is a separate panel for the same
 * reason `secondLookOf` is a separate fold: a correction is rated after the
 * reader has looked the specific point up, so it is an easier population, and
 * one figure spanning both would improve as the reader did more of the hardest
 * thing this course asks of them.
 *
 * **It is drawn below the first panel and never instead of it**, and the order
 * is the argument. A reader who has worked thirty corrections has a better-
 * looking second table than first, which is what you would expect and is not
 * progress; what the two of them together say is how much of the knowing came
 * from the lookup. Putting the flattering table first, or alone, would be the
 * surface telling the reader what they want to hear with the evidence for the
 * other reading already in hand.
 *
 * Absent when there are no re-answers, on the first panel's rule: a reader who
 * has missed nothing does not need a box saying so, and the corrections page is
 * where somebody has gone looking.
 */

/**
 * How many relapses are named before the list says *and N more*.
 *
 * The calibration panel above shows six and stops, with nothing saying there
 * were more, which is a small version of exactly what this surface spends its
 * time refusing to do. Six is kept — a list is not the point, the count above it
 * is — and the remainder is said out loud.
 */
const LISTED = 6

export const SecondLookPanel = () => {
  const { progress, ready } = useProgress()

  if (!ready) return undefined

  const second = secondLookOf(progress)

  if (second.reanswers === 0) return undefined

  return (
    <section style={{ ...style.panel, ...style.column(3) }} aria-label="On a second look">
      <h2 style={style.label}>On a second look</h2>

      <p style={style.note}>
        {second.right} of {second.reanswers} re-answer{second.reanswers === 1 ? "" : "s"} got. These
        are the questions you missed, asked again — and they are kept apart from the numbers above
        rather than added to them, because the schedule has you look the specific point up before
        you come back. That makes this the easier population by construction, so a single figure
        across both would get better the more corrections you did.
      </p>

      <p style={style.note}>
        Which means this table is not measuring whether you knew it. You had just read it. It is
        measuring <strong style={{ color: style.ink }}>whether the reading took</strong> — and
        whether you could tell.
      </p>

      <ul style={{ listStyle: "none", margin: 0, padding: 0, ...style.column(1) }}>
        {second.bands
          .filter((band) => band.attempts > 0)
          .map((band) => (
            <li key={band.confidence} style={style.note}>
              Rated {band.confidence} on the way back: {band.right} of {band.attempts} got
            </li>
          ))}
      </ul>

      <p style={style.note}>
        <strong style={{ color: style.ink }}>
          Sure again and wrong: {second.sureAndWrong.length}
        </strong>{" "}
        {second.sureAndWrong.length === 0
          ? "— none. That is the one to watch here: rating a re-answer 4 or 5 and missing it anyway means the lookup left you more certain and no more correct."
          : `— ${second.sureAndWrong
              .slice(0, LISTED)
              .map((relapse) => questionLabel(relapse.set, relapse.question))
              .join(", ")}${
              second.sureAndWrong.length > LISTED
                ? `, and ${second.sureAndWrong.length - LISTED} more.`
                : "."
            }`}
      </p>

      {second.twice === 0 ? undefined : (
        <p style={style.note}>
          <strong style={{ color: style.ink }}>
            {second.twice} of {second.twice === 1 ? "those was" : "those were"} rated 4 or 5 the
            first time too.
          </strong>{" "}
          That is not a gap in what you know — a gap gets fixed on contact, and this one has already
          had contact. It is a belief about how the system works that you looked the answer up for,
          came back to a day later still sure of, and were wrong about again. The queue has already
          sent {second.twice === 1 ? "it" : "them"} back to the start and has done since the day it
          shipped; this paragraph is the part that was missing.
        </p>
      )}
    </section>
  )
}
