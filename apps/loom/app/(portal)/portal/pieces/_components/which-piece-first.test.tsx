import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { primitiveTypeSchema, treeIdSchema, type PrimitiveType, type TreeId } from "@jam-overture/loom"
import type {
  KindReach,
  KindReading,
  LibraryReach,
  LibraryReading,
  PartStanding,
} from "@jam-overture/loom/signals"

import type { PageName } from "@/app/(portal)/_lib/page-name"
import { howItIsRead, piecesReadOf, type PiecesRead } from "@/app/(portal)/_lib/pieces-read"
import { portalFile, screenSource } from "@/app/(portal)/_lib/screen-source"
import { runtimeWordsIn } from "@/app/(portal)/_test/plain-language"
import { recordOf, surfaceOf } from "@/app/(portal)/_test/rendered"

import { PieceCard } from "./piece-card"
import { WhichPieceFirst } from "./which-piece-first"

const type = (value: string): PrimitiveType => primitiveTypeSchema.parse(value)
const tree = (value: string): TreeId => treeIdSchema.parse(value)

const PAGES: ReadonlyMap<string, PageName> = new Map([
  ["t_shop", { name: "Autumn arrivals", treeId: "t_shop", derived: true }],
  ["t_price", { name: "Pricing", treeId: "t_price", derived: true }],
])

const standings = (
  over: Partial<Record<PartStanding, number>> = {}
): Readonly<Record<PartStanding, number>> => ({ read: 0, skipped: 0, unknown: 0, ...over })

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

const read = (
  overCensus: Partial<LibraryReading> = {},
  overReach: Partial<LibraryReach> = {},
  unjoined = 0
): PiecesRead => {
  const byType = overCensus.byType ?? [census({ type: "loom.card" })]
  const reaches = overReach.byType ?? [reach({ type: "loom.card" })]

  return piecesReadOf(
    {
      byType,
      byRole: [],
      pages: 3,
      trees: 3,
      placements: 7,
      standings: standings({ read: 4, skipped: 3 }),
      mostSkipped: byType[0] ?? null,
      mostUsed: null,
      duplicated: 0,
      roleDisagreed: [],
      ...overCensus,
    },
    {
      byType: reaches,
      byRole: [],
      pages: 3,
      trees: 3,
      placements: 7,
      arrivals: 230,
      scaled: 3,
      unscaled: [],
      mostMissed: reaches[0] ?? null,
      duplicated: 0,
      duplicatedRows: 0,
      roleDisagreed: [],
      ...overReach,
    },
    PAGES,
    unjoined
  )
}

const shown = (reading: PiecesRead) => {
  const { container } = render(<WhichPieceFirst read={reading} />)

  return { surface: surfaceOf(container), record: recordOf(container), container }
}

describe("which piece to look at first", () => {
  it("asks the reader's question as the heading", () => {
    const { container } = render(<WhichPieceFirst read={read()} />)

    expect(container.querySelector("h2")?.textContent).toBe("Which piece should I look at first?")
  })

  /**
   * **The pair, and the whole care this component exists to take.**
   *
   * The share of the places a piece stands and the share of the readers who met
   * it are different questions whose answers can differ by an order of
   * magnitude. The lead sentence is the one place a person meets both before
   * they know there are two, so it has to carry *places* and *readers* in it
   * and neither figure may appear without its own noun.
   */
  it("names the piece and says both figures, each against its own population", () => {
    const { surface } = shown(read())

    expect(surface).toContain("Start with Card")
    expect(surface).toContain("loom.card")
    expect(surface).toContain("It stands in 7 places on 3 pages.")
    expect(surface).toContain("Readers reached it in 4 of them.")
    expect(surface).toContain("2 in 10 of the readers who met it read it.")
    expect(surface).toContain("misses more readers than any other piece here")
  })

  /**
   * The three counts that are page views rather than people stay off the
   * surface and go in the record, where the sentences above them say what each
   * one is. A share of places times a readership was this lane's 8 October
   * defect one layer down, and `met` printed as readers would be the same
   * mistake with a worse denominator.
   */
  it("keeps the page-view counts off the surface and in the record", () => {
    const { surface, record } = shown(read())

    expect(surface).not.toContain("133")
    expect(surface).not.toContain("630")
    expect(record).toContain("133.20")
    expect(record).toContain("630")
    expect(record).toContain("is a headcount")
  })

  /**
   * **One reading, one shape, in both places it appears.**
   *
   * The first photograph of this section ran the two figures together into a
   * single paragraph while the card it links to set them on two lines. Both
   * were right about their own arithmetic and the defect was between them: a
   * reader meets the same two numbers twice, in two shapes, and two
   * presentations of one reading is how a portal comes to read as two
   * measurements. A test could not have found it and the photograph did, which
   * is the fifth time running that sentence has been true in this lane.
   *
   * So the shape lives in one component and this pins that both go through it:
   * the paragraphs the section draws for the piece at the top are the same
   * paragraphs its card draws, element for element.
   */
  it("draws the pair in the same shape the card below it does", () => {
    const reading = read()
    const lead = render(<WhichPieceFirst read={reading} />).container
    const card = render(
      <PieceCard
        primitive={{
          type: type("loom.card"),
          description: "A block of related content",
          props: [],
          slots: [],
          reads: undefined,
        }}
        read={howItIsRead(reading.worst!)}
      />
    ).container

    const paragraphs = (container: HTMLElement): readonly string[] =>
      Array.from(container.querySelectorAll("p"), (one) => one.outerHTML).filter((html) =>
        /places|readers who met it/u.test(html)
      )

    expect(paragraphs(lead)).toEqual(paragraphs(card))
    expect(paragraphs(lead).length).toBe(2)
  })

  it("sends the reader down to the card it told them to look at", () => {
    const { container } = render(<WhichPieceFirst read={read()} />)
    const link = container.querySelector('a[href="#loom.card"]')

    expect(link?.textContent).toContain("Look at Card below")
  })

  /**
   * One page with no count of arrivals withholds the reader share for every
   * piece in the library, because every piece stands on it — which is the
   * ordinary state rather than an exotic one, and the only thing anybody can do
   * about it is open that page. So it is named, and it is a link.
   */
  it("names the pages that are why a reader share is missing, and links to each", () => {
    const { surface, container } = shown(
      read(
        {},
        {
          byType: [reach({ type: "loom.card", share: null, silence: "unscaled" })],
          mostMissed: null,
          scaled: 2,
          unscaled: [{ treeId: tree("t_price"), revision: 0, silence: "unmeasured" }],
        }
      )
    )

    expect(surface).toContain("1 page here has no readership to weigh these figures against")
    expect(surface).toContain("still holds")
    expect(surface).toContain("Pricing")
    expect(surface).toContain("nothing has counted how many readers arrived there")
    expect(container.querySelector('a[href="/portal/readers?tree=t_price"]')).not.toBeNull()
  })

  it("says nothing about unpriced pages when every page could be scaled", () => {
    expect(shown(read()).surface).not.toContain("no readership to weigh")
  })

  /**
   * Each page's own reason, which is the actionable half: a row that has
   * expired, a sender that is not marking its openings and a window that has
   * not come round have three different remedies, and a list that named the
   * page without the reason would send somebody after the wrong fault.
   */
  it("gives each unpriced page the reason that belongs to it", () => {
    const { surface } = shown(
      read(
        {},
        {
          byType: [reach({ type: "loom.card", share: null, silence: "unscaled" })],
          mostMissed: null,
          scaled: 1,
          unscaled: [
            { treeId: tree("t_price"), revision: 0, silence: "unopened" },
            { treeId: tree("t_shop"), revision: 1, silence: "uncounted" },
          ],
        }
      )
    )

    expect(surface).toContain("nothing there is saying when a reader arrives")
    expect(surface).toContain("no window of their reading has been counted yet")
  })

  it("says which pages are not behind the figures yet, and that nothing needs doing", () => {
    const { surface } = shown(read({}, {}, 2))

    expect(surface).toContain("2 pages are not behind these figures yet")
    expect(surface).toContain("nothing to do about it")
  })

  it("says how many pages the figures come from", () => {
    expect(shown(read()).surface).toContain("These figures come from 3 pages.")
  })

  /**
   * The governing principle, as a property rather than as taste: no sentence a
   * reader meets unasked contains a word from the runtime's vocabulary, and the
   * record beside it does.
   */
  it("meets a reader in plain words, with the runtime's own one click down", () => {
    const { surface, record } = shown(
      read(
        {},
        {
          byType: [reach({ type: "loom.card", share: null, silence: "unscaled" })],
          mostMissed: null,
          scaled: 2,
          unscaled: [{ treeId: tree("t_price"), revision: 0, silence: "unmeasured" }],
        },
        1
      )
    )

    expect(runtimeWordsIn(surface)).toEqual([])
    expect(record).toContain("libraryReadingOf")
    expect(record).toContain("libraryReachOf")
    expect(record).toContain("read ÷ (read + skipped)")
    expect(record).toContain("met ÷ counted")
    expect(record).toContain("unscaled")
  })

  /**
   * The record says why the grouping by what a piece *plays* is absent, and
   * names what would have to exist for it to stop being absent — because a
   * comment or a sentence arguing that a screen cannot do something is a dated
   * claim about the runtime, and nothing re-reads one when the runtime changes.
   */
  it("says what is not drawn and what would make it drawable", () => {
    const { record } = shown(read())

    expect(record).toContain("byRole")
    expect(record).toContain("role: null")
    expect(record).toContain("One declaration per primitive")
  })

  it("adds the arrivals and says why that one may be added", () => {
    const { record } = shown(read({}, { arrivals: 1500 }))

    expect(record).toContain("1500")
    expect(record).toContain("counted once")
  })

  /** Every reason this deployment actually holds, and no others. */
  it("explains every reason a reader share is missing here, and none that is not", () => {
    const { record } = shown(
      read(
        { byType: [census({ type: "loom.card" }), census({ type: "loom.heading" })] },
        {
          byType: [
            reach({ type: "loom.card", share: null, silence: "unscaled" }),
            reach({ type: "loom.heading" }),
          ],
          mostMissed: null,
        }
      )
    )

    expect(record).toContain("not comparable yet")
    expect(record).not.toContain("nobody marked as arriving")
  })

  /** Two libraries read as one is the one failure this join can have. */
  it("raises a disagreement about what a piece plays, and stays quiet otherwise", () => {
    expect(shown(read({}, { roleDisagreed: [type("loom.card")] })).record).toContain(
      "disagreed about the role they play"
    )
    expect(shown(read()).record).not.toContain("disagreed about the role they play")
    expect(shown(read({ duplicated: 2 })).record).toContain("second copy of one revision")
    expect(shown(read()).record).not.toContain("second copy of one revision")
  })

  /**
   * Three answers where only one is a league table, and each of the others is a
   * sentence rather than an empty section. A library every reader reads is good
   * news and must not read as a failure to measure.
   */
  it("says so when there is no piece to lead with, in each of the ways there is not", () => {
    expect(
      shown(read({ byType: [], mostSkipped: null }, { byType: [], mostMissed: null })).surface
    ).toContain("Nothing has been counted yet")

    expect(
      shown(
        read(
          {
            byType: [census({ type: "loom.card", standings: standings({ read: 7 }), readShare: 1 })],
            mostSkipped: null,
          },
          { mostMissed: null }
        )
      ).surface
    ).toContain("everywhere it stands")
  })

  it("offers nothing to press, because a measurement is not a control", () => {
    const { container } = render(<WhichPieceFirst read={read()} />)

    expect(container.querySelector("button")).toBeNull()
    expect(container.querySelector("form")).toBeNull()
  })

  /**
   * **A space this file's own rendered tests cannot see.**
   *
   * `<span>…</span> off its own row` keeps the space under the transform the
   * tests run through and loses it under the one the application is built with,
   * so a browser prints the two words as one while every assertion above
   * passes. Every screen in this portal is behind a session, so
   * `prerender:check` never walks one either — a photograph is the only thing
   * that has ever caught it.
   *
   * So the guard is on the source: a word may not follow an element on the same
   * line without `{" "}` between them. Punctuation may and does, because a
   * comma hard against the thing it follows is correct.
   */
  it("never leaves a word against an element without an explicit space", () => {
    const source = screenSource(
      portalFile("portal", "pieces", "_components", "which-piece-first.tsx")
    )

    expect(source.match(/<\/(?:span|strong)>\s+[A-Za-z(—]/gu)).toBeNull()
  })
})
