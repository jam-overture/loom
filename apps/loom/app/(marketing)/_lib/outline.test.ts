import type { LoomTree } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { askById, type AskId } from "./adapt/asks"
import { runAsk, type AskRun } from "./adapt/run"
import { BAND, MECHANISM_BAND, MECHANISM_SHORT_ANSWERS } from "./bands"
import { bandsOf, outlineDiff, outlineOf, type OutlineRow } from "./outline"
import { treeFor } from "./render"
import { DEFAULT_THEME, HOW_IT_WORKS } from "./site"

/**
 * The outline, held against the page it claims to describe.
 *
 * It is the half of the record that cannot be written in advance: the list of
 * requests says what was asked for, and this says what the page is now. A
 * record whose two halves could disagree would be worth less than either.
 */

const ORIGIN = "https://loom.example"

const front = (): LoomTree => treeFor(HOW_IT_WORKS, { origin: ORIGIN, theme: DEFAULT_THEME })

/**
 * The page before and after one request, which is all this file ever needed.
 *
 * It went through `runHistory` until 26 September, because the record page
 * replayed sequences and this borrowed its machinery to build a two-state
 * fixture. That page is retired and the machinery with it; a single ask against
 * the published front door is the same fixture with nothing in between.
 */
const after = async (...asks: readonly (readonly [AskId, boolean])[]) => {
  const start = front()
  const steps: AskRun[] = []
  let page = start

  for (const [id, approve] of asks) {
    const chosen = askById(id)

    if (chosen === undefined) throw new Error(`loom: no ask called ${id}`)

    const run = await runAsk(page, chosen, approve)

    steps.push(run)
    page = run.page
  }

  return { start, page, steps }
}

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
    expect(names).toContain(MECHANISM_BAND.journey)
    expect(names).toContain(MECHANISM_BAND.whoAsks)
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
  /**
   * **Approved, because this request is now held.** *I don't have long* takes
   * all four short answers away at once, and that is enough of the page in one
   * go that the rules stop and ask a person first. Without the yes, nothing is
   * removed and the outline is right to say every band is kept — which is what
   * this assertion caught when the five choices moved to this page on 1 October.
   */
  it("marks a band that has been taken off the page", async () => {
    const history = await after(["shorter", true])
    const rows = outlineDiff(history.start, history.page)

    /**
     * **All four, not one.** This request took a single band away until the five
     * choices moved to this page; it now takes the four short answers together,
     * which is what makes it the held one. So the assertion is over the set.
     */
    for (const eyebrow of MECHANISM_SHORT_ANSWERS) {
      expect(rowFor(rows, eyebrow)).toEqual({
        name: eyebrow,
        state: "taken-away",
        note: "taken off the page",
      })
    }

    /**
     * Last, so the rows above them are the page as it now reads, in order. Four
     * rows rather than one, and still the tail: a taken-away band has no place
     * left on the page, so it cannot be interleaved with the bands that do.
     */
    const tail = rows.slice(-MECHANISM_SHORT_ANSWERS.length)

    expect(tail.map((row) => row.state)).toEqual(MECHANISM_SHORT_ANSWERS.map(() => "taken-away"))
    expect([...tail.map((row) => row.name)].sort()).toEqual([...MECHANISM_SHORT_ANSWERS].sort())
  })

  it("marks a band that was not there when the visitor arrived", async () => {
    const history = await after(["proof", false])
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
    const history = await after(["problem", true])
    const rows = outlineDiff(history.start, history.page)
    const moved = rows.filter((row) => row.state === "moved")

    expect(moved.map((row) => row.name)).toContain(MECHANISM_BAND.puttingItBack)
    expect(rowFor(rows, MECHANISM_BAND.puttingItBack)?.note).toBe("moved up the page")
    expect(rows.filter((row) => row.state === "added")).toEqual([])
    expect(rows.filter((row) => row.state === "taken-away")).toEqual([])
  })

  it("reads the outline off the changed page rather than off the requests", async () => {
    const history = await after(["drop-pitch", false])
    const rows = outlineDiff(history.start, history.page)

    /** The request asked for that band to go and the rules refused, so it stays. */
    expect(history.steps[0]?.record.verdict).toBe("refused")
    expect(rowFor(rows, MECHANISM_BAND.puttingItBack)?.state).toBe("kept")
  })

  it("keeps every band of the changed page, in its order", async () => {
    const history = await after(["proof", false], ["problem", true], ["shorter", false])
    const rows = outlineDiff(history.start, history.page)
    const present = rows.filter((row) => row.state !== "taken-away").map((row) => row.name)

    expect(present).toEqual(outlineOf(history.page))
  })
})
