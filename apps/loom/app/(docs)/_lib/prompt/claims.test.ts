import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { draftSchemaByteSize, DEFAULT_DRAFT_DEPTH, GRAMMAR_BUDGET_BYTES } from "@loom/runtime"
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
   * The sentence is *"about two per cent"*, so this checks the claim rather
   * than a decimal: what the reader asked about has to stay a small enough
   * fraction of the request for that sentence to be fair, and the day it is not
   * is the day somebody should rewrite the paragraph rather than the number.
   */
  it("keeps the reader's own question a small fraction of what is sent", () => {
    const { measurement } = docsModelRequest("first-tree")
    const asked = measurement.tree + measurement.request

    expect(page).toContain("two per cent")
    expect(asked / measurement.total).toBeGreaterThan(0.005)
    expect(asked / measurement.total).toBeLessThan(0.03)
  })

  it("is honest that the vocabulary is the bulk of it", () => {
    const { measurement } = docsModelRequest("first-tree")
    const vocabulary = measurement.primitives + measurement.themes

    expect(vocabulary).toBeGreaterThan(measurement.total / 2)
    expect(docsBareRequest("first-tree").total).toBeLessThan(measurement.total / 2)
  })
})
