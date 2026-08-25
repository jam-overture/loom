import {
  INTERPRETER_SYSTEM_PROMPT,
  measurePrompt,
  renderCatalogue,
  renderTree,
  sequentialIdFactory,
  type EditIntent,
} from "@loom/runtime"
import { catalogueOf } from "@loom/runtime/sdk"
import { describe, expect, it } from "vitest"

import { docsExamples } from "../examples/catalogue"
import { docsRegistry, docsThemes } from "../loom/registry"

import { docsBareRequest, docsModelRequest, DOCS_PROMPT_UTTERANCE } from "./request"

/**
 * The page prints a request. These are the claims that make printing it worth
 * anything: that it is the request the runtime would really assemble, that the
 * elisions are honest about what they hid, and that two builds of the page
 * produce the same bytes.
 */

const EXAMPLE = "first-tree"

const blockOf = (id: string) => {
  const block = docsModelRequest(EXAMPLE).blocks.find((candidate) => candidate.id === id)

  if (block === undefined) throw new Error(`no block called ${id}`)

  return block
}

describe("the request the documentation prints", () => {
  it("names an example the site actually has", () => {
    expect(() => docsModelRequest("not-an-example")).toThrow(/no example/)
    expect(() => docsBareRequest("not-an-example")).toThrow(/no example/)
  })

  it("is the same on every build", () => {
    expect(docsModelRequest(EXAMPLE)).toEqual(docsModelRequest(EXAMPLE))
  })

  it("shows the five blocks in the order they are sent", () => {
    expect(docsModelRequest(EXAMPLE).blocks.map((block) => block.id)).toEqual([
      "system",
      "primitives",
      "themes",
      "tree",
      "request",
    ])
  })

  it("sizes every block the way measurePrompt does, not the way the preview looks", () => {
    const tree = docsExamples.get(EXAMPLE)?.build()

    if (tree === undefined) throw new Error("the example did not build")

    const intent: EditIntent = {
      intentId: sequentialIdFactory("measure").intentId(),
      treeId: tree.treeId,
      baseRevision: tree.revision,
      origin: "user-instruction",
      actor: "the reader",
      utterance: DOCS_PROMPT_UTTERANCE,
      observedAt: "2026-01-01T00:00:00.000Z",
    }
    const expected = measurePrompt(intent, tree, catalogueOf(docsRegistry), docsThemes.catalogue())
    const { blocks, measurement } = docsModelRequest(EXAMPLE)

    expect(measurement).toEqual(expected)
    expect(blocks.reduce((sum, block) => sum + block.characters, 0)).toBe(expected.total)
  })

  it("prints the tree the reader is looking at, whole", () => {
    const tree = docsExamples.get(EXAMPLE)?.build()

    if (tree === undefined) throw new Error("the example did not build")

    const block = blockOf("tree")

    expect(block.elided).toBeUndefined()
    expect(block.preview.join("\n")).toBe(renderTree(tree))
  })

  it("prints the sentence the first chip would have sent", () => {
    expect(blockOf("request").preview).toEqual([
      `Request (user-instruction): ${DOCS_PROMPT_UTTERANCE}`,
    ])
  })

  it("elides the long blocks and says exactly how much it hid", () => {
    const primitives = blockOf("primitives")
    const catalogue = catalogueOf(docsRegistry)

    expect(primitives.preview.length).toBeGreaterThan(0)
    expect(primitives.elided?.noun).toBe("primitives")
    expect(primitives.preview.length + (primitives.elided?.count ?? 0)).toBe(catalogue.length)
    expect(primitives.preview.join("\n")).toBe(
      renderCatalogue(catalogue).split("\n").slice(0, primitives.preview.length).join("\n")
    )
  })

  it("shows the head of the standing instructions rather than a paraphrase", () => {
    const system = blockOf("system")

    expect(INTERPRETER_SYSTEM_PROMPT.startsWith(system.preview.join("\n"))).toBe(true)
    expect(system.characters).toBe(INTERPRETER_SYSTEM_PROMPT.length)
  })

  it("counts what the deployment registered rather than a number somebody typed", () => {
    const { registered } = docsModelRequest(EXAMPLE)
    const themes = docsThemes.catalogue()

    expect(registered.primitives).toBe(catalogueOf(docsRegistry).length)
    expect(registered.themeIds).toBe(
      themes.palettes.length + themes.fontPacks.length + themes.stylePresets.length
    )
  })

  it("costs far less with nothing registered, which is the comparison the page makes", () => {
    const bare = docsBareRequest(EXAMPLE)
    const { measurement } = docsModelRequest(EXAMPLE)

    expect(bare.primitives).toBe(0)
    expect(bare.themes).toBe(0)
    expect(bare.tree).toBe(measurement.tree)
    expect(bare.total).toBeLessThan(measurement.total)
  })
})
