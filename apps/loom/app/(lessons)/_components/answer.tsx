"use client"

import { useState, type ReactNode } from "react"

import { CONFIDENCES, type Attempt, type Confidence, type Grade } from "../_lib/progress"
import * as style from "./style"

/**
 * One question, and the order it has to happen in.
 *
 * On paper this is an honour system, and the honour system is where retrieval
 * practice quietly dies: the answer is on the next page, the eye reaches it
 * first, and what feels like recall is recognition. The sequence here is the
 * one thing a screen can enforce that a page cannot.
 *
 * 1. **Rate first.** A confidence given after seeing where the answer was is
 *    not a confidence, it is a memory of one. This is the only moment the
 *    number means anything, so it is the first thing asked and it cannot be
 *    revised afterwards.
 * 2. **Write, then submit.** Not "think about it and continue". Writing is what
 *    makes the retrieval attempt real, and having written is what makes the
 *    check informative.
 * 3. **Only then, where to check.** Note what does *not* appear: the answer.
 *    The review sets have no printed answers by design — the answer is in the
 *    lesson, and going to get it is itself a retrieval. What unlocks is the
 *    pointer, and nothing about this control is easier than the paper version
 *    except the bookkeeping.
 * 4. **Grade yourself.** Which, paired with the rating from step 1, is the only
 *    way calibration is measurable at all.
 *
 * "I can't retrieve this" is deliberately present and deliberately not free: it
 * records a real attempt with an empty answer, which is honest, and it is the
 * only way past a question without writing something.
 */

export type CheckPointer = {
  readonly number: number
  readonly title: string
  readonly href: string
}

type AnswerProps = {
  readonly question: number
  readonly total: number
  /** The question, rendered from the schedule as a Loom fragment. */
  readonly body: ReactNode
  readonly checkIn: readonly CheckPointer[]
  readonly onRecord: (attempt: Omit<Attempt, "on">) => void
}

const CONFIDENCE_LABELS: Readonly<Record<Confidence, string>> = {
  1: "no idea",
  2: "a guess",
  3: "roughly",
  4: "fairly sure",
  5: "certain",
}

const GRADE_LABELS: readonly (readonly [Grade, string])[] = [
  ["got-it", "Got it"],
  ["partly", "Partly"],
  ["missed", "Missed it"],
]

export const Answer = ({ question, total, body, checkIn, onRecord }: AnswerProps) => {
  const [confidence, setConfidence] = useState<Confidence | undefined>(undefined)
  const [answer, setAnswer] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const record = (grade: Grade): void => {
    if (confidence === undefined) return

    onRecord({ question, confidence, answer: answer.trim(), grade })
  }

  return (
    <section style={{ ...style.panel, ...style.column(4) }} aria-label={`Question ${question}`}>
      <p style={style.label}>
        Question {question} of {total}
      </p>

      {body}

      {confidence === undefined ? (
        <div style={style.column(2)}>
          <p style={style.note}>
            Before you write anything: how sure are you that you can answer this? Rate it now — after
            you have written it down, the number would be a different number.
          </p>
          <div style={style.row(2)} role="group" aria-label="Confidence">
            {CONFIDENCES.map((value) => (
              <button
                key={value}
                type="button"
                style={style.button(false)}
                onClick={() => setConfidence(value)}
              >
                {value} — {CONFIDENCE_LABELS[value]}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p style={style.note}>
          Rated <strong style={{ color: style.ink }}>{confidence}</strong> —{" "}
          {CONFIDENCE_LABELS[confidence]}.
        </p>
      )}

      {confidence !== undefined && !submitted ? (
        <div style={style.column(3)}>
          <label style={style.column(2)}>
            <span style={style.label}>Your answer, closed book</span>
            <textarea
              style={style.textarea}
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Write it out. Half an answer written down beats a whole one you were sure you had."
            />
          </label>

          <div style={style.row(3)}>
            <button
              type="button"
              style={{ ...style.button(true), opacity: answer.trim() === "" ? 0.4 : 1 }}
              disabled={answer.trim() === ""}
              onClick={() => setSubmitted(true)}
            >
              Submit, then check
            </button>
            <button
              type="button"
              style={{ ...style.button(false), color: style.inkMuted }}
              onClick={() => {
                setAnswer("")
                setSubmitted(true)
              }}
            >
              I can&rsquo;t retrieve this
            </button>
          </div>
        </div>
      ) : undefined}

      {submitted ? (
        <div style={style.column(3)}>
          {answer.trim() === "" ? (
            <p style={style.note}>
              Recorded as a miss before you looked. That is worth more than a half-remembered answer
              you would have graded generously.
            </p>
          ) : (
            <blockquote
              style={{
                ...style.note,
                borderInlineStart: `2px solid ${style.edge}`,
                paddingInlineStart: "var(--loom-spacing-3)",
                whiteSpace: "pre-wrap",
              }}
            >
              {answer.trim()}
            </blockquote>
          )}

          <div style={style.column(2)}>
            <p style={style.label}>Where to check</p>
            <p style={style.note}>
              The answer is not printed here, and that is not an omission — going and getting it is
              another retrieval. Look up the specific point only; do not reread the lesson.
            </p>
            <div style={style.row(2)}>
              {checkIn.map((pointer) => (
                <a
                  key={pointer.number}
                  href={pointer.href}
                  style={{ ...style.button(false), textDecoration: "none" }}
                >
                  {String(pointer.number).padStart(2, "0")} — {pointer.title}
                </a>
              ))}
            </div>
          </div>

          <div style={style.column(2)}>
            <p style={style.label}>How did it go?</p>
            <div style={style.row(2)} role="group" aria-label="Self-grade">
              {GRADE_LABELS.map(([grade, text]) => (
                <button key={grade} type="button" style={style.button(false)} onClick={() => record(grade)}>
                  {text}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : undefined}
    </section>
  )
}
