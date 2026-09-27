import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { LICENSE_NOTICE } from "./copy"
import { pageSchema } from "./schema"
import { HOME, LICENSE_URL } from "./site"

/**
 * The licence the site states, held against the licence the repository carries.
 *
 * It was a placeholder until 27 September — *"Licensing is not settled, and
 * this line is where it will be stated"* — and `docs/rollout.md` had it as the
 * one hard gate on Phase 4. The maintainer settled it as MIT.
 *
 * A sentence in a footer is the easiest kind of claim to leave behind: nothing
 * renders differently if the package relicenses, no page breaks, and the one
 * reader who would notice is a lawyer. So the site's sentence is held against
 * the **manifest**, which is what a person installing actually gets, and
 * against the `LICENSE` file, which is what the footer links to.
 */

const manifest = JSON.parse(
  readFileSync(new URL("../../../../../package.json", import.meta.url), "utf8")
) as { readonly license?: string }

const licenseFile = readFileSync(new URL("../../../../../LICENSE", import.meta.url), "utf8")

describe("the licence this site states", () => {
  it("is the licence the package publishes under", () => {
    expect(manifest.license).toBe("MIT")
    expect(LICENSE_NOTICE).toContain("MIT")
  })

  it("is the licence the file at the end of the link actually is", () => {
    expect(licenseFile).toContain("MIT License")
  })

  it("points at a licence that exists in this repository", () => {
    expect(LICENSE_URL.endsWith("/LICENSE")).toBe(true)
    expect(licenseFile.length).toBeGreaterThan(0)
  })

  /**
   * The graph says it too, because that is the field an assistant answering
   * *can I use this* reaches for, and a graph that disagreed with the footer
   * would be the site giving two answers to a legal question.
   */
  it("is what the structured data says as well", () => {
    const nodes = (
      pageSchema(HOME, "https://loom.example") as unknown as {
        "@graph": readonly Record<string, unknown>[]
      }
    )["@graph"]
    const software = nodes.find((node) => node["@type"] === "SoftwareApplication")

    expect(software?.["license"]).toBe(LICENSE_URL)
  })
})
