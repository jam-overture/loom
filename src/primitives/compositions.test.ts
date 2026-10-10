import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { sequentialIdFactory, type IdFactory, type NodeId } from "../ids.js"
import type { Clock } from "../runtime/events.js"
import type { EditIntent } from "../runtime/intent.js"
import { renderLoomTree } from "../render/render.js"
import { THEME_PROP_KEY } from "../render/theme.js"
import { describeRegistryError, type PrimitiveRegistry } from "../sdk/registry.js"
import { createThemeRegistry } from "../theme/registry.js"
import { PALETTE_SLOTS } from "../theme/theme.js"
import { applyDelta } from "../tree/apply.js"
import { buildElement } from "../tree/builders.js"
import { treeDeltaSchema } from "../tree/delta.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { createTree, type LoomTree } from "../tree/tree.js"

import { createStarterPrimitiveRegistry } from "./index.js"
import {
  CATALOGUE_TYPES,
  COMPOSITION_INTERPRETER,
  COMPOSITION_PARTS,
  compositionById,
  compositionInterpreter,
  compositionsForPart,
  PAGE_SEQUENCE,
  planComposition,
  STARTER_COMPOSITIONS,
  type Composition,
  type CompositionPart,
} from "./compositions/index.js"

/**
 * What a starting composition has to be true of, and it is a short list with
 * one long consequence.
 *
 * A composition is not a primitive, so most of `library.test.ts` does not apply
 * to it. What does apply is everything about the *tree it builds*: the types
 * have to exist, the props have to pass their own schemas, the slots have to be
 * ones the primitive declares, and the whole thing has to render under both
 * starter palettes with no colour of its own. None of that is checkable by
 * reading the module — it is checkable by building the subtree, putting it in a
 * page, and rendering it, which is what almost every test here does.
 *
 * The one that matters most is the rot check. A composition names nine
 * primitive types in a string literal; a primitive that is renamed or whose
 * schema tightens leaves the literal behind, and the failure would otherwise be
 * a band that silently loses a node on a host's page months later. `renders
 * with no diagnostics` is what makes that a red build here instead.
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

/** A page holding whatever bands a test wants, themed the way a host would. */
const pageOf = (theme: Record<string, string>, bands: readonly LoomNode[], ids: IdFactory): LoomTree =>
  createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: bands,
    }),
    ids
  )

const render = (
  tree: LoomTree,
  editMode = false
): { markup: string; diagnostics: readonly unknown[] } => {
  const rendered = renderLoomTree(tree, { resolver: registry, validator: registry, themes, editMode })

  return { markup: renderToStaticMarkup(rendered.element), diagnostics: rendered.diagnostics }
}

/**
 * The library's stylesheet is hoisted ahead of the tree by React, so every
 * assertion about "the root" has to step over it first. The same helper
 * `library.test.ts` has, for the same reason.
 */
const HOISTED_STYLESHEET = /^(<style[^>]*>[\s\S]*?<\/style>)?/

const treeMarkup = (markup: string): string => {
  const [matched] = HOISTED_STYLESHEET.exec(markup) ?? [""]

  return markup.slice((matched ?? "").length)
}

/** Every element type in a subtree, including the root's. */
const typesIn = (node: LoomNode): readonly string[] => {
  if (node.kind === "text") return []
  const here = node.kind === "element" ? [node.type] : []

  return [...here, ...node.children.flatMap(typesIn)]
}

/**
 * Every `anchor` a subtree declares, in document order.
 *
 * Only three primitives carry one — `loom.section`, `loom.hero`, `loom.callout`
 * — but reading the prop by name rather than the type keeps this true when a
 * fourth is given one, and an anchor is the only prop in the library that a
 * node writes straight into the document as an `id`.
 */
/**
 * Every `href` in a subtree. Shared by the two tests below because they are two
 * halves of one property — what a link points at, and whether it is there.
 */
const hrefsIn = (node: LoomNode): readonly string[] => {
  if (node.kind === "text") return []
  const here = node.kind === "element" && typeof node.props["href"] === "string" ? [node.props["href"]] : []

  return [...here, ...node.children.flatMap(hrefsIn)]
}

const anchorsIn = (node: LoomNode): readonly string[] => {
  if (node.kind === "text") return []
  const anchor = node.kind === "element" ? (node.props as Record<string, unknown>)["anchor"] : undefined
  const here = typeof anchor === "string" ? [anchor] : []

  return [...here, ...node.children.flatMap(anchorsIn)]
}

/** Every `loom.stat-chart` in a subtree, paired with the children it plots. */
const chartsIn = (node: LoomNode): readonly (readonly LoomNode[])[] => {
  if (node.kind === "text") return []
  const here = node.kind === "element" && node.type === "loom.stat-chart" ? [node.children] : []

  return [...here, ...node.children.flatMap(chartsIn)]
}

const idsIn = (node: LoomNode): readonly string[] => {
  if (node.kind === "text") return [node.id]

  return [node.id, ...node.children.flatMap(idsIn)]
}

const nodesIn = (node: LoomNode): number => idsIn(node).length

/** Every element of one type in a subtree, in document order. */
const elementsOfType = (node: LoomNode, type: string): readonly ElementNode[] => {
  if (node.kind === "text") return []
  const here: readonly ElementNode[] = node.kind === "element" && node.type === type ? [node] : []

  return [...here, ...node.children.flatMap((child) => elementsOfType(child, type))]
}

/** Everything a subtree says, run together. */
const wordsIn = (node: LoomNode): string =>
  node.kind === "text" ? node.value : node.children.map(wordsIn).join(" ")

const fixedClock: Clock = { now: () => "2026-09-09T00:00:00.000Z" }

const intentOf = (tree: LoomTree, ids: IdFactory): EditIntent => ({
  intentId: ids.intentId(),
  treeId: tree.treeId,
  baseRevision: tree.revision,
  origin: "user-instruction",
  utterance: "Add a pricing band to the bottom of the page.",
  observedAt: "2026-09-09T00:00:00.000Z",
})

describe("the starter compositions", () => {
  it("offers sixty-three bands, each with a distinct id", () => {
    expect(STARTER_COMPOSITIONS).toHaveLength(63)

    const ids = STARTER_COMPOSITIONS.map((composition) => composition.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("declares a part the page sequence knows, for every band", () => {
    for (const composition of STARTER_COMPOSITIONS) {
      expect(COMPOSITION_PARTS).toContain(composition.part)
    }
  })

  /**
   * The convention {@link PAGE_SEQUENCE} is derived from, asserted rather than
   * trusted: a part's canonical design is the band whose id **is** the part's
   * name. A part with no canonical design would silently vanish from the page —
   * `flatMap` would drop it and the page would render clean with a hole in it —
   * so the hole is caught here instead.
   */
  it("gives every part a canonical design whose id is the part's name", () => {
    for (const part of COMPOSITION_PARTS) {
      const canonical = compositionById(part)

      expect(canonical, `no canonical design for the ${part} band`).toBeDefined()
      expect((canonical as Composition).part).toBe(part)
    }
  })

  /**
   * The example of a part with one design was `credentials` until 3 October,
   * `banner` from then until 5 October, and **there is no longer one** — which
   * the previous version of this comment named as the day the line would need
   * editing, and is why the second half of this assertion has changed shape
   * rather than changing its literal.
   *
   * What it holds is the *shape* of the answer: canonical first, alternates
   * after it. The half that used to be a part with no alternate is now the
   * invariant that replaced it — **every part answers with at least its
   * canonical, and the canonical is the entry whose id is the part's own
   * name.** That is the property `PAGE_SEQUENCE` is derived from, it cannot go
   * stale as the catalogue grows, and it is red for exactly the case the old
   * line could no longer see: a part admitted under 0171 whose canonical was
   * never written.
   */
  it("answers which designs a part has, canonical first, for every part", () => {
    expect(compositionsForPart("hero").map((composition) => composition.id)).toEqual([
      "hero",
      "hero-split",
      "hero-shot",
    ])
    expect(compositionsForPart("banner").map((composition) => composition.id)).toEqual(["banner", "banner-inline"])

    for (const part of COMPOSITION_PARTS) {
      const designs = compositionsForPart(part)

      expect(designs.length, `the ${part} band has no designs at all`).toBeGreaterThan(0)
      expect(designs[0]?.id, `the ${part} band does not answer with its canonical first`).toBe(part)
    }
  })

  /**
   * The rule the catalogue's index states, made checkable: a second design of a
   * part earns its place by building a **different set of nodes**, because a
   * band that differs only in its props is a `configure` of the first and does
   * not belong in a catalogue at all.
   *
   * Shape rather than ids, since every build mints fresh ones. Two designs of a
   * part whose node types read the same in the same order are the near-miss
   * this asserts against — and it is a cheap check that would have caught the
   * tempting `layout: "cards" | "matrix"` version of `pricing-matrix`.
   */
  it("makes every alternate design differ from its canonical in structure, not in props", () => {
    const shapeOf = (node: LoomNode): readonly string[] =>
      node.kind === "text" ? ["#text"] : [node.kind === "element" ? node.type : "#slot", ...node.children.flatMap(shapeOf)]

    for (const part of COMPOSITION_PARTS) {
      const designs = compositionsForPart(part)
      if (designs.length < 2) continue

      const shapes = designs.map((design) => shapeOf(design.build(sequentialIdFactory())).join(" "))
      expect(new Set(shapes).size, `two designs of the ${part} band build the same tree`).toBe(shapes.length)
    }
  })

  /**
   * An anchor belongs to the part, not to the design.
   *
   * `hero` and `hero-split` both answer to `#top`, and they have to: a nav link
   * written against the canonical design has to keep working when a host swaps
   * in the alternate, and a fragment that silently stops resolving is a defect
   * only the people who arrived from a menu ever see.
   *
   * **This found one.** `testimonials` carried no anchor and
   * `testimonials-wall` carried `#testimonials`, so the link worked on a page
   * that had taken the alternate and not on the default page. Restoring that
   * asymmetry fails here by name.
   */
  it("gives every design of a part the same anchors as its canonical", () => {
    for (const part of COMPOSITION_PARTS) {
      const designs = compositionsForPart(part)
      if (designs.length < 2) continue

      const anchors = designs.map((design) => JSON.stringify(anchorsIn(design.build(sequentialIdFactory()))))
      expect(new Set(anchors).size, `designs of the ${part} band disagree about their anchors: ${anchors.join(" ")}`).toBe(1)
    }
  })

  it("finds a band by its id, and nothing by a name that is not one", () => {
    expect(compositionById("pricing")?.label).toBe("Pricing")
    expect(compositionById("loom.pricing")).toBeUndefined()
  })

  /**
   * The rot check, and the reason this file exists.
   *
   * `uses` is a string literal beside a subtree of string literals, so the two
   * can disagree the moment either is edited. Both directions are asserted:
   * a type in the subtree that `uses` does not name would make the catalogue
   * lie about its own dependencies, and a type in `uses` that the subtree does
   * not build is a dependency nobody has.
   */
  it("declares exactly the primitive types its subtree builds", () => {
    for (const composition of STARTER_COMPOSITIONS) {
      const built = new Set<string>(typesIn(composition.build(sequentialIdFactory())))

      expect([...built].sort()).toEqual([...composition.uses].sort())
    }
  })

  /**
   * The reach of the phrasebook over the vocabulary, made a checked artifact
   * rather than a number in a report.
   *
   * **This is deliberately not a ceiling**, and the distinction is the whole
   * reason it is written this way. A primitive is registered before a band
   * uses it, so a test demanding that every registered type be reachable would
   * fire on the ordinary order of work — 0170's argument about a character
   * budget over the primitives block, one list over. What is asserted is only that the exported number
   * is the one the catalogue actually has: that {@link CATALOGUE_TYPES} is the
   * union of the bands' own `uses` and nothing else, so the gap a run reports
   * is derived from the same strings the rot check holds against the subtrees.
   *
   * Measured on 19 September: 52 of 96, and the 44 are in that run's report
   * classified by *why*, which is the part a number cannot carry.
   *
   * The second assertion is what makes this list safe to hand to 0170's
   * `selectPrimitives`: a host taking `selectPrimitives(STARTER_PRIMITIVES,
   * CATALOGUE_TYPES)` gets the smallest registry that can build every band,
   * and that call can never hit the `unregistered-types` refusal because this
   * test would have gone red first.
   */
  it("reaches exactly the types its bands declare, and every one is registered", () => {
    const declared = new Set(STARTER_COMPOSITIONS.flatMap((composition) => composition.uses))
    const registered = new Set<string>(registry.primitives.map((primitive) => primitive.type))

    expect(CATALOGUE_TYPES).toEqual([...declared].sort())
    for (const type of CATALOGUE_TYPES) expect(registered.has(type), `${type} is not registered`).toBe(true)
    expect(CATALOGUE_TYPES.length).toBeLessThanOrEqual(registered.size)
  })

  /**
   * A code panel with nothing in it renders clean, and is a box of air.
   *
   * The same shape as the plotted-figure check below and found the same way:
   * `loom.code` takes its snippet as a **child** rather than as a prop, so a
   * band that puts the code in a prop by mistake, or builds the panel and
   * forgets the text, satisfies every schema, produces no diagnostic and draws
   * a titled empty surface. Rendering is total (0008); nothing is refused.
   *
   * It is asserted over the catalogue rather than over the two bands that ship
   * a panel today, because the failure belongs to the primitive's shape and
   * will outlive both of them.
   */
  it("gives every code panel something to print", () => {
    const panelsIn = (node: LoomNode): readonly ElementNode[] =>
      node.kind === "text"
        ? []
        : [...(node.kind === "element" && node.type === "loom.code" ? [node] : []), ...node.children.flatMap(panelsIn)]

    for (const composition of STARTER_COMPOSITIONS) {
      for (const panel of panelsIn(composition.build(sequentialIdFactory()))) {
        const printed = panel.children
          .flatMap((child) => (child.kind === "text" ? [child.value] : []))
          .join("")
          .trim()

        expect(printed.length, `a code panel in ${composition.id} would print nothing`).toBeGreaterThan(0)
      }
    }
  })

  it("builds nothing this library does not register", () => {
    const registered = new Set<string>(registry.primitives.map((primitive) => primitive.type))

    for (const composition of STARTER_COMPOSITIONS) {
      for (const type of composition.uses) expect(registered.has(type)).toBe(true)
    }
  })

  /**
   * Fresh ids on every call, and no id used twice inside one band.
   *
   * The first is what makes a composition insertable more than once — two
   * pricing bands on one page is an ordinary thing to want, and it would be a
   * duplicate-id delta if `build` closed over its ids. The second is what makes
   * it insertable at all: `tree/identity.ts` refuses a delta that mints one id
   * twice, so a band with a collision inside it would be refused whole.
   */
  it("mints fresh ids on every build, and none of them twice", () => {
    for (const composition of STARTER_COMPOSITIONS) {
      const first = idsIn(composition.build(sequentialIdFactory()))
      const second = idsIn(composition.build(sequentialIdFactory("b")))

      expect(new Set(first).size).toBe(first.length)
      expect(first.some((id) => second.includes(id))).toBe(false)
    }
  })
})

describe("what a band renders", () => {
  for (const composition of STARTER_COMPOSITIONS) {
    /**
     * One test per band per palette. A diagnostic here is the only signal that
     * distinguishes "the band rendered" from "the band rendered with three of
     * its nodes silently omitted", because rendering is total (0008) and an
     * invalid node is dropped rather than thrown.
     */
    it(`renders ${composition.id} under both starter palettes with nothing refused`, () => {
      for (const theme of [EDITORIAL, BOLD]) {
        const ids = sequentialIdFactory()
        const { markup, diagnostics } = render(pageOf(theme, [composition.build(ids)], ids))

        expect(diagnostics).toEqual([])
        expect(markup.length).toBeGreaterThan(0)
      }
    })
  }

  it("reads every colour from the palette and names none of its own", () => {
    const ids = sequentialIdFactory()
    const page = pageOf(
      BOLD,
      STARTER_COMPOSITIONS.map((composition) => composition.build(ids)),
      ids
    )
    const { markup, diagnostics } = render(page)
    const tree = treeMarkup(markup)
    const root = tree.slice(0, tree.indexOf(">"))
    const body = tree.slice(tree.indexOf(">"))

    expect(diagnostics).toEqual([])
    for (const slot of PALETTE_SLOTS) expect(root).toContain(`--loom-${slot}:`)

    expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(body).not.toMatch(/\b(rgba?|hsla?)\(/)
  })

  /**
   * One design of each band is one page, which is the claim `PAGE_SEQUENCE`
   * makes by being ordered. A page that renders clean under both palettes is
   * the whole of what that claim can be held to here; whether it *reads* as a
   * page is what the screenshots in the report are for.
   *
   * **This assertion used to be made of `STARTER_COMPOSITIONS`**, and moving it
   * is the whole of what 0162 changed. The catalogue is now a phrasebook of
   * twenty-three designs including two heroes, and two heroes are not a page —
   * which the test below about level-one headings says louder than this one.
   */
  it("assembles one page from one design of each band, in order, under both palettes", () => {
    expect(PAGE_SEQUENCE).toHaveLength(COMPOSITION_PARTS.length)

    for (const theme of [EDITORIAL, BOLD]) {
      const ids = sequentialIdFactory()
      const bands = PAGE_SEQUENCE.map((composition) => composition.build(ids))
      const { markup, diagnostics } = render(pageOf(theme, bands, ids), true)

      expect(diagnostics).toEqual([])
      /**
       * Every band left its own node in the output, in the order the catalogue
       * lists them. Edit mode is what puts the ids in the markup, and an id is
       * the only thing that distinguishes one `loom.section` from the four
       * others on the page.
       */
      const positions = bands.map((band) => markup.indexOf(`data-loom-node="${band.id}"`))
      expect(positions.every((position) => position >= 0)).toBe(true)
      expect([...positions].sort((left, right) => left - right)).toEqual(positions)
    }
  })

  /**
   * No two bands on the page answer to the same name.
   *
   * `anchor.ts` states in its own header that this is exactly what it cannot
   * check — *"a schema validates one node's props and duplication is a fact
   * about a tree"* — and names the render seam as where it belongs. It is not
   * there yet, and in the meantime the assembled page is a tree this lane owns
   * and can assert over, which is 0125's rule about where a property of a
   * *page* is measured.
   *
   * **This found one.** `features` and `bento` both carried `anchor: "features"`
   * and both are on the canonical page, so the document rendered two elements
   * with `id="features"` and a link to `#features` reached the first. The bento
   * band was unreachable by fragment from the day it shipped, with no error, no
   * diagnostic and no failing test — the whole of what a duplicate id does is
   * that the second one stops being found.
   */
  it("gives the assembled page no two bands that answer to the same anchor", () => {
    const ids = sequentialIdFactory()
    const anchors = PAGE_SEQUENCE.flatMap((composition) => anchorsIn(composition.build(ids)))

    expect(anchors.length).toBeGreaterThan(0)
    expect(new Set(anchors).size, `the page carries a duplicate anchor: ${anchors.join(" ")}`).toBe(anchors.length)
  })

  /**
   * A plotted figure without a magnitude draws a column of no height.
   *
   * `loom.stat` takes `magnitude` as optional because a stat in a
   * `loom.stat-grid` has nothing to be a magnitude *of*; inside a
   * `loom.stat-chart` it is what gives the bar its height, and its absence is
   * the quietest failure in this band's vicinity. Nothing refuses it — the
   * schema is satisfied, the render is total, the diagnostics are empty — and
   * what a reader gets is a chart with a gap in the series where one month's
   * bar should be. So the check has to be about the *pair*, which is what this
   * is: any stat under a chart, in any band, now or later.
   */
  it("gives every plotted figure a magnitude to be drawn at", () => {
    for (const composition of STARTER_COMPOSITIONS) {
      for (const plotted of chartsIn(composition.build(sequentialIdFactory()))) {
        expect(plotted.length, `${composition.id} plots nothing`).toBeGreaterThan(0)

        for (const point of plotted) {
          const magnitude = point.kind === "element" ? (point.props as Record<string, unknown>)["magnitude"] : undefined

          expect(typeof magnitude, `a point in ${composition.id} has no magnitude and would draw nothing`).toBe("number")
        }
      }
    }
  })

  /**
   * The clearest statement of 0162's rule that the catalogue contains, pinned
   * so it stays true.
   *
   * `steps` and `steps-cards` say **the same three things in the same three
   * sentences** on purpose, so that what is left over between them is exactly
   * the difference the rule is about: ten nodes where a step's title and body
   * are props on a leaf, against twenty-eight where they are nodes with text
   * children of their own. Neither band is better; they cost different
   * amounts to drop in and reach different amounts afterwards.
   *
   * Both halves are asserted, because either alone is weak. Identical text with
   * identical structure would be a `configure` and must not be in the catalogue;
   * different structure with different text would prove nothing about the rule,
   * since every other pair in the phrasebook differs in its copy too.
   */
  it("makes steps and steps-cards the same words in two different sets of nodes", () => {
    const textIn = (node: LoomNode): readonly string[] =>
      node.kind === "text" ? [node.value] : node.children.flatMap(textIn)

    const row = (compositionById("steps") as Composition).build(sequentialIdFactory())
    const cards = (compositionById("steps-cards") as Composition).build(sequentialIdFactory())

    /** The copy a milestone holds is in its props, so the rendered words are the comparison. */
    const wordsOf = (composition: Composition): string => {
      const ids = sequentialIdFactory()
      const { markup } = render(pageOf(EDITORIAL, [composition.build(ids)], ids))

      return (treeMarkup(markup).replace(/<[^>]*>/g, " ").match(/\S+/g) ?? []).join(" ")
    }

    for (const step of ["Connect what you already use", "Describe the change in a sentence", "Approve what you meant"]) {
      expect(wordsOf(compositionById("steps") as Composition)).toContain(step)
      expect(wordsOf(compositionById("steps-cards") as Composition)).toContain(step)
    }

    expect(textIn(row)).not.toEqual(textIn(cards))
    expect(nodesIn(row)).toBe(10)
    expect(nodesIn(cards)).toBe(28)
  })

  it("carries the same number of nodes into the page as it built", () => {
    /**
     * A count rather than a shape, and it is the cheap half of the diagnostics
     * assertion above: a band whose nodes were dropped renders clean if the
     * dropped node was the only invalid one and nothing referenced it. The
     * pricing band is the one worth counting — its doc comment opens by naming
     * the figure, and a claim in a doc comment nobody checks is how a comment
     * starts lying.
     *
     * **Forty-four since 20 September**, where it was forty-two. Two nodes,
     * both treatments, both under
     * [0174](../../decisions/0174-a-band-wears-the-treatment-its-own-content-earns.md):
     * a `loom.halo` round the plan the band is selling, and a `loom.backdrop`
     * holding the whole band. One node each for a treatment that would
     * otherwise have been a prop on every schema that can be one of several is
     * the wrapper argument of 0110 and 0130 paying off where it is easiest to
     * count.
     */
    const pricing = compositionById("pricing")
    expect(pricing).toBeDefined()
    expect(nodesIn((pricing as Composition).build(sequentialIdFactory()))).toBe(44)
  })
})

describe("planning a band into a tree", () => {
  const emptyPage = (ids: IdFactory): LoomTree => pageOf(EDITORIAL, [], ids)

  it("is one insert carrying the whole subtree", () => {
    const ids = sequentialIdFactory()
    const tree = emptyPage(ids)
    const plan = planComposition(compositionById("cta") as Composition, tree, ids)

    expect(plan.outcome).toBe("planned")
    if (plan.outcome !== "planned") return

    expect(plan.operations).toHaveLength(1)
    const [operation] = plan.operations
    expect(operation?.op).toBe("insert")
  })

  it("applies cleanly and leaves the band's nodes in the tree", () => {
    const ids = sequentialIdFactory()
    const tree = emptyPage(ids)
    const plan = planComposition(compositionById("features") as Composition, tree, ids)
    if (plan.outcome !== "planned") throw new Error("not planned")

    const applied = applyDelta(tree, {
      deltaId: ids.deltaId(),
      treeId: tree.treeId,
      baseRevision: tree.revision,
      operations: plan.operations,
    })

    expect(applied.ok).toBe(true)
    if (!applied.ok) return

    expect(applied.value.root.children).toHaveLength(1)
    expect(typesIn(applied.value.root)).toContain("loom.feature-grid")
  })

  /**
   * The re-plan property, and the one that makes this a plan rather than a
   * recording (0057). The band is appended after whatever is on the page *now*,
   * not at the index the caller was looking at when they chose it.
   */
  it("appends after the bands already on the page", () => {
    const ids = sequentialIdFactory()
    const withOne = ((): LoomTree => {
      const tree = emptyPage(ids)
      const plan = planComposition(compositionById("hero") as Composition, tree, ids)
      if (plan.outcome !== "planned") throw new Error("not planned")
      const applied = applyDelta(tree, {
        deltaId: ids.deltaId(),
        treeId: tree.treeId,
        baseRevision: tree.revision,
        operations: plan.operations,
      })
      if (!applied.ok) throw new Error("not applied")

      return applied.value
    })()

    const second = planComposition(compositionById("cta") as Composition, withOne, ids)
    if (second.outcome !== "planned") throw new Error("not planned")

    const [operation] = second.operations
    expect(operation?.op === "insert" ? operation.index : -1).toBe(1)
  })

  it("clamps an index past the end rather than refusing it", () => {
    const ids = sequentialIdFactory()
    const tree = emptyPage(ids)
    const plan = planComposition(compositionById("faq") as Composition, tree, ids, { index: 40 })
    if (plan.outcome !== "planned") throw new Error("not planned")

    const [operation] = plan.operations
    expect(operation?.op === "insert" ? operation.index : -1).toBe(0)
  })

  it("declines when the parent it was given is not in this tree", () => {
    const ids = sequentialIdFactory()
    const tree = emptyPage(ids)
    const plan = planComposition(compositionById("faq") as Composition, tree, ids, {
      parentId: "n_gone" as NodeId,
    })

    expect(plan.outcome).toBe("no-such-parent")
  })
})

describe("a band as an ordinary interpreter", () => {
  it("proposes a delta the runtime authored, and says so", async () => {
    const ids = sequentialIdFactory()
    const tree = pageOf(EDITORIAL, [], ids)
    const interpreter = compositionInterpreter(compositionById("metrics") as Composition, ids, fixedClock)

    const proposed = await interpreter.interpret(intentOf(tree, ids), tree)

    expect(proposed.ok).toBe(true)
    if (!proposed.ok) return

    expect(proposed.value.provenance.interpreter).toBe(COMPOSITION_INTERPRETER)
    /** Computed rather than guessed, so calibration segments it out (0031). */
    expect(proposed.value.provenance.authoredBy).toBe("runtime")
    expect(proposed.value.provenance.confidence).toBe(1)
    expect(proposed.value.rationale.length).toBeGreaterThan(0)
    /** The delta is a delta, not a shape that merely resembles one. */
    expect(treeDeltaSchema.safeParse(proposed.value.delta).success).toBe(true)
  })

  it("carries the intent's actor through, and leaves it absent when there is none", async () => {
    const ids = sequentialIdFactory()
    const tree = pageOf(EDITORIAL, [], ids)
    const interpreter = compositionInterpreter(compositionById("metrics") as Composition, ids, fixedClock)

    const anonymous = await interpreter.interpret(intentOf(tree, ids), tree)
    const named = await interpreter.interpret({ ...intentOf(tree, ids), actor: "someone" }, tree)

    expect(anonymous.ok && "actor" in anonymous.value.provenance).toBe(false)
    expect(named.ok && named.value.provenance.actor).toBe("someone")
  })

  it("is not understood when the parent it was built for has gone", async () => {
    const ids = sequentialIdFactory()
    const tree = pageOf(EDITORIAL, [], ids)
    const interpreter = compositionInterpreter(compositionById("metrics") as Composition, ids, fixedClock, {
      parentId: "n_gone" as NodeId,
    })

    const proposed = await interpreter.interpret(intentOf(tree, ids), tree)

    expect(proposed.ok).toBe(false)
    if (proposed.ok) return
    expect(proposed.error.code).toBe("not-understood")
  })

  /**
   * The band is judged against the tree it is handed, so a proposal made
   * against a page that has moved carries that page's revision rather than the
   * one the interpreter was built at. Nothing here re-targets an intent — the
   * write path refuses a moved head before this is reached — but the delta's
   * base has to be the tree in front of it or the refusal would name the wrong
   * revision.
   */
  it("bases its delta on the tree it is given", async () => {
    const ids = sequentialIdFactory()
    const first = pageOf(EDITORIAL, [], ids)
    const moved: LoomTree = { ...first, revision: 7 }
    const interpreter = compositionInterpreter(compositionById("cta") as Composition, ids, fixedClock)

    const proposed = await interpreter.interpret(intentOf(first, ids), moved)

    expect(proposed.ok).toBe(true)
    if (!proposed.ok) return
    expect(proposed.value.delta.baseRevision).toBe(7)
  })
})

describe("what a band puts on a page", () => {
  /**
   * The links a composition ships are destinations on the site it is dropped
   * into, never somebody else's domain. It is a security-adjacent property
   * rather than a stylistic one: a starting composition is content a page may
   * publish before anyone re-reads it, and a live outbound link in it is a link
   * this library chose on a host's behalf.
   *
   * **The rule was `startsWith("/")` and that was wrong by one destination**,
   * which is the thing this run found. `linkUrlSchema` gained the bare fragment
   * on 14 September, closing a finding the maintainer filed from
   * `prototypes/ski-apparel`: a page with a bar across the top could mark every
   * one of its sections and link to none of them. The schema was fixed and
   * **this assertion then forbade the catalogue from using it** — silently, and
   * for four days, because nothing in the catalogue had tried.
   *
   * A fragment is not an exception being carved out of the reason above. It is
   * the *strongest* case of it: a path reaches this origin, and `#pricing`
   * reaches no origin at all — it is the one href that provably cannot leave
   * the document. The test now says what it always meant.
   */
  it("points every link and every action at this page, this site, or the reader's own client", () => {
    const reachesNoOrigin = (href: string): boolean =>
      href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")

    for (const composition of STARTER_COMPOSITIONS) {
      for (const href of hrefsIn(composition.build(sequentialIdFactory()))) {
        expect(href.startsWith("/") || reachesNoOrigin(href), `${composition.id} links to ${href}`).toBe(true)
      }
    }
  })

  /**
   * And the rule that keeps the line above from widening into nothing.
   *
   * `mailto:` and `tel:` are allowed because they reach no origin, which is
   * true of the *scheme* and says nothing about the address. An address is
   * still a destination this library chose on a host's behalf, and a real one
   * would have the catalogue handing strangers somebody's inbox.
   *
   * So every address the catalogue ships sits in a **reserved** namespace that
   * provably resolves nowhere: `.example` for mail (RFC 2606) and the UK's
   * reserved `+44 113 496 0000` drama range for telephone. It is the same
   * mechanism `url.ts` uses one layer down for `https://loom.invalid`, and the
   * same reason — *"a value that somehow escaped into a real request would fail
   * rather than reach a host someone owns"* — with the added property that a
   * reader can see it is a placeholder without being told.
   */
  it("addresses every mail and telephone link to a reserved placeholder", () => {
    for (const composition of STARTER_COMPOSITIONS) {
      for (const href of hrefsIn(composition.build(sequentialIdFactory()))) {
        if (href.startsWith("mailto:")) {
          expect(href.endsWith(".example"), `${composition.id} mails a real domain: ${href}`).toBe(true)
        }

        if (href.startsWith("tel:")) {
          expect(href.startsWith("tel:+44113496"), `${composition.id} dials a real number: ${href}`).toBe(true)
        }
      }
    }
  })

  /**
   * And the half a per-node schema is structurally unable to check.
   *
   * `url.ts` says so in the header of the fragment it accepts, and names the
   * owner rather than faking it:
   *
   * > **It does not check that the anchor exists.** That is the same fact about
   * > a tree rather than about a node that `anchor.ts` records for uniqueness,
   * > and it belongs to whatever walks the whole tree. A schema that pretended
   * > to enforce it would be enforcing nothing.
   *
   * The assembled page is a tree this lane owns, so this is that walk — the
   * same argument, and the same place, as the anchor-uniqueness test above.
   * Together they are a pair: that one refuses two bands answering to one name,
   * this one refuses a name nothing answers to. A page can fail either while
   * passing the other, and both failures are equally silent — a fragment
   * naming nothing scrolls nowhere, reports nothing and renders perfectly.
   *
   * It is [0168](../../decisions/0168-a-band-links-into-the-page-it-is-assembled-into.md),
   * and it is deliberately made of `PAGE_SEQUENCE` and not of `STARTER_COMPOSITIONS`.
   * A band in isolation may legitimately name an anchor it does not itself
   * carry — that is what a nav bar *is* — so the property is about the page, in
   * exactly the sense 0162 made load-bearing. Checking it per band would demand
   * that every band be its own page, which would rule out navigation entirely.
   */
  it("gives every fragment on the assembled page a band that answers to it", () => {
    const ids = sequentialIdFactory()
    const bands = PAGE_SEQUENCE.map((composition) => composition.build(ids))

    const anchors = new Set(bands.flatMap(anchorsIn))
    const fragments = bands.flatMap(hrefsIn).filter((href) => href.startsWith("#"))

    expect(fragments.length, "no band on the page links into it").toBeGreaterThan(0)

    for (const fragment of fragments) {
      expect(anchors.has(fragment.slice(1)), `${fragment} names no band on this page`).toBe(true)
    }
  })

  /**
   * Nothing in the catalogue names an image, and the reason is worth an
   * assertion rather than nine doc comments: a composition cannot ship an
   * asset, so a `src` in one would be either a broken path in a host's
   * `public/` or a live request to a third party from a page nobody has read
   * yet. Both are worse than an empty media slot.
   */
  it("ships no image source at all", () => {
    const srcsIn = (node: LoomNode): readonly unknown[] => {
      if (node.kind === "text") return []
      const here = node.kind === "element" ? [node.props["src"], node.props["image"], node.props["avatar"]] : []

      return [...here.filter((value) => value !== undefined), ...node.children.flatMap(srcsIn)]
    }

    for (const composition of STARTER_COMPOSITIONS) {
      expect(srcsIn(composition.build(sequentialIdFactory()))).toEqual([])
    }
  })

  it("gives the page one level-one heading and no other", () => {
    /**
     * The page sequence assembled in order is one document outline, and the
     * hero is the only band that opens one. A second `level: 1` further down is
     * the defect a hand-built page acquires by copying a hero's heading into a
     * section, and it is invisible in every palette.
     *
     * **This is the assertion that forced 0162.** It is made of the page and
     * not of the catalogue, and the difference is now load-bearing: the
     * phrasebook holds `hero` and `hero-split`, both of which open a document,
     * and a catalogue that was also a page could not hold both. The test did
     * not need changing to say that — it needed pointing at the right list.
     */
    const levelsIn = (node: LoomNode): readonly number[] => {
      if (node.kind === "text") return []
      const here =
        node.kind === "element" && node.type === "loom.heading" && typeof node.props["level"] === "number"
          ? [node.props["level"]]
          : []

      return [...here, ...node.children.flatMap(levelsIn)]
    }

    const ids = sequentialIdFactory()
    const levels = PAGE_SEQUENCE.flatMap((composition) => levelsIn(composition.build(ids)))

    expect(levels.filter((level) => level === 1)).toHaveLength(1)
  })

  /**
   * The other half of the outline, and the half a new part can break.
   *
   * One level-one heading says the page has a single document title. It says
   * nothing about the run of headings under it, and a reader navigating by
   * heading — which is how a screen reader user reads a landing page they did
   * not write — is served by the *steps* between them: a level-2 followed by a
   * level-4 tells them a level-3 section exists and they have missed it.
   *
   * This was worth adding on the day the page vocabulary opened (0171). Every
   * band written before today happened to open at level 2 because every band
   * before today began with a `loom.section` and the convention travelled with
   * the copy; a part whose region is *above* the navigation has no such
   * convention to inherit, and the most natural mistake in writing one is to
   * give the strip a heading. `banner` carries none, deliberately, and the
   * reasoning is in its module — but the reason it is *safe* to carry none is
   * this assertion rather than that paragraph.
   *
   * Descending is unconstrained on purpose: a level-4 back to a level-2 is a
   * section ending, which is ordinary. Only the climb can skip.
   */
  it("never skips a heading level on the way down the page", () => {
    const levelsIn = (node: LoomNode): readonly number[] => {
      if (node.kind === "text") return []
      const here =
        node.kind === "element" && node.type === "loom.heading" && typeof node.props["level"] === "number"
          ? [node.props["level"] as number]
          : []

      return [...here, ...node.children.flatMap(levelsIn)]
    }

    const ids = sequentialIdFactory()
    const levels = PAGE_SEQUENCE.flatMap((composition) => levelsIn(composition.build(ids)))

    expect(levels.length).toBeGreaterThan(0)
    expect(levels[0]).toBe(1)

    let previous = levels[0] as number
    for (const [index, level] of levels.entries()) {
      expect(level, `heading ${index} on the page jumps from level ${previous} to level ${level}`).toBeLessThanOrEqual(
        previous + 1
      )
      previous = level
    }
  })

  /**
   * And the other half, which is the part a single list could not have said: a
   * band that opens a document is fine in the phrasebook and is only a defect
   * *on a page*. Two heroes each carrying one `level: 1` is exactly right.
   */
  it("lets the phrasebook hold three bands that each open a document", () => {
    const ids = sequentialIdFactory()
    const opens = (composition: Composition): boolean =>
      JSON.stringify(composition.build(ids)).includes('"level":1')

    expect(compositionsForPart("hero").filter(opens)).toHaveLength(3)
  })
})

describe("what a band is not", () => {
  /**
   * The property that keeps this a convenience over the delta model rather than
   * a second way to author one: nothing a composition inserts remembers that it
   * came from a composition. What lands is ordinary nodes, and a reviewer
   * looking at the tree afterwards cannot tell a catalogue band from nine
   * separate operations that happened to agree.
   */
  it("leaves no trace of itself in the nodes it builds", () => {
    const marks = (node: LoomNode): readonly string[] => {
      if (node.kind === "text") return []
      const here = node.kind === "element" ? Object.keys(node.props) : []

      return [...here, ...node.children.flatMap(marks)]
    }

    for (const composition of STARTER_COMPOSITIONS) {
      const keys = new Set(marks(composition.build(sequentialIdFactory())))

      expect([...keys].some((key) => key.includes("composition"))).toBe(false)
      expect([...keys].some((key) => key.startsWith("loom:"))).toBe(false)
    }
  })

  it("builds only from types that were already registered", () => {
    /**
     * The catalogue adds no primitive, so every type in every band was in the
     * registry before it existed. A composition that needed a new type would be
     * a fat primitive with extra steps, which is what
     * `docs/primitive-granularity.md` spends four pages refusing — and would
     * show up here as a `uses` entry the registry has never heard of.
     */
    const registered = new Set<string>(registry.primitives.map((primitive) => primitive.type))
    const used = new Set<string>(STARTER_COMPOSITIONS.flatMap((composition) => composition.uses))

    expect([...used].filter((type) => !registered.has(type))).toEqual([])
  })
})

/**
 * What [0174](../../decisions/0174-a-band-wears-the-treatment-its-own-content-earns.md)
 * holds the catalogue to.
 *
 * Three treatment primitives shipped between 6 and 13 September and no band
 * used any of them until 20 September, so nothing here existed to be kept
 * honest before. What is checked is the half of the rule a test can reach: the
 * refusal in its second clause, the agreement the pricing band claims in prose,
 * and the rendering consequence the first real use uncovered.
 *
 * The rule's first clause — *the band's own content has already made this
 * distinction* — is deliberately **not** asserted. It is a judgment about copy
 * and a test that tried would either be a restatement of the three bands that
 * pass it today, which is a list rather than a check, or a guess at what counts
 * as a named exception, which is the rule re-decided by whoever writes the
 * regex. The record is where that clause is enforced, and a reviewer is the
 * thing enforcing it.
 */
describe("the treatments a band wears", () => {
  const TREATMENTS = ["loom.reveal", "loom.backdrop", "loom.halo"] as const

  /**
   * A treatment outside a band may not be outside the band's own ground, which
   * is 0174's *add, never replace* clause in the form a test can hold.
   *
   * `loom.section`'s tones are opaque. A backdrop wrapping a section that takes
   * one paints behind it and a reader sees **nothing at all** — and the fix
   * that suggests itself is to drop the tone, which trades a ground every
   * palette can draw for a paint only some of them can. `metrics` and `cta` are
   * the two bands that would lose most by it; both take a tone and neither may
   * be wrapped.
   *
   * A band on the page's own canvas has no ground to lose, so `pricing` may be
   * wrapped and is. The distinction is the whole of the clause, and it is worth
   * a test rather than a sentence because both versions are one line, both
   * render clean, and the broken one is invisible under whichever palette you
   * happened to open.
   */
  it("puts no treatment outside a ground the band paints for itself", () => {
    for (const composition of STARTER_COMPOSITIONS) {
      const root = composition.build(sequentialIdFactory())

      if (!(TREATMENTS as readonly string[]).includes(root.type)) continue

      for (const wrapped of root.children) {
        const tone = wrapped.kind === "element" ? wrapped.props["tone"] : undefined

        expect(
          tone,
          `${composition.id} wraps a ${wrapped.kind === "element" ? wrapped.type : wrapped.kind} that paints its own ground in a ${root.type}, which will draw nothing behind it`
        ).toBeUndefined()
      }
    }
  })

  /**
   * The pricing band ships its light and its ribbon on the same plan.
   *
   * **A claim about this band, not a rule about trees.** `loom.halo` is
   * emphatic that the two are independent on purpose — *a halo draws the eye; a
   * badge says why* — so a page that lights one tier and labels another is
   * expressing something, and no schema should stop it. What a *starting*
   * composition may not do is arrive already disagreeing with itself, which is
   * the state this band would reach if somebody moved the badge to Enterprise
   * and left the ring on Team. Nothing else would notice: both trees are valid,
   * both render clean under both palettes, and the defect is a sentence about a
   * plan pointing at the plan beside it.
   */
  it("lights the pricing tier that carries the ribbon", () => {
    const band = compositionById("pricing")

    expect(band).toBeDefined()
    if (band === undefined) return

    const root = band.build(sequentialIdFactory())

    const tiersIn = (node: LoomNode): readonly ElementNode[] =>
      node.kind === "text"
        ? []
        : [...(node.kind === "element" && node.type === "loom.tier" ? [node] : []), ...node.children.flatMap(tiersIn)]

    const halosIn = (node: LoomNode): readonly ElementNode[] =>
      node.kind === "text"
        ? []
        : [...(node.kind === "element" && node.type === "loom.halo" ? [node] : []), ...node.children.flatMap(halosIn)]

    const halos = halosIn(root)
    const badged = tiersIn(root).filter((tier) =>
      tier.children.some((child) => child.kind === "slot" && child.name === "badge" && child.children.length > 0)
    )

    expect(halos, "the pricing band should light exactly one plan").toHaveLength(1)
    expect(badged, "the pricing band should label exactly one plan").toHaveLength(1)

    const lit = halos.flatMap(tiersIn)

    expect(lit).toHaveLength(1)
    expect(lit[0]?.id, "the lit plan and the labelled plan are different plans").toBe(badged[0]?.id)
  })

  /**
   * A treatment between an arranger and its cell is transparent to stretching.
   *
   * `loom.feature-grid` stretches its cells to the tallest in the row so the
   * cards' bottoms line up. A wrapper in between is the grid item now, and
   * unless it passes the stretch on, every tile whose text is shorter than the
   * tallest ends above the box it is in — ragged bottoms on some cards and not
   * others, which reads as a rendering fault rather than as a design.
   *
   * `loom.halo` had worked this out and written it down; `loom.reveal` had not,
   * because until `featuresBand` no tree in this repository had ever put a
   * reveal inside an arranger. Asserted on the markup rather than on the module
   * because it is a fact about what the browser is handed, and because the
   * failure it catches is a style quietly dropped rather than a prop renamed.
   */
  it("passes a grid's stretch through every treatment the catalogue puts in a cell", () => {
    const band = compositionById("features")

    expect(band).toBeDefined()
    if (band === undefined) return

    const ids = sequentialIdFactory()
    const { markup, diagnostics } = render(pageOf(EDITORIAL, [band.build(ids)], ids))
    const cells = [...treeMarkup(markup).matchAll(/<div[^>]*class="[^"]*loom-reveal[^"]*"[^>]*>/g)].map(
      (match) => match[0]
    )

    expect(diagnostics).toEqual([])
    expect(cells.length, "the features band should reveal each of its six tiles").toBe(6)

    for (const cell of cells) {
      expect(cell, "a revealed grid cell that does not stretch leaves its card short of the row").toContain(
        "display:grid"
      )
      expect(cell).toContain("height:100%")
    }
  })

  /**
   * Every treatment the catalogue builds is a type it declares it uses.
   *
   * `uses` is already held against the subtree in both directions by the tests
   * above, so this adds nothing for the ninety-three primitives it covers. It
   * is written for the three it does not: a treatment is the one kind of node a
   * band can gain in a one-line edit to a `children` array, with no new import,
   * no new constant and nothing in the diff that looks like a new primitive —
   * which is exactly the edit that leaves `uses` behind, and `CATALOGUE_TYPES`
   * is derived from `uses`.
   */
  it("declares every treatment it builds, so the catalogue's slice can draw it", () => {
    for (const composition of STARTER_COMPOSITIONS) {
      const built = new Set(typesIn(composition.build(sequentialIdFactory())))

      for (const treatment of TREATMENTS) {
        if (!built.has(treatment)) continue

        expect(
          composition.uses,
          `${composition.id} builds a ${treatment} it does not declare, so a deployment taking CATALOGUE_TYPES cannot draw it`
        ).toContain(treatment)
        expect(CATALOGUE_TYPES).toContain(treatment)
      }
    }
  })
})

/**
 * What a table has to be, and what a page has to call itself.
 *
 * Two properties with nothing in common except that both were found by
 * assembling the page and reading it, and neither is visible in any one band's
 * module.
 */
describe("what the assembled page says about itself", () => {
  /**
   * A heading region goes in a `<thead>`, and a `<thead>` holds rows.
   *
   * `comparisonBand`'s own comment records what the absence of this test looks
   * like: column headings put into the `columns` slot as bare cells render
   * every mark one column right of its heading, with the steered tint on the
   * competitor instead of on the subject. It registers, it renders, it passes
   * every palette assertion, and it is wrong — the class of defect that until
   * now only a photograph caught.
   *
   * Written over both two-dimensional bands rather than over the one this run
   * added, because the rule is about the region and not about the table: a
   * `columns` slot is placed somewhere the flow of children does not go, and
   * what goes there is whatever HTML puts inside a `<thead>`.
   */
  it("puts a row, not a bare cell, in every table's region of column headings", () => {
    const HEADED = ["loom.table", "loom.comparison-table"] as const

    for (const composition of STARTER_COMPOSITIONS) {
      const root = composition.build(sequentialIdFactory())

      for (const type of HEADED) {
        for (const table of elementsOfType(root, type)) {
          const columns = table.children.find((child) => child.kind === "slot" && child.name === "columns")

          if (columns === undefined || columns.kind !== "slot") continue

          for (const child of columns.children) {
            expect(
              child.kind === "element" && child.type.endsWith("-row"),
              `${composition.id} puts a ${child.kind === "element" ? child.type : child.kind} straight into a ${type}'s columns region, where a thead needs a row`
            ).toBe(true)
          }
        }
      }
    }
  })

  /**
   * The page calls itself one thing from the bar at the top to the line at the
   * bottom.
   *
   * On 20 September it called itself two. `navBand`'s wordmark, the mark in the
   * middle of `integrationsBand`'s orbit and the steered column of
   * `comparisonBand` all said **Overture**; `footerBand`'s wordmark and its
   * copyright line said **Northwind** — and `proofBand` listed *Northwind*
   * first among six customers, so the page also named itself as somebody it had
   * sold to.
   *
   * Nothing could have caught it. Every band is correct read on its own, each
   * renders clean under both palettes, and the two names are in two modules a
   * thousand lines apart that no test had ever read together. It is the defect
   * the phrasebook acquires by construction — bands are written one a day by
   * runs with no memory of each other — and the only instrument that sees it is
   * the assembled page, which is what this file already builds for the heading
   * outline and the anchors.
   *
   * The wordmark is read off `loom.logo` in the navigation rather than declared
   * here, so the assertion is about the two agreeing and never about which word
   * they agree on. A deployment renaming the catalogue's placeholder changes one
   * string and this test follows it.
   *
   * **It reads the footer's `brand` region and not the footer**, which is the
   * correction a mutation run forced. Written against everything the band says,
   * it passed with the wordmark put back to `Northwind`, because the copyright
   * line under it still carried the other name — a test that goes green on the
   * exact defect it was written for. A wordmark is one region and one string,
   * so it is compared as one.
   */
  it("calls itself the same name in the bar at the top and the line at the bottom", () => {
    const nav = compositionById("nav")
    const footer = compositionById("footer")

    expect(nav).toBeDefined()
    expect(footer).toBeDefined()
    if (nav === undefined || footer === undefined) return

    const marks = elementsOfType(nav.build(sequentialIdFactory()), "loom.brand")

    expect(marks).toHaveLength(1)

    const site = marks[0]?.props["name"]

    expect(typeof site).toBe("string")
    if (typeof site !== "string") return

    const brand = footer
      .build(sequentialIdFactory())
      .children.find((child) => child.kind === "slot" && child.name === "brand")

    expect(brand?.kind).toBe("slot")
    if (brand === undefined || brand.kind !== "slot") return

    const wordmark = brand.children.find((child) => child.kind === "element" && child.type === "loom.heading")

    expect(wordmark).toBeDefined()
    if (wordmark === undefined) return

    expect(wordsIn(wordmark)).toBe(site)

    /**
     * And the line under it, which is the other half of what the footer says
     * the site is called. Asserted as containment because a copyright line is a
     * sentence with the name in it rather than the name alone.
     */
    const note = footer
      .build(sequentialIdFactory())
      .children.find((child) => child.kind === "slot" && child.name === "note")

    expect(note?.kind).toBe("slot")
    if (note === undefined || note.kind !== "slot") return

    expect(wordsIn(note)).toContain(site)
  })

  /**
   * And it never puts its own name in a wall of other people's.
   *
   * The second half of the same defect and a separate assertion, because the
   * two failed independently: fixing the footer's wordmark leaves the customer
   * wall naming the site, and a reader who reaches that band is told the product
   * is one of its own references.
   *
   * A `loom.logo-cloud` is the one container in the library whose children are
   * *somebody else's* marks — the orbit's `mark` region is deliberately not one,
   * because the thing in the middle of an integrations diagram is the product
   * and is supposed to be.
   */
  it("names itself in no wall of customer logos", () => {
    const nav = compositionById("nav")

    expect(nav).toBeDefined()
    if (nav === undefined) return

    const site = elementsOfType(nav.build(sequentialIdFactory()), "loom.brand")[0]?.props["name"]

    expect(typeof site).toBe("string")
    if (typeof site !== "string") return

    for (const composition of STARTER_COMPOSITIONS) {
      for (const cloud of elementsOfType(composition.build(sequentialIdFactory()), "loom.logo-cloud")) {
        for (const logo of elementsOfType(cloud, "loom.logo")) {
          expect(logo.props["name"], `${composition.id} lists ${site} among its customers`).not.toBe(site)
        }
      }
    }
  })
})

/**
 * The four second designs that gave four single-design parts a choice, and the
 * one claim each of them rests on.
 *
 * Each of these is invisible in the subtree and invisible to every other test in
 * this file. A band whose two columns both mark their rows `included` renders
 * perfectly and says the opposite of what it was written to say; a bento whose
 * four cells hold four copies of one primitive passes the structural check
 * against its canonical and is no longer a mixed bento. They are asserted here
 * rather than per band because what is held is the *design*, not the subtree.
 */
describe("the parts that offered no choice", () => {
  const designsOf = (part: CompositionPart): readonly string[] =>
    compositionsForPart(part).map((composition) => composition.id)

  const slotIn = (node: LoomNode, name: string): readonly LoomNode[] => {
    if (node.kind === "text") return []
    if (node.kind === "slot" && node.name === name) return node.children

    return node.children.flatMap((child) => slotIn(child, name))
  }

  const bandOf = (id: string): ElementNode => {
    const band = compositionById(id)

    expect(band, `${id} is not in the phrasebook`).toBeDefined()
    if (band === undefined) throw new Error(`${id} is not in the phrasebook`)

    return band.build(sequentialIdFactory())
  }

  /**
   * The four parts that had one design on 1 October now have two, and the four
   * that are named here are named rather than counted: a run that added a fifth
   * design of `features` would move the catalogue's total and say nothing about
   * whether the bar still has an alternative.
   */
  it("gives the bar, the mosaic, the comparison and the footer a second design each", () => {
    /**
     * **The bar has three as of 7 October**, and it is the one part in this
     * assertion where that is worth a sentence rather than a longer array.
     * `nav-menus` is the design the band beside it documented as *impossible*
     * until 0234 let a tree name a control — so the third entry is a retraction
     * landing, not a fourth taste.
     */
    expect(designsOf("nav")).toEqual(["nav", "nav-centred", "nav-menus"])
    expect(designsOf("bento")).toEqual(["bento", "bento-mixed"])
    expect(designsOf("comparison")).toEqual(["comparison", "comparison-ways"])
    /**
     * **And the footer has three as of 10 October**, for the reason the bar's
     * third exists rather than as a taste: `footer-status` is the first design
     * of this part that says anything about the state of the product *now*
     * rather than about what the site contains, and the thing carrying that is
     * a `loom.badge` and the `loom.link` that backs it — nodes, so an incident
     * is a `configure` on a text child.
     */
    expect(designsOf("footer")).toEqual(["footer", "footer-signup", "footer-status"])
  })

  /**
   * The closing band's three designs, and the third is the one that holds a
   * region rather than a destination.
   *
   * Named rather than counted for the reason above it: `cta-booking` is the
   * first band in the catalogue whose second control opens something instead of
   * going somewhere, and a run that added a fourth design of `cta` should not
   * be able to drop it silently.
   */
  it("gives the closing band a design whose second control opens a form over the page", () => {
    expect(designsOf("cta")).toEqual(["cta", "cta-signup", "cta-booking"])

    const band = bandOf("cta-booking")
    const dialogs = (function find(node: LoomNode): readonly ElementNode[] {
      if (node.kind === "text") return []
      const here = node.kind === "element" && node.type === "loom.dialog" ? [node] : []

      return [...here, ...node.children.flatMap(find)]
    })(band)

    expect(dialogs).toHaveLength(1)
    /**
     * The body is a node rather than a string, which is the claim the band's
     * own rationale makes and the reason `loom.dialog` takes children at all.
     */
    expect(dialogs[0]?.children.some((child) => child.kind === "element" && child.type === "loom.form")).toBe(
      true
    )
  })

  /**
   * One loud control in the corner of the bar, and the quiet one beside it is a
   * link.
   *
   * This is the band's whole subject and it is the defect it exists to avoid:
   * `Sign in` and `Start free` as two `loom.action` nodes is two primary buttons
   * in one region, which `heroBand`'s comment names as the most common defect in
   * a hand-built band and which no schema can see — `variant: "primary"` twice
   * is not malformed in any way. Asserted on the actions region rather than on
   * the whole band, because the menu above it is links by construction.
   */
  it("puts one action and one quiet link in the centred bar's corner", () => {
    const actions = slotIn(bandOf("nav-centred"), "actions")

    expect(actions.map((node) => (node.kind === "element" ? node.type : node.kind))).toEqual([
      "loom.link",
      "loom.action",
    ])
  })

  /**
   * Every design of the two bands a page cannot be without calls the site the
   * same thing.
   *
   * The canonical pair is already held, further up this file, against the
   * wordmark in the bar and the line in the footer. That check reaches
   * `compositionById(part)` and therefore reaches canonical designs only — so on
   * the day a part gained an alternate, a host swapping one in could rename
   * their own site and nothing would notice. The failure is silent and it is
   * the kind a reader sees immediately: a pill at the top reading one name over
   * a footer signing off as another.
   */
  it("calls the site the same name in every design of the bar and the footer", () => {
    const names = new Set<string>()

    for (const design of compositionsForPart("nav")) {
      for (const mark of elementsOfType(design.build(sequentialIdFactory()), "loom.brand")) {
        expect(typeof mark.props["name"]).toBe("string")
        names.add(String(mark.props["name"]))
      }
    }

    expect(names.size, `the designs of the bar name the site ${[...names].join(" and ")}`).toBe(1)

    const site = [...names][0] as string

    for (const design of compositionsForPart("footer")) {
      const brand = slotIn(design.build(sequentialIdFactory()), "brand")
      const note = slotIn(design.build(sequentialIdFactory()), "note")

      expect(brand.map(wordsIn).join(" "), `${design.id} does not name the site`).toContain(site)
      expect(note.map(wordsIn).join(" "), `${design.id}'s legal line does not name the site`).toContain(site)
    }
  })

  /**
   * The capture goes in the footer's brand region and never into the groups.
   *
   * A `loom.form` among the `loom.link-list` children is the edit that suggests
   * itself — it is one array over — and it renders. What it renders is a form
   * sized by an `auto-fit` minimum meant for a column of links, which wraps the
   * button under the field at every width. The groups region is asserted to hold
   * link lists and nothing else, because that is the invariant rather than the
   * symptom.
   */
  it("keeps the footer's capture in its brand region and its groups all links", () => {
    const band = bandOf("footer-signup")

    expect(slotIn(band, "brand").some((node) => node.kind === "element" && node.type === "loom.form")).toBe(true)

    const groups = band.children.filter((child) => child.kind === "element")

    expect(groups.map((group) => (group as ElementNode).type)).toEqual(["loom.link-list", "loom.link-list"])
    expect(elementsOfType(band, "loom.form")).toHaveLength(1)
  })

  /**
   * The two columns of the two-ways band disagree about every row.
   *
   * `loom.perk`'s `state` is what the whole band is made of: the left column is
   * four ✕ marks and the right is four ✓. A row moved from one column to the
   * other keeps the state it was written with, which is the one edit a reader of
   * this band will actually make and the one the band cannot survive — a ✓ under
   * *How it goes today* is the page arguing for the thing it is arguing against,
   * and it renders beautifully.
   */
  it("marks every row of the two-ways band against the column it is in", () => {
    const band = bandOf("comparison-ways")

    const statesUnder = (name: string): readonly unknown[] =>
      slotIn(band, name).flatMap((node) => elementsOfType(node, "loom.perk").map((perk) => perk.props["state"]))

    const today = statesUnder("start")
    const instead = statesUnder("end")

    expect(today.length, "the band's first column has no rows").toBeGreaterThan(0)
    expect(today.length).toBe(instead.length)
    expect(new Set(today)).toEqual(new Set(["excluded"]))
    expect(new Set(instead)).toEqual(new Set(["included"]))
  })

  /**
   * And it shows its working through the one presentation in the catalogue.
   *
   * `loom.popover` shipped on 1 October and the reach measurement taken the same
   * day found it registered and unreachable — surface every deployment pays for
   * in every interpretation request and cannot drop in. This is the band that
   * closed that, so the assertion is on the type being *there* as well as on the
   * panel having something in it: a popover with an empty panel is a button that
   * opens nothing, and `uses` alone would still read as reached.
   */
  it("gives the two-ways band a panel with the method in it", () => {
    const panels = elementsOfType(bandOf("comparison-ways"), "loom.popover")

    expect(panels).toHaveLength(1)
    expect(wordsIn(panels[0] as ElementNode).length, "the popover opens on an empty panel").toBeGreaterThan(40)
    expect(CATALOGUE_TYPES).toContain("loom.popover")
  })

  /**
   * Four cells, four different primitives, one surface.
   *
   * The band's claim is that a bento's registers may disagree, and the thing
   * that would quietly undo it is a cell duplicated and re-worded: two
   * quotations in four cells still differs structurally from the canonical
   * bento, still renders, and is no longer a mixed bento. The cards are asserted
   * uniform in the same test, because the other half of the claim is that only
   * the contents vary — four cells each drawing a slightly different ground is
   * four bands pushed together.
   */
  it("fills each cell of the mixed mosaic with a different kind of thing, on one surface", () => {
    const mosaics = elementsOfType(bandOf("bento-mixed"), "loom.mosaic")

    expect(mosaics).toHaveLength(1)

    const cells = (mosaics[0] as ElementNode).children

    expect(cells).toHaveLength(4)

    const tones = new Set<unknown>()
    const kinds: string[] = []

    for (const cell of cells) {
      expect(cell.kind).toBe("element")
      if (cell.kind !== "element") continue

      expect(cell.type).toBe("loom.card")
      tones.add(`${String(cell.props["tone"])} ${String(cell.props["padding"])}`)

      const inner = cell.children.filter(
        (child): child is ElementNode => child.kind === "element" && child.type !== "loom.heading"
      )

      expect(inner.length, "a cell of the mixed mosaic holds nothing but its heading").toBeGreaterThan(0)
      kinds.push((inner[0] as ElementNode).type)
    }

    expect(tones.size, `the mixed mosaic's cells draw ${tones.size} different surfaces`).toBe(1)
    expect(new Set(kinds), `the mixed mosaic repeats a register: ${kinds.join(", ")}`).toEqual(new Set(kinds))
    expect(new Set(kinds).size, `the mixed mosaic repeats a register: ${kinds.join(", ")}`).toBe(4)
  })
})

/**
 * The four bands that made a page for another kind of business, and the claim
 * underneath all of them.
 *
 * The 21 September inventory filed twelve registered primitives — `product`,
 * `offering`, `recording`, `message`, `event`, `listing`, `book` and their
 * grids — behind *a second page sequence*, on the reading that a shop, a
 * studio, a podcast and an assistant are not landing pages. Four of those
 * twelve are now reachable and `COMPOSITION_PARTS` did not move, because the
 * reading was wrong:
 * [0171](../../decisions/0171-a-page-part-is-earned-by-the-region-it-occupies.md)
 * makes a part a **region**, and a region is the same region whatever business
 * the page is for.
 *
 * These are asserted as a group rather than one test per band because what is
 * being held is the *claim*, not four subtrees. A run that deleted one of the
 * four would otherwise take a primitive back out of reach and leave every
 * other test green.
 */
describe("a page for another kind of business", () => {
  /**
   * The eight types the four bands put back in reach, named rather than
   * counted.
   *
   * A count — *reach went 73 to 81* — is the assertion a later run edits
   * without reading. Naming them means a deleted band fails with the name of
   * the primitive that went dark, which is the sentence somebody needs.
   */
  const REACHED: readonly { readonly type: string; readonly by: string }[] = [
    { type: "loom.offering", by: "pricing-offerings" },
    { type: "loom.offering-grid", by: "pricing-offerings" },
    { type: "loom.message", by: "code-conversation" },
    { type: "loom.message-list", by: "code-conversation" },
    { type: "loom.recording", by: "articles-episodes" },
    { type: "loom.recording-grid", by: "articles-episodes" },
    { type: "loom.product", by: "features-catalogue" },
    { type: "loom.product-grid", by: "features-catalogue" },
  ]

  it("puts eight primitives that no band could place back in reach", () => {
    for (const { type, by } of REACHED) {
      expect(CATALOGUE_TYPES, `${type} is unreachable: no band builds one`).toContain(type)

      const band = compositionById(by)
      expect(band, `${by} is not in the phrasebook`).toBeDefined()
      if (band === undefined) continue

      expect(typesIn(band.build(sequentialIdFactory())), `${by} no longer builds a ${type}`).toContain(type)
    }
  })

  /**
   * None of the four is a new part, and this is the assertion that says so.
   *
   * If a later run decides one of them really does occupy a region of its own,
   * this test is where the argument has to be made — 0171 asks for the swap in
   * both directions, and a part admitted quietly is the failure mode that
   * record was written against.
   */
  it("adds no part, because a different business is not a different sequence", () => {
    expect(COMPOSITION_PARTS).toHaveLength(22)

    for (const { by } of REACHED) {
      const band = compositionById(by)
      expect(band).toBeDefined()
      if (band === undefined) continue

      expect(compositionsForPart(band.part).length, `${by} is the only design of ${band.part}`).toBeGreaterThan(1)
      expect(band.id.startsWith(`${band.part}-`), `${by} is not named for the part it designs`).toBe(true)
    }
  })

  /**
   * A design answers to its part's fragment, so swapping one design for
   * another leaves the page's own navigation working.
   *
   * This is the invariant that makes a phrasebook usable at all and nothing
   * held it. `navBand` links at `#pricing`; a page that swapped the tier table
   * for the service menu would have kept a nav link pointing at nothing if
   * this band had introduced an anchor of its own — no error, no diagnostic,
   * and a press that does nothing. The existing fragment test walks
   * `PAGE_SEQUENCE`, which is canonical designs only, so every non-canonical
   * band in the catalogue was outside it.
   *
   * Stated as *agrees with the canonical design*, including when both have
   * none: `metrics` and `metrics-chart` carry no anchor at all, and a rule
   * demanding one would be a rule about headings rather than about fragments.
   */
  it("answers to its part's own fragment, in every design of every part", () => {
    for (const composition of STARTER_COMPOSITIONS) {
      const canonical = compositionById(composition.part)

      expect(canonical, `${composition.part} has no canonical design`).toBeDefined()
      if (canonical === undefined) continue

      expect(
        anchorsIn(composition.build(sequentialIdFactory())),
        `${composition.id} does not answer to the fragments ${composition.part} does`
      ).toEqual(anchorsIn(canonical.build(sequentialIdFactory())))
    }
  })
})

/**
 * What the four bands actually draw, as opposed to what they declare.
 *
 * Each of these is the one claim its band rests on, and each of them is
 * invisible in the subtree: a band whose recordings lost their `href` still
 * renders, still passes every schema and still produces no diagnostic — it
 * just draws six cards with nothing to press.
 */
describe("what a page for another kind of business draws", () => {
  const slotOf = (node: LoomNode, name: string): readonly LoomNode[] => {
    if (node.kind === "text") return []
    if (node.kind === "slot" && node.name === name) return node.children

    return node.children.flatMap((child) => slotOf(child, name))
  }

  const bandOf = (id: string): ElementNode => {
    const composition = compositionById(id)
    if (composition === undefined) throw new Error(`${id} is not in the phrasebook`)

    return composition.build(sequentialIdFactory())
  }

  /**
   * The episodes band is not waiting on an image source, and this is the
   * assertion that says so out loud.
   *
   * `loom.recording` draws its frame when there is artwork **or** somewhere to
   * play, so a shelf with no cover art still has the play mark that is the
   * primitive's whole signal. Six cards, six marks, and no `artwork` prop
   * anywhere in the subtree — which is also what keeps the band inside the
   * catalogue-wide *ships no image source at all* rule rather than beside it.
   *
   * Put the defect back by dropping `href` from the episodes and this fails
   * with six marks missing, while every other test in this file stays green.
   */
  it("draws a play mark on every episode, from an address rather than a picture", () => {
    const band = bandOf("articles-episodes")
    const recordings = elementsOfType(band, "loom.recording")

    expect(recordings.length).toBe(6)
    for (const recording of recordings) {
      expect(recording.props["artwork"], "an episode carries artwork the catalogue may not ship").toBeUndefined()
      expect(typeof recording.props["href"], "an episode has nowhere to play").toBe("string")
    }

    const ids = sequentialIdFactory()
    const { markup, diagnostics } = render(pageOf(BOLD, [bandOf("articles-episodes")], ids))

    expect(diagnostics).toEqual([])
    expect(treeMarkup(markup).split("loom-recording-play").length - 1).toBe(recordings.length)
  })

  /**
   * The conversation ends mid-answer, and the dots say so in words.
   *
   * Two separate claims. The first is about the band: exactly one turn is
   * pending and it is the **last** one, because a transcript with a pending
   * turn in the middle is a page claiming an answer arrived after the thing
   * that is still being written.
   *
   * The second is about where the words come from. `loom.message` declares
   * `pending: "Still writing"` in its own text seam (0060), so the accessible
   * name is the primitive's and not a string this band typed. Asserting the
   * rendered `aria-label` is what holds those two halves together: a band that
   * wrote its own label would pass a subtree check and fail here.
   */
  it("leaves the last turn still being written, and names it from the primitive's own words", () => {
    const band = bandOf("code-conversation")
    const turns = elementsOfType(band, "loom.message")
    const pending = turns.filter((turn) => turn.props["pending"] === true)

    expect(turns.length).toBeGreaterThan(2)
    expect(pending).toHaveLength(1)
    expect(turns[turns.length - 1], "a turn arrives after the one still being written").toBe(pending[0])
    expect(pending[0]?.children.length, "the dots replace the answer rather than following its first clause").toBe(1)

    const ids = sequentialIdFactory()
    const { markup, diagnostics } = render(pageOf(EDITORIAL, [bandOf("code-conversation")], ids))

    expect(diagnostics).toEqual([])
    expect(treeMarkup(markup)).toContain('aria-label="Still writing"')
  })

  /**
   * Every priced card pins its way in to the foot, in the region rather than
   * in the flow.
   *
   * Both grids stretch their cells, and a stretched cell only buys aligned
   * buttons if the button is in the region the primitive pins. A `loom.action`
   * that landed in `children` instead would sit directly under a description,
   * so six cards with six different description lengths would give six
   * different button positions — right in a test, ragged in a photograph.
   *
   * Asserted over both bands at once because it is a fact about how these
   * primitives are composed and not about either band's copy.
   */
  it("pins the way in to the foot of every offering and every product", () => {
    for (const [id, type] of [
      ["pricing-offerings", "loom.offering"],
      ["features-catalogue", "loom.product"],
    ] as const) {
      const cards = elementsOfType(bandOf(id), type)

      expect(cards.length).toBeGreaterThan(2)
      for (const card of cards) {
        const pinned = slotOf(card, "action").flatMap((node) => elementsOfType(node, "loom.action"))
        const loose = card.children
          .filter((child) => child.kind === "element")
          .flatMap((child) => elementsOfType(child, "loom.action"))

        expect(pinned, `a ${type} in ${id} has no way in`).toHaveLength(1)
        expect(loose, `a ${type} in ${id} puts its action in the flow rather than the region`).toHaveLength(0)
        expect(slotOf(card, "meta").length, `a ${type} in ${id} carries no qualifier`).toBeGreaterThan(0)
      }
    }
  })
})

/**
 * The two rows of the reach inventory that were work rather than a decision,
 * and what the four bands closing them each rest on.
 *
 * The 21 September inventory sorted twenty-five unreachable primitives into
 * three rows. 23 September showed that the *not a landing page* row was
 * reasoning from what a band says rather than from where it goes, and closed
 * four of its twelve. What was left of it — `book`, `listing`, `event` and
 * their grids — and the whole of the *bound region* row's figure half were
 * filed in that run's report as **a run**, with one 0171 judgement inside it.
 * This is that run, and these are the claims it makes.
 *
 * Grouped rather than split one test per band for the reason the 23 September
 * group gives: what is held is the claim, and a run that deleted one band would
 * otherwise take a primitive back out of reach with every other test green.
 */
describe("the rows that were waiting on a run", () => {
  const slotOf = (node: LoomNode, name: string): readonly LoomNode[] => {
    if (node.kind === "text") return []
    if (node.kind === "slot" && node.name === name) return node.children

    return node.children.flatMap((child) => slotOf(child, name))
  }

  const bandOf = (id: string): ElementNode => {
    const composition = compositionById(id)
    if (composition === undefined) throw new Error(`${id} is not in the phrasebook`)

    return composition.build(sequentialIdFactory())
  }

  /**
   * The seven types the four bands put back in reach, named rather than
   * counted — 23 September's form, and for its stated reason: a count is the
   * assertion a later run edits without reading, and a name is the sentence
   * somebody needs when a band goes.
   */
  const REACHED: readonly { readonly type: string; readonly by: string }[] = [
    { type: "loom.book", by: "features-shelf" },
    { type: "loom.book-grid", by: "features-shelf" },
    { type: "loom.listing", by: "features-listings" },
    { type: "loom.listing-grid", by: "features-listings" },
    { type: "loom.event", by: "articles-whats-on" },
    { type: "loom.event-grid", by: "articles-whats-on" },
    { type: "loom.tally", by: "metrics-live" },
  ]

  it("puts seven more primitives that no band could place back in reach", () => {
    for (const { type, by } of REACHED) {
      expect(CATALOGUE_TYPES, `${type} is unreachable: no band builds one`).toContain(type)

      const band = compositionById(by)
      expect(band, `${by} is not in the phrasebook`).toBeDefined()
      if (band === undefined) continue

      expect(typesIn(band.build(sequentialIdFactory())), `${by} no longer builds a ${type}`).toContain(type)
    }
  })

  /**
   * None of the four is a new part, and the what's-on band is the one this is
   * really about.
   *
   * 0186 answers the question 23 September left open, and the thing it turns on
   * is which part is the *nearest* one. Against `changelog` the swap fails both
   * ways and a what's-on band looks like a twenty-third part; against
   * `articles` it loses nothing, and 0171 is explicit that a shared shape is
   * content and content is the wrong axis. If a later run reopens it, this is
   * where the argument has to be made.
   */
  it("adds no part, because a calendar is not a region of its own", () => {
    expect(COMPOSITION_PARTS).toHaveLength(22)

    for (const { by } of REACHED) {
      const band = compositionById(by)
      expect(band).toBeDefined()
      if (band === undefined) continue

      expect(compositionsForPart(band.part).length, `${by} is the only design of ${band.part}`).toBeGreaterThan(1)
      expect(band.id.startsWith(`${band.part}-`), `${by} is not named for the part it designs`).toBe(true)
    }
  })

  /**
   * A listing carries as many facts as it has and no blanks, which is the
   * whole of 0052 spent on something load-bearing.
   *
   * Hermes held `beds`, `baths` and `sqft` as three fixed fields. As
   * `loom.spec` children a yard can carry two, a floor can carry four, and the
   * fourth is one `insert` rather than a prop nothing can register
   * mid-session. A band where every card had the same number of specs would
   * render identically and would be a photograph of the prop version, so the
   * raggedness is asserted rather than left to the copy.
   */
  it("gives the listings different numbers of facts, including one that no field could hold", () => {
    const cards = elementsOfType(bandOf("features-listings"), "loom.listing")
    const counts = cards.map((card) => elementsOfType(card, "loom.spec").length)

    expect(cards.length).toBeGreaterThan(4)
    expect(Math.min(...counts), "a listing carries no facts at all").toBeGreaterThan(1)
    expect(Math.max(...counts), "no listing carries a fourth fact, so nothing is spent on the argument").toBe(4)
    expect(new Set(counts).size, "every listing carries the same number of facts").toBeGreaterThan(2)
  })

  /**
   * The flags are worn on the frame and the way in is pinned to the floor —
   * both regions, neither in the flow.
   *
   * 0051's rule with a photograph behind it: the specs *are* the flow, so an
   * action that landed among them would sit under a different fact on every
   * card, and six cards would give six button positions. The flags are in a
   * region for the other reason — they are drawn over the picture, and a band
   * that put them in the flow would be a second layout nobody chose.
   */
  it("puts every listing's state on its frame and every viewing on its floor", () => {
    for (const card of elementsOfType(bandOf("features-listings"), "loom.listing")) {
      const pinned = slotOf(card, "action").flatMap((node) => elementsOfType(node, "loom.action"))
      const loose = card.children
        .filter((child) => child.kind === "element")
        .flatMap((child) => elementsOfType(child, "loom.action"))

      expect(pinned, "a listing has no way to be seen").toHaveLength(1)
      expect(loose, "a listing puts its action in the flow, among the specs").toHaveLength(0)
      expect(slotOf(card, "flags").length, "a listing wears no state").toBeGreaterThan(0)
    }
  })

  /**
   * Exactly one date is emphasised, and it is the first.
   *
   * `emphasis` is the one prop on `loom.event` that survives the granularity
   * test — it changes a rendering and no node — and a band that emphasised
   * three would be emphasising none. First because the band is a column a
   * finger runs down and the thing being steered towards is at the top of it;
   * an emphasised row in the middle reads as an accident.
   */
  it("steers towards one date, at the top of the column", () => {
    const dates = elementsOfType(bandOf("articles-whats-on"), "loom.event")
    const featured = dates.filter((date) => date.props["emphasis"] === "featured")

    expect(dates.length).toBeGreaterThan(3)
    expect(featured).toHaveLength(1)
    expect(dates[0], "the emphasised date is not the first one").toBe(featured[0])

    for (const date of dates) {
      expect(slotOf(date, "meta").length, `${String(date.props["name"])} carries no qualifier`).toBeGreaterThan(0)
      expect(
        slotOf(date, "action").flatMap((node) => elementsOfType(node, "loom.action")),
        `${String(date.props["name"])} cannot be got into`
      ).toHaveLength(1)
    }
  })

  /**
   * The live figures band arrives **unbound**, and that is the band rather than
   * an omission.
   *
   * `articles-feed` established it and the reasoning is unchanged: a binding
   * names a **source id**, and a source id is a thing a host registers, so a
   * composition that declared one would hand every deployment that had not
   * registered that exact id a page reporting a binding it never agreed to
   * make. What is asserted is both halves — no `loom:data` anywhere, and every
   * tally naming the key it will read once somebody adds one.
   */
  it("ships four sockets rather than four bindings nobody registered", () => {
    const band = bandOf("metrics-live")
    const figures = elementsOfType(band, "loom.tally")

    expect(figures).toHaveLength(4)

    const bound = (node: LoomNode): readonly string[] =>
      node.kind === "text"
        ? []
        : [
            ...(node.kind === "element" && node.props["loom:data"] !== undefined ? [node.type] : []),
            ...node.children.flatMap(bound),
          ]

    expect(bound(band), "the band names a source a host never registered").toEqual([])

    const names = figures.map((figure) => figure.props["binding"])
    expect(new Set(names).size, "two figures read the same answer").toBe(4)

    for (const figure of figures) {
      expect(typeof figure.props["binding"], "a figure does not say what it reads").toBe("string")
      expect(typeof figure.props["caption"], "a figure that cannot be read does not say what it waits on").toBe("string")
    }
  })

  /**
   * The unconnected figure is quiet, which is the one thing that decides
   * whether this band reads as unconnected or as broken.
   *
   * `loom.tally` overrides its own value rule when there is nothing to print —
   * muted, one step down the ramp, deliberately not the accent — *because a
   * figure that did not arrive must not be the loudest thing on the page*. The
   * band is the first thing to rest on that, four times in a row, so the
   * override is asserted from the band rather than only from the primitive: a
   * run that removed the inline style would leave every test but this one
   * green and four `Unavailable`s shouting in yellow.
   */
  it("draws four figures that could not be read without shouting any of them", () => {
    for (const theme of [EDITORIAL, BOLD]) {
      const ids = sequentialIdFactory()
      const { markup, diagnostics } = render(pageOf(theme, [bandOf("metrics-live")], ids))
      const tree = treeMarkup(markup)

      expect(diagnostics).toEqual([])
      expect((tree.match(/Unavailable/g) ?? []).length, "a figure printed something it was never given").toBe(4)
      expect(tree).toContain("Connect a source")

      for (const value of tree.matchAll(/loom-stat-value"[^>]*style="([^"]*)"/g)) {
        expect(value[1], "an unreadable figure keeps the accent it is drawn in when it arrives").toMatch(/color:/)
      }
    }
  })

  /**
   * Both bound primitives now say which name they read an answer under.
   *
   * 0181 gave a primitive `reads` and could not describe either of these,
   * because both take the name from an optional prop; 0184 added the form that
   * fits and the framework lane filed the two-line change as this lane's. It is
   * asserted rather than eyeballed because **absence and emptiness are
   * different answers** — leaving `reads` out says *nobody has said*, which is
   * what both of these said for two days, and a run that removed the
   * declaration would take the `data-unread` diagnostic with it silently.
   */
  it("makes both bound primitives declare the name they read under", () => {
    for (const [type, fallback] of [
      ["loom.feed", "entries"],
      ["loom.tally", "value"],
    ] as const) {
      const declared = registry.primitives.find((primitive) => primitive.type === type)?.reads

      expect(declared, `${type} still says nothing about what it reads`).toEqual([
        { fromProp: "binding", default: fallback },
      ])
    }
  })
})

/**
 * The claim the whole-page photograph is the evidence for, held where a later
 * run will read it.
 *
 * Two bands attribute quotes and they attribute them differently on purpose:
 * `testimonials` to **roles**, because a starting composition may not ship a
 * fabricated endorsement from a person who does not exist, and
 * `testimonials-wall` to **names**. Until 25 September that difference had no
 * consequence, because `loom.quote` drew no face either way. It has one now, so
 * the difference has to be *declared* rather than left implicit in the copy —
 * which is
 * [0160](../../decisions/0160-a-prop-that-unblocks-a-rendering-names-the-content-and-never-the-layout.md),
 * and [0189](../../decisions/0189-a-portrait-with-no-photograph-is-the-persons-initials-and-a-portrait-with-nobody-named-is-nothing.md)
 * is why it matters.
 *
 * These are asserted as a pair rather than one test each, for the reason the
 * reach tests above give: what is held is the *contrast*, and a run that
 * changed one band's copy without the other's declaration would otherwise leave
 * every test green and put the initials of a job title in a circle.
 */
describe("which quotes have a face", () => {
  const quotesOf = (id: string): readonly ElementNode[] => {
    const band = compositionById(id)
    if (band === undefined) throw new Error(`${id} is not in the phrasebook`)

    return elementsOfType(band.build(sequentialIdFactory()), "loom.quote")
  }

  it("declares every role-attributed quote unnamed, and every named one not", () => {
    const anonymous = quotesOf("testimonials")
    const named = quotesOf("testimonials-wall")

    expect(anonymous.length).toBeGreaterThan(0)
    expect(named.length).toBeGreaterThan(0)

    for (const quote of anonymous) {
      expect(quote.props["anonymous"], `a testimonials quote attributed to ${quote.props["author"]}`).toBe(true)
    }

    for (const quote of named) {
      expect(quote.props["anonymous"], `a wall quote attributed to ${quote.props["author"]}`).toBeUndefined()
    }
  })

  /**
   * The rule the copy has to keep for the declaration above to be the right
   * one. A role has no initials; a name does. Two words is what `monogramOf`
   * reduces, and it is the property that makes a wall of eight read as eight
   * people rather than eight paragraphs.
   */
  it("attributes the wall to people with names in them", () => {
    for (const quote of quotesOf("testimonials-wall")) {
      const author = quote.props["author"]

      expect(typeof author).toBe("string")
      expect(String(author).split(/\s+/u).length, `${String(author)} is not a person's name`).toBeGreaterThan(1)
    }
  })

  /**
   * The singleton pull quote is the third placement of the same fallback and
   * the one that is not in a card — it sits against a 2px accent rule — so it
   * is named here rather than left to the two grids.
   */
  it("gives the customer story's pull quote a name to draw a face from", () => {
    const [story] = quotesOf("proof-story")

    expect(story).toBeDefined()
    expect(story?.props["anonymous"]).toBeUndefined()
    expect(String(story?.props["author"]).split(/\s+/u).length).toBeGreaterThan(1)
  })
})

/**
 * The two bands the 25 September whole-page photograph found thin, held to what
 * the pictures of them now show.
 *
 * Both were filed as *thin rather than broken*, and that phrase is the reason
 * these assertions are worth writing: every test in this file passed on both
 * bands the whole time. A band that satisfies every schema, emits no
 * diagnostic, measures no overflow and still reads as unfinished is the shape
 * this file cannot see, so what is asserted here is the **specific thing the
 * picture needed** — a panel in the wide cell, a plate under every mark on the
 * ring — named so that a later edit removing one fails with the reason rather
 * than with a count.
 */
describe("the two bands that did not pop", () => {
  const bandOf = (id: string): ElementNode => {
    const composition = compositionById(id)
    if (composition === undefined) throw new Error(`${id} is not in the phrasebook`)

    return composition.build(sequentialIdFactory())
  }

  const slotOf = (node: LoomNode, name: string): readonly LoomNode[] => {
    if (node.kind === "text") return []
    if (node.kind === "slot" && node.name === name) return node.children

    return node.children.flatMap((child) => slotOf(child, name))
  }

  /**
   * The wide cell, and only the wide cell. The three under it are a third of a
   * row each — well under the tile's own 44rem turn — so the same subtree there
   * would be three tall cards with a panel stacked in each, which is the tidy
   * row spoiled rather than three cells earning anything.
   */
  it("puts a panel in the cell that has room for one, and in no other", () => {
    const tiles = elementsOfType(bandOf("bento"), "loom.feature")
    const withMedia = tiles.filter((tile) => slotOf(tile, "media").length > 0)

    expect(tiles).toHaveLength(4)
    expect(withMedia).toHaveLength(1)
    expect(withMedia[0], "the panel is not in the cell the rhythm runs across the top").toBe(tiles[0])
  })

  /**
   * What is in it is nodes rather than an asset, which is the rule that lets
   * this catalogue ship a product surface at all: `hero-split-band` established
   * it and this is the second band resting on it.
   */
  it("fills the panel out of the library rather than with a picture nobody has", () => {
    const [lead] = elementsOfType(bandOf("bento"), "loom.feature")
    const media = slotOf(lead as LoomNode, "media")

    expect(media.flatMap((node) => elementsOfType(node, "loom.frame"))).toHaveLength(1)
    expect(media.flatMap((node) => elementsOfType(node, "loom.code"))).toHaveLength(1)
  })

  /**
   * The diff is the band's own claim drawn beside itself, and the two markers
   * are what make it a diff rather than a listing. Asserted as a pair, because
   * a later edit tidying the removed line away would leave a panel that shows a
   * result where the sentence beside it promises a change.
   */
  it("shows a change rather than a state", () => {
    const [panel] = elementsOfType(bandOf("bento"), "loom.code")
    const lines = wordsIn(panel as LoomNode).split("\n")

    expect(lines.some((line) => line.startsWith("-")), "nothing is coming off the page").toBe(true)
    expect(lines.some((line) => line.startsWith("+")), "nothing is going on to it").toBe(true)
    expect(Math.max(...lines.map((line) => line.length)), "a line is too long for a phone's panel").toBeLessThan(31)
  })

  /**
   * Every mark on the ring, not most of them. A plate under seven of eight is
   * the kind of edit that looks right in the diff and wrong in the picture.
   */
  it("plates every mark on the ring, and leaves the middle to the primitive", () => {
    const orbit = bandOf("integrations")
    const marks = elementsOfType(orbit, "loom.logo")
    const centre = slotOf(orbit, "mark").flatMap((node) => elementsOfType(node, "loom.logo"))

    expect(marks.length).toBeGreaterThan(4)
    expect(centre).toHaveLength(1)

    for (const logo of marks) {
      const plated = logo.props["surface"] === "card"
      const isCentre = centre.includes(logo)

      expect(
        plated,
        `${String(logo.props["name"])} is ${isCentre ? "plated as well as grounded" : "a bare word on a ring"}`
      ).toBe(!isCentre)
    }
  })

  /**
   * The connectors are what this band claims over a logo wall — *these things
   * are attached to that thing* — and the band asking for them is the only
   * place that claim is made. Held beside `rings`, because the two were changed
   * together and for one reason: eight plates alternating between two radii
   * crowd the hub they are meant to be circling.
   */
  it("asks for the rendering that says the marks are attached to the middle", () => {
    const [orbit] = elementsOfType(bandOf("integrations"), "loom.orbit")

    expect(orbit?.props["guides"]).toBe("spokes")
    expect(orbit?.props["rings"]).toBe("one")
  })
})

/**
 * What the code band tells a stranger to type, held against what the registry
 * actually publishes.
 *
 * This is the one band in the catalogue whose content is **executable
 * instructions**, and the 26 September framework rename made it wrong without
 * making it fail: every schema passed, the band rendered, and the import line
 * it printed resolved for nobody outside this workspace, because
 * [0194](decisions/0194-the-framework-is-the-package-and-everything-that-uses-it-ships-separately.md)
 * withholds `./primitives` from the published framework and
 * `createStarterPrimitiveRegistry` lives only there.
 *
 * So the assertion reads the runtime's own `publishConfig.exports` — the map
 * that reaches the registry — rather than restating a package name here, where
 * it would be a second copy of a fact and would go stale the same way.
 */
describe("the band that prints instructions", () => {
  const band = (): ElementNode => {
    const composition = compositionById("code")
    if (composition === undefined) throw new Error("the code band is not in the phrasebook")

    return composition.build(sequentialIdFactory())
  }

  it("does not import the registry from a package that does not export it", async () => {
    const { readFile } = await import("node:fs/promises")
    const root: { name?: string; publishConfig?: { exports?: Record<string, unknown> } } = JSON.parse(
      await readFile(new URL("../../package.json", import.meta.url), "utf8")
    )
    const framework = root.name ?? ""
    const published = Object.keys(root.publishConfig?.exports ?? {})
    const words = wordsIn(band())

    expect(published, "the framework now publishes ./primitives, so this test is the stale one").not.toContain(
      "./primitives"
    )
    expect(words).toContain("createStarterPrimitiveRegistry")
    expect(
      words.includes(`from "${framework}"`),
      "the band imports the registry from the framework, which does not export it"
    ).toBe(false)
  })

  /**
   * Both packages, in the one line a visitor copies first. A page that tells
   * somebody to install the framework alone and then hands them a registry
   * import is a page that fails on the second step.
   */
  it("tells them to install both packages", () => {
    const words = wordsIn(band())
    const framework: string = "@jam-overture/loom"

    expect(words).toContain(`pnpm add ${framework} ${framework}-primitives`)
  })
})

/**
 * The four second designs of 3 October, each held to the one claim it rests on.
 *
 * Not one of these is a count, which is the discipline the 2 October run set and
 * the reason that run's seven tests are still worth reading: a test that asserts
 * *there are three cards* goes red when somebody writes a fourth release, which
 * is the change the band exists to make easy. Each test below asserts the
 * **property that made the design worth a catalogue entry**, and every one of
 * them is a property the canonical of the same part does not have — so each is
 * run against the pair rather than against the alternate alone, and a test that
 * passed because both designs changed together would be a test that asserted
 * nothing.
 */
describe("what the second designs claim", () => {
  const build = (id: string): LoomNode => {
    const composition = compositionById(id)

    expect(composition, `no band with the id ${id}`).toBeDefined()

    return (composition as Composition).build(sequentialIdFactory())
  }

  const elementChildren = (node: LoomNode): readonly ElementNode[] =>
    node.kind === "text" ? [] : node.children.filter((child): child is ElementNode => child.kind === "element")

  /**
   * Every element in the subtree paired with the element that encloses it,
   * looking through slots.
   *
   * Slots are skipped rather than counted, because a slot is a region the
   * primitive places (0051) and not a thing a node is "inside" in the sense any
   * of these tests mean. A `loom.person` in a card's `footer` is a child of the
   * card as far as *who holds it* is concerned, and that is the question here.
   */
  const parentage = (node: LoomNode, holder?: ElementNode): readonly { child: ElementNode; holder?: ElementNode }[] => {
    if (node.kind === "text") return []

    const here = node.kind === "element" ? [{ child: node, ...(holder === undefined ? {} : { holder }) }] : []
    const next = node.kind === "element" ? node : holder

    return [...here, ...node.children.flatMap((child) => parentage(child, next))]
  }

  /**
   * `specs-sheet`, and the fact neither primitive involved states.
   *
   * The middot between two specifications is `.loom-spec + .loom-spec::before`
   * — a position selector, because no render of one node can know it has a
   * sibling (0008). So whether a run of figures is punctuated is decided by
   * **what the band puts between them**, and the two designs of this part want
   * opposite answers: the canonical's row is `600 · 2,000 · 90 days` read as one
   * line, and the sheet's card is four lines each beginning with its own figure.
   *
   * Asserted as a pair, which is the only way it means anything. The sheet wraps
   * every spec in its own `loom.list-item`, so no two are ever adjacent and the
   * rule never matches; the canonical lays them as siblings in a `loom.stack`,
   * so it always does. Change either band's container and one half goes red.
   */
  it("gives the specification sheet no two adjacent specs, and the canonical nothing else", () => {
    const sheet = parentage(build("specs-sheet")).filter(({ child }) => child.type === "loom.spec")
    const table = parentage(build("specs")).filter(({ child }) => child.type === "loom.spec")

    expect(sheet.length, "the sheet ships no specifications").toBeGreaterThan(1)
    expect(table.length, "the canonical ships no specifications").toBeGreaterThan(1)

    for (const { holder } of sheet) {
      expect(holder?.type, `a sheet spec is held by ${holder?.type ?? "nothing"}`).toBe("loom.list-item")
      expect(
        elementChildren(holder as ElementNode).filter((sibling) => sibling.type === "loom.spec"),
        "two specs in one row of the sheet would draw a middot between them"
      ).toHaveLength(1)
    }

    const row = table[0]?.holder as ElementNode
    expect(
      elementChildren(row).filter((sibling) => sibling.type === "loom.spec").length,
      "the canonical's specs are a punctuated run and have to be siblings to be one"
    ).toBeGreaterThan(1)
  })

  /**
   * `team-leads`, and the near-miss its doc comment runs out loud.
   *
   * The first draft held the two foregrounded people in a `loom.split`, which
   * fixes the count at two in the *primitive* rather than in the content: a
   * split has exactly two regions (0051), so a third lead is an `insert` with
   * nowhere to go. A grid at a two-column floor draws the same pair and takes a
   * third.
   *
   * So the assertion is not *there are two leads* — that is the thing a
   * deployment changes. It is **the two leads share one ordinary parent that
   * takes children**, which is what makes a third one reachable, and it would go
   * red the moment somebody reached for the split again.
   */
  it("holds the leads in a container that would take a third", () => {
    const leads = parentage(build("team-leads")).filter(({ child }) => child.type === "loom.person")

    expect(leads.length).toBeGreaterThan(1)

    expect(
      leads.map(({ holder }) => holder?.type),
      "a lead is no longer a person in a card"
    ).toEqual(leads.map(() => "loom.card"))

    /**
     * The claim is one level above the person: each lead has a card of its own,
     * and what has to be shared is the thing holding the **cards**. A third lead
     * is an `insert` into that node, so there has to be exactly one of it and it
     * has to be a container that takes children rather than a pair of regions.
     */
    const cards = parentage(build("team-leads")).filter(({ child }) => child.type === "loom.card")
    const holders = new Set(cards.map(({ holder }) => holder?.id))

    expect(cards.length).toBe(leads.length)
    expect(holders.size, "the lead cards are in separate regions, so a third has nowhere to go").toBe(1)
    expect(
      new Set(cards.map(({ holder }) => holder?.type)),
      "a lead card sits in a region a split placed rather than among siblings"
    ).toEqual(new Set(["loom.grid"]))
  })

  /**
   * `credentials-posture`, and the two regions the canonical ships empty.
   *
   * `loom.credential` declares `mark` and `meta`, and `credentialsBand` fills
   * neither — correctly, and its comment says why: a seal is a third party's
   * trademark fetched from a third party's domain. That reasoning is about
   * *assets*, and the consequence it left behind is that both regions were
   * unreachable by dropping in a band.
   *
   * A glyph is not an asset, so this band reaches both. Asserted on every
   * credential rather than on one, because a band that marked three of four
   * would photograph as an oversight — and asserted against the canonical in the
   * same breath, so the claim *this is the band that reaches them* is the thing
   * held rather than the band's own doc comment.
   */
  it("fills the credential's mark and meta regions, which the canonical leaves empty", () => {
    const regionsOf = (id: string): readonly (readonly string[])[] =>
      parentage(build(id))
        .filter(({ child }) => child.type === "loom.credential")
        .map(({ child }) =>
          child.children
            .filter((region) => region.kind === "slot" && region.children.length > 0)
            .map((region) => (region.kind === "slot" ? region.name : ""))
        )

    const posture = regionsOf("credentials-posture")
    expect(posture.length).toBeGreaterThan(1)

    for (const regions of posture) {
      expect(new Set(regions)).toEqual(new Set(["mark", "meta"]))
    }

    expect(regionsOf("credentials").flat(), "the canonical has started filling these regions").toEqual([])

    /**
     * And the rule the icon primitive states about itself: a glyph beside a
     * word that says the same thing must be hidden from assistive technology,
     * or the name is read twice. `label` present on one of these is the defect,
     * and it is invisible in every photograph.
     */
    for (const { child } of parentage(build("credentials-posture")).filter(({ child }) => child.type === "loom.icon")) {
      expect(child.props["label"], "a decorative glyph is named, so its credential is read out twice").toBeUndefined()
    }
  })

  /**
   * `changelog-notes`, and the thing a rail of milestones structurally cannot
   * hold.
   *
   * `loom.milestone` carries `body` as one string — one of 0052's fixed fields,
   * and right for a rail, where a release has one line about it. A release's
   * *changes* are repeated content, so by the same rule they are child nodes,
   * and there is nowhere in a milestone for a second one to go.
   *
   * The pair is the assertion: every release in the notes carries its changes as
   * more than one node, and every release on the rail carries its line as a prop
   * with no nodes under it at all. Either half alone would be satisfied by a
   * band that had quietly become the other one.
   */
  it("carries every release's changes as nodes, where the rail carries one string", () => {
    const releases = parentage(build("changelog-notes")).filter(({ child }) => child.type === "loom.list")

    expect(releases.length, "the notes ship no release").toBeGreaterThan(1)

    for (const { child } of releases) {
      const rows = elementChildren(child).filter((row) => row.type === "loom.list-item")

      expect(rows.length, "a release whose changes are one row is a milestone with extra steps").toBeGreaterThan(1)
      expect(elementChildren(child).length, "a release's list holds something that is not a row").toBe(rows.length)
    }

    const milestones = parentage(build("changelog")).filter(({ child }) => child.type === "loom.milestone")

    expect(milestones.length).toBeGreaterThan(1)

    for (const { child } of milestones) {
      expect(typeof child.props["body"], "the rail's line stopped being a prop").toBe("string")
      expect(child.children, "the rail's milestone grew children, so the pair this asserts has collapsed").toEqual([])
    }
  })

  /**
   * The instrument, asserted rather than reported.
   *
   * `docs/primitive-gap-inventory.md` added *designs per part* on 2 October and
   * it is the measurement that chose this run's work: a part with exactly one
   * design is a part where a deployment has no choice, and the catalogue reads
   * as complete from every other angle while it is true. It went 9 → 5 on
   * 2 October and 5 → 1 here.
   *
   * **This is a floor and not a count**, which is the distinction that makes it
   * a test worth keeping rather than a literal to edit: it said *no part has one
   * design except `banner`*, closing `banner` made it stricter, and it is now at
   * its floor — **no part in the catalogue leaves a deployment without a
   * choice.** It went 9 → 5 on 2 October, 5 → 1 on 3 October and 1 → 0 on
   * 5 October, by `banner-inline`.
   *
   * It stays as an assertion rather than retiring with the instrument, because
   * the one thing that can still make it red is the thing it was always for: a
   * new part admitted under 0171 arrives with one design, and the moment to be
   * told is then rather than three runs later. That failure is honest and the
   * remedy is a second design, not an edit to this line.
   */
  it("leaves no part in the catalogue without a choice of design", () => {
    const alone = COMPOSITION_PARTS.filter((part) => compositionsForPart(part).length === 1)

    expect(alone).toEqual([])
  })
})

/**
 * The four third designs, and the claim each of them rests on.
 *
 * Every part named here had exactly two designs on 9 October, and two designs
 * is a choice between two drawings rather than a vocabulary — so what these
 * four add is not a third taste but, in each case, a region the part could not
 * occupy at all. That region is the claim, and in all four cases it is
 * invisible to every structural test in this file: `faq-aside` with its aside
 * emptied renders as a narrow `faq` and passes the shape check against its
 * canonical; `contact-split` with the form's own reply promise copied into the
 * aside renders beautifully and is the two-figure failure the portal lane has
 * now recorded twice.
 *
 * They are asserted here rather than beside each band for the reason the second
 * designs' block gives: what is held is the **design**, and a design is a
 * statement about what the subtree is *for*, which no walk of the subtree's
 * types can recover.
 */
describe("what the third designs claim", () => {
  const bandOf = (id: string): ElementNode => {
    const band = compositionById(id)

    expect(band, `${id} is not in the phrasebook`).toBeDefined()
    if (band === undefined) throw new Error(`${id} is not in the phrasebook`)

    return band.build(sequentialIdFactory())
  }

  const slotIn = (node: LoomNode, name: string): readonly LoomNode[] => {
    if (node.kind === "text") return []
    if (node.kind === "slot" && node.name === name) return node.children

    return node.children.flatMap((child) => slotIn(child, name))
  }

  /**
   * The questions band's aside has to offer a way *out*, not more questions.
   *
   * The band exists because `faq` and `faq-grid` both end on the last answer,
   * so a reader whose question is not there reaches the closing call to action
   * having just failed to get one. The remedy is a control, and the thing that
   * would silently undo it is an aside holding a sixth `loom.faq` — which is
   * the edit that suggests itself, renders perfectly, and leaves the band
   * saying exactly what the canonical already said.
   *
   * So: every question in the `start` region, no question in the `end` region,
   * and a control in the `end` region. The third clause is what the band is;
   * the second is what it must not become.
   */
  it("puts every question on the wide side of the questions band and a way out on the other", () => {
    const band = bandOf("faq-aside")
    const start = slotIn(band, "start")
    const end = slotIn(band, "end")

    const questionsIn = (nodes: readonly LoomNode[]): number =>
      nodes.reduce((count, node) => count + elementsOfType(node, "loom.faq").length, 0)

    expect(questionsIn(start), "the wide side carries no questions").toBeGreaterThan(1)
    expect(questionsIn(end), "the aside carries questions, which is what the wide side is for").toBe(0)

    const actions = end.flatMap((node) => elementsOfType(node, "loom.action"))

    expect(actions, "the aside offers no way out, which is the only reason it is there").toHaveLength(1)
    expect(typeof actions[0]?.props["href"]).toBe("string")
  })

  /**
   * One marquee row, and the fade that makes it mean *this continues*.
   *
   * Both halves are props-and-counts rather than types, so the shape check
   * against the canonical cannot see either. A second row would make this
   * `integrations-grid` with the explanations removed and the stillness taken
   * away — the band's own note argues it at length — and `edges: "hard"` would
   * tell a reader the list ends where the viewport does, which is the opposite
   * of the claim the band is drawn to make.
   *
   * The logos are asserted to carry no image because that is how this one reads
   * as a ribbon of wordmarks rather than as a row of broken pictures: the
   * catalogue ships no image source at all (asserted page-wide above), and this
   * band is the design most likely to tempt the first one.
   */
  it("runs the integrations ribbon as one faded row of wordmarks", () => {
    const band = bandOf("integrations-marquee")
    const rows = elementsOfType(band, "loom.marquee")

    expect(rows, "a ribbon of integrations is one row; two is a moving grid").toHaveLength(1)
    expect(rows[0]?.props["edges"], "hard edges say the list ends where the band does").toBe("faded")

    const logos = elementsOfType(band, "loom.logo")

    expect(logos.length, "a ribbon with nothing on it").toBeGreaterThan(6)
    for (const logo of logos) {
      expect(logo.props["image"], `${String(logo.props["name"])} ships an image source`).toBeUndefined()
    }

    expect(elementsOfType(band, "loom.action"), "the ribbon cannot answer *is mine in there*").toHaveLength(1)
  })

  /**
   * The contact band serves both readers once each.
   *
   * It is the two halves of `contact` and `contact-details` on the page
   * together, and the failure it has to be held against is that it becomes the
   * two *bands* concatenated: two headings, two reply promises, two eyebrows,
   * the page saying *contact us* twice with different furniture.
   *
   * One `loom.perk` is the whole assertion — the reply promise lives in the
   * form's `note` region and nowhere else — plus one heading at level 2 for the
   * band and the direct ways present as links rather than as a second form. The
   * `loom.option` check is the other direction: the team-size select is
   * deliberately *gone* from this design, which is a node difference and the
   * reason the band is not `contact` in a narrower column.
   */
  it("gives the split contact band one reply promise, one form and the addresses beside it", () => {
    const band = bandOf("contact-split")

    expect(elementsOfType(band, "loom.form"), "two forms is the band saying contact us twice").toHaveLength(1)
    expect(elementsOfType(band, "loom.perk"), "a second reply promise is the two-figure failure").toHaveLength(1)
    expect(
      elementsOfType(band, "loom.option"),
      "the team-size select is the question a reader beside an email address will not answer"
    ).toHaveLength(0)

    const headings = elementsOfType(band, "loom.heading").filter((heading) => heading.props["level"] === 2)

    expect(headings, "a band has one level-two heading, however many halves it has").toHaveLength(1)

    const end = slotIn(band, "end")
    const schemes = end
      .flatMap((node) => elementsOfType(node, "loom.link"))
      .map((link) => String(link.props["href"]).split(":")[0])

    expect(schemes, "the direct ways in are what the aside is for").toContain("mailto")
    expect(schemes).toContain("tel")
  })

  /**
   * The footer's live claim is two nodes in the brand region, and a node is the
   * point.
   *
   * `footer-status` is the first design of this part that says anything about
   * the state of the product now rather than about what the site contains. The
   * thing that carries it is a `loom.badge` — which has no `href` and must not
   * get one, because a badge that navigated would be a control drawn as a label
   * — beside the `loom.link` that backs it.
   *
   * Both in the brand region rather than among the groups, for the reason the
   * footer's own capture test gives about `footer-signup`: the groups region is
   * an `auto-fit` grid sized for columns of links, and a badge dropped into it
   * becomes a column.
   *
   * The single group is asserted as **one** because that is what makes this a
   * row rather than a sitemap, and it is a count — so the shape check against
   * the canonical's four would pass a second and a third arriving.
   */
  it("keeps the compact footer's status claim in its brand region, over one row of links", () => {
    const band = bandOf("footer-status")
    const brand = slotIn(band, "brand")

    const badges = brand.flatMap((node) => elementsOfType(node, "loom.badge"))

    expect(badges, "the live claim is not in the brand region").toHaveLength(1)
    expect(badges[0]?.props["href"], "a badge that navigates is a control drawn as a label").toBeUndefined()

    const backing = brand
      .flatMap((node) => elementsOfType(node, "loom.link"))
      .map((link) => String(link.props["href"]))

    expect(backing, "the status claim is not backed by anywhere a reader can check it").toContain("/status")

    expect(elementsOfType(band, "loom.badge"), "a badge among the groups becomes a column").toHaveLength(1)

    const groups = band.children.filter((child): child is ElementNode => child.kind === "element")

    expect(groups.map((group) => group.type), "a compact footer is one row of links, not a sitemap").toEqual([
      "loom.link-list",
    ])
  })
})
