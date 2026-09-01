import { describe, expect, it } from "vitest"

import { addDays, anchorFinishedOn, daysBetween, dueNow, dueOn, queueFor } from "./queue"
import { EMPTY_PROGRESS, withLessonWorkedThrough, withSetCompleted, type Progress } from "./progress"
import { REVIEW_SETS, reviewSet, type ReviewSet } from "./schedule"
import { PART_LESSONS } from "./syllabus"

const set = (letter: string): ReviewSet => {
  const found = reviewSet(`set-${letter.toLowerCase()}`)

  if (found === undefined) throw new Error(`no set ${letter}`)

  return found
}

const workedThrough = (lessons: readonly (readonly [number, string])[]): Progress =>
  lessons.reduce<Progress>(
    (progress, [lesson, on]) => withLessonWorkedThrough(progress, lesson, on),
    EMPTY_PROGRESS
  )

/** Part I is lessons 01–04; the reader finished it on the 10th. */
const partOneDone = workedThrough([
  [1, "2026-03-01"],
  [2, "2026-03-04"],
  [3, "2026-03-07"],
  [4, "2026-03-10"],
])

describe("when a set becomes due", () => {
  it("counts days from the lesson it is anchored to", () => {
    expect(dueOn(set("A"), workedThrough([[1, "2026-03-01"]]), PART_LESSONS)).toBe("2026-03-03")
    expect(dueOn(set("N"), workedThrough([[11, "2026-02-27"]]), PART_LESSONS)).toBe("2026-03-01")
  })

  it("has no date at all until its anchor is worked through", () => {
    expect(dueOn(set("A"), EMPTY_PROGRESS, PART_LESSONS)).toBeUndefined()
    expect(anchorFinishedOn(set("N"), partOneDone, PART_LESSONS)).toBeUndefined()
  })

  it("waits for the last lesson of a part, not the first", () => {
    expect(anchorFinishedOn(set("E"), partOneDone, PART_LESSONS)).toBe("2026-03-10")
    expect(dueOn(set("E"), partOneDone, PART_LESSONS)).toBe("2026-03-17")
    expect(dueOn(set("F"), partOneDone, PART_LESSONS)).toBe("2026-04-09")
  })

  it("refuses to schedule a part the reader is part-way through", () => {
    const three = workedThrough([
      [1, "2026-03-01"],
      [2, "2026-03-04"],
      [3, "2026-03-07"],
    ])

    expect(dueOn(set("E"), three, PART_LESSONS)).toBeUndefined()
  })

  it("crosses a month boundary the way a calendar does", () => {
    expect(addDays("2026-02-27", 2)).toBe("2026-03-01")
    expect(addDays("2026-03-10", 30)).toBe("2026-04-09")
    expect(daysBetween("2026-03-01", "2026-03-08")).toBe(7)
  })
})

describe("the queue on a given day", () => {
  it("calls a set due on the day it arrives, and every day after", () => {
    const progress = workedThrough([[1, "2026-03-01"]])
    const on = (today: string) =>
      queueFor([set("A")], progress, PART_LESSONS, today).map(
        (entry) => `${entry.status}/${entry.overdueBy}`
      )

    expect(on("2026-03-02")).toEqual(["upcoming/0"])
    expect(on("2026-03-03")).toEqual(["due/0"])
    expect(on("2026-03-09")).toEqual(["due/6"])
  })

  it("puts the most overdue first, then the soonest, then what has no date", () => {
    const progress = workedThrough([
      [1, "2026-03-01"],
      [2, "2026-03-06"],
    ])

    const order = queueFor([set("C"), set("B"), set("A")], progress, PART_LESSONS, "2026-03-08").map(
      (entry) => `${entry.set.letter}:${entry.status}`
    )

    expect(order).toEqual(["A:due", "B:due", "C:unscheduled"])
  })

  it("keeps a finished set out of the way without forgetting it", () => {
    const progress = withSetCompleted(workedThrough([[1, "2026-03-01"]]), "set-a", "2026-03-03")
    const [entry] = queueFor([set("A")], progress, PART_LESSONS, "2026-03-09")

    expect(entry?.status).toBe("done")
    expect(entry?.dueOn).toBe("2026-03-03")
    expect(dueNow(queueFor([set("A")], progress, PART_LESSONS, "2026-03-09"))).toEqual([])
  })

  it("leaves a reader who has done nothing with twenty-one sets and no queue", () => {
    const entries = queueFor(REVIEW_SETS, EMPTY_PROGRESS, PART_LESSONS, "2026-03-09")

    expect(entries).toHaveLength(21)
    expect(entries.every((entry) => entry.status === "unscheduled")).toBe(true)
    expect(dueNow(entries)).toEqual([])
  })

  it("gives a reader who has finished Part I exactly the sets Part I earns", () => {
    const entries = queueFor(REVIEW_SETS, partOneDone, PART_LESSONS, "2026-03-20")

    expect(dueNow(entries).map((entry) => entry.set.letter)).toEqual(["A", "B", "C", "D", "E"])
  })
})
