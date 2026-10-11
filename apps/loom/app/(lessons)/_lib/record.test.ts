import { describe, expect, it } from "vitest"

import {
  RECORD_FORMAT,
  describeMerge,
  isEmptyRecord,
  mergeRecords,
  packRecord,
  summariseRecord,
  unpackRecord,
} from "./record"
import {
  EMPTY_PROGRESS,
  type Attempt,
  type Correction,
  type Explanation,
  type Progress,
} from "./progress"

/**
 * The rules an import is allowed to have.
 *
 * Every test here is about the same worry: a merge that invents history. The
 * record is the only copy of two things that cannot be reconstructed — when a
 * lesson was actually worked through, and how many times a missed question has
 * been retrieved since — so a merge that moves a date forward, or that counts
 * one retrieval as two, has not lost data but done something worse. It has left
 * the reader a record that is confidently wrong about them.
 */

const attempt = (question: number, on: string, over: Partial<Attempt> = {}): Attempt => ({
  question,
  confidence: 3,
  answer: `answer to ${question} on ${on}`,
  grade: "missed",
  on,
  ...over,
})

const correction = (question: number, on: string, over: Partial<Correction> = {}): Correction => ({
  set: "set-a",
  question,
  confidence: 2,
  answer: `re-answer to ${question}`,
  grade: "got-it",
  on,
  ...over,
})

const explanation = (question: number, on: string, over: Partial<Explanation> = {}): Explanation => ({
  question,
  answer: `in my own words, ${question}, on ${on}`,
  on,
  ...over,
})

const progress = (over: Partial<Progress> = {}): Progress => ({ ...EMPTY_PROGRESS, ...over })

describe("reading a record back", () => {
  it("accepts a file this page wrote", () => {
    const mine = progress({ lessons: { "4": "2026-03-01" } })

    expect(unpackRecord(packRecord(mine, "2026-03-02"))).toEqual(mine)
  })

  it("accepts a bare record, because devtools was the only way out before this", () => {
    expect(unpackRecord({ lessons: { "4": "2026-03-01" } })?.lessons).toEqual({ "4": "2026-03-01" })
  })

  it("reads what is legible in a file that is partly not", () => {
    const read = unpackRecord({
      format: RECORD_FORMAT,
      version: 99,
      progress: {
        lessons: { "4": "2026-03-01", "5": "not a day", six: "2026-03-02" },
        sets: { "set-a": { attempts: [attempt(1, "2026-03-01"), { question: 2 }] } },
        corrections: "no",
      },
    })

    expect(read?.lessons).toEqual({ "4": "2026-03-01" })
    expect(read?.sets["set-a"]?.attempts).toHaveLength(1)
    expect(read?.corrections).toEqual([])
  })

  it("refuses what has no study history in it", () => {
    expect(unpackRecord({ hello: "world" })).toBeUndefined()
    expect(unpackRecord("[]")).toBeUndefined()
    expect(unpackRecord(packRecord(EMPTY_PROGRESS, "2026-03-02"))).toBeUndefined()
    expect(isEmptyRecord(EMPTY_PROGRESS)).toBe(true)
  })
})

describe("merging two machines", () => {
  it("keeps the earlier day a lesson was worked through", () => {
    const laptop = progress({ lessons: { "4": "2026-03-01", "5": "2026-03-08" } })
    const tablet = progress({ lessons: { "4": "2026-03-06", "6": "2026-03-09" } })

    expect(mergeRecords(laptop, tablet).lessons).toEqual({
      "4": "2026-03-01",
      "5": "2026-03-08",
      "6": "2026-03-09",
    })
  })

  it("lets a later attempt at a question replace an earlier one, in either direction", () => {
    const laptop = progress({
      sets: { "set-a": { attempts: [attempt(1, "2026-03-01"), attempt(2, "2026-03-09")], completedOn: "2026-03-09" } },
    })
    const tablet = progress({
      sets: { "set-a": { attempts: [attempt(1, "2026-03-05"), attempt(2, "2026-03-02")], completedOn: "2026-03-05" } },
    })

    const merged = mergeRecords(laptop, tablet).sets["set-a"]

    expect(merged?.attempts.map((each) => each.on)).toEqual(["2026-03-05", "2026-03-09"])
    /** The set was sat down and done on the 5th; hearing about it later does not move that. */
    expect(merged?.completedOn).toBe("2026-03-05")
  })

  it("changes nothing when two attempts claim the same day", () => {
    const held = progress({ sets: { "set-a": { attempts: [attempt(1, "2026-03-05", { answer: "mine" })], completedOn: undefined } } })
    const incoming = progress({ sets: { "set-a": { attempts: [attempt(1, "2026-03-05", { answer: "theirs" })], completedOn: undefined } } })

    expect(mergeRecords(held, incoming).sets["set-a"]?.attempts[0]?.answer).toBe("mine")
  })

  it("appends corrections rather than replacing them, because the count is the measurement", () => {
    const laptop = progress({ corrections: [correction(1, "2026-03-02")] })
    const tablet = progress({ corrections: [correction(1, "2026-03-09"), correction(1, "2026-04-08")] })

    expect(mergeRecords(laptop, tablet).corrections.map((each) => each.on)).toEqual([
      "2026-03-02",
      "2026-03-09",
      "2026-04-08",
    ])
  })

  it("does nothing at all the second time the same file is imported", () => {
    const mine = progress({
      lessons: { "4": "2026-03-01" },
      sets: { "set-a": { attempts: [attempt(1, "2026-03-03")], completedOn: "2026-03-03" } },
      predictions: { "lesson-04": [{ question: 1, confidence: 5, answer: "stale data", on: "2026-03-01" }] },
      corrections: [correction(1, "2026-03-04"), correction(1, "2026-03-11")],
    })

    const once = mergeRecords(EMPTY_PROGRESS, mine)

    expect(once).toEqual(mergeRecords(once, mine))
    expect(describeMerge(once, mine).nothingNew).toBe(true)
    expect(describeMerge(once, mine).corrections).toEqual({ added: 0, alreadyHeld: 2 })
  })

  it("merges into an empty record without changing it", () => {
    const mine = progress({
      lessons: { "9": "2026-03-01" },
      corrections: [correction(3, "2026-03-04")],
    })

    expect(mergeRecords(EMPTY_PROGRESS, mine)).toEqual(mine)
  })

  it("keeps a set only one machine has ever seen", () => {
    const laptop = progress({ sets: { "set-a": { attempts: [attempt(1, "2026-03-01")], completedOn: "2026-03-01" } } })
    const tablet = progress({ sets: { "set-b": { attempts: [attempt(1, "2026-03-02")], completedOn: "2026-03-02" } } })

    expect(Object.keys(mergeRecords(laptop, tablet).sets).sort()).toEqual(["set-a", "set-b"])
  })
})

describe("saying what an import would do before it does it", () => {
  const laptop = progress({
    lessons: { "4": "2026-03-01" },
    sets: { "set-a": { attempts: [attempt(1, "2026-03-03")], completedOn: "2026-03-03" } },
    corrections: [correction(1, "2026-03-04")],
  })

  const tablet = progress({
    lessons: { "4": "2026-02-25", "5": "2026-03-06" },
    sets: {
      "set-a": { attempts: [attempt(1, "2026-03-05"), attempt(2, "2026-03-05")], completedOn: "2026-03-05" },
      "set-b": { attempts: [attempt(1, "2026-03-07")], completedOn: "2026-03-07" },
    },
    corrections: [correction(1, "2026-03-04"), correction(1, "2026-03-12")],
  })

  it("counts an earlier date for a lesson already held as something the import brings", () => {
    expect(describeMerge(laptop, tablet).lessons).toEqual({ added: 2, alreadyHeld: 0 })
  })

  it("counts a replacement as added and an identical entry as already held", () => {
    const report = describeMerge(laptop, tablet)

    expect(report.attempts).toEqual({ added: 3, alreadyHeld: 0 })
    expect(report.sets).toEqual({ added: 1, alreadyHeld: 1 })
    expect(report.corrections).toEqual({ added: 1, alreadyHeld: 1 })
    expect(report.nothingNew).toBe(false)
  })

  it("agrees with the merge it describes", () => {
    const merged = mergeRecords(laptop, tablet)

    expect(merged.corrections).toHaveLength(2)
    expect(merged.sets["set-a"]?.attempts).toHaveLength(2)
    expect(merged.lessons["4"]).toBe("2026-02-25")
  })
})

describe("explanations, which replace rather than accumulate", () => {
  /**
   * The opposite rule to a correction's, and the reason is that there is no grade
   * to sort two of these by. Two machines holding two goes at explaining lesson 09
   * would merge into a document and an older draft of it, with nothing able to say
   * which was which.
   */
  it("keeps the later of two explanations of the same prompt", () => {
    const merged = mergeRecords(
      progress({ explanations: { "lesson-09-explain-it-back": [explanation(1, "2026-03-01")] } }),
      progress({
        explanations: {
          "lesson-09-explain-it-back": [explanation(1, "2026-04-01"), explanation(2, "2026-04-01")],
        },
      })
    )

    const kept = merged.explanations["lesson-09-explain-it-back"] ?? []

    expect(kept).toHaveLength(2)
    expect(kept[0]?.on).toBe("2026-04-01")
  })

  it("does not move an explanation backwards, whichever file was opened second", () => {
    const merged = mergeRecords(
      progress({ explanations: { "lesson-09-explain-it-back": [explanation(1, "2026-04-01")] } }),
      progress({ explanations: { "lesson-09-explain-it-back": [explanation(1, "2026-03-01")] } })
    )

    expect(merged.explanations["lesson-09-explain-it-back"]?.[0]?.on).toBe("2026-04-01")
  })

  it("reports them before applying them, and says nothing is new on a second import", () => {
    const incoming = progress({
      explanations: { "lesson-09-explain-it-back": [explanation(1, "2026-04-01")] },
    })

    expect(describeMerge(EMPTY_PROGRESS, incoming).explanations).toEqual({ added: 1, alreadyHeld: 0 })
    expect(describeMerge(EMPTY_PROGRESS, incoming).nothingNew).toBe(false)

    const merged = mergeRecords(EMPTY_PROGRESS, incoming)

    expect(describeMerge(merged, incoming).explanations).toEqual({ added: 0, alreadyHeld: 1 })
    expect(describeMerge(merged, incoming).nothingNew).toBe(true)
  })

  it("is history worth carrying, so a record holding only explanations is not empty", () => {
    expect(
      isEmptyRecord(
        progress({ explanations: { "lesson-09-explain-it-back": [explanation(1, "2026-04-01")] } })
      )
    ).toBe(false)
  })
})

describe("what the record page may show", () => {
  it("counts what is at stake without holding an answer", () => {
    const summary = summariseRecord(
      progress({
        lessons: { "4": "2026-03-01", "5": "2026-03-08" },
        sets: {
          "set-a": {
            attempts: [attempt(1, "2026-03-03", { confidence: 5 }), attempt(2, "2026-03-03", { grade: "got-it" })],
            completedOn: "2026-03-03",
          },
          "set-b": { attempts: [attempt(1, "2026-03-10")], completedOn: undefined },
        },
        corrections: [correction(1, "2026-03-04")],
      })
    )

    expect(summary).toEqual({
      lessons: 2,
      sets: 1,
      attempts: 3,
      predictions: 0,
      explanations: 0,
      corrections: 1,
      confidentAndWrong: 1,
      sureAgainAndWrong: 0,
      firstDay: "2026-03-01",
      lastDay: "2026-03-10",
      days: 5,
    })

    expect(JSON.stringify(summary)).not.toContain("answer to")
  })

  /**
   * An explanation is a day the reader worked, and the summary is what says how
   * much a cleared browser would cost. Leaving them out of the day set would
   * report a reader who only ever wrote explanations as having nothing at stake.
   */
  it("counts explanations, and the days they were written on", () => {
    const summary = summariseRecord(
      progress({
        explanations: {
          "lesson-09-explain-it-back": [explanation(1, "2026-03-11"), explanation(2, "2026-03-11")],
          "lesson-10-explain-it-back": [explanation(1, "2026-03-14")],
        },
      })
    )

    expect(summary.explanations).toBe(3)
    expect(summary.days).toBe(2)
    expect(summary.firstDay).toBe("2026-03-11")
    expect(summary.lastDay).toBe("2026-03-14")
  })

  it("has no dates to report for an empty record", () => {
    expect(summariseRecord(EMPTY_PROGRESS).firstDay).toBeUndefined()
    expect(summariseRecord(EMPTY_PROGRESS).days).toBe(0)
  })
})
