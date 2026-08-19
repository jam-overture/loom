import { readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { catalogueOf } from "@loom/runtime/sdk"
import { describe, expect, it } from "vitest"

import { FACTS } from "./copy"
import { siteRegistry } from "./registry"

/**
 * The numbers on the page, held against the thing they are about.
 *
 * A marketing site claiming "37 primitives" is worth nothing if the number is
 * something someone typed once. These tests are what make it a fact: the
 * library is counted through the registry the site actually renders with, and
 * the records are counted on disk. When either grows, this fails and the page
 * is updated — which is the only way a number on a marketing page stays true.
 */

describe("what the site says about the repository", () => {
  it("counts the primitives it is built from", () => {
    expect(FACTS.primitives).toBe(String(catalogueOf(siteRegistry).length))
  })

  it("counts the decision records", () => {
    const decisions = fileURLToPath(new URL("../../../../../decisions", import.meta.url))
    const records = readdirSync(decisions).filter(
      (entry) => entry.endsWith(".md") && entry !== "README.md"
    )

    expect(FACTS.decisions).toBe(String(records.length))
  })

  it("counts the delta operations, which is the number that should not move", () => {
    expect(FACTS.operations).toBe("4")
  })
})
