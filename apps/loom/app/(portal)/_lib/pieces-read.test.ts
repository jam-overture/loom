import { describe, expect, it } from "vitest"

import { primitiveTypeSchema, treeIdSchema, type PrimitiveType, type TreeId } from "@jam-overture/loom"
import {
  KIND_REACH_SILENCES,
  REACH_SILENCES,
  describeKindReachSilence,
  type KindReach,
  type KindReading,
  type LibraryReach,
  type LibraryReading,
  type PartStanding,
} from "@jam-overture/loom/signals"

import {
  figuresFrom,
  howItIsRead,
  notCountedYet,
  notOnThesePages,
  piecesCount,
  piecesReadOf,
  piecesReadSummary,
  READER_SILENCES_PLAIN,
  readerSilencesHeld,
  WHY_NOT_WEIGHED,
  whyItLeads,
  whyNotComparable,
  whyNotWeighed,
  type PiecesRead,
} from "./pieces-read"
import { unnamed, type PageName } from "./page-name"
import { runtimeWordsIn } from "../_test/plain-language"

const type = (value: string): PrimitiveType => primitiveTypeSchema.parse(value)
const tree = (value: string): TreeId => treeIdSchema.parse(value)

const page = (name: string, id: string): PageName => ({ name, treeId: id, derived: true })

const PAGES: ReadonlyMap<string, PageName> = new Map([
  ["t_shop", page("Autumn arrivals", "t_shop")],
  ["t_help", page("Help and support", "t_help")],
  ["t_price", page("Pricing", "t_price")],
])

const standings = (
  over: Partial<Record<PartStanding, number>> = {}
): Readonly<Record<PartStanding, number>> => ({ read: 0, skipped: 0, unknown: 0, ...over })

/** One census row, with every figure the runtime puts on a kind of part. */
const census = ({
  type: name,
  ...over
}: Omit<Partial<KindReading>, "kind"> & { readonly type: string }): KindReading => ({
  kind: { by: "type", type: type(name) },
  role: null,
  placements: 7,
  trees: 3,
  revisions: 3,
  standings: standings({ read: 4, skipped: 3 }),
  readShare: 4 / 7,
  silence: null,
  words: 0,
  wordsReached: 0,
  wordShare: null,
  floored: 0,
  dwellMs: 4000,
  activations: 0,
  opens: 0,
  closes: 0,
  completions: 0,
  ...over,
})

/** One reach row, against the readers who met the places it stands. */
const reach = ({
  type: name,
  ...over
}: Omit<Partial<KindReach>, "kind"> & { readonly type: string }): KindReach => ({
  kind: { by: "type", type: type(name) },
  role: null,
  placements: 7,
  verdicts: 7,
  unknown: 0,
  pages: 3,
  openings: 630,
  counted: 630,
  met: 133.2,
  missed: 496.8,
  share: 0.211,
  atMost: 0.238,
  atMostMet: 150,
  drift: 93,
  pending: 0,
  exact: false,
  unreconciled: 0,
  silence: null,
  ...over,
})

const library = (over: Partial<LibraryReading> = {}): LibraryReading => ({
  byType: [census({ type: "loom.card" })],
  byRole: [],
  pages: 3,
  trees: 3,
  placements: 7,
  standings: standings({ read: 4, skipped: 3 }),
  mostSkipped: census({ type: "loom.card" }),
  mostUsed: null,
  duplicated: 0,
  roleDisagreed: [],
  ...over,
})

const reached = (over: Partial<LibraryReach> = {}): LibraryReach => ({
  byType: [reach({ type: "loom.card" })],
  byRole: [],
  pages: 3,
  trees: 3,
  placements: 7,
  arrivals: 230,
  scaled: 3,
  unscaled: [],
  mostMissed: reach({ type: "loom.card" }),
  duplicated: 0,
  duplicatedRows: 0,
  roleDisagreed: [],
  ...over,
})

const read = (
  overCensus: Partial<LibraryReading> = {},
  overReach: Partial<LibraryReach> = {},
  unjoined = 0
): PiecesRead => piecesReadOf(library(overCensus), reached(overReach), PAGES, unjoined)

describe("the two figures", () => {
  /**
   * The whole reason this module exists, and the thing the filing asked for in
   * as many words: *two labelled figures, never one*, with **places** and
   * **readers** load-bearing rather than decorative.
   *
   * The same piece, the same counters: 4 of 7 places and 2 in 10 readers. A
   * surface that printed one of those under the other's label would be wrong by
   * roughly a factor of three on this row, and by an order of magnitude on a
   * library whose shape is more lopsided.
   */
  it("says the places and the readers in different sentences, each naming its own population", () => {
    const pair = howItIsRead(read().byType.get("loom.card")!)

    expect(pair.places).toContain("places")
    expect(pair.places).toContain("4 of them")
    expect(pair.readers).toContain("readers who met it")
    expect(pair.readers).toContain("2 in 10")
    expect(pair.withheld).toBeUndefined()
  })

  /**
   * The pair arrives as one value precisely so that a component cannot draw one
   * half. The property worth pinning is the exclusivity: a reader who meets a
   * places figure and a gap cannot tell a piece nobody measured from a piece
   * whose page has no count of arrivals, and those two send a person to
   * completely different places.
   */
  it.each(KIND_REACH_SILENCES.map((silence) => [silence]))(
    "replaces the readers half with a reason under %s, and never leaves a gap",
    (silence) => {
      const pair = howItIsRead(
        read({}, { byType: [reach({ type: "loom.card", share: null, silence })] }).byType.get(
          "loom.card"
        )!
      )

      expect(pair.readers).toBeUndefined()
      expect(pair.withheld).toBe(READER_SILENCES_PLAIN[silence].meaning)
      expect(pair.places).toContain("places")
    }
  )

  /**
   * The places half is sound with no door row, no correction and no window in
   * it, which is the whole reason it is the half that never goes dark: it is a
   * ratio of two counts of parts of trees.
   */
  it("keeps the places figure when every reader figure is withheld", () => {
    const withheld = read(
      {},
      {
        byType: [reach({ type: "loom.card", share: null, silence: "unscaled" })],
        mostMissed: null,
        scaled: 2,
        unscaled: [{ treeId: tree("t_price"), revision: 0, silence: "unmeasured" }],
      }
    )

    expect(howItIsRead(withheld.byType.get("loom.card")!).places).toContain("Readers reached it in")
  })

  /**
   * Three denominators and three sentences, because they are three different
   * populations. *4 of the 5 places anything has been counted for* and *4 of
   * the 7 places it stands* are the same numerator and different news, and a
   * place in a window that said nothing is not a skip (0212).
   */
  it("puts the places nothing was counted for outside the denominator and says so", () => {
    const some = howItIsRead(
      read({
        byType: [
          census({
            type: "loom.card",
            placements: 7,
            standings: standings({ read: 4, skipped: 1, unknown: 2 }),
            readShare: 0.8,
          }),
        ],
      }).byType.get("loom.card")!
    )

    expect(some.places).toContain("It stands in 7 places on 3 pages.")
    expect(some.places).toContain("4 of the 5 that anything has been counted for")
  })

  it("names the two ends rather than printing them as a ratio", () => {
    const all = howItIsRead(
      read({
        byType: [
          census({ type: "loom.card", standings: standings({ read: 7 }), readShare: 1 }),
        ],
      }).byType.get("loom.card")!
    )

    const none = howItIsRead(
      read({
        byType: [
          census({ type: "loom.card", standings: standings({ skipped: 7 }), readShare: 0 }),
        ],
      }).byType.get("loom.card")!
    )

    expect(all.places).toContain("all 7 of them")
    expect(none.places).toContain("none of them")
  })

  it("says the one place it stands rather than all 1 of them", () => {
    const one = howItIsRead(
      read({
        byType: [
          census({
            type: "loom.card",
            placements: 1,
            trees: 1,
            standings: standings({ read: 1 }),
            readShare: 1,
          }),
        ],
      }).byType.get("loom.card")!
    )

    expect(one.places).toContain("1 place on 1 page")
    expect(one.places).toContain("the one place it stands")
    expect(one.places).not.toContain("1 pages")
    expect(one.places).not.toContain("all 1")
  })

  /**
   * A census row with nothing counted at any of its places has no share, and
   * the sentence says that rather than printing a nought: *nobody reached it*
   * and *nobody measured it* are the two states a quiet deployment must not
   * confuse (0212).
   */
  it("says nothing has been counted rather than printing a nought", () => {
    const quiet = howItIsRead(
      read({
        byType: [
          census({
            type: "loom.card",
            standings: standings({ unknown: 7 }),
            readShare: null,
            silence: "unread",
          }),
        ],
      }).byType.get("loom.card")!
    )

    expect(quiet.places).toContain("nothing has been counted for any of them")
    expect(quiet.places).not.toContain("0 of")
  })
})

describe("the piece to look at first", () => {
  /**
   * Read out of the runtime and never chosen here, which is the lesson the
   * 10 October order was built on: a rank computed in the portal is a second
   * implementation of a record's arithmetic that looks entirely correct in a
   * photograph of a deployment whose rows happen already to be in the right
   * order.
   */
  it("leads with the type the reach says misses the most readers", () => {
    const reading = read(
      { mostSkipped: census({ type: "loom.heading" }) },
      { mostMissed: reach({ type: "loom.card" }) }
    )

    expect(reading.worst?.type).toBe("loom.card")
    expect(reading.leadsOn).toBe("readers")
    expect(whyItLeads(reading)).toBe("It misses more readers than any other piece here.")
  })

  /**
   * The census's answer is what is left when the door cannot scale a page, and
   * it is a **different claim**. A screen that printed *misses more readers*
   * for both would be wrong exactly where the two readings disagree, which is
   * the lopsided library and the one that most needs reading.
   */
  it("falls back to the places the census counts, and says it is a different claim", () => {
    const skipped = census({
      type: "loom.heading",
      standings: standings({ read: 2, skipped: 5 }),
      readShare: 2 / 7,
    })

    const reading = read(
      { byType: [census({ type: "loom.card" }), skipped], mostSkipped: skipped },
      { mostMissed: null }
    )

    expect(reading.worst?.type).toBe("loom.heading")
    expect(reading.leadsOn).toBe("places")
    expect(whyItLeads(reading)).toBe(
      "It is passed over in 5 places, which is more than any other piece here."
    )
  })

  it("has no piece to lead with when the readings name none", () => {
    const reading = read({ mostSkipped: null }, { mostMissed: null })

    expect(reading.worst).toBeUndefined()
    expect(reading.leadsOn).toBeUndefined()
    expect(whyItLeads(reading)).toBeUndefined()
  })

  /**
   * A pick that names a type with no row of its own cannot be drawn, and the
   * section says *nothing to lead with* rather than a card with a name on it and
   * no figures under it.
   *
   * The published readings cannot produce that — both picks are one of the rows
   * they ship beside — so this is a guard on the pairing rather than on the
   * reading: the two are matched on the type, and a lead taken from one reading
   * while the rows came from the other is exactly how that would stop being
   * true.
   */
  it("draws no lead for a pick with no row behind it", () => {
    const reading = read(
      { byType: [census({ type: "loom.card" })], mostSkipped: census({ type: "loom.absent" }) },
      { byType: [reach({ type: "loom.card" })], mostMissed: reach({ type: "loom.absent" }) }
    )

    expect(reading.worst).toBeUndefined()
    expect(reading.leadsOn).toBeUndefined()
  })

  /**
   * The same value the card below draws, and not a second mapping of the same
   * row: two mappings of one row is two chances to say two different things
   * about one piece.
   */
  it("leads with the very row the card below is drawn from", () => {
    const reading = read()

    expect(reading.worst).toBe(reading.byType.get("loom.card"))
  })

  /**
   * The lead draws the **same pair** the card below it draws, off the same row
   * and through the same call.
   *
   * The first photograph had the section running the two figures together into
   * one paragraph while the card below set them on two lines — the same two
   * numbers in two shapes, a few hundred pixels apart in the reading order.
   * Both were right about their own arithmetic; what was wrong is between them,
   * and two presentations of one reading is how a portal comes to read as two
   * measurements. `_components/how-read.tsx` is where that is now settled, and
   * what is pinned here is the half this module owns: the lead is a row of this
   * reading, so the pair it is drawn from is the pair the card is drawn from.
   */
  it("hands the lead the same pair as the card below it", () => {
    const reading = read()

    expect(howItIsRead(reading.worst!)).toEqual(howItIsRead(reading.byType.get("loom.card")!))
  })
})

describe("what the section says above the list", () => {
  it("leads with the piece that misses the most readers", () => {
    expect(piecesReadSummary(read())).toContain("misses more readers than any other")
  })

  /**
   * The three answers that are not a league table, which render identically as
   * silence and are three different pieces of news. Only one of them is about
   * anybody's pages.
   */
  it("tells nothing counted, nothing passed over and passed over somewhere apart", () => {
    const nothing = read({ byType: [] }, { byType: [], mostMissed: null })
    const healthy = read(
      {
        byType: [census({ type: "loom.card", standings: standings({ read: 7 }), readShare: 1 })],
        mostSkipped: null,
      },
      { mostMissed: null }
    )
    const passed = read({ mostSkipped: census({ type: "loom.card" }) }, { mostMissed: null })

    expect(piecesReadSummary(nothing)).toContain("Nothing has been counted yet")
    expect(piecesReadSummary(healthy)).toContain("everywhere it stands")
    expect(piecesReadSummary(passed)).toContain("being passed over")
  })

  it("says one kind of piece without saying 1 kinds of piece", () => {
    expect(piecesCount(1)).toBe("1 kind of piece")
    expect(piecesCount(4)).toBe("4 kinds of piece")
    expect(piecesReadSummary(read({ mostSkipped: census({ type: "loom.card" }) }, { mostMissed: null }))).toContain(
      "One kind of piece"
    )
  })

  /**
   * How much to believe it, which is the rule this portal states for every
   * count on a reading screen: a census over three pages and one over thirty
   * are the same screen with different weight behind them.
   */
  it("says how many pages the figures come from, and when a page is counted at two versions", () => {
    expect(figuresFrom(read())).toBe("These figures come from 3 pages.")
    expect(figuresFrom(read({ pages: 4 }))).toBe(
      "These figures come from 3 pages, at 4 versions between them."
    )
  })
})

describe("the pages a reader share is withheld for", () => {
  /**
   * The actionable half of every silence on a row above: one page is why the
   * whole library has no reader share, and 0256 refuses to give a share over
   * the pages it could price. Naming the page is the only thing anybody can do
   * about it.
   */
  it("names them, and says that every figure about the places still holds", () => {
    const reading = read(
      {},
      {
        scaled: 2,
        unscaled: [{ treeId: tree("t_price"), revision: 0, silence: "unmeasured" }],
      }
    )

    expect(reading.unscaled).toEqual([
      { treeId: "t_price", page: page("Pricing", "t_price"), why: "unmeasured" },
    ])

    const why = whyNotComparable(reading)

    expect(why).toContain("1 page here has no readership to weigh these figures against")
    expect(why).toContain("still holds")
  })

  /** The verb is the half a count word cannot carry. */
  it("says has for one page and have for two", () => {
    const one = whyNotComparable(
      read({}, { unscaled: [{ treeId: tree("t_price"), revision: 0, silence: "unmeasured" }] })
    )
    const two = whyNotComparable(
      read(
        {},
        {
          unscaled: [
            { treeId: tree("t_price"), revision: 0, silence: "unmeasured" },
            { treeId: tree("t_help"), revision: 2, silence: "unopened" },
          ],
        }
      )
    )

    expect(one).toContain("1 page here has no readership")
    expect(two).toContain("2 pages here have no readership")
  })

  it("says nothing at all when every page could be scaled", () => {
    expect(whyNotComparable(read())).toBeUndefined()
  })

  /**
   * **The reason is the page's own, and it is drawn rather than carried.**
   *
   * The first photograph of this screen was staged with a page whose door row
   * was deleted and the deployment reported `unopened` — a row that exists and
   * says nothing ever began — where the fixture expected `unmeasured`. Both are
   * *no readership to weigh against* and their remedies are opposite: one is a
   * row that expired, the other is a sender that is not marking its openings.
   * A list that named the page and not the reason would send somebody looking
   * for the wrong fault.
   */
  it("gives each page its own reason, in the vocabulary whose subject is a page", () => {
    const reasons = REACH_SILENCES.map((silence) =>
      whyNotWeighed({ treeId: tree("t_price"), page: page("Pricing", "t_price"), why: silence })
    )

    expect(new Set(reasons).size).toBe(REACH_SILENCES.length)
    expect(Object.keys(WHY_NOT_WEIGHED).sort()).toEqual([...REACH_SILENCES].sort())
    expect(
      whyNotWeighed({ treeId: tree("t_price"), page: page("Pricing", "t_price"), why: "unopened" })
    ).toBe("nothing there is saying when a reader arrives")
  })

  /** A page whose own read failed is named by its identifier, never dropped. */
  it("names an unreadable page by its identifier rather than losing the row", () => {
    const reading = read(
      {},
      { unscaled: [{ treeId: tree("t_gone"), revision: 0, silence: "unmeasured" }] }
    )

    expect(reading.unscaled[0]?.page).toEqual(unnamed(tree("t_gone")))
  })
})

describe("the pages that are not behind the figures yet", () => {
  it("says so with the count, and that there is nothing to do about it", () => {
    expect(notCountedYet(read({}, {}, 0))).toBeUndefined()
    expect(notCountedYet(read({}, {}, 1))).toContain("1 page is not behind these figures yet")
    expect(notCountedYet(read({}, {}, 3))).toContain("3 pages are not behind these figures yet")
    expect(notCountedYet(read({}, {}, 1))).toContain("nothing to do about it")
  })

  /**
   * **Never *nothing uses this*.** The reading is over the pages a deployment
   * has counted and joined, so a piece standing only on a page in the version
   * gap has no row here and is in use all the same.
   */
  it("says a piece is on none of these pages rather than that nothing uses it", () => {
    const said = notOnThesePages(read())

    expect(said).toContain("No page behind the figures on this screen uses this piece")
    expect(said).toContain("It may well be on other pages")
    expect(notOnThesePages(read({ trees: 1 }))).toContain("another page")
    expect(notOnThesePages(read({ trees: 0 }))).toContain("Nothing has been counted")
  })
})

describe("the reasons a reader share can be missing", () => {
  /**
   * Total over the runtime's vocabulary, so a sixth reason cannot arrive
   * without this table failing to compile — and every entry carries the
   * runtime's own name for the state, which is what lets a reader check the
   * portal against the record.
   */
  it("has a plain word for every reason the runtime publishes", () => {
    for (const silence of KIND_REACH_SILENCES) {
      const word = READER_SILENCES_PLAIN[silence]

      expect(word.technical).toBe(silence)
      expect(word.label.length).toBeGreaterThan(0)
      expect(word.meaning.endsWith(".")).toBe(true)
    }

    expect(Object.keys(READER_SILENCES_PLAIN).sort()).toEqual([...KIND_REACH_SILENCES].sort())
  })

  it("reports only the reasons this reading actually holds, in the runtime's order", () => {
    const reading = read(
      {
        byType: [census({ type: "loom.card" }), census({ type: "loom.heading" })],
      },
      {
        byType: [
          reach({ type: "loom.card", share: null, silence: "unscaled" }),
          reach({ type: "loom.heading", share: null, silence: "unread" }),
        ],
      }
    )

    expect(readerSilencesHeld(reading)).toEqual(["unread", "unscaled"])
    expect(readerSilencesHeld(read())).toEqual([])
  })

  /**
   * A census row with no reach row beside it is a deployment with no door rows
   * at all. Absent is not nought and it is not an unexplained gap: the honest
   * answer is the one the reach itself would have given.
   */
  it("reads a missing reach row as nothing being comparable yet", () => {
    const reading = read({}, { byType: [], mostMissed: null })
    const piece = reading.byType.get("loom.card")!

    expect(piece.readerSilence).toBe("unscaled")
    expect(piece.readerShare).toBeNull()
    expect(piece.onTheRecord).toBe(describeKindReachSilence("unscaled"))
    expect(howItIsRead(piece).withheld).toBe(READER_SILENCES_PLAIN.unscaled.meaning)
  })
})

/**
 * The governing principle, on the sentences this module produces.
 *
 * Every one of them is shown to somebody who has not asked for the record, so
 * none of them may use the runtime's vocabulary — and `onTheRecord` is the one
 * field here that is **supposed** to, because it is the runtime's own line and
 * it is drawn inside the disclosure.
 */
describe("the words a reader meets", () => {
  const everySentence = (reading: PiecesRead): readonly string[] => {
    const pieces = [...reading.byType.values()]
    const pairs = pieces.flatMap((piece) => {
      const pair = howItIsRead(piece)

      return [pair.places, pair.readers, pair.withheld]
    })

    return [
      piecesReadSummary(reading),
      figuresFrom(reading),
      notOnThesePages(reading),
      whyItLeads(reading),
      whyNotComparable(reading),
      notCountedYet(reading),
      ...pairs,
      ...KIND_REACH_SILENCES.flatMap((silence) => [
        READER_SILENCES_PLAIN[silence].label,
        READER_SILENCES_PLAIN[silence].meaning,
      ]),
    ].filter((sentence): sentence is string => sentence !== undefined)
  }

  const sentences = [
    ...everySentence(read({}, {}, 2)),
    ...everySentence(
      read(
        { byType: [], mostSkipped: null },
        { byType: [], mostMissed: null, unscaled: [{ treeId: tree("t_price"), revision: 0, silence: "unmeasured" }] },
        1
      )
    ),
    ...everySentence(
      read(
        { byType: [census({ type: "loom.card", standings: standings({ read: 7 }), readShare: 1 })], mostSkipped: null },
        { mostMissed: null }
      )
    ),
  ]

  it("finds the sentences to judge, so an empty sweep cannot pass as clean", () => {
    expect(sentences.length).toBeGreaterThan(25)
  })

  it.each(sentences.map((sentence) => [sentence]))("says %s without the runtime's vocabulary", (sentence) => {
    expect(runtimeWordsIn(sentence), sentence).toEqual([])
  })

  /** The other end of the rule: the record is supposed to speak the runtime's. */
  it("keeps the runtime's own line for the record", () => {
    expect(read().byType.get("loom.card")?.onTheRecord).toBeUndefined()
    expect(
      read({}, { byType: [reach({ type: "loom.card", share: null, silence: "unopened" })] }).byType.get(
        "loom.card"
      )?.onTheRecord
    ).toBe(describeKindReachSilence("unopened"))
  })
})

describe("what the reading carries over from the runtime", () => {
  /**
   * The counts a surface must never print as people, carried so the record can
   * show them and so nothing has to go back for a second read to do it.
   */
  it("keeps every figure the two readings publish about a kind", () => {
    const piece = read().byType.get("loom.card")!

    expect(piece).toMatchObject({
      type: "loom.card",
      name: "Card",
      places: 7,
      pages: 3,
      read: 4,
      skipped: 3,
      unsaid: 0,
      openings: 630,
      counted: 630,
      met: 133.2,
      missed: 496.8,
      atMost: 0.238,
      drift: 93,
      pending: 0,
      exact: false,
      unreconciled: 0,
    })
  })

  it("carries the alarms that are about two libraries read as one", () => {
    const reading = read(
      { duplicated: 2 },
      { duplicatedRows: 1, roleDisagreed: [type("loom.card")] }
    )

    expect(reading.duplicated).toBe(2)
    expect(reading.duplicatedRows).toBe(1)
    expect(reading.disagreed).toEqual(["loom.card"])
  })

  /** A role row is never a piece: this screen is keyed by what an author can change. */
  it("ignores the rows keyed by what part a piece plays", () => {
    const reading = read(
      {
        byType: [census({ type: "loom.card" })],
        byRole: [
          {
            ...census({ type: "loom.card" }),
            kind: { by: "role", role: null },
          },
        ],
      },
      {
        byRole: [{ ...reach({ type: "loom.card" }), kind: { by: "role", role: null } }],
      }
    )

    expect([...reading.byType.keys()]).toEqual(["loom.card"])
    expect(reading.kinds).toBe(1)
  })
})
