"use client"

import Link from "next/link"
import { useState, type ReactNode } from "react"

import {
  CORRECTION_GAPS,
  SITTING,
  correctionQueue,
  correctionSitting,
  dueCorrections,
  keyOf,
  knownOnly,
  nextCorrection,
  wasConfident,
  whyNothingIsDue,
  type PendingCorrection,
  type Quiet,
} from "../_lib/corrections"
import { withCorrection, type Confidence, type Grade } from "../_lib/progress"
import { recordIsKnown } from "../_lib/reading"
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
 * What is deliberately different: **the sitting does not say where a question
 * came from until it has been answered.** Knowing that this one is from Set D,
 * or from lesson 04's Self-check, is knowing it is about identity, and a
 * question you have been pointed at is a question you have been given half of.
 * Where to check appears at the same moment it does everywhere else, which is
 * after the writing.
 *
 * A question arrives here from a review set or from a lesson's own Warm-up,
 * Predict or Self-check, and by the time it does there is nothing to tell them
 * apart: it is a question the reader answered, rated and got wrong, and it is
 * asked again. That is the point of mixing them. Which of the two it was is a
 * fact about where it was written down, and it belongs in the line that appears
 * afterwards rather than in the question.
 */

export type CorrectionQuestion = {
  readonly set: string
  readonly number: number
  /** "Set D", "Lesson 04 Self-check" — shown only once it has been answered. */
  readonly label: string
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

const labelOf = (correction: PendingCorrection, label: string | undefined): string =>
  `${label ?? correction.set} q${correction.question}`

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

/**
 * The empty queue, saying which empty queue it is.
 *
 * One paragraph per reading, and no paragraph shared between two of them. The
 * temptation when writing these was to fold `retired`, `by-design` and
 * `no-misses` together — all three are a reader who has nothing to do and did
 * nothing wrong — and the three sentences below are different because the next
 * move is different in each: come back in a month and see whether it held; go
 * on with the course; and, for the third, notice that a run of questions
 * answered and none missed is either a reader who knows the material or a
 * reader grading themselves kindly, and that this page cannot tell those apart
 * either.
 */
const Quietly = ({ quiet }: { readonly quiet: Quiet | undefined }) => {
  if (quiet === undefined) return undefined

  if (quiet.kind === "unreadable") {
    return (
      <p style={style.note}>
        <strong style={{ color: style.ink }}>
          This page cannot tell you whether anything has come back.
        </strong>{" "}
        Your record could not be read in this browser — the note above says which way — so the
        queue is empty because there is nothing to compute from, and not because you are up to
        date. Nothing is being written over while that is true.
      </p>
    )
  }

  if (quiet.kind === "upcoming") {
    return (
      <p style={style.note}>
        Nothing is due today.{" "}
        {`${
          quiet.waiting === 1 ? "The one you have in hand" : `The next of your ${quiet.waiting}`
        } comes back in ${days(quiet.next.inDays ?? 0)}, on ${quiet.next.dueOn}. Doing it early is doing it while you still remember it, which measures nothing.`}
      </p>
    )
  }

  if (quiet.kind === "lost") {
    return (
      <p style={style.note}>
        <strong style={{ color: style.ink }}>
          {quiet.lost} question{quiet.lost === 1 ? "" : "s"} you missed{" "}
          {quiet.lost === 1 ? "is" : "are"} still waiting, and the course no longer contains{" "}
          {quiet.lost === 1 ? "it" : "them"}.
        </strong>{" "}
        A question renumbered or rewritten since you were asked leaves a key pointing at nothing,
        and your browser has no way of hearing about that. It stays in your record and stops being
        counted. Nothing here can bring it back, and the honest thing is to say so rather than to
        tell you that you are clear.
      </p>
    )
  }

  if (quiet.kind === "retired") {
    return (
      <p style={style.note}>
        Nothing has come back, and that one is a result:{" "}
        <strong style={{ color: style.ink }}>
          {quiet.retired} question{quiet.retired === 1 ? "" : "s"}
        </strong>{" "}
        you missed {quiet.retired === 1 ? "has been" : "have each been"} got three times running,
        across a month. That is the only way out of this queue.
      </p>
    )
  }

  if (quiet.kind === "by-design") {
    return (
      <p style={style.note}>
        Nothing has come back. You have missed {quiet.predictions} prediction
        {quiet.predictions === 1 ? "" : "s"}, and a prediction you rated 1 to 3 does not come back
        — you said you did not know, and you did not know, which is the Predict section working
        rather than a gap in what you know. A prediction you were <em>sure</em> about and wrong
        about would be here, because that is a belief rather than a gap.
      </p>
    )
  }

  if (quiet.kind === "no-misses") {
    return (
      <p style={style.note}>
        Nothing has come back: {quiet.graded} questions answered here and none of them missed.
        Worth one moment of suspicion — this queue is built entirely out of a grade you gave
        yourself, and a long run of clean sheets is either the course landing or the grading being
        kind. This page cannot tell those two apart, and you can.
      </p>
    )
  }

  return (
    <p style={style.note}>
      Nothing has come back, because nothing has been answered here yet. This queue is built out of
      questions you got wrong — in a review set, or in a lesson&rsquo;s own Warm-up, Predict or
      Self-check — so it stays empty until one of those has been answered and graded. It is not a
      queue you fill in; it is one that fills itself, from the parts of the course that go badly.
    </p>
  )
}

export const Corrections = ({
  questions,
}: {
  readonly questions: readonly CorrectionQuestion[]
}) => {
  const { progress, ready, today, update, record } = useProgress()
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
   * A question the course no longer contains is dropped, and dropped here
   * rather than filtered out further down, so that every number on this page
   * counts the same things.
   *
   * The alternatives to dropping it are a blank panel with a confidence control
   * underneath, or a queue that says one thing is due and then offers nothing —
   * and that second one is not hypothetical. It is what the review index said
   * for a week, because it did this filtering nowhere and this page did it
   * here. The filter is shared now, and the questions it filters against are
   * every question in the course rather than only the review sets.
   */
  const queue = knownOnly(correctionQueue(progress, today), new Set(known.keys()))
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

  const recordAnswer = (
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
        label: labelOf(correction, known.get(key)?.label),
        confidence: attempt.confidence,
        grade: attempt.grade,
        done: attempt.grade === "got-it" ? correction.done + 1 : 0,
      },
    ])
  }

  /**
   * Why there is nothing to offer, computed whether or not there is — the
   * function returns `undefined` when something is due, which is the guard
   * against drawing one of these paragraphs over a queue that has work in it.
   *
   * It is given the same filtered key set as the sitting, so the two cannot
   * disagree about what the course contains, and the reading rather than the
   * progress, because an empty record nobody could read is the one case where
   * every sentence below would be a fabrication.
   */
  const quiet = whyNothingIsDue(progress, today, new Set(known.keys()), recordIsKnown(record.reading))

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
        <>
          {record.writable ? undefined : (
            <p style={style.note}>
              This browser is not keeping your record, so answering these will not move them along:
              a question retires on three clean retrievals across a month, and none of the three
              can be written down. The retrieval is still worth doing. The ladder will not move.
            </p>
          )}
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
            onRecord: (attempt) => recordAnswer(current, attempt),
          }}
          />
        </>
      ) : (
        <section style={{ ...style.panel, ...style.column(3) }} aria-label="Corrections">
          {answered.length > 0 ? (
            <p style={style.note}>
              That is today&rsquo;s corrections done.{" "}
              {due.length > 0
                ? `${due.length} more ${due.length === 1 ? "is" : "are"} due and being held back — five at a time is the point, and doing thirty this afternoon would be massed practice with extra steps. Tomorrow.`
                : "The ones you got are not finished. They come back in a week, and again a month after that."}
            </p>
          ) : (
            <Quietly quiet={quiet} />
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
 *
 * `keys` is every question the course still contains, and it is a parameter
 * because this is a client component and that list is read off the repository
 * on the server. It is not optional and it is not a nicety: without it this
 * panel counted questions the sitting could not render, and a promise of work
 * that is not there when you click through costs more than the panel is worth.
 */
export const CorrectionsPanel = ({ keys }: { readonly keys: readonly string[] }) => {
  const { progress, ready, today, record } = useProgress()

  if (!ready) return undefined

  const queue = knownOnly(correctionQueue(progress, today), new Set(keys))
  const due = dueCorrections(queue)

  /**
   * An empty queue is almost always nothing to say, and this panel goes on
   * saying nothing about it: a reader who has missed nothing does not need a
   * box telling them so every time they open the review queue, and the three
   * readings that mean *you have done the work* belong on the corrections page,
   * where somebody has gone looking.
   *
   * One of the seven is different in kind and is why this branch exists at all.
   * `lost` is not a state, it is a fault — misses are waiting and the questions
   * they name are gone — and the place a fault has to appear is the page the
   * reader is on, not the one they would have to already suspect something to
   * visit. It replaced a `return undefined` that hid exactly this.
   */
  if (queue.length === 0) {
    const quiet = whyNothingIsDue(progress, today, new Set(keys), recordIsKnown(record.reading))

    if (quiet?.kind !== "lost") return undefined

    return (
      <section style={{ ...style.panel, ...style.column(3) }}>
        <h2 style={style.label}>Coming back</h2>
        <p style={style.note}>
          {quiet.lost} question{quiet.lost === 1 ? "" : "s"} you missed{" "}
          {quiet.lost === 1 ? "is" : "are"} waiting and {quiet.lost === 1 ? "names" : "name"} a
          question this course no longer contains — renumbered or rewritten since you were asked.{" "}
          {quiet.lost === 1 ? "It cannot" : "They cannot"} be brought back, and your record keeps{" "}
          {quiet.lost === 1 ? "it" : "them"}.
        </p>
        <Link href="/lessons/review/corrections" style={{ color: style.highlight }}>
          What happened to them
        </Link>
      </section>
    )
  }

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
