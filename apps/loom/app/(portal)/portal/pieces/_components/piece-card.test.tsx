import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  primitiveTypeSchema,
  slotNameSchema,
  type CataloguedPrimitive,
} from "@jam-overture/loom"

import { recordOf, surfaceOf } from "@/app/(portal)/_test/rendered"

import { PieceCard } from "./piece-card"

/** The names in a catalogue are branded, so a fixture parses rather than casts. */
const slots = (...names: readonly string[]) => names.map((name) => slotNameSchema.parse(name))

const piece = (over: Partial<CataloguedPrimitive> = {}): CataloguedPrimitive => ({
  type: primitiveTypeSchema.parse("loom.card"),
  description: "A block of related content, optionally outlined",
  props: [{ name: "variant", required: false }],
  slots: [],
  reads: undefined,
  ...over,
})

describe("PieceCard", () => {
  it("leads with a name a person reads and keeps the type beside it", () => {
    const { container } = render(<PieceCard primitive={piece()} />)
    const surface = surfaceOf(container)

    expect(surface).toContain("Card")
    /*
     * The type is not hidden. It is the string this reader meets on every other
     * screen in the portal — in a change's plain reading, in History, in the
     * outline — so replacing it with the friendly name would break the
     * connection rather than simplify anything.
     */
    expect(surface).toContain("loom.card")
  })

  it("puts the plain name in the heading, not the type", () => {
    const { container } = render(<PieceCard primitive={piece()} />)

    expect(container.querySelector("h2")?.textContent).toBe("Card")
  })

  it("says what you can set in a sentence, unasked", () => {
    const { container } = render(<PieceCard primitive={piece()} />)

    expect(surfaceOf(container)).toContain("You can set variant, or leave it as it comes.")
  })

  /**
   * The `?` was the only thing on the old card saying whether a setting had to
   * be given, and nothing said that it was. The words are on the surface now and
   * the notation is explained where it is still used.
   */
  it("marks a needed setting in a word rather than in punctuation", () => {
    const { container } = render(
      <PieceCard
        primitive={piece({
          props: [
            { name: "src", required: true },
            { name: "width", required: false },
          ],
        })}
      />
    )
    const surface = surfaceOf(container)

    expect(surface).toContain("needed")
    expect(surface).toContain("optional")
    expect(surface).not.toContain("src?")
    expect(surface).not.toContain("width?")
  })

  it("tells a piece with nothing to set apart from one that cannot say", () => {
    const { container: none } = render(<PieceCard primitive={piece({ props: [] })} />)
    const { container: unknown } = render(<PieceCard primitive={piece({ props: undefined })} />)

    expect(surfaceOf(none)).toContain("Nothing to set.")
    expect(surfaceOf(unknown)).toContain("Loom cannot list what you can set on this one.")
    expect(surfaceOf(unknown)).not.toContain("Nothing to set.")
  })

  it("names the spaces a piece keeps, and says nothing when it keeps none", () => {
    const { container: withSlots } = render(
      <PieceCard primitive={piece({ slots: slots("footer", "header") })} />
    )
    const { container: without } = render(<PieceCard primitive={piece({ slots: slots() })} />)

    expect(surfaceOf(withSlots)).toContain("footer and header")
    expect(surfaceOf(without)).not.toContain("named space")
  })

  /**
   * The rule the whole redirection turns on. `slots:`, `props:` and the `?`
   * notation were all on the surface before; none of them has been deleted, and
   * none of them is met before a reader has asked for it.
   */
  it("keeps the registry's own words off the surface and in the record", () => {
    const { container } = render(<PieceCard primitive={piece({ slots: slots("header") })} />)
    const surface = surfaceOf(container)
    const record = recordOf(container)

    for (const word of ["props:", "slots:", "schema"]) {
      expect(surface).not.toContain(word)
    }

    expect(record).toContain("props: variant?")
    expect(record).toContain("slots: header")
  })

  it("shows the line the model is given, verbatim, one click down", () => {
    const { container } = render(<PieceCard primitive={piece({ slots: slots("header") })} />)

    expect(recordOf(container)).toContain(
      "- loom.card — A block of related content, optionally outlined. props: variant? slots: header"
    )
  })

  /**
   * Found by looking at the page rather than by a test: the notation was
   * explained on every card, including the one whose line reads `props: none`
   * and holds no `?` at all.
   */
  it("explains the ? only where the line has one", () => {
    const { container: optional } = render(
      <PieceCard primitive={piece({ props: [{ name: "variant", required: false }] })} />
    )
    const { container: none } = render(<PieceCard primitive={piece({ props: [] })} />)
    const { container: required } = render(
      <PieceCard primitive={piece({ props: [{ name: "src", required: true }] })} />
    )

    expect(recordOf(optional)).toContain("A trailing ? marks a setting that can be left out.")
    expect(recordOf(none)).not.toContain("A trailing")
    expect(recordOf(required)).not.toContain("A trailing")
  })

  it("explains a schema it cannot enumerate where the reader can act on it", () => {
    const { container } = render(<PieceCard primitive={piece({ props: undefined })} />)

    expect(recordOf(container)).toContain("props: not declared")
  })

  /** One disclosure, named for what is under it rather than "technical details". */
  it("names its disclosure", () => {
    const { container } = render(<PieceCard primitive={piece()} />)
    const summaries = Array.from(container.querySelectorAll("summary"), (one) => one.textContent)

    expect(summaries).toEqual(["The line the AI is given about this piece"])
  })

  it("leaves the disclosure closed", () => {
    const { container } = render(<PieceCard primitive={piece()} />)

    expect(container.querySelector("details")?.open).toBe(false)
  })

  /**
   * Addressed by its type, so the section above the list can send a reader to
   * the one card that needs them. The type is what the whole portal already
   * calls this piece, so nothing had to be invented to link to it.
   */
  it("can be linked to by the type the rest of the portal calls it", () => {
    const { container } = render(<PieceCard primitive={piece()} />)

    expect(container.querySelector("#loom\\.card")).not.toBeNull()
  })

  /**
   * **The two figures, and the reason they arrive as one value.**
   *
   * The share of the places a piece stands and the share of the readers who met
   * it are different questions whose answers can differ by an order of
   * magnitude — *one place in ten* and *nine readers in ten* about the same
   * piece are both true. `howItIsRead` hands the card both halves at once, so
   * there is no arrangement of this markup that prints one of them under the
   * other's label.
   */
  it("draws both figures, each with its own population named", () => {
    const { container } = render(
      <PieceCard
        primitive={piece()}
        read={{
          places: "It stands in 7 places on 3 pages. Readers reached it in 4 of them.",
          readers: "2 in 10 of the readers who met it read it.",
          withheld: undefined,
        }}
      />
    )

    const surface = surfaceOf(container)

    expect(surface).toContain("4 of them")
    expect(surface).toContain("2 in 10 of the readers who met it")
  })

  /**
   * A reader who meets a places figure and a gap cannot tell a piece nobody has
   * measured from a piece whose page has no count of arrivals, and those two
   * send a person to completely different places. So the readers half is never
   * absent: it is a share or it is the reason there is not one.
   */
  it("prints the reason instead of the readers figure, never a gap", () => {
    const { container } = render(
      <PieceCard
        primitive={piece()}
        read={{
          places: "It stands in 7 places on 3 pages. Readers reached it in 4 of them.",
          readers: undefined,
          withheld: "One of the pages this piece stands on has no count of how many readers arrived.",
        }}
      />
    )

    const surface = surfaceOf(container)

    expect(surface).toContain("4 of them")
    expect(surface).toContain("no count of how many readers arrived")
  })

  /**
   * Never *nothing uses this*: the reading is over the pages a deployment has
   * counted and joined, so a piece standing only on a page whose counters have
   * not caught up has no row and is in use all the same. The sentence is handed
   * in for that reason — it needs to know how many pages were behind the
   * figures, and a card does not.
   */
  it("says a piece is on none of the counted pages where it has no figures", () => {
    const { container } = render(
      <PieceCard primitive={piece()} unused="No page behind the figures on this screen uses this piece." />
    )

    expect(surfaceOf(container)).toContain("No page behind the figures on this screen")
  })

  /** The card a deployment that has measured nothing meets: exactly the card it always was. */
  it("says nothing about readers where nothing has been measured", () => {
    const surface = surfaceOf(render(<PieceCard primitive={piece()} />).container)

    expect(surface).not.toContain("places")
    expect(surface).not.toContain("readers")
  })
})
