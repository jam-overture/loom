"use client"

import type { ReactNode } from "react"

import { sittingMisses } from "../_lib/calibration"
import { setProgress, withAttempt, withSetCompleted, type Attempt } from "../_lib/progress"
import { Answer, type CheckPointer } from "./answer"
import * as style from "./style"
import { today, useProgress } from "./store"

/**
 * A set, worked one question at a time.
 *
 * The markdown shows all eight questions at once, and the cost of that is
 * invisible: question 5 names the thing question 2 was asking about, so by the
 * time you reach it you have been reminded rather than tested. Interleaving
 * survives on the page only because the questions cannot see each other here.
 *
 * There is no way to skip forward. The only thing that advances this is a
 * recorded attempt — with a rating taken before the reveal and a grade given
 * after — which is also exactly what the schedule's tracking table asks the
 * reader to keep by hand and nobody does.
 */

export type RunnableQuestion = {
  readonly number: number
  readonly body: ReactNode
  readonly checkIn: readonly CheckPointer[]
}

type SetRunnerProps = {
  readonly slug: string
  readonly letter: string
  readonly questions: readonly RunnableQuestion[]
  readonly closing: ReactNode
}

const GRADE_TEXT: Readonly<Record<Attempt["grade"], string>> = {
  "got-it": "got it",
  partly: "partly",
  missed: "missed it",
}

export const SetRunner = ({ slug, letter, questions, closing }: SetRunnerProps) => {
  const { progress, ready, update } = useProgress()

  if (!ready) {
    return (
      <p style={style.note} aria-live="polite">
        Reading what you have done so far&hellip;
      </p>
    )
  }

  const record = setProgress(progress, slug)
  const answered = new Map(record.attempts.map((attempt) => [attempt.question, attempt]))
  const current = questions.find((question) => !answered.has(question.number))
  const misses = sittingMisses(slug, record.attempts)

  return (
    <div style={style.column(5)}>
      {record.attempts.length > 0 ? (
        <ol style={{ ...style.column(2), listStyle: "none", padding: 0, margin: 0 }}>
          {record.attempts.map((attempt) => (
            <li key={attempt.question} style={style.note}>
              <strong style={{ color: style.ink }}>{attempt.question}.</strong> rated{" "}
              {attempt.confidence} · {GRADE_TEXT[attempt.grade]}
              {attempt.confidence >= 4 && attempt.grade !== "got-it" ? " · confident and wrong" : ""}
            </li>
          ))}
        </ol>
      ) : undefined}

      {current !== undefined ? (
        <Answer
          key={current.number}
          question={current.number}
          total={questions.length}
          body={current.body}
          checkIn={current.checkIn}
          onRecord={(attempt) => update((state) => withAttempt(state, slug, { ...attempt, on: today() }))}
        />
      ) : (
        <section style={{ ...style.panel, ...style.column(4) }} aria-label={`Set ${letter} finished`}>
          <p style={style.label}>Set {letter} — all {questions.length} answered</p>

          {misses.length === 0 ? (
            <p style={style.note}>
              Nothing you were confident and wrong about this time. That is the pair worth watching:
              being unsure and wrong fixes itself on contact, and being sure and wrong does not.
            </p>
          ) : (
            <div style={style.column(2)}>
              <p style={style.note}>
                <strong style={{ color: style.ink }}>Confident and wrong:</strong> question
                {misses.length === 1 ? " " : "s "}
                {misses.map((miss) => miss.question).join(", ")}. This is the list the schedule calls
                your real study plan. Re-answer these from memory in a day — do not reread the lesson.
              </p>
            </div>
          )}

          {closing}

          {record.completedOn === undefined ? (
            <button
              type="button"
              style={style.button(true)}
              onClick={() => update((state) => withSetCompleted(state, slug, today()))}
            >
              Mark this set done
            </button>
          ) : (
            <p style={style.note}>Done on {record.completedOn}.</p>
          )}
        </section>
      )}
    </div>
  )
}
