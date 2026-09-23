import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  primitiveTypeSchema,
  slotNameSchema,
  type CataloguedPrimitive,
} from "@loom/runtime"

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

/**
 * What a reader meets without asking.
 *
 * A closed `<details>` is still in the DOM — deliberately, so browser
 * find-in-page reaches it — which means `container.textContent` cannot tell "on
 * the surface" from "one click down". Every assertion about the plain-language
 * rule turns on exactly that difference, so it gets a reading of its own.
 *
 * The same pair exists in `_components/proposal-effect.test.tsx`. Copied rather
 * than shared because that file is open on another branch and a shared helper
 * landing in two places at once is the collision this repository already knows
 * about; worth lifting into one module once both have merged.
 */
const surfaceOf = (container: HTMLElement): string => {
  const copy = container.cloneNode(true) as HTMLElement

  for (const disclosure of Array.from(copy.querySelectorAll("details"))) disclosure.remove()

  return copy.textContent ?? ""
}

const recordOf = (container: HTMLElement): string =>
  Array.from(container.querySelectorAll("details"), (one) => one.textContent ?? "").join(" ")

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
})
