import { readFile } from "node:fs/promises"

import { describe, expect, it } from "vitest"

import { planCommand } from "./plan.js"

/**
 * `scaffold-fixture/` is the exact output of `loom init`, committed.
 *
 * Asserting that templates *contain* the right strings only proves they say what
 * was intended. Committing the output proves something stronger, and proves it
 * with machinery that already exists: `tsc` typechecks the fixture along with the
 * rest of `src/`, and Vitest runs the generated conformance test for real — so
 * "the scaffold compiles, and the audit it ships passes" is enforced on every
 * `pnpm verify` rather than asserted in prose.
 *
 * This test is the other half: it fails when a template changes and the fixture
 * does not, so the two cannot drift. Regenerate the fixture when it fails; do not
 * hand-edit it.
 */

const FIXTURE_DIRECTORY = "src/cli/scaffold-fixture"

const planned = (): readonly { readonly basename: string; readonly contents: string }[] => {
  const plan = planCommand({ kind: "init", directory: "any" }, [])
  if (!plan.ok) throw new Error(`init could not be planned: ${plan.error.code}`)

  return plan.value.files.map((file) => ({
    basename: file.path.slice(file.path.lastIndexOf("/") + 1),
    contents: file.contents,
  }))
}

describe("the committed scaffold fixture", () => {
  it("is byte-identical to what loom init writes today", async () => {
    for (const file of planned()) {
      const committed = await readFile(`${FIXTURE_DIRECTORY}/${file.basename}`, "utf8")

      expect(committed, `${file.basename} has drifted from its template`).toBe(file.contents)
    }
  })

  it("covers every file init writes, so none goes unchecked", () => {
    expect(planned().map((file) => file.basename)).toEqual([
      "app.page.ts",
      "registry.ts",
      "registry.test.ts",
    ])
  })
})
