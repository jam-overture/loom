import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { draftSchemaByteSize, DEFAULT_DRAFT_DEPTH, GRAMMAR_BUDGET_BYTES } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { docsBareRequest, docsModelRequest } from "./request"

/**
 * The numbers *Connecting a model* states in prose, held against the runtime.
 *
 * Almost everything on that page is generated, and the two places it is not are
 * the two places a documentation site normally rots: a measurement quoted in a
 * sentence, and a proportion quoted in a sentence. Neither can be a component
 * without turning a paragraph into a table, so they are checked here instead —
 * the same bargain the marketing site strikes with its own claims.
 */

/**
 * The source with its hard wrapping flattened, because a claim this file looks
 * for is a phrase and prose is wrapped at eighty columns — so "two per cent"
 * would be missed for the sole reason that a line ended between the words.
 */
const page = readFileSync(
  fileURLToPath(new URL("../../docs/the-runtime/connecting-a-model/page.mdx", import.meta.url)),
  "utf8"
).replace(/\s+/g, " ")

const withThousands = (value: number): string =>
  new Intl.NumberFormat("en-US").format(value)

describe("what the page says about the reply schema", () => {
  it("quotes the depth the runtime actually caps drafts at", () => {
    expect(page).toContain(`nesting depth of ${DEFAULT_DRAFT_DEPTH}`)
  })

  it("quotes the compiled size at that depth, and the budget it fits inside", () => {
    const size = draftSchemaByteSize(DEFAULT_DRAFT_DEPTH)

    expect(size).toBeLessThanOrEqual(GRAMMAR_BUDGET_BYTES)
    expect(page).toContain(withThousands(size))
    expect(page).toContain(withThousands(GRAMMAR_BUDGET_BYTES))
  })

  it("quotes the size one level deeper, and it really is over", () => {
    const over = draftSchemaByteSize(DEFAULT_DRAFT_DEPTH + 1)

    expect(over).toBeGreaterThan(GRAMMAR_BUDGET_BYTES)
    expect(page).toContain(`Depth ${DEFAULT_DRAFT_DEPTH + 1} would be ${withThousands(over)}`)
  })
})

describe("what the page says a request is made of", () => {
  /**
   * The sentence is *"under two per cent"*, and the bound in it is the bound
   * checked here — which it was not until the sources block arrived.
   *
   * The page used to say *"about two per cent"* against a band of half a per
   * cent to three, so a request whose question was really three per cent of it
   * would have passed a test for a sentence it contradicted. A sentence with a
   * number in it is worth only as much as the comparison behind it, and *under
   * two* is the one a reader can check by reading the table above it.
   *
   * The lower bound stays, for the opposite failure: a share rounding to
   * nothing would mean the vocabulary had grown past the point where this
   * paragraph's argument is the right one to make.
   */
  it("keeps the reader's own question under the share the page claims", () => {
    const { measurement } = docsModelRequest("first-tree")
    const asked = measurement.tree + measurement.request

    expect(page).toContain("under two per cent")
    expect(asked / measurement.total).toBeGreaterThan(0.005)
    expect(asked / measurement.total).toBeLessThan(0.02)
  })

  it("is honest that the vocabulary is the bulk of it", () => {
    const { measurement } = docsModelRequest("first-tree")
    const vocabulary = measurement.primitives + measurement.themes + measurement.sources

    expect(vocabulary).toBeGreaterThan(measurement.total / 2)
    expect(docsBareRequest("first-tree").total).toBeLessThan(measurement.total / 2)
  })
})

describe("what the page says about the sources block", () => {
  /**
   * *"the shortest block with the longest instructions"* — the one claim on
   * that paragraph that could quietly stop being true, because it is about a
   * ratio inside a block the runtime owns.
   *
   * It is the sources block and not the primitive one for a reason worth
   * keeping: a catalogue of a hundred-odd primitives is almost entirely list,
   * and a handful of sources are almost entirely the paragraph that comes after
   * them. The instruction is the same length either way, so the shorter the
   * list the more of the block is the explanation — and a reader shown four
   * lines beside a four-figure character count would otherwise be left to
   * wonder where the rest of it went.
   */
  it("is the shortest list and is mostly not the list", () => {
    const { blocks, measurement, sourceListCharacters } = docsModelRequest("first-tree")
    const shown = (id: string): number => {
      const block = blocks.find((candidate) => candidate.id === id)

      if (block === undefined) throw new Error(`no block called ${id}`)

      return block.characters
    }

    expect(page).toContain("the shortest block with the longest instructions")
    expect(sourceListCharacters).toBeLessThan(measurement.sources / 2)
    expect(shown("sources")).toBeLessThan(shown("primitives"))
    expect(shown("sources")).toBeLessThan(shown("themes"))
  })

  /**
   * The two further ways a binding fails, which is why the paragraph is long:
   * an id can be checked against the list and the other two cannot.
   */
  it("says what the list cannot show, in the prompt's own terms", () => {
    expect(page).toContain("params the source never declared")
    expect(page).toContain("read by nobody")
  })
})
