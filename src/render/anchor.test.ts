import { createElement, type ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { sequentialIdFactory, type NodeId } from "../ids.js"
import { ANCHOR_PROP_KEY } from "../reserved-props.js"
import { buildElement, buildText } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"

import {
  createAnchorLedger,
  resolveAnchor,
  ANCHOR_MAX_LENGTH,
  type AnchorReading,
} from "./anchor.js"
import { describeRenderDiagnostic, type RenderDiagnostic } from "./diagnostics.js"
import { staticPrimitiveResolver, type LoomPrimitiveProps } from "./primitive.js"
import { renderLoomTree } from "./render.js"

const NODE = "n_one" as NodeId
const OTHER = "n_two" as NodeId

const reading = (declared: unknown): AnchorReading =>
  resolveAnchor(declared as never, NODE, createAnchorLedger())

describe("reading an anchor a tree named", () => {
  it("takes a slug of lowercase words joined by single hyphens", () => {
    expect(reading("see-it-happen")).toEqual({
      status: "anchored",
      attributes: { id: "see-it-happen" },
    })
  })

  it("takes digits, which is what a numbered section is", () => {
    expect(reading("step-2")).toEqual({ status: "anchored", attributes: { id: "step-2" } })
  })

  /**
   * Fragment matching is case-sensitive, so the failure this prevents is a page
   * that anchors one spelling and links to the other and silently scrolls
   * nowhere — the two are hard to tell apart in a diff read quickly.
   */
  it("refuses capitals", () => {
    expect(reading("Pricing").status).toBe("unusable")
  })

  it("refuses anything that would have to be encoded to reach a URL", () => {
    for (const declared of ["see it happen", "prix-café", "a/b", "half%20way", "why?"]) {
      expect(reading(declared).status, declared).toBe("unusable")
    }
  })

  it("refuses a leading, trailing or doubled hyphen", () => {
    for (const declared of ["-pricing", "pricing-", "see--it"]) {
      expect(reading(declared).status, declared).toBe("unusable")
    }
  })

  it("refuses an anchor longer than an anchor may be, and takes one exactly that long", () => {
    expect(reading("a".repeat(ANCHOR_MAX_LENGTH)).status).toBe("anchored")
    expect(reading("a".repeat(ANCHOR_MAX_LENGTH + 1)).status).toBe("unusable")
  })

  /**
   * The tree is AI-authored, so every reading of it is total: a proposal that
   * puts a number where a slug goes produces a reading, never a throw.
   */
  it("refuses what is not a string at all, and says which of them it was", () => {
    expect(reading(42)).toEqual({ status: "unusable", detail: "got number" })
    expect(reading(undefined)).toEqual({ status: "unusable", detail: "no value was given" })
    expect(reading("")).toEqual({ status: "unusable", detail: "it is empty" })
  })
})

describe("the ledger that decides who holds a slug", () => {
  it("gives it to the first claim and names that holder to the second", () => {
    const ledger = createAnchorLedger()

    expect(resolveAnchor("pricing", NODE, ledger)).toEqual({
      status: "anchored",
      attributes: { id: "pricing" },
    })
    expect(resolveAnchor("pricing", OTHER, ledger)).toEqual({
      status: "claimed",
      anchor: "pricing",
      holder: NODE,
    })
  })

  it("does not record an anchor it refused, so a later usable one is free to take it", () => {
    const ledger = createAnchorLedger()

    expect(resolveAnchor("Pricing", NODE, ledger).status).toBe("unusable")
    expect(resolveAnchor("pricing", OTHER, ledger).status).toBe("anchored")
  })

  /**
   * Two renders of the same tree must not be able to disagree about which node
   * holds a slug because one of them ran first — the same property the text
   * seam's per-render merge cache has, for the same reason.
   */
  it("is per render, so a second ledger knows nothing about the first", () => {
    resolveAnchor("pricing", NODE, createAnchorLedger())

    expect(resolveAnchor("pricing", OTHER, createAnchorLedger()).status).toBe("anchored")
  })
})

/** A band that places its anchor, and one that drops it. */
const anchoring = ({ loom, children }: LoomPrimitiveProps): ReactNode =>
  createElement("section", { ...loom.anchor, ...loom.editable }, children)

const forgetful = ({ children }: LoomPrimitiveProps): ReactNode =>
  createElement("section", null, children)

/** A band that says its children twice — the arrangement a copy exists for. */
const echoing = ({ loom, children }: LoomPrimitiveProps): ReactNode =>
  createElement(
    "div",
    { ...loom.anchor },
    createElement("div", { key: "run" }, children),
    createElement("div", { key: "echo", "aria-hidden": true }, loom.decorative())
  )

const resolver = staticPrimitiveResolver({
  "loom.section": anchoring,
  "loom.plain": forgetful,
  "loom.marquee": echoing,
})

type Band = { readonly type?: string; readonly anchor?: unknown; readonly text?: string }

const treeOf = (bands: readonly Band[], rootType = "loom.section") => {
  const idFactory = sequentialIdFactory()
  const children = bands.map((band) =>
    buildElement(idFactory, {
      type: band.type ?? "loom.section",
      props: band.anchor === undefined ? {} : { [ANCHOR_PROP_KEY]: band.anchor as never },
      children: [buildText(idFactory, band.text ?? "band")],
    })
  )
  const root = buildElement(idFactory, { type: rootType, children })

  return { tree: createTree(root, idFactory), ids: children.map((child) => child.id) }
}

const renderOf = (
  bands: readonly Band[],
  options: { readonly editMode?: boolean; readonly rootType?: string } = {}
): { readonly markup: string; readonly diagnostics: readonly RenderDiagnostic[] } => {
  const { tree } = treeOf(bands, options.rootType)
  const output = renderLoomTree(tree, {
    resolver,
    ...(options.editMode === undefined ? {} : { editMode: options.editMode }),
  })

  return { markup: renderToStaticMarkup(output.element), diagnostics: output.diagnostics }
}

const occurrences = (haystack: string, needle: string): number =>
  haystack.split(needle).length - 1

describe("a node the tree gave an anchor", () => {
  it("reaches the document as an id the primitive placed", () => {
    expect(renderOf([{ anchor: "see-it-happen" }]).markup).toContain('id="see-it-happen"')
  })

  it("gets no id when the tree named none, and nothing is reported", () => {
    const { markup, diagnostics } = renderOf([{}])

    expect(markup).not.toContain("id=")
    expect(diagnostics).toEqual([])
  })

  /**
   * An anchor adds an attribute and changes nothing else, so a tree that named a
   * bad one loses the ability to be linked to and keeps its content — the same
   * bargain every other diagnostic in the renderer makes.
   */
  it("still renders when the anchor is unusable, and says so", () => {
    const { markup, diagnostics } = renderOf([{ anchor: "See It Happen", text: "the record" }])

    expect(markup).toContain("the record")
    expect(markup).not.toContain("id=")
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["anchor-unusable"])
    expect(describeRenderDiagnostic(diagnostics[0] as RenderDiagnostic)).toContain(
      "not lowercase letters, digits and single hyphens"
    )
  })

  it("is not reported as a reserved key nothing reads", () => {
    const codes = renderOf([{ anchor: "pricing" }]).diagnostics.map(
      (diagnostic) => diagnostic.code
    )

    expect(codes).not.toContain("reserved-prop-unrecognised")
  })

  it("renders correctly, and unlinkable, when its primitive drops the attributes", () => {
    const { markup, diagnostics } = renderOf([
      { type: "loom.plain", anchor: "pricing", text: "the record" },
    ])

    expect(markup).toContain("the record")
    expect(markup).not.toContain("id=")
    expect(diagnostics).toEqual([])
  })
})

describe("two nodes that named the same anchor", () => {
  it("gives it to the first and reports the second, naming who holds it", () => {
    const { tree, ids } = treeOf([{ anchor: "pricing" }, { anchor: "pricing" }])
    const { element, diagnostics } = renderLoomTree(tree, { resolver })

    expect(occurrences(renderToStaticMarkup(element), 'id="pricing"')).toBe(1)
    expect(diagnostics).toEqual([
      { code: "anchor-claimed", nodeId: ids[1], anchor: "pricing", holder: ids[0] },
    ])
  })

  /**
   * The walk reaches a node's children before it builds that node's own render
   * context, so claiming at either of those two moments gives a different
   * winner. Document order is the one a reader would predict.
   */
  it("gives it to the ancestor rather than to its own descendant", () => {
    const idFactory = sequentialIdFactory()
    const child = buildElement(idFactory, {
      type: "loom.section",
      props: { [ANCHOR_PROP_KEY]: "pricing" },
      children: [buildText(idFactory, "inner")],
    })
    const root = buildElement(idFactory, {
      type: "loom.section",
      props: { [ANCHOR_PROP_KEY]: "pricing" },
      children: [child],
    })
    const { element, diagnostics } = renderLoomTree(createTree(root, idFactory), { resolver })

    expect(renderToStaticMarkup(element)).toMatch(/<section id="pricing">.*<section>/s)
    expect(diagnostics).toEqual([
      { code: "anchor-claimed", nodeId: child.id, anchor: "pricing", holder: root.id },
    ])
  })

  it("does not carry a claim from one render into the next", () => {
    const { tree } = treeOf([{ anchor: "pricing" }])

    expect(renderLoomTree(tree, { resolver }).diagnostics).toEqual([])
    expect(renderLoomTree(tree, { resolver }).diagnostics).toEqual([])
  })
})

describe("an anchor inside a decorative copy", () => {
  /**
   * The copy is the same children with identity switched off, and an anchor is
   * identity: emitting one would put the same id on two elements, which is the
   * failure the copy exists to avoid, in its other spelling.
   */
  it("is not emitted, so the copy cannot duplicate the original's id", () => {
    const { markup } = renderOf([{ anchor: "pricing" }], { rootType: "loom.marquee" })

    expect(occurrences(markup, 'id="pricing"')).toBe(1)
  })

  it("does not claim, so the original keeps its anchor and nothing is reported", () => {
    const { markup, diagnostics } = renderOf([{ anchor: "pricing" }], {
      rootType: "loom.marquee",
    })

    expect(markup).toContain('id="pricing"')
    expect(diagnostics).toEqual([])
  })

  it("holds still for an unusable anchor too, reporting it once rather than twice", () => {
    const { diagnostics } = renderOf([{ anchor: "Pricing" }], { rootType: "loom.marquee" })

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["anchor-unusable"])
  })
})

describe("an anchor beside the attributes that make a node editable", () => {
  it("is placed with them, and survives edit mode being off", () => {
    expect(renderOf([{ anchor: "pricing" }], { editMode: true }).markup).toContain(
      'id="pricing"'
    )
    expect(renderOf([{ anchor: "pricing" }], { editMode: false }).markup).toContain(
      'id="pricing"'
    )
  })

  it("is a different attribute from the one a portal resolves", () => {
    const markup = renderOf([{ anchor: "pricing" }], { editMode: true }).markup

    expect(markup).toContain('id="pricing"')
    expect(markup).toContain("data-loom-node=")
  })
})
