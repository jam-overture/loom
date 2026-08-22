"use client"

import type { ReactNode } from "react"

import {
  lessonWorkedThrough,
  predictionsFor,
  setProgress,
  withAttempt,
  withLessonWorkedThrough,
  withPrediction,
  type Confidence,
  type Grade,
  type Prediction,
} from "../_lib/progress"
import { Answer, type CheckPointer } from "./answer"
import * as style from "./style"
import { today, useProgress } from "./store"

/**
 * A lesson, in the order it has to happen in.
 *
 * The markdown is one document read top to bottom, and read that way it hands
 * the reader three things early that it should not:
 *
 * 1. **The explanation, under the Predict questions.** Predict exists to make
 *    the reader fail at something before it is explained, and a page where the
 *    explanation is the next paragraph turns that into a suggestion. Here the
 *    lesson does not exist until every prediction is written down.
 * 2. **The answers, at the bottom.** Eleven lessons print an `## Answers`
 *    section, and the honour system between a question and its answer is one
 *    scroll long. The two halves are moved up beside the questions they answer
 *    and locked — the exercise answers to Try it, the rest to Self-check —
 *    which is closer, and further away.
 * 3. **The confidence rating, retrospectively.** It is taken before anything is
 *    revealed or it is not taken at all.
 *
 * Nothing here makes the lesson easier. Every gate below is a thing the paper
 * version asks the reader to do and cannot check, and the only work removed is
 * the bookkeeping.
 */

export type PromptQuestion = {
  readonly number: number
  readonly body: ReactNode
  /** Where to check, for a question that has somewhere to check. */
  readonly checkIn: readonly CheckPointer[]
}

/** What has to have happened before a printed answer is on the screen. */
export type AnswerGate =
  | { readonly kind: "attempted"; readonly slug: string; readonly count: number; readonly of: string }
  | { readonly kind: "written"; readonly slug: string; readonly prompt: ReactNode }

export type LessonPart =
  | { readonly kind: "prose"; readonly id: string; readonly node: ReactNode }
  | {
      readonly kind: "recall"
      readonly id: string
      /** The section's own heading, rendered through Loom like the rest of the words. */
      readonly heading: ReactNode
      readonly slug: string
      readonly intro: ReactNode
      readonly outro: ReactNode
      readonly questions: readonly PromptQuestion[]
    }
  | {
      readonly kind: "predict"
      readonly id: string
      readonly heading: ReactNode
      readonly slug: string
      readonly intro: ReactNode
      readonly outro: ReactNode
      readonly questions: readonly PromptQuestion[]
    }
  | {
      readonly kind: "answers"
      readonly id: string
      readonly heading: ReactNode
      readonly node: ReactNode
      readonly gate: AnswerGate
    }
  | {
      readonly kind: "reflect"
      readonly id: string
      readonly heading: ReactNode
      readonly node: ReactNode
      readonly slug: string
      readonly questions: readonly PromptQuestion[]
    }

type LessonReaderProps = {
  readonly lesson: number
  readonly parts: readonly LessonPart[]
}

const GRADES: readonly (readonly [Grade, string])[] = [
  ["got-it", "I had this"],
  ["partly", "Partly"],
  ["missed", "I was wrong"],
]

export const LessonReader = ({ lesson, parts }: LessonReaderProps) => {
  const { progress, ready, update } = useProgress()

  if (!ready) {
    return (
      <p style={style.note} aria-live="polite">
        Reading what you have done so far&hellip;
      </p>
    )
  }

  const attempts = (slug: string) => setProgress(progress, slug).attempts
  const written = (slug: string): readonly Prediction[] => predictionsFor(progress, slug)

  const record = (slug: string, attempt: { question: number; confidence: Confidence; answer: string; grade: Grade }) =>
    update((state) => withAttempt(state, slug, { ...attempt, on: today() }))

  const hold = (slug: string, prediction: Omit<Prediction, "on">) =>
    update((state) => withPrediction(state, slug, { ...prediction, on: today() }))

  /**
   * The one gate that closes over the whole page. Everything after Predict is
   * the answer to Predict, in the sense that matters: it is the material the
   * reader is supposed to meet having already committed to something.
   */
  const gateAt = parts.findIndex((part) => part.kind === "predict")
  const predict = gateAt >= 0 ? parts[gateAt] : undefined
  const locked =
    predict?.kind === "predict" && written(predict.slug).length < predict.questions.length

  const visible = locked ? parts.slice(0, gateAt + 1) : parts

  const renderRun = (
    part: Extract<LessonPart, { kind: "recall" | "predict" }>
  ): ReactNode => {
    const holding = part.kind === "predict"
    const answered = holding
      ? new Set(written(part.slug).map((each) => each.question))
      : new Set(attempts(part.slug).map((each) => each.question))
    const current = part.questions.find((question) => !answered.has(question.number))

    return (
      <section key={part.id} style={style.column(4)}>
        {part.heading}
        {part.intro}

        {current !== undefined ? (
          <Answer
            key={current.number}
            question={current.number}
            total={part.questions.length}
            body={current.body}
            resolve={
              holding
                ? {
                    kind: "hold",
                    note: "Nothing is revealed by this. What you write is held until Reflect, where you grade it against what you then know — which is the only place a confidence rated now can be scored at all.",
                    onWrite: ({ confidence, answer }) =>
                      hold(part.slug, { question: current.number, confidence, answer }),
                  }
                : {
                    kind: "check",
                    checkIn: current.checkIn,
                    onRecord: (attempt) => record(part.slug, attempt),
                  }
            }
          />
        ) : (
          <div style={{ ...style.panel, ...style.column(3) }}>
            <p style={style.note}>
              {holding
                ? `${part.questions.length} predictions committed. They are held until Reflect — do not go back and improve them, a prediction you edited after reading the lesson is not a prediction.`
                : `${part.questions.length} answered. Anything you were confident and wrong about is the list worth keeping.`}
            </p>
            {part.outro}
          </div>
        )}
      </section>
    )
  }

  const renderAnswers = (part: Extract<LessonPart, { kind: "answers" }>): ReactNode => {
    const gate = part.gate
    const open =
      gate.kind === "attempted"
        ? attempts(gate.slug).length >= gate.count
        : written(gate.slug).length > 0

    if (open) {
      return (
        <section key={part.id} style={style.column(4)}>
          {part.heading}
          {part.node}
        </section>
      )
    }

    return (
      <section key={part.id} style={style.column(4)}>
        {part.heading}

        {gate.kind === "attempted" ? (
          <div style={{ ...style.panel, ...style.column(2) }}>
            <p style={style.note}>
              Locked until you have answered all {gate.count} {gate.of} questions above. An answer
              read before the attempt is made feels like understanding and leaves nothing behind;
              this is the same page it always was, with the order enforced.
            </p>
          </div>
        ) : (
          <Answer
            question={1}
            total={1}
            body={gate.prompt}
            resolve={{
              kind: "hold",
              note: "What you write here is not graded and not shown to anyone. It is the thing being checked against — an answer read without one to compare it to is a paragraph you agree with.",
              onWrite: ({ confidence, answer }) =>
                hold(gate.slug, { question: 1, confidence, answer }),
            }}
          />
        )}
      </section>
    )
  }

  const renderReflect = (part: Extract<LessonPart, { kind: "reflect" }>): ReactNode => {
    const predictions = written(part.slug)
    const graded = new Map(attempts(part.slug).map((each) => [each.question, each]))

    return (
      <section key={part.id} style={style.column(4)}>
        {part.heading}

        {predictions.length > 0 ? (
          <div style={{ ...style.panel, ...style.column(4) }}>
            <p style={style.note}>
              What you predicted, before any of this was on the screen. Grade each against what you
              now know — the rating beside it is the one you gave then, and the pair of numbers is the
              only thing in this course that measures whether your sense of what you know is any good.
            </p>

            {predictions.map((prediction) => {
              const question = part.questions.find((each) => each.number === prediction.question)
              const grade = graded.get(prediction.question)

              return (
                <div key={prediction.question} style={style.column(2)}>
                  <p style={style.label}>
                    Prediction {prediction.question} — rated {prediction.confidence} on {prediction.on}
                  </p>

                  {question?.body}

                  <blockquote
                    style={{
                      ...style.note,
                      margin: 0,
                      borderInlineStart: `2px solid ${style.edge}`,
                      paddingInlineStart: "var(--loom-spacing-3)",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {prediction.answer === "" ? "Nothing written — no idea at all." : prediction.answer}
                  </blockquote>

                  {grade === undefined ? (
                    <div style={style.row(2)} role="group" aria-label={`Grade prediction ${prediction.question}`}>
                      {GRADES.map(([value, text]) => (
                        <button
                          key={value}
                          type="button"
                          style={style.button(false)}
                          onClick={() =>
                            record(part.slug, {
                              question: prediction.question,
                              confidence: prediction.confidence,
                              answer: prediction.answer,
                              grade: value,
                            })
                          }
                        >
                          {text}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p style={style.note}>
                      {grade.confidence >= 4 && grade.grade !== "got-it"
                        ? "Confident and wrong. This is the one to bring to the review set."
                        : `Graded: ${grade.grade.replace("-", " ")}.`}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        ) : undefined}

        {part.node}
      </section>
    )
  }

  const workedThrough = lessonWorkedThrough(progress, lesson)

  return (
    <div style={style.column(6)}>
      {visible.map((part) => {
        switch (part.kind) {
          case "prose":
            return <section key={part.id}>{part.node}</section>
          case "recall":
          case "predict":
            return renderRun(part)
          case "answers":
            return renderAnswers(part)
          case "reflect":
            return renderReflect(part)
        }
      })}

      {locked ? (
        <div style={{ ...style.panel, ...style.column(2) }}>
          <p style={style.label}>The rest of the lesson</p>
          <p style={style.note}>
            It unlocks when every prediction above has been written down. This is the one place the
            course is stricter than the paper version rather than more convenient than it: attempting
            and missing is what makes the explanation stick, and an explanation read first cannot be
            missed.
          </p>
        </div>
      ) : (
        <div style={{ ...style.panel, ...style.column(3) }}>
          <p style={style.label}>When you finish</p>
          <p style={style.note}>
            Every review set for this lesson is scheduled from the day you worked through it and from
            nothing else, so this is the date the whole spacing schedule is a function of.
          </p>
          {workedThrough === undefined ? (
            <div style={style.row(2)}>
              <button
                type="button"
                style={style.button(true)}
                onClick={() => update((state) => withLessonWorkedThrough(state, lesson, today()))}
              >
                I worked through this today
              </button>
            </div>
          ) : (
            <p style={style.note}>
              Worked through on {workedThrough}. The queue knows what that makes due.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
