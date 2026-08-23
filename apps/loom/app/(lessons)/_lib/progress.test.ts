import { describe, expect, it } from "vitest"

import { calibrationOf, sittingMisses } from "./calibration"
import {
  EMPTY_PROGRESS,
  predictionsFor,
  readProgress,
  setProgress,
  withAttempt,
  withLessonWorkedThrough,
  withPrediction,
  type Attempt,
} from "./progress"

const attempt = (question: number, confidence: 1 | 2 | 3 | 4 | 5, grade: Attempt["grade"]): Attempt => ({
  question,
  confidence,
  grade,
  answer: "something written down",
  on: "2026-03-09",
})

describe("reading a record somebody else wrote", () => {
  it("keeps what is legible and drops what is not, rather than throwing", () => {
    const record = readProgress({
      lessons: { "1": "2026-03-01", "2": "sometime", three: "2026-03-04" },
      sets: {
        "set-a": {
          completedOn: "2026-03-03",
          attempts: [
            { question: 1, confidence: 4, grade: "missed", answer: "no", on: "2026-03-03" },
            { question: 2, confidence: 9, grade: "missed", on: "2026-03-03" },
            { question: 3, confidence: 2, grade: "nearly", on: "2026-03-03" },
          ],
        },
      },
    })

    expect(record.lessons).toEqual({ "1": "2026-03-01" })
    expect(setProgress(record, "set-a").attempts.map((each) => each.question)).toEqual([1])
    expect(setProgress(record, "set-a").completedOn).toBe("2026-03-03")
  })

  it("reads nothing at all as nothing done", () => {
    expect(readProgress(undefined)).toEqual(EMPTY_PROGRESS)
    expect(readProgress("[]")).toEqual(EMPTY_PROGRESS)
    expect(readProgress({ sets: 4, lessons: null })).toEqual(EMPTY_PROGRESS)
  })

  it("survives a round trip through the string a browser would store", () => {
    const written = withAttempt(
      withLessonWorkedThrough(EMPTY_PROGRESS, 11, "2026-03-01"),
      "set-n",
      attempt(1, 3, "partly")
    )

    expect(readProgress(JSON.parse(JSON.stringify(written)))).toEqual(written)
  })
})

describe("recording an attempt", () => {
  it("replaces a second attempt at the same question rather than counting it twice", () => {
    const once = withAttempt(EMPTY_PROGRESS, "set-a", attempt(1, 2, "missed"))
    const twice = withAttempt(once, "set-a", attempt(1, 5, "got-it"))

    expect(setProgress(twice, "set-a").attempts).toHaveLength(1)
    expect(setProgress(twice, "set-a").attempts[0]?.grade).toBe("got-it")
  })

  it("keeps a set's attempts in question order however they arrive", () => {
    const progress = [attempt(3, 3, "got-it"), attempt(1, 3, "got-it"), attempt(2, 3, "got-it")].reduce(
      (record, each) => withAttempt(record, "set-c", each),
      EMPTY_PROGRESS
    )

    expect(setProgress(progress, "set-c").attempts.map((each) => each.question)).toEqual([1, 2, 3])
  })
})

describe("calibration", () => {
  const progress = [
    ["set-a", attempt(1, 5, "missed")],
    ["set-a", attempt(2, 4, "partly")],
    ["set-a", attempt(3, 5, "got-it")],
    ["set-b", attempt(1, 2, "missed")],
    ["set-b", attempt(2, 1, "got-it")],
  ].reduce(
    (record, [slug, each]) => withAttempt(record, slug as string, each as Attempt),
    EMPTY_PROGRESS
  )

  it("counts the pairs that matter: confident, and not got", () => {
    const calibration = calibrationOf(progress)

    expect(calibration.attempts).toBe(5)
    expect(calibration.right).toBe(2)
    expect(calibration.confidentAndWrong.map((miss) => `${miss.set}#${miss.question}`)).toEqual([
      "set-a#1",
      "set-a#2",
    ])
  })

  it("does not treat a low rating and a miss as a calibration failure", () => {
    expect(calibrationOf(progress).confidentAndWrong.some((miss) => miss.set === "set-b")).toBe(false)
  })

  it("bands every rating, including the ones nobody used", () => {
    const bands = calibrationOf(progress).bands

    expect(bands.map((band) => band.attempts)).toEqual([1, 1, 0, 1, 2])
    expect(bands.find((band) => band.confidence === 5)).toEqual({
      confidence: 5,
      attempts: 2,
      right: 1,
    })
  })

  it("reports one sitting's misses without the rest of the history", () => {
    expect(sittingMisses("set-a", setProgress(progress, "set-a").attempts)).toHaveLength(2)
  })

  it("says nothing at all about a reader who has done nothing", () => {
    expect(calibrationOf(EMPTY_PROGRESS)).toMatchObject({ attempts: 0, right: 0, confidentAndWrong: [] })
  })
})

describe("predictions, which are not attempts", () => {
  const written = withPrediction(
    withPrediction(EMPTY_PROGRESS, "lesson-13-predict", {
      question: 2,
      confidence: 2,
      answer: "The reason code and nothing else.",
      on: "2026-08-22",
    }),
    "lesson-13-predict",
    { question: 1, confidence: 4, answer: "A counter.", on: "2026-08-22" }
  )

  it("keeps them in question order however they were written", () => {
    expect(predictionsFor(written, "lesson-13-predict").map((each) => each.question)).toEqual([1, 2])
  })

  it("replaces a rewritten prediction rather than keeping both", () => {
    const again = withPrediction(written, "lesson-13-predict", {
      question: 1,
      confidence: 1,
      answer: "Actually, no idea.",
      on: "2026-08-22",
    })

    expect(predictionsFor(again, "lesson-13-predict")).toHaveLength(2)
    expect(predictionsFor(again, "lesson-13-predict")[0]?.confidence).toBe(1)
  })

  /**
   * The rating is the whole point of storing these: it was given before the
   * lesson, and it is what the grade at Reflect is paired against.
   */
  it("survives a round trip through the store, rating and all", () => {
    const back = readProgress(JSON.parse(JSON.stringify(written)))

    expect(predictionsFor(back, "lesson-13-predict")[0]).toEqual({
      question: 1,
      confidence: 4,
      answer: "A counter.",
      on: "2026-08-22",
    })
  })

  it("reads a record written before predictions existed, and one corrupted since", () => {
    expect(readProgress({ lessons: {}, sets: {} }).predictions).toEqual({})
    expect(
      predictionsFor(
        readProgress({ predictions: { "lesson-13-predict": [{ question: 1, confidence: 9 }, null] } }),
        "lesson-13-predict"
      )
    ).toEqual([])
  })
})
