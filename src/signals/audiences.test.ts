import { describe, expect, it } from "vitest"

import { DEFAULT_AUDIENCE_ID } from "../audience/audience.js"
import { OTHER_TREE, RIDERS, SKIERS, TREE } from "../testing/reader-signal-contract.js"

import {
  audienceScopeOf,
  audienceScopeRead,
  audiencesIn,
  byAudience,
  comparedAudiencesOf,
  crossesAudiences,
  forAudience,
  audiencesOf,
  formKeyOf,
  formOf,
  inFormOrder,
  pagesOf,
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

/**
 * The three-way answer, which exists because `null` was two states. Two
 * readings here were corrected one at a time for treating them alike (0297,
 * 0299) and a third was still wrong, so what is tested is that each of the
 * three is reachable and that the ambiguous one is a value a caller has to
 * handle rather than one it can read an audience off.
 */
describe("audienceScopeOf", () => {
  it("is of the one audience a window names, with nothing asked for", () => {
    expect(audienceScopeOf([SKIERS])).toEqual({
      reading: "one",
      audienceId: SKIERS,
      audiences: [SKIERS],
    })
  })

  it("is unlabelled where nothing named an audience, which is every window before the column", () => {
    expect(audienceScopeOf([])).toEqual({ reading: "unlabelled", audienceId: null, audiences: [] })
  })

  it("is mixed where two forms are named and none is asked for", () => {
    expect(audienceScopeOf([RIDERS, SKIERS])).toEqual({
      reading: "mixed",
      audienceId: null,
      audiences: [RIDERS, SKIERS],
    })
  })

  /** The whole point: the ambiguous answer has no audience to be read off it. */
  it("gives the mixed answer no audience, so no reading can pick one of the two", () => {
    const scope = audienceScopeOf([RIDERS, SKIERS])

    expect(scope.audienceId).toBeNull()
    expect(scope.reading).toBe("mixed")
  })

  it("takes the audience asked for, and still says what the window held", () => {
    expect(audienceScopeOf([RIDERS, SKIERS], SKIERS)).toEqual({
      reading: "one",
      audienceId: SKIERS,
      audiences: [RIDERS, SKIERS],
    })
  })

  /**
   * A caller asking for a population the window does not hold is holding an
   * empty reading, which is what it asked for and not an ambiguity.
   */
  it("takes the audience asked for where the window names it nowhere", () => {
    expect(audienceScopeOf([], SKIERS)).toEqual({
      reading: "one",
      audienceId: SKIERS,
      audiences: [],
    })
  })

  it("deduplicates and sorts the census, so two windows concatenated read the same either way", () => {
    expect(audienceScopeOf([SKIERS, RIDERS, SKIERS]).audiences).toEqual([RIDERS, SKIERS])
    expect(audienceScopeOf([RIDERS, SKIERS, RIDERS]).audiences).toEqual([RIDERS, SKIERS])
  })

  it("is of one audience where a window names it twice", () => {
    expect(audienceScopeOf([SKIERS, SKIERS]).reading).toBe("one")
  })

  it("is of the default audience like any other, because it is a name a host chose", () => {
    expect(audienceScopeOf([DEFAULT_AUDIENCE_ID])).toEqual({
      reading: "one",
      audienceId: DEFAULT_AUDIENCE_ID,
      audiences: [DEFAULT_AUDIENCE_ID],
    })
    expect(audienceScopeOf([DEFAULT_AUDIENCE_ID, SKIERS]).reading).toBe("mixed")
  })
})

describe("audienceScopeRead", () => {
  it("reads back the one population a reading recorded", () => {
    expect(audienceScopeRead({ audienceId: SKIERS, audiences: [RIDERS, SKIERS] })).toEqual({
      reading: "one",
      audienceId: SKIERS,
      audiences: [RIDERS, SKIERS],
    })
  })

  it("reads back a reading that was of neither of two populations", () => {
    expect(audienceScopeRead({ audienceId: null, audiences: [RIDERS, SKIERS] }).reading).toBe(
      "mixed"
    )
  })

  it("reads back a reading of a window that named nothing", () => {
    expect(audienceScopeRead({ audienceId: null, audiences: [] }).reading).toBe("unlabelled")
  })

  /**
   * A reading recording one audience in its census and none as its own is not
   * ambiguous: one population is one population whether or not anybody asked.
   */
  it("reads one audience and no asking as that one audience", () => {
    expect(audienceScopeRead({ audienceId: null, audiences: [SKIERS] })).toEqual({
      reading: "one",
      audienceId: SKIERS,
      audiences: [SKIERS],
    })
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

describe("formKeyOf", () => {
  /**
   * The assertion the second rule exists for. Four library comparisons keyed a
   * paired page by its tree, so two forms of it were one key — and the two
   * ways a window can hold them both came out as *the first one handed in
   * twice* and *this page is ambiguous*, neither of which is what happened.
   */
  it("makes two forms of one page two pages rather than one", () => {
    expect(formKeyOf({ treeId: TREE, audienceId: SKIERS })).not.toBe(
      formKeyOf({ treeId: TREE, audienceId: RIDERS })
    )
  })

  /**
   * What makes it a second rule rather than a second spelling of the first: a
   * comparison spans two revisions of one page, so the revision cannot be in
   * the key that pairs them.
   */
  it("holds one form still across two revisions, where a reading key does not", () => {
    const was = { treeId: TREE, revision: 1, audienceId: SKIERS }
    const now = { treeId: TREE, revision: 2, audienceId: SKIERS }

    expect(formKeyOf(formOf(was))).toBe(formKeyOf(formOf(now)))
    expect(readingKeyOf(was)).not.toBe(readingKeyOf(now))
  })

  it("goes on telling two trees apart", () => {
    expect(formKeyOf({ treeId: OTHER_TREE, audienceId: SKIERS })).not.toBe(
      formKeyOf({ treeId: TREE, audienceId: SKIERS })
    )
  })

  /** 0290's third state, kept: a window that never carried the column is not `aud_everyone`. */
  it("keys a form that names no audience as itself, and never as the default", () => {
    expect(formKeyOf(formOf({ treeId: TREE, revision: 1 }))).toBe(
      formKeyOf({ treeId: TREE, audienceId: null })
    )
    expect(formKeyOf({ treeId: TREE, audienceId: null })).not.toBe(
      formKeyOf({ treeId: TREE, audienceId: DEFAULT_AUDIENCE_ID })
    )
  })

  it("normalises an absent audience to the null it means", () => {
    expect(formOf({ treeId: TREE, revision: 1 })).toEqual({ treeId: TREE, audienceId: null })
    expect(formOf({ treeId: TREE, revision: 2, audienceId: SKIERS })).toEqual({
      treeId: TREE,
      audienceId: SKIERS,
    })
  })

  it("orders two forms of one page the same way whatever order they arrived in", () => {
    const skiers = { treeId: TREE, audienceId: SKIERS }
    const riders = { treeId: TREE, audienceId: RIDERS }

    expect([skiers, riders].sort(inFormOrder)).toEqual([riders, skiers])
    expect([riders, skiers].sort(inFormOrder)).toEqual([riders, skiers])
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

/**
 * The two form rules a comparison of whole windows is built on. Both are
 * questions about a set of forms rather than about one, which is what makes a
 * library window different from a reading (0295).
 */
describe("what a window of forms is of", () => {
  it("names each audience once however many forms of it the window holds", () => {
    expect(
      audiencesOf([
        { treeId: TREE, audienceId: SKIERS },
        { treeId: OTHER_TREE, audienceId: SKIERS },
        { treeId: TREE, audienceId: RIDERS },
      ])
    ).toEqual([RIDERS, SKIERS])
  })

  /** `[]` is *nothing here said*, which is not an audience and is not `aud_everyone`. */
  it("names no audience for forms that named none", () => {
    expect(audiencesOf([{ treeId: TREE, audienceId: null }])).toEqual([])
    expect(audiencesOf([])).toEqual([])
  })

  it("leaves out the forms that named none and keeps the ones that did", () => {
    expect(
      audiencesOf([
        { treeId: TREE, audienceId: null },
        { treeId: TREE, audienceId: SKIERS },
      ])
    ).toEqual([SKIERS])
  })

  /** Two forms of one page share a tree (0263), so a page is counted once. */
  it("counts two forms of one page as one page", () => {
    expect([
      ...pagesOf([
        { treeId: TREE, audienceId: SKIERS },
        { treeId: TREE, audienceId: RIDERS },
      ]),
    ]).toEqual([TREE])
  })

  it("counts one form handed in twice as one page", () => {
    expect(
      pagesOf([
        { treeId: TREE, audienceId: SKIERS },
        { treeId: TREE, audienceId: SKIERS },
        { treeId: OTHER_TREE, audienceId: SKIERS },
      ]).size
    ).toBe(2)
  })

  it("counts a form that named no audience as the page it is of", () => {
    expect([...pagesOf([{ treeId: TREE, audienceId: null }])]).toEqual([TREE])
  })
})
