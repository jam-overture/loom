import { audienceIdSchema } from "../../src/audience/audience.js"
import { parseReaderSignalBatch } from "../../src/signals/signal.js"

import { goalRateOn } from "./effect.js"
import { START_GOAL, STARTS_HIGH, STARTS_LOW } from "./fixtures.js"
import { DAY_MS, readersOf, type ReadersOf } from "./readers.js"
import { FIRST_WORLD } from "./world.js"

const DAY_ZERO = Date.UTC(2026, 10, 16)

const given: ReadersOf = {
  world: FIRST_WORLD,
  seed: 1,
  tree: STARTS_LOW,
  goal: START_GOAL,
  day: 3,
  dayZero: DAY_ZERO,
  count: 400,
}

const views = readersOf(given)

const batches = views.flatMap((view) => view.batches)

describe("simulated readers", () => {
  it("send batches the door accepts", () => {
    expect(batches.length).toBeGreaterThan(views.length)
    batches.forEach((batch) => expect(parseReaderSignalBatch(batch).ok).toBe(true))
  })

  it("open each page view once, in its first batch, under one view key", () => {
    views.forEach((view) => {
      const keys = new Set(view.batches.map((batch) => batch.view))

      expect(keys.size).toBe(1)
      expect(view.batches.map((batch) => batch.first === true)).toEqual(
        view.batches.map((_, index) => index === 0)
      )
    })
    expect(new Set(views.map((view) => view.batches[0]?.view)).size).toBe(views.length)
  })

  it("arrive during the day they are simulated for, and send in order", () => {
    const start = DAY_ZERO + given.day * DAY_MS

    views.forEach((view) => {
      const sent = view.batches.map((batch) => batch.sentAt)

      expect(sent[0]).toBeGreaterThan(start)
      expect(sent).toEqual([...sent].sort((left, right) => left - right))
    })
    expect(Math.min(...batches.map((batch) => batch.sentAt))).toBeLessThan(start + DAY_MS)
  })

  it("never say which persona read", () => {
    const sent = JSON.stringify(batches)

    FIRST_WORLD.personas.forEach((persona) => expect(sent).not.toContain(persona.name))
  })

  it("are the same readers for the same seed, and different ones for another", () => {
    expect(readersOf(given)).toEqual(views)
    expect(readersOf({ ...given, seed: 2 })).not.toEqual(views)
  })

  it("read a page in meaningfully different ways", () => {
    const meanBands = (name: string): number => {
      const theirs = views.filter((view) => view.persona === name)

      return theirs.reduce((sum, view) => sum + view.batches.length, 0) / theirs.length
    }

    expect(meanBands("Developer comparing")).toBeGreaterThan(meanBands("Hurried phone reader") * 2)
    expect(meanBands("Returning user")).toBeLessThan(meanBands("Pricing checker"))
  })

  it("send the goal's signal, against the goal's part, exactly when they did the goal", () => {
    views.forEach((view) => {
      const sent = view.batches
        .flatMap((batch) => batch.signals)
        .filter((signal) => signal.kind === START_GOAL.kind && signal.nodeId === START_GOAL.nodeId)

      expect(sent).toHaveLength(view.didGoal ? 1 : 0)
    })
  })

  it("do the goal at the rate the world's rules add up to", () => {
    const many = readersOf({ ...given, tree: STARTS_HIGH, count: 20_000 })
    const rate = many.filter((view) => view.didGoal).length / many.length
    const expected = goalRateOn(FIRST_WORLD, STARTS_HIGH, START_GOAL, given.day)
    const fourErrors = 4 * Math.sqrt((expected * (1 - expected)) / many.length)

    expect(Math.abs(rate - expected)).toBeLessThan(fourErrors)
  })

  it("carry the audience a site would sort them into, and nothing else about them", () => {
    const phones = audienceIdSchema.parse("aud_phones")
    const sorted = readersOf({
      ...given,
      count: 50,
      world: {
        ...FIRST_WORLD,
        audienceOf: (traits) => (traits.device === "phone" ? phones : undefined),
      },
    })
    const audiences = new Set(sorted.flatMap((view) => view.batches.map((batch) => batch.audience)))

    expect(audiences).toEqual(new Set([phones, undefined]))
    sorted
      .flatMap((view) => view.batches)
      .filter((batch) => batch.audience === undefined)
      .forEach((batch) => expect("audience" in batch).toBe(false))
  })
})
