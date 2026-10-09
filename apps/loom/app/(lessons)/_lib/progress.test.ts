import { describe, expect, it } from "vitest"

import { calibrationOf, secondLookOf, sittingMisses } from "./calibration"
import {
  EMPTY_PROGRESS,
  explanationsFor,
  predictionsFor,
  readProgress,
  setProgress,
  withAttempt,
  withExplanation,
  withLessonWorkedThrough,
  withCorrection,
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

describe("calibration on a second look", () => {
  /**
   * One sitting, three misses, and a month of coming back to them.
   *
   * `set-a#1` is the case the whole fold exists for: rated 5, missed, looked up,
   * re-answered a day later at 5, and missed again. `set-a#2` is the ordinary
   * recovery — sure and wrong, then got. `set-b#1` was never confident, so its
   * re-answer rated 4 and missed belongs in `sureAndWrong` and not in `twice`.
   */
  const sat = [
    ["set-a", attempt(1, 5, "missed")],
    ["set-a", attempt(2, 4, "missed")],
    ["set-b", attempt(1, 2, "missed")],
  ].reduce(
    (record, [slug, each]) => withAttempt(record, slug as string, each as Attempt),
    EMPTY_PROGRESS
  )

  const reanswer = (
    set: string,
    question: number,
    confidence: 1 | 2 | 3 | 4 | 5,
    grade: Attempt["grade"],
    on: string
  ) => ({ set, question, confidence, answer: "from memory", grade, on })

  const progress = [
    reanswer("set-a", 1, 5, "missed", "2026-03-10"),
    reanswer("set-a", 2, 3, "got-it", "2026-03-10"),
    reanswer("set-b", 1, 4, "partly", "2026-03-11"),
  ].reduce((record, each) => withCorrection(record, each), sat)

  it("counts re-answers as their own population rather than as attempts", () => {
    const second = secondLookOf(progress)

    expect(second.reanswers).toBe(3)
    expect(second.right).toBe(1)
    expect(calibrationOf(progress).attempts).toBe(3)
  })

  /**
   * The assertion the whole separation is for. Folding corrections into the
   * first reading would raise `attempts` to six and make the bands a figure
   * about two populations — one rated cold, one rated after a lookup — with
   * nothing in the figure saying which.
   */
  it("leaves the first reading exactly as it was", () => {
    expect(calibrationOf(progress)).toEqual(calibrationOf(sat))
  })

  it("names the re-answers the reader was sure about and still wrong about", () => {
    expect(
      secondLookOf(progress).sureAndWrong.map((relapse) => `${relapse.set}#${relapse.question}`)
    ).toEqual(["set-a#1", "set-b#1"])
  })

  it("counts separately the ones that were confident the first time too", () => {
    expect(secondLookOf(progress).twice).toBe(1)
  })

  /**
   * Being unsure, missing, reading it, and coming back unsure is the schedule
   * working. It is not a relapse and must not be counted as one, on the same
   * threshold `comesBack` uses.
   */
  it("says nothing about a re-answer the reader did not claim to know", () => {
    const unsure = withCorrection(sat, reanswer("set-a", 1, 2, "missed", "2026-03-10"))

    expect(secondLookOf(unsure).sureAndWrong).toEqual([])
    expect(secondLookOf(unsure).reanswers).toBe(1)
  })

  it("bands the way back by the rating given on the way back", () => {
    expect(secondLookOf(progress).bands.map((band) => band.attempts)).toEqual([0, 0, 1, 1, 1])
  })

  it("puts a belief that survived contradiction above whatever happened yesterday", () => {
    const later = withCorrection(sat, reanswer("set-b", 1, 5, "missed", "2026-03-20"))
    const both = withCorrection(later, reanswer("set-a", 1, 4, "missed", "2026-03-12"))

    expect(both.corrections.map((each) => each.on)).toEqual(["2026-03-20", "2026-03-12"])
    expect(secondLookOf(both).sureAndWrong.map((relapse) => relapse.set)).toEqual([
      "set-a",
      "set-b",
    ])
  })

  it("says nothing at all about a reader who has never come back", () => {
    expect(secondLookOf(EMPTY_PROGRESS)).toMatchObject({
      reanswers: 0,
      right: 0,
      sureAndWrong: [],
      twice: 0,
    })
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

describe("explanations, which nothing grades and nothing rates", () => {
  const written = withExplanation(EMPTY_PROGRESS, "lesson-31-explain-it-back", {
    question: 1,
    answer: "A closed set is a set somebody can be held to.",
    on: "2026-09-29",
  })

  it("files them under the lesson section they were written in", () => {
    expect(explanationsFor(written, "lesson-31-explain-it-back")).toHaveLength(1)
    expect(explanationsFor(written, "lesson-30-explain-it-back")).toEqual([])
  })

  it("replaces a rewritten explanation rather than keeping a draft beside it", () => {
    const again = withExplanation(written, "lesson-31-explain-it-back", {
      question: 1,
      answer: "Second go, better.",
      on: "2026-10-06",
    })

    expect(explanationsFor(again, "lesson-31-explain-it-back")).toHaveLength(1)
    expect(explanationsFor(again, "lesson-31-explain-it-back")[0]?.answer).toBe("Second go, better.")
  })

  /**
   * The absence of a confidence is the design and not an omission, so it is worth
   * one assertion: a rating added here later would be a number about how fluent
   * the explaining felt, which is the feeling this course exists to distrust.
   */
  it("carries no confidence through a round trip, and drops one somebody added", () => {
    const back = readProgress(JSON.parse(JSON.stringify(written)))

    expect(explanationsFor(back, "lesson-31-explain-it-back")[0]).toEqual({
      question: 1,
      answer: "A closed set is a set somebody can be held to.",
      on: "2026-09-29",
    })

    expect(
      explanationsFor(
        readProgress({
          explanations: { "lesson-31-explain-it-back": [{ question: 1, answer: "x", on: "2026-09-29", confidence: 5 }] },
        }),
        "lesson-31-explain-it-back"
      )[0]
    ).not.toHaveProperty("confidence")
  })

  /**
   * An empty answer is what "I can't explain this yet" records, and it has to
   * survive: a reader who said so is a different reader from one who wrote
   * nothing, and the comparison the section offers says which of the two it is
   * looking at.
   */
  it("keeps an explanation that says nothing, and drops one that is not legible", () => {
    expect(
      explanationsFor(
        readProgress({
          explanations: {
            "lesson-31-explain-it-back": [
              { question: 1, answer: "", on: "2026-09-29" },
              { question: 2, on: "not a day" },
              null,
            ],
          },
        }),
        "lesson-31-explain-it-back"
      )
    ).toEqual([{ question: 1, answer: "", on: "2026-09-29" }])
  })

  it("reads a record written before explanations existed", () => {
    expect(readProgress({ lessons: {}, sets: {} }).explanations).toEqual({})
  })
})
