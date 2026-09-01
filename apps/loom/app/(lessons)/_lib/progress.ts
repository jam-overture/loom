/**
 * What the reader has done, as a value.
 *
 * The schedule's own tracking table asks for three things per set: the date it
 * was done, and the questions where the reader was *confident and wrong*. That
 * second column is the one the course says is the real study plan, and it is
 * also the one nobody fills in, because filling it in means remembering a
 * confidence rating you gave before you knew the answer. So the rating is taken
 * at the moment it is honest — before the reveal — and kept here.
 *
 * This module is the record and nothing else: no storage, no clock, no
 * scheduling. Reading is total (0005 in miniature): a record written by an older
 * version, or by hand, or corrupted, parses to whatever part of it is still
 * legible rather than throwing on the reader's own study history.
 */

export const CONFIDENCES = [1, 2, 3, 4, 5] as const

export type Confidence = (typeof CONFIDENCES)[number]

/** What the reader concluded after checking, in their own judgement. */
export const GRADES = ["got-it", "partly", "missed"] as const

export type Grade = (typeof GRADES)[number]

export type Attempt = {
  readonly question: number
  /** Rated before the reveal. That is the whole point of keeping it. */
  readonly confidence: Confidence
  /** Empty when the reader said, explicitly, that they could not retrieve it. */
  readonly answer: string
  readonly grade: Grade
  readonly on: string
}

export type SetProgress = {
  readonly attempts: readonly Attempt[]
  readonly completedOn: string | undefined
}

/**
 * An answer written before the thing that answers it was read.
 *
 * A prediction is not an attempt and cannot be stored as one, because the field
 * that makes an attempt an attempt — how it went — does not exist yet and will
 * not for twenty minutes. What it has instead is a confidence rated at the only
 * moment such a number is honest: before the lesson. Holding the pair until
 * Reflect, and grading it there, is the one calibration measurement paper
 * cannot make at all — on paper the rating is a memory of a rating by the time
 * the reader knows whether they were right.
 */
export type Prediction = {
  readonly question: number
  readonly confidence: Confidence
  readonly answer: string
  readonly on: string
}

/**
 * The same question, answered again on a later day.
 *
 * The schedule's instruction after a miss is one sentence long — *look up only
 * the specific point, then re-answer that question from memory a day later* —
 * and it is the only thing in this course that nothing kept. It could not be an
 * `Attempt`: a second attempt at a question **replaces** the first, because a
 * set you came back to is a set you did, and that rule is right for a sitting
 * and catastrophic here. Overwriting the miss would delete the confidence that
 * made it worth returning to, so getting a question right at last would erase
 * the evidence that you were ever confident and wrong about it — the one number
 * the whole surface exists to keep.
 *
 * So a correction is a separate thing that accumulates rather than replaces. The
 * sitting stays exactly as it happened; what is added is what happened *since*.
 */
export type Correction = {
  /** The set the question is in — a correction is always a question somewhere. */
  readonly set: string
  readonly question: number
  /** Rated before the reveal, again. The first rating is not reused. */
  readonly confidence: Confidence
  readonly answer: string
  readonly grade: Grade
  readonly on: string
}

export type Progress = {
  /** Lesson number as a string, to the day it was worked through. */
  readonly lessons: Readonly<Record<string, string>>
  /** Set slug to what happened in it. */
  readonly sets: Readonly<Record<string, SetProgress>>
  /** Set slug to what was written before the answer existed. */
  readonly predictions: Readonly<Record<string, readonly Prediction[]>>
  /** Every re-answer, oldest first. Appended to; nothing here is ever replaced. */
  readonly corrections: readonly Correction[]
}

export const EMPTY_PROGRESS: Progress = {
  lessons: {},
  sets: {},
  predictions: {},
  corrections: [],
}

export const EMPTY_SET_PROGRESS: SetProgress = { attempts: [], completedOn: undefined }

const DAY = /^\d{4}-\d{2}-\d{2}$/

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const readDay = (value: unknown): string | undefined =>
  typeof value === "string" && DAY.test(value) ? value : undefined

const readConfidence = (value: unknown): Confidence | undefined =>
  CONFIDENCES.find((allowed) => allowed === value)

const readGrade = (value: unknown): Grade | undefined => GRADES.find((allowed) => allowed === value)

const readAttempt = (value: unknown): Attempt | undefined => {
  if (!isObject(value)) return undefined

  const question = value["question"]
  const confidence = readConfidence(value["confidence"])
  const grade = readGrade(value["grade"])
  const on = readDay(value["on"])

  if (typeof question !== "number" || !Number.isInteger(question)) return undefined
  if (confidence === undefined || grade === undefined || on === undefined) return undefined

  return {
    question,
    confidence,
    grade,
    on,
    answer: typeof value["answer"] === "string" ? value["answer"] : "",
  }
}

const readSetProgress = (value: unknown): SetProgress => {
  if (!isObject(value)) return EMPTY_SET_PROGRESS

  const attempts = Array.isArray(value["attempts"])
    ? value["attempts"].map(readAttempt).filter((attempt): attempt is Attempt => attempt !== undefined)
    : []

  return { attempts, completedOn: readDay(value["completedOn"]) }
}

const readPrediction = (value: unknown): Prediction | undefined => {
  if (!isObject(value)) return undefined

  const question = value["question"]
  const confidence = readConfidence(value["confidence"])
  const on = readDay(value["on"])

  if (typeof question !== "number" || !Number.isInteger(question)) return undefined
  if (confidence === undefined || on === undefined) return undefined

  return { question, confidence, on, answer: typeof value["answer"] === "string" ? value["answer"] : "" }
}

const readCorrection = (value: unknown): Correction | undefined => {
  if (!isObject(value)) return undefined

  const set = value["set"]
  const question = value["question"]
  const confidence = readConfidence(value["confidence"])
  const grade = readGrade(value["grade"])
  const on = readDay(value["on"])

  if (typeof set !== "string" || set === "") return undefined
  if (typeof question !== "number" || !Number.isInteger(question)) return undefined
  if (confidence === undefined || grade === undefined || on === undefined) return undefined

  return {
    set,
    question,
    confidence,
    grade,
    on,
    answer: typeof value["answer"] === "string" ? value["answer"] : "",
  }
}

export const readProgress = (value: unknown): Progress => {
  if (!isObject(value)) return EMPTY_PROGRESS

  const lessons: Record<string, string> = {}
  const rawLessons = value["lessons"]

  if (isObject(rawLessons)) {
    for (const [number, day] of Object.entries(rawLessons)) {
      const on = readDay(day)
      if (/^\d+$/.test(number) && on !== undefined) lessons[number] = on
    }
  }

  const sets: Record<string, SetProgress> = {}
  const rawSets = value["sets"]

  if (isObject(rawSets)) {
    for (const [slug, record] of Object.entries(rawSets)) sets[slug] = readSetProgress(record)
  }

  const predictions: Record<string, readonly Prediction[]> = {}
  const rawPredictions = value["predictions"]

  if (isObject(rawPredictions)) {
    for (const [slug, written] of Object.entries(rawPredictions)) {
      if (!Array.isArray(written)) continue

      predictions[slug] = written
        .map(readPrediction)
        .filter((prediction): prediction is Prediction => prediction !== undefined)
    }
  }

  const raw = value["corrections"]
  const corrections = Array.isArray(raw)
    ? raw.map(readCorrection).filter((entry): entry is Correction => entry !== undefined)
    : []

  return { lessons, sets, predictions, corrections }
}

export const setProgress = (progress: Progress, slug: string): SetProgress =>
  progress.sets[slug] ?? EMPTY_SET_PROGRESS

export const lessonWorkedThrough = (progress: Progress, lesson: number): string | undefined =>
  progress.lessons[String(lesson)]

export const withLessonWorkedThrough = (
  progress: Progress,
  lesson: number,
  on: string | undefined
): Progress => {
  const lessons = { ...progress.lessons }

  if (on === undefined) delete lessons[String(lesson)]
  else lessons[String(lesson)] = on

  return { ...progress, lessons }
}

/**
 * One question's attempt, recorded. A second attempt at the same question
 * replaces the first: the record is what the reader knows now, and a set they
 * came back to is a set they did, not two.
 */
export const withAttempt = (progress: Progress, slug: string, attempt: Attempt): Progress => {
  const existing = setProgress(progress, slug)
  const attempts = [...existing.attempts.filter((each) => each.question !== attempt.question), attempt]

  return {
    ...progress,
    sets: {
      ...progress.sets,
      [slug]: { ...existing, attempts: [...attempts].sort((a, b) => a.question - b.question) },
    },
  }
}

export const predictionsFor = (progress: Progress, slug: string): readonly Prediction[] =>
  progress.predictions[slug] ?? []

/**
 * A prediction, written down. Rewriting one replaces it — a reader who came
 * back to the page mid-sitting is one reader, not two — and the confidence it
 * carries is whatever was rated at that moment, which is still before the
 * reveal, because nothing about the lesson is on the screen yet.
 */
export const withPrediction = (
  progress: Progress,
  slug: string,
  prediction: Prediction
): Progress => {
  const existing = predictionsFor(progress, slug).filter(
    (each) => each.question !== prediction.question
  )

  return {
    ...progress,
    predictions: {
      ...progress.predictions,
      [slug]: [...existing, prediction].sort((a, b) => a.question - b.question),
    },
  }
}

export const correctionsFor = (
  progress: Progress,
  slug: string,
  question: number
): readonly Correction[] =>
  progress.corrections.filter(
    (correction) => correction.set === slug && correction.question === question
  )

/**
 * A re-answer, recorded. Appended, never replacing: two goes at the same
 * question a week apart are two retrievals, and the fact that there were two is
 * the thing being measured.
 */
export const withCorrection = (progress: Progress, correction: Correction): Progress => ({
  ...progress,
  corrections: [...progress.corrections, correction],
})

export const withSetCompleted = (progress: Progress, slug: string, on: string): Progress => ({
  ...progress,
  sets: { ...progress.sets, [slug]: { ...setProgress(progress, slug), completedOn: on } },
})
