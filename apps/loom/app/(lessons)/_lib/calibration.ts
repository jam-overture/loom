import { CONFIDENCES, type Attempt, type Confidence, type Progress } from "./progress"

/**
 * The gap between what the reader thought they knew and what they knew.
 *
 * *Make It Stick*'s claim about calibration is not that people know less than
 * they think. It is narrower and more useful: **the answers you are confident
 * and wrong about are the ones that quietly break your model later**, because
 * confidence is what stops you checking. Ignorance you are aware of gets fixed
 * on contact.
 *
 * That is unmeasurable on paper — it needs a rating recorded before the reveal
 * and a judgement recorded after, kept together, which is the one thing a
 * printed schedule cannot do. Everything here is arithmetic over pairs of those.
 */

export type ConfidenceBand = {
  readonly confidence: Confidence
  readonly attempts: number
  readonly right: number
}

export type Miss = {
  readonly set: string
  readonly question: number
  readonly confidence: Confidence
  readonly on: string
}

export type Calibration = {
  readonly attempts: number
  readonly right: number
  readonly bands: readonly ConfidenceBand[]
  /** Rated 4 or 5 and not got: the list the schedule calls the real study plan. */
  readonly confidentAndWrong: readonly Miss[]
}

export const CONFIDENT = 4

const attemptsIn = (progress: Progress): readonly (readonly [string, Attempt])[] =>
  Object.entries(progress.sets).flatMap(([slug, record]) =>
    record.attempts.map((attempt) => [slug, attempt] as const)
  )

export const calibrationOf = (progress: Progress): Calibration => {
  const all = attemptsIn(progress)

  const bands = CONFIDENCES.map((confidence) => {
    const rated = all.filter(([, attempt]) => attempt.confidence === confidence)

    return {
      confidence,
      attempts: rated.length,
      right: rated.filter(([, attempt]) => attempt.grade === "got-it").length,
    }
  })

  const confidentAndWrong = all
    .filter(([, attempt]) => attempt.confidence >= CONFIDENT && attempt.grade !== "got-it")
    .map(([set, attempt]) => ({
      set,
      question: attempt.question,
      confidence: attempt.confidence,
      on: attempt.on,
    }))
    .sort((a, b) => (a.on === b.on ? a.set.localeCompare(b.set) : b.on.localeCompare(a.on)))

  return {
    attempts: all.length,
    right: all.filter(([, attempt]) => attempt.grade === "got-it").length,
    bands,
    confidentAndWrong,
  }
}

/**
 * One sitting's version of the same thing, for the page shown at the end of a
 * set — where it is still worth something, because the questions are fresh.
 */
export const sittingMisses = (slug: string, attempts: readonly Attempt[]): readonly Miss[] =>
  attempts
    .filter((attempt) => attempt.confidence >= CONFIDENT && attempt.grade !== "got-it")
    .map((attempt) => ({
      set: slug,
      question: attempt.question,
      confidence: attempt.confidence,
      on: attempt.on,
    }))
