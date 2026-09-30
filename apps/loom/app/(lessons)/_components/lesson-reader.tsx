"use client"

import type { ReactNode } from "react"

import {
  explanationsFor,
  lessonWorkedThrough,
  predictionsFor,
  setProgress,
  withAttempt,
  withExplanation,
  withLessonWorkedThrough,
  withPrediction,
  type Confidence,
  type Explanation,
  type Grade,
  type Prediction,
} from "../_lib/progress"
import type { HeldRef } from "../_lib/held"
import type { CheckPointer } from "../_lib/links"
import { Answer } from "./answer"
import { Held } from "./held"
import * as style from "./style"
import { useProgress } from "./store"

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
 *
 * **Two of those gates hold nothing.** The lesson body and Reflect are here,
 * held back by a slice; the three things that are *answers* — the transcripts
 * and the two halves of `## Answers` — are not in this page at all. They are
 * `HeldRef`s: an address and a slot, fetched when the gate opens (`held.tsx`).
 * The difference is the difference between a lock and a picture of one, and it
 * is worth saying plainly which of the two each gate here is. The body gate is
 * still a slice: an explanation is not an answer, and it is a scroll away in
 * the markdown either way. The answers are not.
 */

export type PromptQuestion = {
  readonly number: number
  readonly body: ReactNode
  /** Where to check, for a question that has somewhere to check. */
  readonly checkIn: readonly CheckPointer[]
}

/**
 * An earlier lesson an elaboration prompt says it builds on, and where the
 * reader's own words about it are filed.
 *
 * Not a `CheckPointer`, though it carries the same three fields, and the
 * difference is the reason this type exists. A check pointer is *where the answer
 * is*. This is where a lesson is, next to a key in the reader's record — and
 * whether there is anything under that key is a fact about them rather than about
 * the course, which is the whole of what makes the comparison below worth
 * building.
 */
export type ElaborationSource = {
  readonly lesson: number
  readonly title: string
  readonly href: string
  /** The record slug that lesson's own explanations are filed under. */
  readonly slug: string
}

export type ElaborationPrompt = {
  readonly number: number
  readonly body: ReactNode
  readonly reaches: readonly ElaborationSource[]
}

/** What has to have happened before a printed answer is on the screen. */
export type AnswerGate =
  | { readonly kind: "attempted"; readonly slug: string; readonly count: number; readonly of: string }
  | {
      readonly kind: "written"
      readonly slug: string
      readonly count: number
      /**
       * The one thing to write, for a lesson with nothing runnable to predict
       * against. Where the exercises do run, the predictions have already been
       * taken one fence at a time and this gate only counts them.
       */
      readonly prompt: ReactNode | undefined
    }

/**
 * A fence in Try it, and where what it printed can be fetched from.
 *
 * The code is the lesson's own text and is always on the page. The transcript
 * under it is this build's, and is held until every fence in the section has a
 * prediction against it — which is what the lesson has always asked for in
 * prose ("predict every output in writing before you run anything") and has
 * never been able to check. `held` is an address, not the output: the page a
 * reader has open while they are predicting does not contain what any of these
 * printed.
 *
 * `run` is absent for a fence that registers no test. A shared preamble of
 * imports and helpers is part of the program and prints nothing, and asking a
 * reader to predict its output would be asking a question with no answer.
 */
export type ExerciseUnit =
  | { readonly kind: "prose"; readonly id: string; readonly node: ReactNode }
  | {
      readonly kind: "code"
      readonly id: string
      readonly node: ReactNode
      readonly run:
        | { readonly number: number; readonly prompt: ReactNode; readonly held: HeldRef }
        | undefined
    }
  /**
   * The output the lesson prints for itself.
   *
   * Nine lessons write "Predict what this prints" and then print it, in an
   * untagged fence a few lines below — which is the paper version doing the
   * only thing paper can. Rendered as written it is the answer, in prose, next
   * to its own question and behind no gate at all: worse than the payload leak
   * this file's other gates had, because it is simply on the screen.
   *
   * So it is held exactly like the transcript it duplicates, in the same
   * document and under the same gate, and it stays where the author put it.
   */
  | { readonly kind: "printed"; readonly id: string; readonly held: HeldRef }

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
      /**
       * Elaboration: say it in your own words, with nothing to reveal.
       *
       * The only section on this page that gates nothing and holds nothing,
       * because there is nothing to hold: no printed answer exists for *explain
       * the ladder to somebody who wrote the OR-of-predicates version*, and the
       * value of the prompt is that the words have to be the reader's. What it
       * enforces is the one thing its own text asks for and paper cannot check —
       * that something was written before the reader moved on — and what it adds
       * afterwards is the one thing paper cannot offer: *then compare*, against
       * their own explanation of the lesson this one says it derives from.
       */
      readonly kind: "elaborate"
      readonly id: string
      readonly heading: ReactNode
      readonly slug: string
      readonly intro: ReactNode
      readonly outro: ReactNode
      readonly questions: readonly ElaborationPrompt[]
    }
  | {
      readonly kind: "answers"
      readonly id: string
      readonly heading: ReactNode
      /** Where the printed answers are. Not what they say — that is the point. */
      readonly held: HeldRef
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
  | {
      readonly kind: "exercises"
      readonly id: string
      readonly heading: ReactNode
      readonly slug: string
      readonly units: readonly ExerciseUnit[]
      /** How many fences have something to predict, which is what the gate counts. */
      readonly total: number
      /** Set when the program did not run, in which case there is nothing to hold back. */
      readonly failure: string | undefined
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
  const { progress, ready, today, update } = useProgress()

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
    update((state) => withAttempt(state, slug, { ...attempt, on: today }))

  const hold = (slug: string, prediction: Omit<Prediction, "on">) =>
    update((state) => withPrediction(state, slug, { ...prediction, on: today }))

  const explained = (slug: string): readonly Explanation[] => explanationsFor(progress, slug)

  const keep = (slug: string, explanation: Omit<Explanation, "on">) =>
    update((state) => withExplanation(state, slug, { ...explanation, on: today }))

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

  /**
   * Explain it back, and then the part paper cannot do.
   *
   * Two things happen here and only the first is a gate. Each prompt takes
   * something written before the next one appears, which is what "closed book"
   * has always asked for and never been able to check. No rating is taken — there
   * is no answer to be right about, so a number here would be a measure of how
   * fluent the explaining felt, and fluency is the illusion this course opens by
   * naming.
   *
   * The second thing is the reason this is stored rather than merely required.
   * Every lesson but the first has a prompt that says *derive this from lesson
   * NN*, and the useful comparison is not against that lesson's text — the reader
   * can reread that any time, and rereading is the study method the course exists
   * to talk them out of. It is against **what they wrote about lesson NN when
   * they were in it**: the same model, in their words, months older. That
   * document exists nowhere but their own browser, so the page cannot contain it
   * and no address could serve it. It arrives after the writing, never before,
   * because arriving before would be reading your notes.
   *
   * When there is nothing there, the section says which nothing it is — no
   * explanation was ever written, or one was written and said it could not be
   * given — because those are different facts about the reader and only the
   * second is about their understanding. That distinction is lesson 24's, applied
   * one floor down from where it is taught.
   */
  const renderElaborate = (part: Extract<LessonPart, { kind: "elaborate" }>): ReactNode => {
    const kept = explained(part.slug)
    const done = new Set(kept.map((each) => each.question))
    const current = part.questions.find((question) => !done.has(question.number))

    const earlier = (source: ElaborationSource): ReactNode => {
      const theirs = explained(source.slug).filter((each) => each.answer.trim() !== "")
      const anything = explained(source.slug).length > 0

      if (theirs.length === 0) {
        return (
          <p key={source.slug} style={style.note}>
            You have nothing written about{" "}
            <a href={source.href} style={{ color: style.ink }}>
              lesson {String(source.lesson).padStart(2, "0")} — {source.title}
            </a>
            {anything
              ? ", beyond saying at the time that you could not explain it yet. That is worth knowing here rather than being shown as a blank: the derivation you have just written is the second attempt, and it went further."
              : ". Nothing is missing from the course — this is the one thing here that only you can have put there, and writing it in that lesson's Explain it back is what makes this comparison possible the next time a prompt sends you back to it."}
          </p>
        )
      }

      return (
        <div key={source.slug} style={style.column(2)}>
          <p style={style.label}>
            What you wrote about lesson {String(source.lesson).padStart(2, "0")} — {source.title}
          </p>
          {theirs.map((each) => (
            <blockquote
              key={each.question}
              style={{
                ...style.note,
                margin: 0,
                borderInlineStart: `2px solid ${style.edge}`,
                paddingInlineStart: "var(--loom-spacing-3)",
                whiteSpace: "pre-wrap",
              }}
            >
              {each.answer}
              <span style={{ display: "block", color: style.inkSubtle }}>
                prompt {each.question}, {each.on}
              </span>
            </blockquote>
          ))}
        </div>
      )
    }

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
            resolve={{
              kind: "explain",
              note: "Nothing is revealed by this and nothing grades it. It is kept so that the next lesson to tell you to derive something from this one can show you what you said here — which is the only comparison in this course that no printed answer could supply.",
              onWrite: ({ answer }) => keep(part.slug, { question: current.number, answer }),
            }}
          />
        ) : (
          <div style={{ ...style.panel, ...style.column(4) }}>
            <p style={style.note}>
              {part.questions.length === 1
                ? "Written. Now compare it against the words you had for the lesson this one builds on."
                : `${part.questions.length} written. Now compare them against the words you had for the lessons these build on.`}
            </p>

            {part.questions.map((question) => {
              const mine = kept.find((each) => each.question === question.number)

              return (
                <div key={question.number} style={style.column(2)}>
                  <p style={style.label}>
                    Prompt {question.number}
                    {mine === undefined ? "" : ` — written ${mine.on}`}
                  </p>

                  {question.body}

                  <blockquote
                    style={{
                      ...style.note,
                      margin: 0,
                      borderInlineStart: `2px solid ${style.edge}`,
                      paddingInlineStart: "var(--loom-spacing-3)",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {mine === undefined || mine.answer === ""
                      ? "Nothing written — you said you could not explain this one yet."
                      : mine.answer}
                  </blockquote>

                  {question.reaches.map(earlier)}
                </div>
              )
            })}

            {part.outro}
          </div>
        )}

        <p style={style.note}>
          What you write here goes into this browser and nowhere else, and what it shows you came
          from the same place — so nobody but you can read either, and nothing on this page was ever
          in the page you loaded. That is also why{" "}
          <a href="/lessons/record" style={{ color: style.ink }}>
            keeping a copy
          </a>{" "}
          is yours to do.
        </p>
      </section>
    )
  }

  const renderAnswers = (part: Extract<LessonPart, { kind: "answers" }>): ReactNode => {
    const gate = part.gate
    const open =
      gate.kind === "attempted"
        ? attempts(gate.slug).length >= gate.count
        : written(gate.slug).length >= gate.count

    if (open) {
      return (
        <section key={part.id} style={style.column(4)}>
          {part.heading}
          <Held held={part.held} label="Fetching the answers" />
        </section>
      )
    }

    return (
      <section key={part.id} style={style.column(4)}>
        {part.heading}

        {gate.kind === "attempted" ? (
          <div style={{ ...style.panel, ...style.column(2) }}>
            <p style={style.note}>
              Not here until you have answered all {gate.count} {gate.of} questions above — not
              hidden here, not in this page. An answer read before the attempt is made feels like
              understanding and leaves nothing behind, so it is fetched from its own address when
              the questions above have been attempted, and until then there is nothing on this page
              to find.
            </p>
          </div>
        ) : gate.prompt === undefined ? (
          <div style={{ ...style.panel, ...style.column(2) }}>
            <p style={style.note}>
              Not here until every exercise above has a prediction against it. These answers explain
              output you have already been shown, and read in the other order they explain output you
              have not looked at yet — which is a paragraph you agree with rather than a correction.
              They are fetched when that is done; the page you are reading does not contain them.
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

  /**
   * Try it, with the outputs where the outputs belong.
   *
   * Two things change against the paper version and neither of them is the
   * words. The transcript is *here*, under the fence that produced it, instead
   * of in a paragraph of the Answers section describing it — and it is held
   * until every fence has been predicted against, so the reader who scrolls is
   * not handed the result of the exercise they are about to attempt. The
   * predictions are taken one fence at a time, in order, for the same reason
   * Predict is: a rating given after the reader has seen the next fence's output
   * is a rating about a different question.
   */
  const renderExercises = (part: Extract<LessonPart, { kind: "exercises" }>): ReactNode => {
    const done = new Set(written(part.slug).map((each) => each.question))
    const complete = done.size >= part.total
    const next = part.units.find(
      (unit) => unit.kind === "code" && unit.run !== undefined && !done.has(unit.run.number)
    )

    return (
      <section key={part.id} style={style.column(4)}>
        {part.heading}

        {part.units.map((unit) => {
          if (unit.kind === "printed") {
            return (
              <div key={unit.id}>
                {complete ? (
                  <Held held={unit.held} label="Fetching the output the lesson prints here" />
                ) : (
                  <p style={style.note}>
                    The lesson prints its output here. It is not in this page until every exercise
                    above has a prediction against it — the sentence before this one asked you to
                    predict it, and on paper that is all it can do.
                  </p>
                )}
              </div>
            )
          }

          if (unit.kind === "prose" || unit.run === undefined) {
            return <div key={unit.id}>{unit.node}</div>
          }

          const run = unit.run

          return (
            <div key={unit.id} style={style.column(3)}>
              {unit.node}

              {complete ? (
                <div style={style.column(2)}>
                  <p style={style.label}>What it printed — exercise {run.number}</p>
                  <Held held={run.held} label="Fetching what it printed" />
                </div>
              ) : unit === next ? (
                <Answer
                  question={run.number}
                  total={part.total}
                  body={run.prompt}
                  resolve={{
                    kind: "hold",
                    note: "Nothing is revealed by this. Every transcript on this page appears at once, when the last exercise has a prediction against it — because the lesson asks you to predict every output before running anything, and revealing them one at a time would make each prediction a little easier than the last.",
                    onWrite: ({ confidence, answer }) =>
                      hold(part.slug, { question: run.number, confidence, answer }),
                  }}
                />
              ) : (
                <p style={style.note}>
                  Exercise {run.number} of {part.total} — predict the ones above it first.
                </p>
              )}
            </div>
          )
        })}

        {part.failure === undefined ? (
          <div style={{ ...style.panel, ...style.column(2) }}>
            <p style={style.label}>Where these outputs came from</p>
            <p style={style.note}>
              {complete
                ? "Every transcript above was produced by compiling this section and running it against src/ when this page was built, and fetched just now from the address it is served at. It is not a record of what the code printed when the lesson was written — a lesson whose exercises stop running is a red test, and this page would be telling you so instead."
                : "The exercises have already run. They were compiled and executed against src/ when this page was built, so what you are predicting against is this commit's behaviour and not a transcript somebody typed up. What they printed is not in this page: it is fetched when the last prediction is in, so there is nothing here to read ahead to. You still have to say what you think it is."}
            </p>
          </div>
        ) : (
          <div style={{ ...style.panel, ...style.column(2) }}>
            <p style={style.label}>These exercises did not run</p>
            <p style={style.note}>
              This section no longer runs against `src/` in this build, so there is nothing to show
              you and nothing to predict against. That is a defect in the course rather than in your
              understanding of it, and it is worth knowing before you spend twenty minutes on the
              paste-and-run version. The error was: {part.failure}
            </p>
          </div>
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
          case "elaborate":
            return renderElaborate(part)
          case "answers":
            return renderAnswers(part)
          case "exercises":
            return renderExercises(part)
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
                onClick={() => update((state) => withLessonWorkedThrough(state, lesson, today))}
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
