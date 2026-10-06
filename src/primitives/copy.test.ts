import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { EMPTY_DATA_RESOLUTION, nodeDataOf, type DataResolution } from "../data/resolution.js"
import { createFrameOriginRegistry, type FrameOriginRegistry } from "../frame/origin.js"
import { sequentialIdFactory } from "../ids.js"
import type { JsonObject, JsonValue } from "../json.js"
import { renderLoomTree } from "../render/render.js"
import { copyIn } from "../sdk/copy.js"
import type { PrimitiveEntry } from "../sdk/definition.js"
import { describeRegistryError, type PrimitiveRegistry } from "../sdk/registry.js"
import { createThemeRegistry } from "../theme/registry.js"
import { DATA_PROP_KEY, THEME_PROP_KEY } from "../reserved-props.js"
import { buildElement, buildText } from "../tree/builders.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { createTree } from "../tree/tree.js"
import { textOf } from "../tree/navigation.js"

import { STARTER_COMPOSITIONS } from "./compositions/index.js"
import { createStarterPrimitiveRegistry, STARTER_PRIMITIVES } from "./index.js"

/**
 * What the library says about its own words, held so it cannot quietly stop
 * saying it.
 *
 * [0122](../../decisions/0122-a-primitive-says-which-of-its-props-a-reader-reads.md)
 * shipped `copy` with nothing declaring it, and said so in its own consequences.
 * For three weeks the honest answer the seam gave about this library was *nobody
 * has told me*, which is the bargain working exactly as designed and worth
 * nothing to the two surfaces that ask — a review queue reporting which words a
 * change takes away, and a reading reporting which words a reader reached.
 *
 * The declarations are now across all of it. Three things can go wrong with a
 * pass like that, and only the first was already checked anywhere:
 *
 * 1. **A declaration names a prop that no longer exists.** The registry refuses
 *    it (`undeclared-copy-prop`), so the first test here is really a test that
 *    the registry is being asked.
 * 2. **A declaration names a prop the component never draws.** Nothing can see
 *    this from outside the component, so the probe below renders every primitive
 *    with a marker in each declared prop and looks for it in the output. A
 *    declaration that outlives the element it described fails here.
 * 3. **A prop a component draws as text that nobody declared.** The silent
 *    half, and the one 0122 was filed about. The same probe reads the other
 *    direction: a string prop drawn as text and not declared is a failure unless
 *    it is in `DRAWN_BUT_NOT_WORDS`, which is two glyphs and the reason each is
 *    not a word.
 *
 * The probe discovers each prop's type by **trial against the schema** rather
 * than by reading Zod's messages: it offers a marker, then the prop's own closed
 * options, then a number, a boolean, and the handful of formats this library
 * uses, and keeps the first the schema does not refuse. A primitive added
 * tomorrow is probed with no edit here, and a Zod upgrade that rewords a message
 * changes nothing.
 */

const registryOf = (): PrimitiveRegistry => {
  const built = createStarterPrimitiveRegistry()
  if (!built.ok) throw new Error(describeRegistryError(built.error))

  return built.value
}

const registry = registryOf()
const themes = createThemeRegistry()

const originsOf = (): FrameOriginRegistry => {
  const built = createFrameOriginRegistry([
    { origin: "https://example.com", description: "The fixture origin for this probe" },
  ])
  if (!built.ok) throw new Error(`probe origins did not build: ${built.error.code}`)

  return built.value
}

const origins = originsOf()

const EDITORIAL = { palette: "editorial", fontPack: "editorial-serif", stylePreset: "comfortable" }
const BOLD = { palette: "bold", fontPack: "bold-sans", stylePreset: "airy-modern" }

/**
 * Three characters, because the shortest string prop in the library is
 * `loom.pin`'s marker at three and a probe that cannot fill a prop cannot say
 * anything about it. Base 36 gives 1,296 of them and the library needs under
 * 300; uniqueness across the whole run is asserted rather than assumed.
 */
const markerAt = (index: number): string => `q${index.toString(36).padStart(2, "0")}`

/**
 * The formats this library asks for that a three-character marker cannot
 * satisfy: two URLs, an SVG path, a view box. Tried in order after the plain
 * candidates, so a prop that takes any string still gets a marker.
 */
const FORMATS: readonly JsonValue[] = [
  "https://example.com/page",
  "https://example.com/image.png",
  "M0 0H24V24H0Z",
  "0 0 24 24",
]

type Filled = {
  readonly entry: PrimitiveEntry
  readonly props: JsonObject
  /** Prop name → the marker it holds, for the props a marker fitted. */
  readonly markers: ReadonlyMap<string, string>
}

const refuses = (entry: PrimitiveEntry, props: JsonObject, name: string): boolean => {
  const verdict = entry.validate(props)

  return verdict.outcome === "invalid" && verdict.issues.some((issue) => issue.path === name)
}

const fill = (entry: PrimitiveEntry, nextMarker: () => string): Filled => {
  const choices = new Map(entry.choices.map((choice) => [choice.name, choice.options]))
  const props: Record<string, JsonValue> = {}
  const markers = new Map<string, string>()

  for (const prop of entry.declaredProps ?? []) {
    const marker = nextMarker()
    const candidates: readonly JsonValue[] = [
      marker,
      ...(choices.get(prop.name) ?? []),
      2,
      50,
      true,
      ...FORMATS,
    ]

    for (const candidate of candidates) {
      props[prop.name] = candidate
      if (!refuses(entry, props, prop.name)) {
        if (candidate === marker) markers.set(prop.name, marker)
        break
      }
      delete props[prop.name]
    }
  }

  return { entry, props, markers }
}

const filled: readonly Filled[] = (() => {
  let index = 0
  const nextMarker = (): string => markerAt(index++)

  return STARTER_PRIMITIVES.map((entry) => fill(entry, nextMarker))
})()

/**
 * `loom.tally` is the one primitive here whose declared copy is drawn only
 * around a figure a binding brought: with no answer it draws the word standing
 * in for the figure, and `prefix` and `suffix` have nothing to wrap. So the
 * probe answers its binding — under whichever name its own prop gave, which is
 * the second form of a `reads` declaration (0184) seen from the outside.
 *
 * The node has to carry the question as well as be handed the answer: the walk
 * looks a node's data up only where its props declare a binding, which is
 * `loom:data` doing exactly what 0058 says it does.
 */
/**
 * The answer each bound primitive needs before its declared copy is on the
 * page, by type, and the default binding name it arrives under when the probe
 * did not fill the `binding` prop.
 *
 * Two of them rather than one as of 0233: `loom.trend` declares `prefix` and
 * `suffix` for `loom.tally`'s reason — a currency mark and a percent sign are
 * words a translation changes — and like `loom.tally` it has nothing to set them
 * against until a figure arrives. The other two twins this run added declare
 * `copy: []` and need no answer here.
 */
const ANSWERS: Readonly<Record<string, { readonly name: string; readonly value: JsonValue }>> = {
  "loom.tally": { name: "value", value: 12480 },
  "loom.trend": { name: "series", value: [{ label: "Jan", value: 62 }] },
}

const isBound = (one: Filled): boolean => one.entry.type in ANSWERS

const bindingNameOf = (one: Filled): string =>
  typeof one.props["binding"] === "string"
    ? one.props["binding"]
    : (ANSWERS[one.entry.type]?.name ?? "value")

const dataFor = (one: Filled): DataResolution => {
  const answer = ANSWERS[one.entry.type]
  if (answer === undefined) return EMPTY_DATA_RESOLUTION

  const answers = nodeDataOf({
    [bindingNameOf(one)]: { status: "ready", value: answer.value },
  })

  return { lookup: () => answers, problemsFor: () => [] }
}

const askingFor = (one: Filled): JsonObject =>
  isBound(one) ? { [DATA_PROP_KEY]: { [bindingNameOf(one)]: { source: "the probe" } } } : {}

const markup = (one: Filled, theme: Record<string, string>): string => {
  const ids = sequentialIdFactory()
  const node: ElementNode = buildElement(ids, {
    type: one.entry.type,
    props: { ...one.props, ...askingFor(one), [THEME_PROP_KEY]: theme },
    children: [buildText(ids, "the words its children carry")],
  })
  const rendered = renderLoomTree(createTree(node, ids), {
    resolver: registry,
    validator: registry,
    origins,
    data: dataFor(one),
    themes,
    editMode: false,
  })

  return renderToStaticMarkup(rendered.element)
}

/** The stylesheet is hoisted into the output and is not what anybody reads. */
const withoutStylesheet = (rendered: string): string =>
  rendered.replace(/<style[^>]*>[\s\S]*?<\/style>/g, "")

const asText = (rendered: string): string => withoutStylesheet(rendered).replace(/<[^>]*>/g, " ")

/**
 * A prop drawn as text that is deliberately not declared copy.
 *
 * Both are glyphs with a character limit that makes them one: a change that
 * swaps a tick for a cross takes no words away, and a reviewer handed `✦` in a
 * list of the words a proposal removes is being handed noise. The limit is the
 * argument — a prop that could hold a sentence is not on this list.
 */
const DRAWN_BUT_NOT_WORDS: readonly (readonly [string, string])[] = [
  ["loom.pin", "marker"],
  ["loom.feature", "icon"],
]

const allowedUndeclared = (type: string, prop: string): boolean =>
  DRAWN_BUT_NOT_WORDS.some(([onType, onProp]) => onType === type && onProp === prop)

/**
 * The declared props holding something this reading will not turn into a word,
 * which on this library is two numbers a component prints: a meter's `value`
 * and a rating's `score`. Held as a list rather than a count so the third one
 * arrives in review rather than in a diff.
 */
const PRINTED_NUMBERS: readonly string[] = ["loom.meter.value", "loom.rating.score"]

describe("what the library declares about its own words", () => {
  it("has every primitive say which of its props a reader reads", () => {
    const silent = STARTER_PRIMITIVES.filter((entry) => entry.copy === undefined).map((entry) => entry.type)

    expect(silent).toEqual([])
    expect(STARTER_PRIMITIVES.length).toBeGreaterThan(100)
  })

  it("keeps empty and absent as different answers", () => {
    const saying = STARTER_PRIMITIVES.filter((entry) => entry.copy?.length === 0)
    const words = STARTER_PRIMITIVES.filter((entry) => (entry.copy?.length ?? 0) > 0)

    /**
     * Both halves are load-bearing. `[]` on an arrangement is what empties
     * `unread` for a whole page — a stack that has not said is a stack a
     * reading has to report — and the primitives with words are what fills
     * `words` at all.
     */
    expect(saying.length).toBeGreaterThan(50)
    expect(words.length).toBeGreaterThan(40)
  })

  it("declares no prop the schema does not have", () => {
    /**
     * `createStarterPrimitiveRegistry` refuses `undeclared-copy-prop`, so the
     * registry this file built is the assertion. Stated as its own test because
     * the failure it catches — a prop renamed, a declaration left pointing at
     * nothing — reads as nothing at all from outside.
     */
    for (const entry of STARTER_PRIMITIVES) {
      const declared = new Set((entry.declaredProps ?? []).map((prop) => prop.name))
      for (const prop of entry.copy ?? []) expect(declared).toContain(prop)
    }
  })

  it("gives the probe a valid node for every primitive, with unique markers", () => {
    const seen = new Set<string>()
    for (const one of filled) {
      expect(one.entry.validate(one.props).outcome, `${one.entry.type}: ${JSON.stringify(one.props)}`).toBe(
        "valid"
      )
      for (const marker of one.markers.values()) {
        expect(seen.has(marker), `marker ${marker} is used twice`).toBe(false)
        seen.add(marker)
      }
    }
  })

  it("draws every prop it declared as copy", () => {
    for (const one of filled) {
      const rendered = withoutStylesheet(markup(one, EDITORIAL))
      for (const prop of one.entry.copy ?? []) {
        const marker = one.markers.get(prop)
        /** A declared prop the probe filled with a number is checked below, not here. */
        if (marker === undefined) continue

        expect(
          rendered.includes(marker),
          `${one.entry.type} declares ${prop} as copy and does not draw it`
        ).toBe(true)
      }
    }
  })

  it("draws no undeclared string prop as text", () => {
    for (const one of filled) {
      const declared = new Set(one.entry.copy ?? [])
      const text = asText(markup(one, EDITORIAL))
      for (const [prop, marker] of one.markers) {
        if (declared.has(prop) || allowedUndeclared(one.entry.type, prop)) continue

        expect(
          text.includes(marker),
          `${one.entry.type} draws ${prop} as text and does not declare it as copy`
        ).toBe(false)
      }
    }
  })

  it("says the same words under both starter palettes", () => {
    /**
     * A palette changes colour, type and spacing and changes nothing about what
     * a page says. Asserted rather than assumed because the way a primitive
     * would break it is a prop drawn only in one theme's branch, which is
     * exactly the shape of thing that gets written by accident.
     */
    for (const one of filled) {
      const editorial = withoutStylesheet(markup(one, EDITORIAL))
      const bold = withoutStylesheet(markup(one, BOLD))
      for (const marker of one.markers.values()) {
        expect(editorial.includes(marker), `${one.entry.type}: ${marker} under editorial`).toBe(
          bold.includes(marker)
        )
      }
    }
  })
})

describe("what a reading of the catalogue now says", () => {
  it("leaves nothing unread in any starting composition", () => {
    for (const composition of STARTER_COMPOSITIONS) {
      const reading = copyIn(composition.build(sequentialIdFactory()), registry)

      expect(
        reading.unread.map((one) => `${one.type} [${one.props.join(",")}]`),
        `${composition.id} has parts whose words nobody classified`
      ).toEqual([])
      expect(reading.words.length, `${composition.id} reads as a band with no words`).toBeGreaterThan(0)
    }
  })

  it("reports a figure it will not coerce only where a component prints a number", () => {
    const unspoken = new Set<string>()
    for (const composition of STARTER_COMPOSITIONS) {
      const reading = copyIn(composition.build(sequentialIdFactory()), registry)
      for (const one of reading.unspoken) {
        for (const prop of one.props) unspoken.add(`${one.type}.${prop}`)
      }
    }

    for (const one of unspoken) expect(PRINTED_NUMBERS).toContain(one)
  })

  it("reads the four figures of the metrics band, which textOf cannot see", () => {
    const band = STARTER_COMPOSITIONS.find((one) => one.id === "metrics")
    if (!band) throw new Error("the metrics band is not in the catalogue")

    const node = band.build(sequentialIdFactory())

    /**
     * The whole finding in two lines: the band a surface offers as a starting
     * composition has four figures and four labels in props, and the walk that
     * reads text children answers the empty string for it.
     */
    expect(textOf(node)).toBe("")
    expect(copyIn(node, registry).words).toEqual([
      "12k+",
      "Teams shipping weekly",
      "99.98%",
      "Uptime last quarter",
      "4 min",
      "Median time to first board",
      "40+",
      "Tools it reads and writes",
    ])
  })
})

describe("what part each primitive plays", () => {
  it("answers which types are headings from the registry rather than a host's array", () => {
    expect(registry.typesWithRole("heading")).toEqual(["loom.heading"])
  })

  it("lets a page name be derived without naming a type", () => {
    /**
     * `TITLE_BEARING` in two hosts, written without one: the first node in
     * reading order whose *type* declares that a reader takes it as the title
     * of what follows. Which heading leads is a fact about the tree and is read
     * here; that it is a heading at all is a fact about the primitive and is
     * read from the registry (0114).
     */
    const titleBearing = new Set(registry.typesWithRole("heading"))
    const firstTitle = (node: LoomNode): string | undefined => {
      if (node.kind === "element" && titleBearing.has(node.type)) return textOf(node)
      if (node.kind === "text") return undefined

      for (const child of node.children) {
        const found = firstTitle(child)
        if (found !== undefined) return found
      }

      return undefined
    }

    const hero = STARTER_COMPOSITIONS.find((one) => one.id === "hero")
    if (!hero) throw new Error("the hero band is not in the catalogue")

    expect(firstTitle(hero.build(sequentialIdFactory()))).toBe("Everything your team ships, in one place")
  })
})
