import { describe, expect, it } from "vitest"

import { calibrationOf } from "./calibration"
import {
  CORRECTION_GAPS,
  SITTING,
  correctionQueue,
  correctionSitting,
  dueCorrections,
  nextCorrection,
} from "./corrections"
import {
  EMPTY_PROGRESS,
  readProgress,
  withAttempt,
  withCorrection,
  type Confidence,
  type Grade,
  type Progress,
} from "./progress"

const missed = (
  progress: Progress,
  slug: string,
  question: number,
  confidence: Confidence,
  on: string,
  grade: Grade = "missed"
): Progress => withAttempt(progress, slug, { question, confidence, answer: "", grade, on })

const corrected = (
  progress: Progress,
  slug: string,
  question: number,
  grade: Grade,
  on: string
): Progress =>
  withCorrection(progress, { set: slug, question, confidence: 3, answer: "something", grade, on })

/** One question, missed on the 1st while feeling certain about it. */
const oneMiss = missed(EMPTY_PROGRESS, "set-d", 7, 5, "2026-03-01")

describe("when a missed question comes back", () => {
  it("is due the day after the sitting, which is what the schedule says", () => {
    expect(correctionQueue(oneMiss, "2026-03-01")[0]?.status).toBe("upcoming")
    expect(correctionQueue(oneMiss, "2026-03-02")[0]?.status).toBe("due")
    expect(correctionQueue(oneMiss, "2026-03-02")[0]?.dueOn).toBe("2026-03-02")
  })

  it("does not come back the same day it was missed", () => {
    expect(dueCorrections(correctionQueue(oneMiss, "2026-03-01"))).toHaveLength(0)
  })

  it("counts the days it is late, so the oldest miss is offered first", () => {
    const late = correctionQueue(oneMiss, "2026-03-20")[0]

    expect(late?.overdueBy).toBe(18)
  })

  it("takes a partial answer as a miss", () => {
    const partly = missed(EMPTY_PROGRESS, "set-c", 2, 3, "2026-03-01", "partly")

    expect(dueCorrections(correctionQueue(partly, "2026-03-02"))).toHaveLength(1)
  })

  it("leaves a question that was got alone", () => {
    const got = missed(EMPTY_PROGRESS, "set-c", 2, 3, "2026-03-01", "got-it")

    expect(correctionQueue(got, "2026-03-30")).toHaveLength(0)
  })
})

describe("the gaps between one retrieval and the next", () => {
  it("widens after each clean one, and retires the question after three", () => {
    const first = corrected(oneMiss, "set-d", 7, "got-it", "2026-03-02")
    expect(correctionQueue(first, "2026-03-08")[0]?.status).toBe("upcoming")
    expect(correctionQueue(first, "2026-03-09")[0]?.dueOn).toBe("2026-03-09")

    const second = corrected(first, "set-d", 7, "got-it", "2026-03-09")
    expect(correctionQueue(second, "2026-03-09")[0]?.dueOn).toBe("2026-04-08")

    const third = corrected(second, "set-d", 7, "got-it", "2026-04-08")
    expect(correctionQueue(third, "2027-01-01")).toHaveLength(0)
  })

  it("uses the gaps in the order they are declared", () => {
    expect(CORRECTION_GAPS).toEqual([1, 7, 30])
  })

  it("sends a question back to the beginning when it is missed again", () => {
    const twice = corrected(corrected(oneMiss, "set-d", 7, "got-it", "2026-03-02"), "set-d", 7, "missed", "2026-03-09")
    const back = correctionQueue(twice, "2026-03-10")[0]

    expect(back?.done).toBe(0)
    expect(back?.dueOn).toBe("2026-03-10")
  })

  it("treats a half-remembered answer as a miss rather than progress", () => {
    const partly = corrected(oneMiss, "set-d", 7, "partly", "2026-03-02")

    expect(correctionQueue(partly, "2026-03-03")[0]?.done).toBe(0)
  })
})

describe("a question missed again long after it was retired", () => {
  const retired = ["2026-03-02", "2026-03-09", "2026-04-08"].reduce(
    (progress, on) => corrected(progress, "set-d", 7, "got-it", on),
    oneMiss
  )

  it("is retired while the miss it answered is the one on record", () => {
    expect(correctionQueue(retired, "2026-06-01")).toHaveLength(0)
  })

  /**
   * A later go at the whole set replaces the attempt, so the question is
   * missed as of a new day. The three retrievals that retired it are still in
   * the record and must not count — they answered an older miss, and letting
   * them stand would retire this one on the strength of a retrieval from June.
   */
  it("starts again from nothing when the set is redone and missed", () => {
    const again = missed(retired, "set-d", 7, 4, "2026-06-01")
    const back = correctionQueue(again, "2026-06-02")[0]

    expect(back?.done).toBe(0)
    expect(back?.status).toBe("due")
  })
})

describe("what the sitting offers", () => {
  const many = Array.from({ length: 9 }, (_, index) => index).reduce(
    (progress, index) =>
      missed(progress, `set-${String.fromCharCode(97 + index)}`, 1, index < 2 ? 5 : 2, "2026-03-01"),
    EMPTY_PROGRESS
  )

  it("hands over five at a time and holds the rest back", () => {
    const queue = correctionQueue(many, "2026-03-05")

    expect(dueCorrections(queue)).toHaveLength(9)
    expect(correctionSitting(queue)).toHaveLength(SITTING)
  })

  it("puts what the reader was sure about and wrong about first", () => {
    const sitting = correctionSitting(correctionQueue(many, "2026-03-05"))

    expect(sitting.slice(0, 2).map((correction) => correction.confidence)).toEqual([5, 5])
  })

  it("names the next one to come round when nothing is due", () => {
    const queue = correctionQueue(oneMiss, "2026-03-01")

    expect(nextCorrection(queue)?.inDays).toBe(1)
  })
})

describe("what a correction does not touch", () => {
  /**
   * The point of keeping corrections apart from attempts. Getting a question
   * right at last must not delete the fact that it was once answered with
   * confidence and wrong — that pair is what the schedule calls the real study
   * plan, and it is a thing that happened.
   */
  it("leaves the confident-and-wrong record exactly where it was", () => {
    const before = calibrationOf(oneMiss).confidentAndWrong
    const after = calibrationOf(corrected(oneMiss, "set-d", 7, "got-it", "2026-03-02"))

    expect(before).toHaveLength(1)
    expect(after.confidentAndWrong).toEqual(before)
    expect(after.attempts).toBe(1)
  })

  it("keeps every re-answer rather than replacing the last one", () => {
    const twice = corrected(corrected(oneMiss, "set-d", 7, "missed", "2026-03-02"), "set-d", 7, "got-it", "2026-03-03")

    expect(twice.corrections).toHaveLength(2)
  })
})

describe("a record written before corrections existed", () => {
  it("reads as one with none, rather than as no record at all", () => {
    const old = readProgress({
      lessons: { "4": "2026-03-01" },
      sets: { "set-d": { attempts: [], completedOn: "2026-03-03" } },
    })

    expect(old.corrections).toEqual([])
    expect(old.lessons["4"]).toBe("2026-03-01")
  })

  it("drops a correction it cannot read and keeps the ones it can", () => {
    const mixed = readProgress({
      corrections: [
        { set: "set-d", question: 7, confidence: 3, grade: "got-it", on: "2026-03-02" },
        { set: "set-d", question: 7, confidence: 9, grade: "got-it", on: "2026-03-09" },
        { question: 7, confidence: 3, grade: "got-it", on: "2026-03-16" },
        "not an object",
      ],
    })

    expect(mixed.corrections).toHaveLength(1)
    expect(mixed.corrections[0]?.on).toBe("2026-03-02")
  })
})
