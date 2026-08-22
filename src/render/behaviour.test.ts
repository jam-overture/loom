import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { z } from "zod"

import { sequentialIdFactory } from "../ids.js"
import { primitiveTypeSchema } from "../primitive-type.js"
import { auditRegistry } from "../sdk/audit.js"
import { definePrimitive, type PrimitiveEntry } from "../sdk/definition.js"
import { createPrimitiveRegistry, describeRegistryError } from "../sdk/registry.js"
import { textDictionarySchema, textResolverFor } from "../sdk/text.js"
import { registryOf } from "../testing/definitions.js"
import { buildElement, buildText } from "../tree/builders.js"
import { createTree, type LoomTree } from "../tree/tree.js"

import { BEHAVIOURS, isBehaviourName, resolveBehaviours } from "./behaviour.js"
import { staticPrimitiveResolver, type LoomPrimitiveProps } from "./primitive.js"
import { renderLoomTree } from "./render.js"
import { NO_TEXT } from "./text.js"

/**
 * The primitive the seam exists for, in the shape the finding described: a code
 * panel whose content is a text child, placing a control it did not implement.
 */
const codeDefinition: PrimitiveEntry = definePrimitive({
  type: "loom.code",
  description: "A snippet with a copy control",
  props: z.object({}),
  text: { copy: "Copy", copied: "Copied" },
  interactive: "always",
  behaviours: ["copy"],
  component: ({ loom, children }) =>
    createElement(
      "figure",
      { ...loom.editable },
      createElement("pre", null, children),
      loom.behaviours.copy
    ),
})

/** Declares nothing, and is here to prove it is handed nothing. */
const proseDefinition: PrimitiveEntry = definePrimitive({
  type: "loom.prose",
  description: "A paragraph",
  props: z.object({}),
  component: ({ loom, children }: LoomPrimitiveProps) =>
    createElement(
      "p",
      { ...loom.editable, "data-behaviours": Object.keys(loom.behaviours).length },
      children
    ),
})

const treeWith = (type: string, content: string): LoomTree => {
  const ids = sequentialIdFactory()

  return createTree(buildElement(ids, { type, children: [buildText(ids, content)] }), ids)
}

const markupOf = (tree: LoomTree, entries: readonly PrimitiveEntry[]): string => {
  const registry = registryOf(entries)

  return renderToStaticMarkup(
    renderLoomTree(tree, { resolver: registry, validator: registry }).element
  )
}

describe("the behaviour vocabulary", () => {
  it("is closed, and a name outside it is not one", () => {
    expect(isBehaviourName("copy")).toBe(true)
    expect(isBehaviourName("paste")).toBe(false)
    expect(isBehaviourName("constructor")).toBe(false)
  })

  it("says of every behaviour which strings its control needs", () => {
    for (const [name, behaviour] of Object.entries(BEHAVIOURS)) {
      expect(behaviour.text.length, name).toBeGreaterThan(0)
      expect(behaviour.description.trim(), name).not.toBe("")
    }
  })
})

describe("resolveBehaviours", () => {
  it("hands back nothing at all for a primitive that declared none", () => {
    const resolved = resolveBehaviours([], "pnpm add loom", NO_TEXT)

    expect(Object.keys(resolved.behaviours)).toEqual([])
    expect(resolved.unnamed).toEqual([])
  })

  it("builds a control for each declared name", () => {
    const resolved = resolveBehaviours(["copy"], "pnpm add loom", {
      copy: "Copy",
      copied: "Copied",
    })

    expect(Object.keys(resolved.behaviours)).toEqual(["copy"])
    expect(resolved.unnamed).toEqual([])
  })

  /**
   * The one way past the registry's check, and the reason this drops rather than
   * renders: a dictionary may answer a declared key with whitespace, which the
   * dictionary schema accepts because it only refuses the empty string.
   */
  it("leaves a control out rather than render it with no name", () => {
    const resolved = resolveBehaviours(["copy"], "pnpm add loom", { copy: "Copy", copied: "   " })

    expect(Object.keys(resolved.behaviours)).toEqual([])
    expect(resolved.unnamed).toEqual([{ behaviour: "copy", key: "copied" }])
  })

  it("answers with a map that inherits nothing from Object.prototype", () => {
    const resolved = resolveBehaviours(["copy"], "x", { copy: "Copy", copied: "Copied" })

    expect(Object.getPrototypeOf(resolved.behaviours)).toBeNull()
  })
})

describe("a rendered tree", () => {
  /**
   * The control renders nothing on the server, because it does not yet know
   * whether the clipboard is there. What this proves is that the primitive
   * placed what it declared and the render walked through it without throwing —
   * the button itself is `behaviour-copy.test.ts`.
   */
  it("places a declared control without emitting a button before it can work", () => {
    const markup = markupOf(treeWith("loom.code", "pnpm add @loom/runtime"), [codeDefinition])

    expect(markup).toContain("pnpm add @loom/runtime")
    expect(markup).not.toContain("<button")
  })

  it("hands a primitive that declared none an empty map", () => {
    expect(markupOf(treeWith("loom.prose", "hello"), [proseDefinition])).toContain(
      'data-behaviours="0"'
    )
  })

  /**
   * A resolver that is not a registry never carried a declaration, so there is
   * nothing to lose and nothing for a host to wire — the text seam's base case,
   * with no dictionary half.
   */
  it("renders through a bare resolver with no behaviours and no diagnostics", () => {
    const rendered = renderLoomTree(treeWith("loom.prose", "hello"), {
      resolver: staticPrimitiveResolver({ "loom.prose": proseDefinition.component }),
    })

    expect(rendered.diagnostics).toEqual([])
    expect(renderToStaticMarkup(rendered.element)).toContain('data-behaviours="0"')
  })

  it("reports the control it left out when a dictionary blanks its name", () => {
    const registry = registryOf([codeDefinition])
    const dictionary = textDictionarySchema.parse({
      locale: "de",
      messages: { "loom.code.copied": "   " },
    })

    const rendered = renderLoomTree(treeWith("loom.code", "x"), {
      resolver: registry,
      validator: registry,
      text: textResolverFor(registry, dictionary),
    })

    expect(rendered.diagnostics).toEqual([
      { code: "behaviour-unnamed", nodeId: expect.any(String), behaviour: "copy", key: "copied" },
    ])
  })
})

describe("registering a primitive that takes a behaviour", () => {
  const errorOf = (entry: PrimitiveEntry): string => {
    const built = createPrimitiveRegistry([entry])
    if (built.ok) throw new Error("expected the registration to be refused")

    return describeRegistryError(built.error)
  }

  it("accepts one that declares its strings and says it is a target", () => {
    expect(createPrimitiveRegistry([codeDefinition]).ok).toBe(true)
  })

  it("refuses a behaviour the runtime does not implement", () => {
    const entry: PrimitiveEntry = { ...codeDefinition, behaviours: ["paste"] }

    expect(errorOf(entry)).toContain("the runtime has none")
  })

  it("refuses one whose control has no string to be named by", () => {
    const entry: PrimitiveEntry = { ...codeDefinition, text: { copy: "Copy" } }

    expect(errorOf(entry)).toContain('declares no "copied" text')
  })

  it("refuses one that takes a control and does not call itself interactive", () => {
    const entry: PrimitiveEntry = { ...codeDefinition, interactive: undefined }

    expect(errorOf(entry)).toContain("renders a target")
  })

  it("answers for a type it knows, and for one it does not", () => {
    const registry = registryOf([codeDefinition, proseDefinition])

    expect(registry.behavioursFor(primitiveTypeSchema.parse("loom.code"))).toEqual(["copy"])
    expect(registry.behavioursFor(primitiveTypeSchema.parse("loom.prose"))).toEqual([])
    expect(registry.behavioursFor(primitiveTypeSchema.parse("loom.absent"))).toEqual([])
  })
})

describe("the audit", () => {
  it("has nothing to report about a primitive that places what it declared", () => {
    expect(auditRegistry(registryOf([codeDefinition])).unplacedBehaviours).toEqual([])
  })

  /**
   * The failure the probe exists for: it registers, it renders, and the control
   * the declaration promised is simply not on the page — with nothing else
   * missing to hint at it, because the content reads perfectly without one.
   */
  it("names a primitive that took a control and dropped it", () => {
    const dropping = definePrimitive({
      type: "loom.code",
      description: "A snippet that forgot its control",
      props: z.object({}),
      text: { copy: "Copy", copied: "Copied" },
      interactive: "always",
      behaviours: ["copy"],
      component: ({ loom, children }: LoomPrimitiveProps) =>
        createElement("pre", { ...loom.editable }, children),
    })

    expect(auditRegistry(registryOf([dropping])).unplacedBehaviours).toEqual([
      { type: "loom.code", behaviours: ["copy"] },
    ])
  })
})
