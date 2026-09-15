import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"
import type { SubmissionUnavailable } from "@loom/runtime"

import { docsEntryAt } from "@/app/(docs)/_lib/nav"

import { produceActions } from "./actions"
import { produceTrouble, produceWhatAModelSees } from "./answers"
import { produceFormVerdicts } from "./proposals"

/**
 * The page's own sentences, held against what its producers answered.
 *
 * A produced table cannot go stale, and the prose around it can. *What a form
 * posts to* counts things in words — five ways there is no target, two rows that
 * are the reason the check is a schema — and a count typed into a paragraph is a
 * claim nothing was checking until this file.
 */

const PAGE = fileURLToPath(
  new URL("../../docs/the-runtime/what-a-form-posts-to/page.mdx", import.meta.url)
)

const source = (): string => readFileSync(PAGE, "utf8")

describe("the page itself", () => {
  it("is in the navigation, under the runtime", () => {
    expect(docsEntryAt("/docs/the-runtime/what-a-form-posts-to")).toBeDefined()
  })

  it("opens with a form a reader can change, before it explains anything", () => {
    const words = source()
    const example = words.indexOf('<Example id="a-form-nobody-has-connected"')
    const heading = words.indexOf("## The address is not in the tree")

    expect(example).toBeGreaterThan(-1)
    expect(example).toBeLessThan(heading)
  })

  it("sends a reader to the two pages this seam is explained against", () => {
    const words = source()

    expect(words).toContain("/docs/building-with-loom/where-content-comes-from")
    expect(words).toContain("/docs/the-runtime/when-nothing-comes-back")
  })

  /**
   * The one thing the page must never do, and the reason it is worth a test: a
   * reader copying a URL out of a `loom:submit` example would be copying the
   * mistake the whole seam exists to prevent.
   */
  it("never writes an address into a declaration", () => {
    const declarations = source().match(/"loom:submit":[^\n]*/g) ?? []

    expect(declarations.length).toBeGreaterThan(0)

    for (const declaration of declarations) {
      expect(declaration).not.toMatch(/https?:/)
      expect(declaration).toContain('"to"')
    }
  })
})

describe("what the page counts", () => {
  /**
   * Exhaustiveness, kept where a sixth reason would be added.
   *
   * The map is a `Record` over the union, so a reason added to the runtime fails
   * to compile here, naming itself — and the assertion under it is that the page
   * reaches every one of them rather than merely knowing they exist.
   */
  it("reaches every reason the seam has", async () => {
    const reached: Record<SubmissionUnavailable["reason"], true> = {
      "no-such-endpoint": true,
      "invalid-target": true,
      "endpoint-threw": true,
      unavailable: true,
      refused: true,
    }

    const trouble = await produceTrouble()

    expect(trouble.map((row) => row.reason).sort()).toEqual(Object.keys(reached).sort())
  })

  it("says five ways there is no target, and prints five", async () => {
    const trouble = await produceTrouble()

    expect(trouble.length).toBe(5)
    expect(source()).toContain("Five reasons")
  })

  it("says two of the candidate actions are carried, and two are the middle rows", async () => {
    const actions = await produceActions()
    const carried = actions.filter((action) => action.accepted)

    expect(carried.length).toBe(2)
    expect(source()).toContain("The two middle rows")

    /** The claim in that sentence: the pair sits in the middle of the table. */
    const refusedInTheMiddle = actions.slice(2, 4)

    expect(refusedInTheMiddle.every((action) => !action.accepted)).toBe(true)
    expect(refusedInTheMiddle.map((action) => action.action)).toEqual([
      "//forms.example.net/collect",
      "/\\forms.example.net/collect",
    ])
  })

  it("shows a model exactly what the registry catalogues, and no more", () => {
    const seen = produceWhatAModelSees()

    expect(seen.destinations.length).toBeGreaterThan(1)
    expect(seen.posting).toEqual(["loom.form"])
    expect(seen.primitives).toBeGreaterThan(seen.posting.length)

    for (const destination of seen.destinations) {
      expect(JSON.stringify(destination)).not.toMatch(/https?:/)
    }
  })
})

describe("what the page says the Gate does", () => {
  it("prints one accepted change and one held, under one policy", async () => {
    const verdicts = await produceFormVerdicts()

    expect(verdicts.map((verdict) => verdict.kind)).toEqual(["accepted", "requires-confirmation"])
  })

  it("holds the repointing for a person by the runtime's own rule, not by stakes alone", async () => {
    const [, repointed] = await produceFormVerdicts()

    expect(repointed?.reasonCode).toBe("redirected-submission")
    expect(repointed?.stakes).toBe("high")
    expect(source()).toContain("held for a person on every origin")
  })
})
