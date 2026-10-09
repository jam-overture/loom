import { describe, expect, it } from "vitest"

import { howManyWaitForYou } from "./how-many-wait-for-you"
import type { AskStanding, WillSay } from "./what-it-will-say"

/**
 * The counting half, with no pipeline anywhere.
 *
 * `what-it-will-say.test.ts` holds that the verdicts are real and
 * `pipeline.test.ts` holds that the count of them matches what the write path
 * actually does. What is held here is the **sentence**: that it says what the
 * answers say, in the grammar it claims, and that it stays quiet where it has
 * nothing worth saying.
 */

const said = (standing: AskStanding, putsBack = false): WillSay => ({
  lead: "…",
  detail: "…",
  moves: standing === "on-its-own",
  standing,
  putsBack,
})

const of = (...standings: readonly AskStanding[]) =>
  howManyWaitForYou(standings.map((standing) => said(standing)))

/**
 * The same list, with the first answer marked as the one that would only put
 * the visitor's last change back — which is the screen one press of a toggle
 * produces and the only screen where the two clauses say different things.
 */
const afterATogglePress = (...standings: readonly AskStanding[]) =>
  howManyWaitForYou(standings.map((standing, i) => said(standing, i === 0)))

describe("howManyWaitForYou", () => {
  it("counts the answers rather than describing them", () => {
    const split = of("on-its-own", "on-its-own", "asks-you", "asks-you", "asks-you")

    expect(split?.total).toBe(5)
    expect(split?.onItsOwn).toBe(2)
    expect(split?.asksYou).toBe(3)
    expect(split?.refuses).toBe(0)
  })

  /**
   * The sentence the arrival screen leads with, and the reason this module
   * exists: a claim a stranger can check against the rows under it fifteen
   * seconds later, rather than one they can only be told.
   */
  it("says the split in plain words, with both numbers in it", () => {
    const split = of("on-its-own", "on-its-own", "asks-you", "asks-you", "asks-you")

    expect(split?.sentence).toBe(
      "You can ask for 5 changes here. Loom will make 2 on its own and ask you first about 3."
    )
  })

  /** Best news first, and it is the same order whichever way the table falls. */
  it("reads what Loom does unattended before what it stops for", () => {
    const split = of("asks-you", "asks-you", "on-its-own")

    expect(split?.sentence).toContain("make 1 on its own and ask you first about 2")
  })

  it("says all of them when every answer is the same", () => {
    expect(of("asks-you", "asks-you", "asks-you")?.sentence).toBe(
      "You can ask for 3 changes here. Loom will ask you first about all 3."
    )
    expect(of("on-its-own", "on-its-own")?.sentence).toBe(
      "You can ask for 2 changes here. Loom will make all 2 on its own."
    )
  })

  /**
   * Three clauses cannot happen on the shipped preset table — nothing in it is
   * refused against the starting page — and the grammar is held anyway,
   * because a table somebody adds to can reach it and a sentence that reads
   * *make 2 on its own, ask you first about 2 refuse 1* is the kind of defect
   * nothing fails on.
   */
  it("joins three answers with commas and a final and", () => {
    const split = of("on-its-own", "on-its-own", "asks-you", "asks-you", "refuses")

    expect(split?.sentence).toBe(
      "You can ask for 5 changes here. Loom will make 2 on its own, ask you first about 2, and refuse 1."
    )
    expect(split?.refuses).toBe(1)
  })

  /**
   * Silence rather than a hedge, twice — the restraint `willSayOf` keeps one
   * level down and `weighedOf` keeps one screen later.
   *
   * A split of one is not a split: the panel already carries that ask's own
   * verdict under its own button, in more exact words, and a second sentence
   * saying *you can ask for 1 change here* above it is the record restated
   * rather than disclosed.
   */
  it("says nothing about one ask, or none", () => {
    expect(of("asks-you")).toBeUndefined()
    expect(of()).toBeUndefined()
  })

  it("counts only the asks that reached a verdict", () => {
    const split = of("on-its-own", "asks-you")

    expect(split?.total).toBe(2)
    expect(split?.sentence).toContain("ask for 2 changes here")
  })

  /**
   * The screen this run exists for.
   *
   * A visitor who pressed *Re-theme the whole page* has made one of five
   * changes, and both unattended presets are toggles, so the ask comes back
   * onto the panel in the other direction. Counted flat, the sentence said
   * **five** in the same words it used before the press.
   */
  it("stops counting the way back as a change still to ask for", () => {
    const split = afterATogglePress(
      "on-its-own",
      "on-its-own",
      "asks-you",
      "asks-you",
      "asks-you"
    )

    expect(split?.sentence).toBe(
      "You can ask for 4 more changes here, and put the last one back." +
        " Loom will make 2 on its own and ask you first about 3."
    )
  })

  /**
   * The restraint, and the reason the chip on the row did not move either
   * (`what-each-row-says.ts`). The way back is weighed like any other ask, so
   * it is still one of the five the second clause divides by verdict — two
   * partitions of one list, which is the pair the row under it already
   * carries.
   */
  it("still counts the way back in what Loom will do about it", () => {
    const split = afterATogglePress(
      "on-its-own",
      "on-its-own",
      "asks-you",
      "asks-you",
      "asks-you"
    )

    expect(split?.total).toBe(5)
    expect(split?.onItsOwn).toBe(2)
    expect(split?.asksYou).toBe(3)
    expect(split?.putsBack).toBe(1)
  })

  /** One forward ask is *1 more change*, and the way back stays singular. */
  it("says one more change in the singular", () => {
    expect(afterATogglePress("on-its-own", "asks-you")?.sentence).toBe(
      "You can ask for 1 more change here, and put the last one back." +
        " Loom will make 1 on its own and ask you first about 1."
    )
  })

  /**
   * *The last one* names the visitor's last change, which there is exactly one
   * of however many presses would reverse it — so the clause does not become
   * plural, and only the count of forward asks comes down.
   */
  it("names one change however many asks would put it back", () => {
    const split = howManyWaitForYou([
      said("on-its-own", true),
      said("on-its-own", true),
      said("asks-you"),
    ])

    expect(split?.putsBack).toBe(2)
    expect(split?.sentence).toContain("ask for 1 more change here, and put the last one back")
  })

  /**
   * Unreachable on the shipped preset table and held anyway, for the reason
   * the three-clause grammar above is: *you can ask for 0 more changes here*
   * is the kind of defect nothing fails on.
   */
  it("names only the way back when nothing left would move the page on", () => {
    const split = howManyWaitForYou([said("on-its-own", true), said("on-its-own", true)])

    expect(split?.sentence).toBe(
      "You can put your last change back here. Loom will make all 2 on its own."
    )
  })

  /**
   * The arrival screen, byte for byte. `putsBack` is `false` on every answer
   * before anything has been pressed, because there is no last change to
   * reverse.
   */
  it("says the arrival screen's sentence unchanged when nothing would put anything back", () => {
    expect(of("on-its-own", "on-its-own", "asks-you", "asks-you", "asks-you")?.sentence).toBe(
      "You can ask for 5 changes here. Loom will make 2 on its own and ask you first about 3."
    )
    expect(of("on-its-own", "on-its-own", "asks-you", "asks-you", "asks-you")?.putsBack).toBe(0)
  })
})
