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
  whyNothingComesBack,
  type PendingCorrection,
} from "../_lib/corrections"
import { CONFIDENT } from "../_lib/calibration"
import { withCorrection, type Confidence, type Grade, type Progress } from "../_lib/progress"
import { recordIsKnown, recordWillKeep, type RecordReading } from "../_lib/reading"
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
 * Why the queue is quiet, said rather than implied.
 *
 * This panel had one sentence for every way of having nothing to re-answer:
 * *Nothing has come back. Either you have not missed anything yet, or
 * everything you missed has been got three times running.* It is a true
 * sentence and it is five situations wide, and its own **or** admits as much —
 * the record knows which, and nothing asked it.
 *
 * Four of the five are about the course and are `whyNothingComesBack`'s. The
 * fifth is not about the course at all, and it is the one that was doing real
 * damage: a reader whose record is on another machine, and a reader with
 * something unreadable under the key, both arrive here with an empty `Progress`
 * and were both told they had missed nothing. That is the page reporting a fact about the reader it is in no
 * position to know, which is lesson 24's subject and the same failure the
 * review queue had one floor up until 17 September. So the storage reading is
 * asked **first**, and it is asked as *could I look* rather than as *what did I
 * find* — because an answer given by a page that could not look is not a wrong
 * answer, it is not an answer.
 *
 * It gets two wordings rather than one, because there are two things to do
 * about it: a browser that would not say what it holds is a reason to bring a
 * record in from elsewhere, and a value stranded under the key is a decision
 * the reader has not made yet. Nothing else here decides anything the record
 * does not already say.
 */
const Quiet = ({
  progress,
  keys,
  today,
  reading,
}: {
  readonly progress: Progress
  readonly keys: ReadonlySet<string>
  readonly today: string
  readonly reading: RecordReading
}) => {
  if (!recordIsKnown(reading)) {
    const stranded = reading.kind === "unreadable" && reading.held !== undefined

    return (
      <p style={style.note}>
        <strong style={{ color: style.ink }}>Nothing has come back, and that is not a finding.</strong>{" "}
        {stranded
          ? "Something is stored under this course’s key in this browser, it could not be read, and nothing is being written over it until you say so."
          : "This browser would not say what it holds."}{" "}
        So this queue is computing from an empty record rather than from yours. It is not telling
        you that you have missed nothing; it is telling you that it could not look.{" "}
        <Link href="/lessons/record" style={{ color: style.highlight }}>
          Your record
        </Link>{" "}
        can bring one in if you have been working through the course somewhere else, and the note
        at the top of the page has the rest.
      </p>
    )
  }

  const quiet = whyNothingComesBack(progress, keys, today)

  if (quiet.kind === "retired") {
    return (
      <p style={style.note}>
        Nothing has come back.{" "}
        <strong style={{ color: style.ink }}>
          {quiet.count} question{quiet.count === 1 ? "" : "s"} you missed{" "}
          {quiet.count === 1 ? "has" : "have"} been got three times running
        </strong>{" "}
        and left this queue, which is the only way out of it. Missing one again puts it back at the
        beginning, and that is what makes the three mean something.
      </p>
    )
  }

  if (quiet.kind === "held-back") {
    return (
      <p style={style.note}>
        Nothing has come back, and {quiet.count} miss{quiet.count === 1 ? "" : "es"} in your record{" "}
        {quiet.count === 1 ? "is" : "are"} being held back on purpose:{" "}
        {quiet.count === 1 ? "a prediction" : "predictions"} you rated {CONFIDENT - 1} or lower and
        got wrong. That is the exercise working rather than a gap — you said you did not know,
        and you did not know. A prediction you were <em>sure</em> about and wrong about does come
        back, because that is a belief rather than a gap.
      </p>
    )
  }

  if (quiet.kind === "unmissed") {
    return (
      <p style={style.note}>
        Nothing has come back. You have answered {quiet.answered} question
        {quiet.answered === 1 ? "" : "s"} here and got every one of them, which is the one reason
        for this queue to be empty that is a result rather than an absence.
      </p>
    )
  }

  return (
    <p style={style.note}>
      <strong style={{ color: style.ink }}>
        Nothing has come back, because nothing has been answered here.
      </strong>{" "}
      This queue is downstream of the review sets and of the lessons’ own Warm-up, Predict and
      Self-check questions: it starts existing the first time one of those goes wrong, and not
      before. So it is not saying you are on top of the course — it is saying it has not been given
      anything to be wrong about yet.
    </p>
  )
}

export const Corrections = ({
  questions,
}: {
  readonly questions: readonly CorrectionQuestion[]
}) => {
  const { progress, ready, today, update, record: held } = useProgress()
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
  const keys = new Set(known.keys())
  const queue = knownOnly(correctionQueue(progress, today), keys)
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
        label: labelOf(correction, known.get(key)?.label),
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

      {current !== undefined && question !== undefined && !recordWillKeep(held) ? (
        /*
         * The one page on this surface where a lost write costs the whole
         * exercise, said here rather than left to the banner above.
         *
         * A set that is not stored still happened: the reader retrieved seven
         * things closed-book, and retrieval is the thing that works whether or
         * not anybody writes it down. A correction is different in kind,
         * because what it buys is a *gap* — the question leaves for a day, then
         * a week, then a month — and a gap that is not recorded does not start.
         * Answer five here in a browser that will not keep them and the same
         * five are due tomorrow at the same count, which is the one arrangement
         * where this course asks for ten minutes and returns nothing at all.
         *
         * The notice at the top of the page says a sitting still counts, and on
         * every other page it does. This is the exception, and the exception
         * belongs where the reader is about to spend the time.
         *
         * `recordWillKeep` is two conditions and only one of them can fire
         * here: a question is being offered, so the queue is not empty, so the
         * record was read, so nothing is stranded under the key and
         * `wouldOverwrite` is false. Said out loud rather than simplified to
         * `!held.writable`, because lesson 27 filed a finding against exactly
         * this shape left unremarked — the redundant half is the shared
         * predicate, which is the half worth keeping, and what it costs is one
         * sentence admitting it is redundant *here*.
         */
        <p style={style.note}>
          <strong style={{ color: style.ink }}>Nothing you answer here is being stored.</strong> A
          correction is worth doing because of the gap that follows it, and a gap nobody wrote down
          does not start — so these come back tomorrow at the count they are at now. The note above
          says why, and{" "}
          <Link href="/lessons/record" style={{ color: style.highlight }}>
            your record
          </Link>{" "}
          can still hand this sitting over as a file.
        </p>
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
            <Quiet progress={progress} keys={keys} today={today} reading={held.reading} />
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
 *
 * `keys` is every question the course still contains, and it is a parameter
 * because this is a client component and that list is read off the repository
 * on the server. It is not optional and it is not a nicety: without it this
 * panel counted questions the sitting could not render, and a promise of work
 * that is not there when you click through costs more than the panel is worth.
 */
export const CorrectionsPanel = ({ keys }: { readonly keys: readonly string[] }) => {
  const { progress, ready, today } = useProgress()

  if (!ready) return undefined

  const queue = knownOnly(correctionQueue(progress, today), new Set(keys))
  const due = dueCorrections(queue)

  /*
   * Silence here, deliberately, and not the sitting's four sentences.
   *
   * An empty queue is ambiguous in exactly the same four ways on this page as
   * on the sitting, and the reason this panel does not say so is that two other
   * things on this very page already have. The notice speaks at the top when
   * the record could not be read, and the queue above says *nothing is due,
   * because nothing is scheduled* — with its own clause for a browser that
   * could not be looked at — whenever no lesson has been marked, which is every
   * record this panel would be tempted to explain. A third voice saying it
   * would be a banner the reader learns to scroll past, which is worth less
   * than no banner.
   *
   * So the rule is one place per page, and the sitting is the place: it is the
   * page the reader arrives at expecting work, and the only one where the
   * sentence is the whole answer rather than a footnote to a queue.
   */
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
