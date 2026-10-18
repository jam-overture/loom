import { describe, expect, it } from "vitest"

import { DEFAULT_AUDIENCE_ID } from "../audience/audience.js"
import { OTHER_TREE, RIDERS, SKIERS, TREE } from "../testing/reader-signal-contract.js"

import {
  audiencesIn,
  byAudience,
  comparedAudiencesOf,
  crossesAudiences,
  forAudience,
  readingKeyOf,
} from "./audiences.js"

/**
 * The split and the key, tested on plain rows: what is being decided here is
 * what counts as one population and what counts as one page, and neither needs
 * a tree to be wrong about.
 */

type Scoped = { readonly audienceId: typeof SKIERS; readonly at: number }

type Row = { readonly audienceId?: typeof SKIERS; readonly at: number }

const row = (audienceId: typeof SKIERS, at: number): Scoped => ({ audienceId, at })

/**
 * A row no store wrote, because a column it never carried is what every window
 * taken before 0284 looks like — and *nothing here says* is not `aud_everyone`.
 */
const unscoped = (at: number): Row => ({ at })

describe("audiencesIn", () => {
  it("names each audience once, in a stable order whatever order they arrived in", () => {
    expect(audiencesIn([row(RIDERS, 1), row(SKIERS, 2), row(RIDERS, 3)])).toEqual([RIDERS, SKIERS])
    expect(audiencesIn([row(SKIERS, 1), row(RIDERS, 2), row(SKIERS, 3)])).toEqual([RIDERS, SKIERS])
  })

  it("counts a row that names no audience as no audience, rather than as the default", () => {
    expect(audiencesIn([unscoped(1), unscoped(2)])).toEqual([])
    expect(audiencesIn([unscoped(1), row(SKIERS, 2)])).toEqual([SKIERS])
  })

  it("has nothing to say about an empty window", () => {
    expect(audiencesIn([])).toEqual([])
  })
})

describe("forAudience", () => {
  it("takes one audience's rows and leaves the other's", () => {
    const rows = [row(SKIERS, 1), row(RIDERS, 2), row(SKIERS, 3)]

    expect(forAudience(SKIERS, rows)).toEqual([row(SKIERS, 1), row(SKIERS, 3)])
    expect(forAudience(RIDERS, rows)).toEqual([row(RIDERS, 2)])
  })

  it("leaves a row that names no audience out of every audience's window", () => {
    expect(forAudience(DEFAULT_AUDIENCE_ID, [unscoped(1)])).toEqual([])
  })
})

describe("byAudience", () => {
  it("puts every row in exactly one window and loses none of them", () => {
    const rows = [row(SKIERS, 1), row(RIDERS, 2), row(SKIERS, 3), row(RIDERS, 4)]
    const windows = byAudience(rows)

    expect(windows.flatMap((window) => window.rows)).toHaveLength(rows.length)
    expect(new Set(windows.flatMap((window) => window.rows.map((one) => one.at)))).toEqual(
      new Set([1, 2, 3, 4])
    )
  })

  it("keeps each window's rows in the order they arrived in", () => {
    const windows = byAudience([row(SKIERS, 3), row(RIDERS, 2), row(SKIERS, 1)])

    expect(windows.find((window) => window.audience === SKIERS)?.rows.map((one) => one.at)).toEqual(
      [3, 1]
    )
  })

  it("orders the windows the same way whatever order the rows arrived in", () => {
    const one = byAudience([row(SKIERS, 1), row(RIDERS, 2)]).map((window) => window.audience)
    const other = byAudience([row(RIDERS, 2), row(SKIERS, 1)]).map((window) => window.audience)

    expect(one).toEqual([RIDERS, SKIERS])
    expect(other).toEqual(one)
  })

  it("gives a deployment serving one form of every page the one window it has always had", () => {
    const windows = byAudience([
      { audienceId: DEFAULT_AUDIENCE_ID, at: 1 },
      { audienceId: DEFAULT_AUDIENCE_ID, at: 2 },
    ])

    expect(windows).toHaveLength(1)
    expect(windows[0]?.audience).toBe(DEFAULT_AUDIENCE_ID)
  })
})

describe("readingKeyOf", () => {
  /**
   * The one assertion this whole unit exists for: before the audience was in
   * the key, these two were one key, so the second form of a page was dropped
   * as the first one handed in twice.
   */
  it("makes two audiences of one page two readings rather than one counted twice", () => {
    expect(readingKeyOf({ treeId: TREE, revision: 1, audienceId: SKIERS })).not.toBe(
      readingKeyOf({ treeId: TREE, revision: 1, audienceId: RIDERS })
    )
  })

  it("makes one audience's two reads of one page the same reading", () => {
    expect(readingKeyOf({ treeId: TREE, revision: 1, audienceId: SKIERS })).toBe(
      readingKeyOf({ treeId: TREE, revision: 1, audienceId: SKIERS })
    )
  })

  it("goes on telling two trees and two revisions apart", () => {
    const key = readingKeyOf({ treeId: TREE, revision: 1, audienceId: SKIERS })

    expect(readingKeyOf({ treeId: OTHER_TREE, revision: 1, audienceId: SKIERS })).not.toBe(key)
    expect(readingKeyOf({ treeId: TREE, revision: 2, audienceId: SKIERS })).not.toBe(key)
  })

  it("keys a reading that names no audience as itself, so a window without the column is unchanged", () => {
    expect(readingKeyOf({ treeId: TREE, revision: 1 })).toBe(
      readingKeyOf({ treeId: TREE, revision: 1, audienceId: null })
    )
    expect(readingKeyOf({ treeId: TREE, revision: 1 })).not.toBe(
      readingKeyOf({ treeId: TREE, revision: 1, audienceId: DEFAULT_AUDIENCE_ID })
    )
  })
})

describe("comparedAudiencesOf", () => {
  it("names the population each side of a comparison was of", () => {
    expect(comparedAudiencesOf({ audienceId: SKIERS }, { audienceId: RIDERS })).toEqual({
      was: SKIERS,
      now: RIDERS,
    })
  })

  it("reads a side that named none as null rather than as the default", () => {
    expect(comparedAudiencesOf(unscoped(1), { audienceId: SKIERS })).toEqual({
      was: null,
      now: SKIERS,
    })
    expect(comparedAudiencesOf({ audienceId: null }, unscoped(1))).toEqual({
      was: null,
      now: null,
    })
  })
})

describe("crossesAudiences", () => {
  /**
   * The assertion this half of the module exists for: a pair of two forms of
   * one page is the comparison that produces every figure and means none of
   * them.
   */
  it("refuses a pair that proves two populations", () => {
    expect(crossesAudiences({ audienceId: SKIERS }, { audienceId: RIDERS })).toBe(true)
  })

  it("allows a pair of one audience, which is every comparison a deployment takes", () => {
    expect(crossesAudiences({ audienceId: SKIERS }, { audienceId: SKIERS })).toBe(false)
  })

  /**
   * A window written before the column existed names no audience, so a pair
   * spanning the migration is unprovable rather than proven alike — and
   * refusing it would withhold the before-and-after across the upgrade, which
   * is the one a deployment most wants.
   */
  it("allows a pair it cannot prove, whichever side named nothing", () => {
    expect(crossesAudiences(unscoped(1), { audienceId: SKIERS })).toBe(false)
    expect(crossesAudiences({ audienceId: SKIERS }, unscoped(1))).toBe(false)
    expect(crossesAudiences({ audienceId: null }, { audienceId: null })).toBe(false)
  })

  it("does not read a named audience against an unnamed one as a match", () => {
    expect(
      comparedAudiencesOf(unscoped(1), { audienceId: DEFAULT_AUDIENCE_ID })
    ).not.toMatchObject({ was: DEFAULT_AUDIENCE_ID })
  })
})
