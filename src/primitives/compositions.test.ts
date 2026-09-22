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
  it("offers thirty-six bands, each with a distinct id", () => {
    expect(STARTER_COMPOSITIONS).toHaveLength(36)

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

  it("answers which designs a part has, and says none for a part with no alternate", () => {
    expect(compositionsForPart("hero").map((composition) => composition.id)).toEqual(["hero", "hero-split"])
    expect(compositionsForPart("footer").map((composition) => composition.id)).toEqual(["footer"])
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
  it("lets the phrasebook hold two bands that each open a document", () => {
    const ids = sequentialIdFactory()
    const opens = (composition: Composition): boolean =>
      JSON.stringify(composition.build(ids)).includes('"level":1')

    expect(compositionsForPart("hero").filter(opens)).toHaveLength(2)
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

    const marks = elementsOfType(nav.build(sequentialIdFactory()), "loom.logo")

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

    const site = elementsOfType(nav.build(sequentialIdFactory()), "loom.logo")[0]?.props["name"]

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
