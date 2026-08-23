import type { LoomTree } from "@loom/runtime"
import { describe, expect, it } from "vitest"

import { readChangeSequence, runHistory } from "./adapt/history"
import { BAND } from "./bands"
import { bandsOf, outlineDiff, outlineOf, type OutlineRow } from "./outline"
import { treeFor } from "./render"
import { DEFAULT_THEME, HOME } from "./site"

/**
 * The outline, held against the page it claims to describe.
 *
 * It is the half of the record that cannot be written in advance: the list of
 * requests says what was asked for, and this says what the page is now. A
 * record whose two halves could disagree would be worth less than either.
 */

const ORIGIN = "https://loom.example"

const front = (): LoomTree => treeFor(HOME, { origin: ORIGIN, theme: DEFAULT_THEME })

const after = async (changes: string) =>
  runHistory(front(), readChangeSequence(changes))

const rowFor = (rows: readonly OutlineRow[], name: string): OutlineRow | undefined =>
  rows.find((row) => row.name === name)

describe("the front door's outline", () => {
  const page = front()

  it("names the bands a visitor actually meets, in the order they meet them", () => {
    const names = outlineOf(page)

    expect(names[0]).toBe("The menu")
    expect(names[1]).toBe("The opening")
    expect(names[names.length - 1]).toBe("The foot of the page, and the way out")
    expect(names).toContain(BAND.seeItHappen)
    expect(names).toContain(BAND.problems)
    expect(names).toContain(BAND.questions)
  })

  /**
   * The drift guard, and the reason this is a list rather than a count.
   *
   * A band added to the front door with no eyebrow, no label and no heading
   * would vanish from the outline silently, and the record page would show a
   * page with a hole in it while every other test still passed. The only thing
   * a row may be missing for is being a rule between two sections.
   */
  it("has a row for every band except the rules between them", () => {
    const bands = page.root.children.filter((child) => child.kind === "element")
    const rules = bands.filter((band) => band.kind === "element" && band.type === "loom.divider")

    expect(bandsOf(page)).toHaveLength(bands.length - rules.length)
  })

  it("says nothing happened to a page nothing happened to", () => {
    const rows = outlineDiff(page, page)

    expect(rows.map((row) => row.state)).toEqual(rows.map(() => "kept"))
    expect(rows.every((row) => row.note === undefined)).toBe(true)
  })
})

describe("what the outline says a change did", () => {
  it("marks a band that has been taken off the page", async () => {
    const history = await after("shorter")
    const rows = outlineDiff(history.start, history.page)
    const questions = rowFor(rows, BAND.questions)

    expect(questions).toEqual({
      name: BAND.questions,
      state: "taken-away",
      note: "taken off the page",
    })
    /** Last, so the rows above it are the page as it now reads, in order. */
    expect(rows[rows.length - 1]).toBe(questions)
  })

  it("marks a band that was not there when the visitor arrived", async () => {
    const history = await after("proof")
    const rows = outlineDiff(history.start, history.page)
    const added = rows.filter((row) => row.state === "added")

    expect(added).toHaveLength(1)
    expect(added[0]?.note).toBe("not here when you arrived")
    expect(outlineOf(history.start)).not.toContain(added[0]?.name)
  })

  /**
   * A move keeps the band, so the outline has to say *moved* rather than one
   * band gone and another arrived. That is the difference between the page
   * having been rearranged and the page having been rewritten, and it is the
   * claim the request itself makes in words.
   */
  it("marks a band that is the same band, further up", async () => {
    const history = await after("problem-yes")
    const rows = outlineDiff(history.start, history.page)
    const moved = rows.filter((row) => row.state === "moved")

    expect(moved.map((row) => row.name)).toContain(BAND.problems)
    expect(rowFor(rows, BAND.problems)?.note).toBe("moved up the page")
    expect(rows.filter((row) => row.state === "added")).toEqual([])
    expect(rows.filter((row) => row.state === "taken-away")).toEqual([])
  })

  it("reads the outline off the changed page rather than off the requests", async () => {
    const history = await after("drop-pitch")
    const rows = outlineDiff(history.start, history.page)

    /** The request asked for that band to go and the rules refused, so it stays. */
    expect(history.steps[0]?.record.verdict).toBe("refused")
    expect(rowFor(rows, BAND.problems)?.state).toBe("kept")
  })

  it("keeps every band of the changed page, in its order", async () => {
    const history = await after("proof.problem-yes.shorter")
    const rows = outlineDiff(history.start, history.page)
    const present = rows.filter((row) => row.state !== "taken-away").map((row) => row.name)

    expect(present).toEqual(outlineOf(history.page))
  })
})
