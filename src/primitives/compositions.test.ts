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
import type { LoomNode } from "../tree/node.js"
import { createTree, type LoomTree } from "../tree/tree.js"

import { createStarterPrimitiveRegistry } from "./index.js"
import {
  COMPOSITION_INTERPRETER,
  compositionById,
  compositionInterpreter,
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

const idsIn = (node: LoomNode): readonly string[] => {
  if (node.kind === "text") return [node.id]

  return [node.id, ...node.children.flatMap(idsIn)]
}

const nodesIn = (node: LoomNode): number => idsIn(node).length

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
  it("offers nineteen bands, each with a distinct id", () => {
    expect(STARTER_COMPOSITIONS).toHaveLength(19)

    const ids = STARTER_COMPOSITIONS.map((composition) => composition.id)
    expect(new Set(ids).size).toBe(ids.length)
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
   * The nine bands are one page, which is the claim `STARTER_COMPOSITIONS`
   * makes by being ordered. A page that renders clean under both palettes is
   * the whole of what that claim can be held to here; whether it *reads* as a
   * page is what the screenshots in the report are for.
   */
  it("assembles one page from the nine, in order, under both palettes", () => {
    for (const theme of [EDITORIAL, BOLD]) {
      const ids = sequentialIdFactory()
      const bands = STARTER_COMPOSITIONS.map((composition) => composition.build(ids))
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

  it("carries the same number of nodes into the page as it built", () => {
    /**
     * A count rather than a shape, and it is the cheap half of the diagnostics
     * assertion above: a band whose nodes were dropped renders clean if the
     * dropped node was the only invalid one and nothing referenced it. The
     * pricing band is the one worth counting — thirty-eight nodes is the number
     * the doc comment claims, and a claim in a doc comment nobody checks is how
     * a comment starts lying.
     */
    const pricing = compositionById("pricing")
    expect(pricing).toBeDefined()
    expect(nodesIn((pricing as Composition).build(sequentialIdFactory()))).toBe(42)
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
   */
  it("points every link and every action at this site", () => {
    const hrefsIn = (node: LoomNode): readonly string[] => {
      if (node.kind === "text") return []
      const here = node.kind === "element" && typeof node.props["href"] === "string" ? [node.props["href"]] : []

      return [...here, ...node.children.flatMap(hrefsIn)]
    }

    for (const composition of STARTER_COMPOSITIONS) {
      for (const href of hrefsIn(composition.build(sequentialIdFactory()))) {
        expect(href.startsWith("/")).toBe(true)
      }
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
     * Nine bands assembled in order are one document outline, and the hero is
     * the only band that opens one. A second `level: 1` further down is the
     * defect a hand-built page acquires by copying a hero's heading into a
     * section, and it is invisible in every palette.
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
    const levels = STARTER_COMPOSITIONS.flatMap((composition) => levelsIn(composition.build(ids)))

    expect(levels.filter((level) => level === 1)).toHaveLength(1)
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
