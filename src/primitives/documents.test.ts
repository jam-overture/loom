import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { sequentialIdFactory, type IdFactory } from "../ids.js"
import type { Clock } from "../runtime/events.js"
import type { EditIntent } from "../runtime/intent.js"
import { renderLoomTree } from "../render/render.js"
import { THEME_PROP_KEY } from "../render/theme.js"
import { describeRegistryError, type PrimitiveRegistry } from "../sdk/registry.js"
import { createThemeRegistry } from "../theme/registry.js"
import { PALETTE_SLOTS } from "../theme/theme.js"
import { buildElement } from "../tree/builders.js"
import type { LoomNode } from "../tree/node.js"
import { createTree, type LoomTree } from "../tree/tree.js"

import { createStarterPrimitiveRegistry, STARTER_PRIMITIVES } from "./index.js"
import {
  CATALOGUE_TYPES,
  COMPOSITION_INTERPRETER,
  COMPOSITION_PARTS,
  compositionById,
  compositionInterpreter,
  compositionsForPart,
  DOCUMENT_COMPOSITIONS,
  DOCUMENT_DESIGNS,
  DOCUMENT_PARTS,
  DOCUMENT_SEQUENCE,
  DOCUMENT_TYPES,
  planComposition,
  STARTER_COMPOSITIONS,
} from "./compositions/index.js"

/**
 * What the second page sequence has to be true of.
 *
 * [0241](../../decisions/0241-a-second-page-sequence-is-earned-by-regions-in-a-different-order-and-the-sites-own-regions-are-shared.md)
 * is `Proposed`, and the thing that makes it reviewable rather than a proposal
 * on paper is that the document it describes **renders**. So this file is
 * `compositions.test.ts`' invariants asked of `DOCUMENT_SEQUENCE` — the ones
 * that are properties of *a page* rather than of the landing page in
 * particular:
 *
 * - every part has a canonical design whose id is the part's own name, which is
 *   what the sequence is derived from;
 * - the assembled document renders clean under both starter palettes with no
 *   colour of its own;
 * - exactly one level-one heading, and the levels never skip;
 * - no two bands answer to the same anchor;
 * - every in-page `href` points at an anchor that is on the page.
 *
 * **And two that are this sequence's alone.** The shared-region rule — `nav` and
 * `footer` are the *same bands* the landing page uses and not copies — and the
 * contents rail, which is the one thing in the document band that could point at
 * nothing with no error, no diagnostic and no failing test anywhere else.
 */

const registryOf = (): PrimitiveRegistry => {
  const built = createStarterPrimitiveRegistry()
  if (!built.ok) throw new Error(describeRegistryError(built.error))

  return built.value
}

const registry = registryOf()
const themes = createThemeRegistry()

const EDITORIAL = { palette: "editorial", fontPack: "editorial-serif", stylePreset: "comfortable" }
const BOLD = { palette: "bold", fontPack: "bold-sans", stylePreset: "airy-modern" }

const pageOf = (theme: Record<string, string>, bands: readonly LoomNode[], ids: IdFactory): LoomTree =>
  createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: bands,
    }),
    ids
  )

const render = (tree: LoomTree, editMode = false): { markup: string; diagnostics: readonly unknown[] } => {
  const rendered = renderLoomTree(tree, { resolver: registry, validator: registry, themes, editMode })

  return { markup: renderToStaticMarkup(rendered.element), diagnostics: rendered.diagnostics }
}

const HOISTED_STYLESHEET = /^(<style[^>]*>[\s\S]*?<\/style>)?/

const treeMarkup = (markup: string): string => {
  const [matched] = HOISTED_STYLESHEET.exec(markup) ?? [""]

  return markup.slice((matched ?? "").length)
}

const typesIn = (node: LoomNode): readonly string[] => {
  if (node.kind === "text") return []
  const here = node.kind === "element" ? [node.type] : []

  return [...here, ...node.children.flatMap(typesIn)]
}

const anchorsIn = (node: LoomNode): readonly string[] => {
  if (node.kind === "text") return []
  const anchor = node.kind === "element" ? (node.props as Record<string, unknown>)["anchor"] : undefined
  const here = typeof anchor === "string" ? [anchor] : []

  return [...here, ...node.children.flatMap(anchorsIn)]
}

const hrefsIn = (node: LoomNode): readonly string[] => {
  if (node.kind === "text") return []
  const here = node.kind === "element" && typeof node.props["href"] === "string" ? [node.props["href"]] : []

  return [...here, ...node.children.flatMap(hrefsIn)]
}

const levelsIn = (node: LoomNode): readonly number[] => {
  if (node.kind === "text") return []
  const here =
    node.kind === "element" && node.type === "loom.heading" && typeof node.props["level"] === "number"
      ? [node.props["level"]]
      : []

  return [...here, ...node.children.flatMap(levelsIn)]
}

const wordsIn = (node: LoomNode): string =>
  node.kind === "text" ? node.value : node.children.map(wordsIn).join(" ")

/** The whole document, built once per call so each test gets fresh ids. */
const documentOf = (ids: IdFactory): readonly LoomNode[] =>
  DOCUMENT_SEQUENCE.map((composition) => composition.build(ids))

describe("the document sequence", () => {
  it("names five regions, in the order a reader meets them", () => {
    expect(DOCUMENT_PARTS).toEqual(["nav", "trail", "document", "onward", "footer"])
  })

  it("offers three designs of its own, each with a distinct id", () => {
    expect(DOCUMENT_COMPOSITIONS).toHaveLength(3)

    const ids = DOCUMENT_COMPOSITIONS.map((composition) => composition.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  /**
   * The convention the sequence is derived from, asserted rather than trusted —
   * the same property `PAGE_SEQUENCE` is held to. A part with no canonical
   * design would be dropped by the `flatMap` and the document would render
   * clean with a hole in it.
   */
  it("fills every region with the design the mapping names, in tuple order", () => {
    expect(DOCUMENT_SEQUENCE).toHaveLength(DOCUMENT_PARTS.length)

    for (const [index, part] of DOCUMENT_PARTS.entries()) {
      expect(DOCUMENT_SEQUENCE[index]?.id, `the ${part} region is not where the tuple says`).toBe(
        DOCUMENT_DESIGNS[part]
      )
    }
  })

  /**
   * The mapping is what the name convention used to be, so it has to be held
   * just as hard: every entry names a band that exists, and — for a region the
   * landing page also has — a band that is a design of **that** region rather
   * than of some other one.
   */
  it("names a design that exists, and one that belongs to the region it fills", () => {
    for (const part of DOCUMENT_PARTS) {
      const id = DOCUMENT_DESIGNS[part]
      const chosen = DOCUMENT_SEQUENCE.find((composition) => composition.id === id)

      expect(chosen, `the ${part} region names ${id}, which is not a band`).toBeDefined()
      expect((chosen as { readonly part: string }).part).toBe(part)
    }
  })

  /**
   * **The shared-region rule, and the half that would otherwise rot quietly.**
   *
   * `nav` and `footer` belong to the site rather than to the page, so the
   * document sequence must hold the *same objects* the landing catalogue holds
   * — not equal ones, the same ones. A copy would compile, render identically
   * on the day it was written, and diverge the first time a deployment edited
   * one of them, shipping a site whose pages have different navigation.
   *
   * Identity is the only assertion that catches that, which is why this is
   * `toBe` and not `toEqual`.
   */
  /**
   * **The shared-region rule, and the half that would otherwise rot quietly.**
   *
   * A region a document takes from the landing phrasebook must hold the *same
   * object* that phrasebook holds — not an equal one, the same one. A copy
   * would compile, render identically on the day it was written, and diverge
   * the first time a deployment edited one of them, shipping a site whose pages
   * have different footers. Identity is the only assertion that catches that,
   * which is why this is `toBe`.
   */
  it("takes the shared regions from the landing phrasebook rather than copying them", () => {
    const shared = DOCUMENT_PARTS.filter(
      (part) => !DOCUMENT_COMPOSITIONS.some((composition) => composition.id === DOCUMENT_DESIGNS[part])
    )

    expect(shared).toEqual(["nav", "footer"])

    for (const part of shared) {
      const id = DOCUMENT_DESIGNS[part]

      expect(DOCUMENT_SEQUENCE.find((composition) => composition.id === id)).toBe(compositionById(id))
    }
  })

  /**
   * **The footer is shared and the header is not, and that asymmetry is the one
   * thing on this branch a test found rather than a person.**
   *
   * 0241 was drafted saying both belong to the site. `documents.test.ts`'
   * every-link-resolves assertion refused it with `#top is linked and no band
   * declares it`: `navBand` honours
   * [0168](../../decisions/0168-a-band-links-into-the-page-it-is-assembled-into.md)
   * by pointing its menu at fragments of `PAGE_SEQUENCE`, which on a document
   * is five links into bands that are not there.
   *
   * So the rule has a scope: **a band that links into the page it is assembled
   * into cannot be shared across page kinds.** This holds the consequence —
   * the document's header is a different design of the same region, and the
   * canonical is still the one the landing page takes.
   */
  it("does not take the landing page's own header, which links into bands a document has not got", () => {
    expect(DOCUMENT_DESIGNS.nav).toBe("nav-docs")
    expect(DOCUMENT_DESIGNS.nav).not.toBe("nav")

    const navDesigns = compositionsForPart("nav").map((composition) => composition.id)
    expect(navDesigns).toContain("nav-docs")
    expect(navDesigns[0], "the landing page still takes the canonical header").toBe("nav")

    /** The reason, asserted rather than described: the canonical links into this page. */
    const canonical = compositionById("nav")
    const fragments = hrefsIn((canonical as { build: (ids: IdFactory) => LoomNode }).build(sequentialIdFactory()))
      .filter((href) => href.startsWith("#"))

    expect(fragments.length).toBeGreaterThan(0)

    /** And the one a document takes carries none. */
    const docs = DOCUMENT_SEQUENCE.find((composition) => composition.id === "nav-docs")
    expect(hrefsIn((docs as { build: (ids: IdFactory) => LoomNode }).build(sequentialIdFactory())).filter((href) => href.startsWith("#"))).toEqual([])
  })

  /**
   * The document bands are deliberately **not** in the landing phrasebook while
   * 0241 is `Proposed`, so `compositions.test.ts`' *every band declares a part
   * the page sequence knows* stays green unweakened. If a later run unifies the
   * two lists this test is the one to delete, and deleting it should be a
   * decision rather than a diff that made a red build go away.
   */
  it("keeps the document bands out of the landing phrasebook, which is what leaves 0241 open", () => {
    expect(STARTER_COMPOSITIONS).toHaveLength(60)

    for (const composition of DOCUMENT_COMPOSITIONS) {
      expect(STARTER_COMPOSITIONS).not.toContain(composition)
      expect(COMPOSITION_PARTS as readonly string[]).not.toContain(composition.part)
    }
  })
})

describe("the document a reader gets", () => {
  it("assembles one document from one design of each region, in order, under both palettes", () => {
    for (const theme of [EDITORIAL, BOLD]) {
      const ids = sequentialIdFactory()
      const bands = documentOf(ids)
      const { markup, diagnostics } = render(pageOf(theme, bands, ids), true)

      expect(diagnostics).toEqual([])

      const positions = bands.map((band) => markup.indexOf(`data-loom-node="${band.id}"`))
      expect(positions.every((position) => position >= 0)).toBe(true)
      expect([...positions].sort((left, right) => left - right)).toEqual(positions)
    }
  })

  /**
   * The brief's non-negotiable bar, asked of the new sequence: every colour
   * comes from a palette slot on the root and nothing below it carries a literal.
   */
  it("takes every colour from the root's slots and carries no literal below it", () => {
    const ids = sequentialIdFactory()
    const { markup } = render(pageOf(BOLD, documentOf(ids), ids))
    const tree = treeMarkup(markup)
    const root = tree.slice(0, tree.indexOf(">"))
    const body = tree.slice(tree.indexOf(">"))

    for (const slot of PALETTE_SLOTS) expect(root).toContain(`--loom-${slot}:`)

    expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(body).not.toMatch(/\b(rgba?|hsla?)\(/)
  })

  /**
   * A re-theme is three ids on the root and nothing else (0049), so the document
   * below the root is byte-identical under two palettes whose fonts and
   * spacing presets also differ.
   */
  it("renders the same document under both palettes once the root's variables are stripped", () => {
    const editorial = treeMarkup(render(pageOf(EDITORIAL, documentOf(sequentialIdFactory()), sequentialIdFactory())).markup)
    const bold = treeMarkup(render(pageOf(BOLD, documentOf(sequentialIdFactory()), sequentialIdFactory())).markup)

    expect(editorial.slice(editorial.indexOf(">"))).toBe(bold.slice(bold.indexOf(">")))
  })

  /**
   * One level-one heading, and it is the document's title rather than a hero's.
   *
   * This is the assertion that states the trigger 0183 named, as a fact about
   * the tree: the landing page's `h1` is in its hero, **this sequence has no
   * hero at all**, and the one `h1` on it is the title of the text.
   */
  it("has exactly one level-one heading, and it is the document's own title", () => {
    const ids = sequentialIdFactory()
    const bands = documentOf(ids)
    const levels = bands.flatMap(levelsIn)

    expect(levels.filter((level) => level === 1)).toHaveLength(1)
    expect(typesIn({ kind: "element", id: "x", type: "loom.page", props: {}, children: bands } as LoomNode)).not.toContain(
      "loom.hero"
    )

    const title = bands.flatMap((band) => (levelsIn(band).includes(1) ? [band] : []))
    expect(title).toHaveLength(1)
    expect(wordsIn(title[0] as LoomNode)).toContain("Starting from a band")
  })

  it("never skips a heading level on the way down", () => {
    const ids = sequentialIdFactory()
    const levels = documentOf(ids).flatMap(levelsIn)

    let deepest = 0
    for (const level of levels) {
      expect(level, `a heading jumped from ${deepest} to ${level}`).toBeLessThanOrEqual(deepest + 1)
      deepest = Math.max(deepest, level)
    }
  })

  /**
   * **The chrome of a document matches the document's band width.**
   *
   * A wide shot is what found this: `trailBand` and `onwardBand` were written
   * at `readable` on the reasoning that they belong to the text, and both drew
   * about a hundred pixels inside the title they sit above and below. Nothing
   * could see it — every schema passed, no diagnostic fired, and the overflow
   * reading was 390 on both palettes, because a band that is too *narrow* is
   * not an overflow.
   *
   * So the rule goes in a test rather than in three doc comments that agree
   * with each other today: every band of this sequence that declares a width
   * declares the same one, and a later change to any of them is red rather
   * than crooked.
   */
  it("gives the document's own bands one measure, so the chrome lines up with the title", () => {
    const widthsIn = (node: LoomNode): readonly string[] => {
      if (node.kind === "text") return []
      const width = node.kind === "element" ? (node.props as Record<string, unknown>)["width"] : undefined
      const here = typeof width === "string" ? [width] : []

      return [...here, ...node.children.flatMap(widthsIn)]
    }

    const ids = sequentialIdFactory()
    const ours = DOCUMENT_COMPOSITIONS.map((composition) => composition.build(ids))
    /** The root section's own width, which is the one that sets the left edge. */
    const measures = ours.map((band) => widthsIn(band)[0])

    expect(measures).toEqual(["wide", "wide", "wide"])
  })

  it("gives the assembled document no two bands that answer to the same anchor", () => {
    const ids = sequentialIdFactory()
    const anchors = documentOf(ids).flatMap(anchorsIn)

    expect(anchors.length).toBeGreaterThan(0)
    expect(new Set(anchors).size, `the document carries a duplicate anchor: ${anchors.join(" ")}`).toBe(anchors.length)
  })

  /**
   * **The contents rail points at four regions that are on the page.**
   *
   * The one defect this band could ship with nothing noticing. Only
   * `loom.section`, `loom.hero` and `loom.callout` accept an `anchor`, so a rail
   * built over bare `loom.heading` nodes — which is the obvious shape — would
   * hold four links pointing at nothing: no error, no diagnostic, no failing
   * test, and four presses that do not move the page. 0165's class exactly.
   *
   * Asserted in **both** directions, because each catches a different edit: a
   * link added to the rail without a section, and a section renamed without the
   * rail.
   */
  it("points every in-page link at an anchor the document actually has", () => {
    const ids = sequentialIdFactory()
    const bands = documentOf(ids)
    const anchors = new Set(bands.flatMap(anchorsIn))
    const fragments = bands.flatMap(hrefsIn).filter((href) => href.startsWith("#"))

    expect(fragments.length).toBeGreaterThan(0)

    for (const fragment of fragments) {
      expect(anchors, `${fragment} is linked and no band declares it`).toContain(fragment.slice(1))
    }
  })

  it("gives the contents rail one link per addressable subsection of the document", () => {
    const ids = sequentialIdFactory()
    const document = DOCUMENT_SEQUENCE.find((composition) => composition.id === "document")?.build(ids)

    expect(document).toBeDefined()

    const subsections = anchorsIn(document as LoomNode).filter((anchor) => anchor !== "starting-from-a-band")
    const rail = hrefsIn(document as LoomNode)
      .filter((href) => href.startsWith("#"))
      .map((href) => href.slice(1))

    expect(subsections).toEqual(["what-a-band-is", "dropping-one-in", "the-arguments", "what-lands"])
    expect(rail).toEqual(subsections)
  })
})

describe("what a document band declares about itself", () => {
  /**
   * The rot check, and the reason it is worth a test rather than a review: a
   * band names its primitive types in a string literal, and a primitive that is
   * renamed leaves the literal behind. Both directions, so neither an unused
   * entry nor a missing one survives.
   */
  it("uses exactly the primitive types it says it uses", () => {
    for (const composition of DOCUMENT_COMPOSITIONS) {
      const ids = sequentialIdFactory()
      const used = new Set(typesIn(composition.build(ids)))

      expect([...used].sort(), `${composition.id} does not use what it declares`).toEqual(
        [...composition.uses].sort()
      )
    }
  })

  it("names only primitives the starter registry holds", () => {
    const registered = new Set(STARTER_PRIMITIVES.map((entry) => entry.type))

    for (const type of DOCUMENT_TYPES) {
      expect(registered, `${type} is used by the document sequence and is not registered`).toContain(type)
    }
  })

  it("says what a person choosing it reads, for every design", () => {
    for (const composition of DOCUMENT_COMPOSITIONS) {
      expect(composition.label.length).toBeGreaterThan(0)
      expect(composition.promise.length).toBeGreaterThan(0)
      expect(composition.rationale.length).toBeGreaterThan(0)
    }
  })
})

describe("the reach the second sequence moves", () => {
  /**
   * **`loom.link-trail` was the last of the ten unreached primitives waiting on
   * work in this lane**, and this is the assertion that says so rather than a
   * sentence in a report that goes stale.
   *
   * The other nine have reasons that are not *nobody wrote a band* — seven are
   * the framework's asset seam, `loom.waiting-state` is a state this runtime is
   * never in, and `loom.page` is the render root — so they are named here as a
   * list a later run can read, and 0241 tabulates why each one is on it.
   */
  it("brings loom.link-trail into reach, which no band could do before", () => {
    expect(CATALOGUE_TYPES).not.toContain("loom.link-trail")
    expect(DOCUMENT_TYPES).toContain("loom.link-trail")
  })

  it("leaves exactly nine primitives unreached, each for a reason that is not a missing band", () => {
    const reached = new Set([...CATALOGUE_TYPES, ...DOCUMENT_TYPES])
    const unreached = STARTER_PRIMITIVES.map((entry) => entry.type)
      .filter((type) => !reached.has(type))
      .sort()

    expect(unreached).toEqual([
      /** Seven waiting on an asset the framework owns. */
      "loom.before-after",
      "loom.carousel",
      "loom.embed",
      "loom.lightbox",
      "loom.media",
      "loom.overlay",
      /** The render root: a band is inserted into a page and cannot be one. */
      "loom.page",
      "loom.pin",
      /** A state resolution-before-the-walk means no component is ever in. */
      "loom.waiting-state",
    ])
  })
})

describe("a document band through the ordinary seam", () => {
  const fixedClock: Clock = { now: () => "2026-10-08T00:00:00.000Z" }

  const intentOf = (tree: LoomTree, ids: IdFactory): EditIntent => ({
    intentId: ids.intentId(),
    treeId: tree.treeId,
    baseRevision: tree.revision,
    origin: "user-instruction",
    utterance: "Put a breadcrumb above the text.",
    observedAt: "2026-10-08T00:00:00.000Z",
  })

  /**
   * The widening 0241 describes, exercised rather than asserted about: a
   * `DocumentComposition` is not assignable to `Composition`, and it goes
   * through `planComposition` anyway because planning takes a `Band` — which it
   * always could have, since it reads `build` and an insertion point and has
   * never read `part`.
   *
   * **This is what keeps there from being a second channel into the tree.** A
   * document band that could not be planned would have needed a surface to
   * build the subtree and write it to the store, which is the one thing the
   * brief for this library forbids by name.
   */
  it("plans one insert, against the tree as it stands", () => {
    const ids = sequentialIdFactory()
    const tree = createTree(buildElement(ids, { type: "loom.page", props: {}, children: [] }), ids)
    const trail = DOCUMENT_COMPOSITIONS.find((composition) => composition.id === "trail")

    expect(trail).toBeDefined()

    const plan = planComposition(trail as (typeof DOCUMENT_COMPOSITIONS)[number], tree, ids)

    expect(plan.outcome).toBe("planned")
    if (plan.outcome !== "planned") return
    expect(plan.operations).toHaveLength(1)
    expect(plan.operations[0]?.op).toBe("insert")
  })

  it("arrives as an ordinary proposal, from the composition interpreter and not a model", async () => {
    const ids = sequentialIdFactory()
    const tree = createTree(buildElement(ids, { type: "loom.page", props: {}, children: [] }), ids)
    const document = DOCUMENT_COMPOSITIONS.find((composition) => composition.id === "document")

    expect(document).toBeDefined()

    const interpreter = compositionInterpreter(
      document as (typeof DOCUMENT_COMPOSITIONS)[number],
      ids,
      fixedClock
    )
    const proposed = await interpreter.interpret(intentOf(tree, ids), tree)

    expect(proposed.ok).toBe(true)
    if (!proposed.ok) return
    expect(proposed.value.provenance.interpreter).toBe(COMPOSITION_INTERPRETER)
    expect(proposed.value.delta.operations).toHaveLength(1)
  })
})
