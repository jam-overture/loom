import {
  primitiveTypeSchema,
  renderCatalogue,
  slotNameSchema,
  type CataloguedPrimitive,
} from "@loom/runtime"
import { catalogueOf } from "@loom/runtime/sdk"
import { describe, expect, it } from "vitest"

import { catalogueLineFor, plainPieceName, settingsOf, spacesReading } from "./piece-view"
import { portalRegistry } from "./registry"

/** The names in a catalogue are branded, so a fixture parses rather than casts. */
const slots = (...names: readonly string[]) => names.map((name) => slotNameSchema.parse(name))

const piece = (over: Partial<CataloguedPrimitive> = {}): CataloguedPrimitive => ({
  type: primitiveTypeSchema.parse("loom.card"),
  description: "A block of related content",
  props: [],
  slots: [],
  ...over,
})

describe("the name a person reads", () => {
  it("drops the namespace and reads the rest as a noun", () => {
    expect(plainPieceName("loom.card")).toBe("Card")
    expect(plainPieceName("loom.heading")).toBe("Heading")
  })

  it("reads a hyphenated type as words", () => {
    expect(plainPieceName("loom.feature-grid")).toBe("Feature grid")
    expect(plainPieceName("loom.tier_table")).toBe("Tier table")
  })

  /** A host's own primitive is the case a hand-maintained table would miss. */
  it("names a primitive this deployment did not write", () => {
    expect(plainPieceName("acme.pricing-table")).toBe("Pricing table")
    expect(plainPieceName("banner")).toBe("Banner")
  })

  /** Nothing left to read: the identifier is a worse name than a blank one is. */
  it("falls back to the type when there is no last part", () => {
    expect(plainPieceName("loom.")).toBe("loom.")
    expect(plainPieceName("")).toBe("")
  })
})

describe("what you can set", () => {
  /**
   * The three claims the runtime makes, kept three. `undefined` is "I cannot
   * enumerate these" and an empty list is "there are none"; a screen that read
   * both as "no settings" would be saying something false about the first.
   */
  it("tells 'cannot say' apart from 'none'", () => {
    expect(settingsOf(piece({ props: undefined })).kind).toBe("unknowable")
    expect(settingsOf(piece({ props: [] })).kind).toBe("none")
  })

  it("says an optional-only piece can be left alone", () => {
    const settings = settingsOf(piece({ props: [{ name: "variant", required: false }] }))

    expect(settings.reading).toBe("You can set variant, or leave it as it comes.")
  })

  it("names two optionals as a list a person would say", () => {
    const settings = settingsOf(
      piece({
        props: [
          { name: "tone", required: false },
          { name: "variant", required: false },
        ],
      })
    )

    expect(settings.reading).toBe("You can set tone and variant, or leave it as it comes.")
  })

  it("says which must be given when all of them must", () => {
    const settings = settingsOf(
      piece({
        props: [
          { name: "alt", required: true },
          { name: "src", required: true },
        ],
      })
    )

    expect(settings.reading).toBe("Alt and src must be given a value.")
  })

  it("says both halves when there are both", () => {
    const settings = settingsOf(
      piece({
        props: [
          { name: "src", required: true },
          { name: "width", required: false },
        ],
      })
    )

    expect(settings.reading).toBe(
      "Src must be given a value. You can also set width."
    )
  })

  it("keeps the two lists apart, so a screen can mark which is which", () => {
    const settings = settingsOf(
      piece({
        props: [
          { name: "src", required: true },
          { name: "width", required: false },
        ],
      })
    )

    expect(settings.kind === "some" && settings.required).toEqual(["src"])
    expect(settings.kind === "some" && settings.optional).toEqual(["width"])
  })

  /**
   * The property that keeps this readable as prose rather than as a template
   * somebody filled in. Every reading is one or two whole sentences.
   */
  it("ends every reading in a full stop", () => {
    const readings = [
      settingsOf(piece({ props: undefined })),
      settingsOf(piece({ props: [] })),
      settingsOf(piece({ props: [{ name: "variant", required: false }] })),
      settingsOf(piece({ props: [{ name: "src", required: true }] })),
      settingsOf(
        piece({
          props: [
            { name: "src", required: true },
            { name: "width", required: false },
          ],
        })
      ),
    ].map((settings) => settings.reading)

    for (const reading of readings) expect(reading.endsWith(".")).toBe(true)
  })

  /**
   * The rule the brief sets, as a check rather than a habit: a person meets the
   * plain word first. `props` and `schema` are both in the marketing lane's
   * reserved vocabulary, and both used to be printed on this screen unasked.
   */
  it("uses no word from the registry's own vocabulary", () => {
    const readings = [
      settingsOf(piece({ props: undefined })).reading,
      settingsOf(piece({ props: [] })).reading,
      settingsOf(piece({ props: [{ name: "variant", required: false }] })).reading,
    ]

    for (const reading of readings) {
      for (const word of ["prop", "schema", "primitive", "registry", "enumerate"]) {
        expect(reading.toLowerCase()).not.toContain(word)
      }
    }
  })
})

describe("the named spaces", () => {
  it("says nothing at all when there are none", () => {
    expect(spacesReading(piece({ slots: slots() }))).toBeUndefined()
  })

  it("counts one space as one", () => {
    expect(spacesReading(piece({ slots: slots("header") }))).toBe(
      "It keeps one named space, header, that holds its own content."
    )
  })

  it("reads several as a list", () => {
    expect(spacesReading(piece({ slots: slots("footer", "header") }))).toBe(
      "It keeps named spaces — footer and header — that each hold their own content."
    )
  })
})

describe("the line the model is given", () => {
  /**
   * The whole point of the disclosure: what a reader is shown is the string that
   * goes into the request, produced by the runtime's own formatter. A second
   * formatter in the portal would agree on the day it was written and drift
   * afterwards, and nothing on the screen would look wrong.
   */
  it("is the runtime's own rendering of that primitive", () => {
    const one = piece({ props: [{ name: "variant", required: false }], slots: slots("header") })

    expect(catalogueLineFor(one)).toBe(renderCatalogue([one]))
  })

  it("is a line out of the catalogue the deployment actually registered", () => {
    const catalogue = catalogueOf(portalRegistry)
    const whole = renderCatalogue(catalogue)

    for (const primitive of catalogue) {
      expect(whole).toContain(catalogueLineFor(primitive))
    }
  })
})

/**
 * A description is the one string on a piece's card that this lane does not
 * write, and until this screen existed nothing read it as prose.
 *
 * The runtime finishes an unfinished one before handing it to the model —
 * `renderCataloguedDescription` appends a full stop — so all four of the
 * portal's read `…vertically.` in the record and `…vertically` on the surface,
 * one line apart. Found by looking at the rendered page, not by a test; this is
 * the test that keeps it from coming back.
 *
 * Asserted on the registry rather than fixed in the component on purpose. The
 * component appending punctuation would be a second formatter disagreeing with
 * the runtime's, and the honest fix for a sentence that does not end is to end
 * it where it is written.
 */
describe("the descriptions this deployment registered", () => {
  it("are whole sentences, because a card prints one unasked", () => {
    const unfinished = catalogueOf(portalRegistry)
      .filter((primitive) => !/[.!?]$/.test(primitive.description))
      .map((primitive) => primitive.type)

    expect(unfinished).toEqual([])
  })

  /** The record is unchanged by that: the runtime appended the same stop. */
  it("read identically in the line the model is given", () => {
    for (const primitive of catalogueOf(portalRegistry)) {
      expect(catalogueLineFor(primitive)).toContain(`— ${primitive.description} `)
    }
  })
})
