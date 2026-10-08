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

const said = (standing: AskStanding): WillSay => ({
  lead: "…",
  detail: "…",
  moves: standing === "on-its-own",
  standing,
  /** The split counts verdicts, and a direction is not one. */
  putsBack: false,
})

const of = (...standings: readonly AskStanding[]) => howManyWaitForYou(standings.map(said))

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
})
