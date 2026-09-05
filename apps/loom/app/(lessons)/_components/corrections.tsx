"use client"

import Link from "next/link"
import { useState, type ReactNode } from "react"

import {
  CORRECTION_GAPS,
  SITTING,
  correctionQueue,
  correctionSitting,
  dueCorrections,
  nextCorrection,
  wasConfident,
  type PendingCorrection,
} from "../_lib/corrections"
import { withCorrection, type Confidence, type Grade } from "../_lib/progress"
import type { CheckPointer } from "../_lib/links"
import { Answer } from "./answer"
import * as style from "./style"
import { useProgress } from "./store"

/**
 * The questions that come back.
 *
 * A set is a sitting the reader can finish. A correction is the opposite: the
 * question that beat you, asked again after a gap, and again a week after that,
 * and once more a month later — and it does not go away until you have got it
 * three times running. That is the shape *Make It Stick* keeps returning to,
 * and it is the one thing this course told the reader to do and then gave them
 * no way of doing.
 *
 * What is deliberately the same as a set: the question is closed book, the
 * confidence is rated before anything is revealed, the answer is written before
 * the pointer appears, and the answer itself is never printed. A correction is
 * not a second chance on easier terms — it is the same terms, later.
 *
 * What is deliberately different: **the sitting does not say which set a
 * question came from until it has been answered.** Knowing that this one is
 * from Set D is knowing it is about identity, and a question you have been
 * pointed at is a question you have been given half of. Where to check appears
 * at the same moment it does everywhere else, which is after the writing.
 */

export type CorrectionQuestion = {
  readonly set: string
  readonly letter: string
  readonly number: number
  readonly body: ReactNode
  readonly checkIn: readonly CheckPointer[]
}

type AnsweredNote = {
  readonly key: string
  readonly label: string
  readonly confidence: Confidence
  readonly grade: Grade
  readonly done: number
}

const keyOf = (set: string, question: number): string => `${set}#${question}`

const labelOf = (correction: PendingCorrection, letter: string | undefined): string =>
  `Set ${letter ?? correction.set} q${correction.question}`

const days = (count: number): string => `${count} ${count === 1 ? "day" : "days"}`

const GRADE_TEXT: Readonly<Record<Grade, string>> = {
  "got-it": "got it",
  partly: "partly",
  missed: "missed it",
}

/**
 * What getting it right just bought, said in days rather than in encouragement.
 * The number is the point: a question answered once is not finished, and the
 * reader should see how far off finished is.
 */
const nextGapText = (done: number): string => {
  const gap = CORRECTION_GAPS[done]

  if (gap === undefined) return "retired — three clean retrievals across a month"

  return `back in ${days(gap)}${done === 0 ? "" : `, ${done} of ${CORRECTION_GAPS.length} clean`}`
}

export const Corrections = ({
  questions,
}: {
  readonly questions: readonly CorrectionQuestion[]
}) => {
  const { progress, ready, today, update } = useProgress()
  const [answered, setAnswered] = useState<readonly AnsweredNote[]>([])

  if (!ready) {
    return (
      <p style={style.note} aria-live="polite">
        Working out what has come back&hellip;
      </p>
    )
  }

  const known = new Map(questions.map((question) => [keyOf(question.set, question.number), question]))
  const seen = new Set(answered.map((note) => note.key))

  /**
   * A question the schedule no longer contains is dropped, and dropped here
   * rather than filtered out further down, so that every number on this page
   * counts the same things.
   *
   * Sets get edited — a question can be reworded, renumbered or removed between
   * the sitting that recorded the miss and the day it comes back — and a record
   * kept in the reader's browser has no way of hearing about it. What is left is
   * a key pointing at nothing, and the alternatives to dropping it are a blank
   * panel with a confidence control underneath, or a queue that says one thing
   * is due and then offers nothing.
   */
  const queue = correctionQueue(progress, today).filter((correction) =>
    known.has(keyOf(correction.set, correction.question))
  )
  const due = dueCorrections(queue)

  const sitting = correctionSitting(queue, SITTING - answered.length).filter(
    (correction) => !seen.has(keyOf(correction.set, correction.question))
  )

  /**
   * How many this sitting is, fixed at the start rather than counted as it
   * goes. Everything already answered has left `due` — its next gap has begun —
   * so the two halves have to be added back together to say "3 of 5" and keep
   * meaning the same five.
   */
  const total = Math.min(due.length + answered.length, SITTING)
  const current = sitting[0]
  const question = current === undefined ? undefined : known.get(keyOf(current.set, current.question))

  const record = (
    correction: PendingCorrection,
    attempt: { readonly confidence: Confidence; readonly answer: string; readonly grade: Grade }
  ): void => {
    const key = keyOf(correction.set, correction.question)

    update((state) =>
      withCorrection(state, {
        set: correction.set,
        question: correction.question,
        confidence: attempt.confidence,
        answer: attempt.answer,
        grade: attempt.grade,
        on: today,
      })
    )

    setAnswered((notes) => [
      ...notes,
      {
        key,
        label: labelOf(correction, known.get(key)?.letter),
        confidence: attempt.confidence,
        grade: attempt.grade,
        done: attempt.grade === "got-it" ? correction.done + 1 : 0,
      },
    ])
  }

  const upcoming = nextCorrection(queue)

  return (
    <div style={style.column(5)}>
      {answered.length > 0 ? (
        <ol style={{ ...style.column(2), listStyle: "none", padding: 0, margin: 0 }}>
          {answered.map((note) => (
            <li key={note.key} style={style.note}>
              <strong style={{ color: style.ink }}>{note.label}</strong> — rated {note.confidence} ·{" "}
              {GRADE_TEXT[note.grade]} · {nextGapText(note.done)}
            </li>
          ))}
        </ol>
      ) : undefined}

      {current !== undefined && question !== undefined ? (
        <Answer
          key={keyOf(current.set, current.question)}
          question={answered.length + 1}
          total={total}
          body={question.body}
          resolve={{
            kind: "check",
            checkIn: question.checkIn,
            /**
             * The number the control hands back is its position in this
             * sitting, not the question's number in its set. The real one comes
             * from the queue entry, which is the thing that knows which
             * question this is.
             */
            onRecord: (attempt) => record(current, attempt),
          }}
        />
      ) : (
        <section style={{ ...style.panel, ...style.column(3) }} aria-label="Corrections">
          {queue.length === 0 ? (
            <p style={style.note}>
              Nothing has come back. Either you have not missed anything yet, or everything you
              missed has been got three times running — which is the only other way out of this
              queue.
            </p>
          ) : answered.length > 0 ? (
            <p style={style.note}>
              That is today&rsquo;s corrections done.{" "}
              {due.length > 0
                ? `${due.length} more ${due.length === 1 ? "is" : "are"} due and being held back — five at a time is the point, and doing thirty this afternoon would be massed practice with extra steps. Tomorrow.`
                : "The ones you got are not finished. They come back in a week, and again a month after that."}
            </p>
          ) : (
            <p style={style.note}>
              Nothing is due today.{" "}
              {upcoming === undefined
                ? "Everything you have missed has been answered again since."
                : `The next one comes back in ${days(upcoming.inDays ?? 0)}, on ${upcoming.dueOn}. Doing it early is doing it while you still remember it, which measures nothing.`}
            </p>
          )}

          <Link href="/lessons/review" style={{ color: style.highlight }}>
            Back to the review queue
          </Link>
        </section>
      )}
    </div>
  )
}

/**
 * The corrections line on the review queue: what is waiting, and the one number
 * worth putting in front of the reader — how many of them they were sure about.
 */
export const CorrectionsPanel = () => {
  const { progress, ready, today } = useProgress()

  if (!ready) return undefined

  const queue = correctionQueue(progress, today)
  const due = dueCorrections(queue)

  if (queue.length === 0) return undefined

  const sure = due.filter(wasConfident).length
  const upcoming = nextCorrection(queue)

  return (
    <section style={{ ...style.panel, ...style.column(3) }}>
      <h2 style={style.label}>Coming back</h2>

      {due.length === 0 ? (
        <p style={style.note}>
          {queue.length} question{queue.length === 1 ? "" : "s"} you missed{" "}
          {queue.length === 1 ? "is" : "are"} still in hand, and none of them is due today
          {upcoming === undefined ? "." : `. The next is in ${days(upcoming.inDays ?? 0)}.`} A
          question leaves this queue by being got three times across a month, and no other way.
        </p>
      ) : (
        <p style={style.note}>
          <strong style={{ color: style.ink }}>
            {due.length} question{due.length === 1 ? "" : "s"} to re-answer
          </strong>{" "}
          — {sure === 0 ? "none" : sure} of them {sure === 1 ? "was" : "were"} rated 4 or 5 when you
          missed {sure === 1 ? "it" : "them"}. Five at a time, closed book, and the answer is not
          printed there either.
        </p>
      )}

      <Link href="/lessons/review/corrections" style={{ color: style.highlight }}>
        {due.length === 0 ? "See what is waiting" : "Re-answer them"}
      </Link>
    </section>
  )
}
