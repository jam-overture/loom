import { describe, expect, it } from "vitest"

import { calibrationOf } from "./calibration"
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
  whyNothingIsDue,
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

/**
 * The other half of the queue: the questions a lesson asks in its own pages.
 *
 * These were recorded, graded and queued from the day the lesson route
 * existed — `correctionQueue` walks every slug in the record and never asked
 * what kind it was. What did not exist was anything that could render one, so
 * the review index counted them and the sitting dropped them.
 */
describe("a lesson's own questions", () => {
  it("brings back a Self-check question, which is a plain retrieval failure", () => {
    const progress = missed(EMPTY_PROGRESS, "lesson-04-self-check", 2, 4, "2026-03-01")
    const queue = correctionQueue(progress, "2026-03-05")

    expect(queue.map((each) => keyOf(each.set, each.question))).toEqual(["lesson-04-self-check#2"])
    expect(dueCorrections(queue)).toHaveLength(1)
  })

  it("brings back a Warm-up question, which is the spacing already working", () => {
    const progress = missed(EMPTY_PROGRESS, "lesson-09-warm-up", 1, 2, "2026-03-01")

    expect(correctionQueue(progress, "2026-03-05")).toHaveLength(1)
  })

  /**
   * The one judgement in this file. Predict is written to be got wrong, and a
   * reader who says they do not know and turns out not to know has done the
   * exercise correctly — there is nothing to relearn, and three of these per
   * lesson would bury the misses that are real.
   */
  it("leaves an unconfident missed prediction alone", () => {
    const progress = missed(EMPTY_PROGRESS, "lesson-04-predict", 1, 2, "2026-03-01")

    expect(correctionQueue(progress, "2026-03-05")).toHaveLength(0)
  })

  it("brings back a prediction the reader was sure about, which is a belief and not a gap", () => {
    const progress = missed(EMPTY_PROGRESS, "lesson-04-predict", 1, 4, "2026-03-01")

    expect(correctionQueue(progress, "2026-03-05")).toHaveLength(1)
  })

  it("uses the same threshold to admit a prediction as it does to rank one", () => {
    const admitted = missed(EMPTY_PROGRESS, "lesson-04-predict", 1, 4, "2026-03-01")

    expect(correctionQueue(admitted, "2026-03-05").every(wasConfident)).toBe(true)
  })

  it("puts a lesson question and a set question in one sitting, ordered by confidence", () => {
    const both = missed(
      missed(EMPTY_PROGRESS, "set-d", 7, 2, "2026-03-01"),
      "lesson-04-self-check",
      2,
      5,
      "2026-03-01"
    )

    expect(correctionSitting(correctionQueue(both, "2026-03-05")).map((each) => each.set)).toEqual([
      "lesson-04-self-check",
      "set-d",
    ])
  })
})

describe("the questions the course no longer contains", () => {
  it("drops a key that points at nothing, so the index and the sitting agree", () => {
    const progress = missed(
      missed(EMPTY_PROGRESS, "set-d", 7, 5, "2026-03-01"),
      "lesson-04-self-check",
      99,
      5,
      "2026-03-01"
    )
    const queue = correctionQueue(progress, "2026-03-05")

    expect(queue).toHaveLength(2)
    expect(knownOnly(queue, new Set(["set-d#7"])).map((each) => each.set)).toEqual(["set-d"])
  })
})

/**
 * Why the queue is empty, which is the question this file could answer all
 * along and nothing asked it.
 *
 * Each of these is a reader with an empty corrections queue, and no two of them
 * should be told the same thing. The test that matters most is the last pair:
 * `unreadable` and `nothing-answered` produce identical `Progress` values — the
 * empty one — and are the two readings furthest apart in what they mean.
 */
describe("why there is nothing to re-answer", () => {
  const ALL = new Set(["set-d#7", "set-c#2", "lesson-04-self-check#2", "lesson-04-predict#1"])

  it("says nothing at all when something is due, so no reason can be drawn over work", () => {
    expect(whyNothingIsDue(oneMiss, "2026-03-05", ALL, true)).toBeUndefined()
  })

  it("refuses to read anything into an empty record nobody could read", () => {
    expect(whyNothingIsDue(EMPTY_PROGRESS, "2026-03-05", ALL, false)).toEqual({
      kind: "unreadable",
    })
  })

  it("tells the blank slate apart from it, on the same record", () => {
    expect(whyNothingIsDue(EMPTY_PROGRESS, "2026-03-05", ALL, true)).toEqual({
      kind: "nothing-answered",
    })
  })

  it("counts what is waiting, not only the next one", () => {
    const today = missed(
      missed(EMPTY_PROGRESS, "set-d", 7, 5, "2026-03-04"),
      "set-c",
      2,
      3,
      "2026-03-04"
    )

    expect(whyNothingIsDue(today, "2026-03-04", ALL, true)).toMatchObject({
      kind: "upcoming",
      waiting: 2,
    })
  })

  /**
   * The reading that reports a fault. `knownOnly` has dropped these since it was
   * written and the page said *nothing has come back*, which is the sentence a
   * reader with a clean sheet gets.
   */
  it("says a miss is waiting on a question the course no longer contains", () => {
    expect(whyNothingIsDue(oneMiss, "2026-03-05", new Set(["set-c#2"]), true)).toEqual({
      kind: "lost",
      lost: 1,
    })
  })

  it("prefers the fault to the achievement when a reader has both", () => {
    const retired = corrected(
      corrected(corrected(oneMiss, "set-d", 7, "got-it", "2026-03-02"), "set-d", 7, "got-it", "2026-03-09"),
      "set-d",
      7,
      "got-it",
      "2026-04-08"
    )
    const andLost = missed(retired, "set-z", 40, 5, "2026-03-01")

    expect(whyNothingIsDue(andLost, "2026-05-01", ALL, true)).toEqual({ kind: "lost", lost: 1 })
  })

  it("keeps the retired ones, which is the only evidence the queue worked", () => {
    const retired = corrected(
      corrected(corrected(oneMiss, "set-d", 7, "got-it", "2026-03-02"), "set-d", 7, "got-it", "2026-03-09"),
      "set-d",
      7,
      "got-it",
      "2026-04-08"
    )

    expect(correctionQueue(retired, "2026-05-01")).toHaveLength(0)
    expect(whyNothingIsDue(retired, "2026-05-01", ALL, true)).toEqual({ kind: "retired", retired: 1 })
  })

  /**
   * A reader who rated three predictions 2 and missed all three has an empty
   * queue *because the Predict section worked*. Telling them they have missed
   * nothing would be the page taking credit for the one thing the course asks
   * them to do badly on purpose.
   */
  it("separates a prediction missed on purpose from a clean sheet", () => {
    const unsure = missed(EMPTY_PROGRESS, "lesson-04-predict", 1, 2, "2026-03-01")

    expect(correctionQueue(unsure, "2026-03-05")).toHaveLength(0)
    expect(whyNothingIsDue(unsure, "2026-03-05", ALL, true)).toEqual({
      kind: "by-design",
      predictions: 1,
    })
  })

  it("calls a clean sheet a clean sheet, and counts what it is made of", () => {
    const got = missed(EMPTY_PROGRESS, "set-d", 7, 3, "2026-03-01", "got-it")

    expect(whyNothingIsDue(got, "2026-03-05", ALL, true)).toEqual({ kind: "no-misses", graded: 1 })
  })

  it("treats a half-remembered answer as a miss rather than as a clean sheet", () => {
    const partly = missed(EMPTY_PROGRESS, "lesson-04-predict", 1, 2, "2026-03-01", "partly")

    expect(whyNothingIsDue(partly, "2026-03-05", ALL, true)).toMatchObject({ kind: "by-design" })
  })
})
