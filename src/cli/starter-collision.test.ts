import { describe, expect, it } from "vitest"

import { createStarterPrimitiveRegistry } from "../primitives/index.js"
import { catalogueOf } from "../sdk/index.js"

import { parseArguments } from "./args.js"
import { planCommand } from "./plan.js"
import { appPage } from "./scaffold-fixture/app.page.js"

/**
 * The promise `namespace.ts` makes, held against the library it is about.
 *
 * The rule is a namespace and the library is a list, so the two can only drift
 * in one direction: a starter primitive registered *outside* `loom.` would be a
 * name the CLI happily writes and a registry then refuses. Nothing else in the
 * repository would notice — the collision only exists once a host owns both
 * halves, which is exactly the position no test was in until this one.
 *
 * So this file stands where the host stands. It builds the registry the
 * documentation walks a stranger through building, out of the scaffold's own
 * committed output, and asserts it is accepted.
 */

const starterTypes = (): readonly string[] => {
  const registry = createStarterPrimitiveRegistry()
  if (!registry.ok) throw new Error(`the starter library does not build: ${registry.error.code}`)

  return catalogueOf(registry.value).map((entry) => entry.type)
}

const scaffoldedTypes = (): readonly string[] => {
  const plan = planCommand({ kind: "init", directory: "any" }, [])
  if (!plan.ok) throw new Error(`init could not be planned: ${plan.error.code}`)

  return plan.value.files
    .map((file) => file.path.slice(file.path.lastIndexOf("/") + 1))
    .filter((basename) => basename !== "registry.ts" && basename !== "registry.test.ts")
    .map((basename) => basename.slice(0, -".ts".length))
}

describe("the CLI against the library a host will combine it with", () => {
  it("refuses every type the starter library has already taken", () => {
    for (const type of starterTypes()) {
      expect(parseArguments(["add", "primitive", type]), type).toEqual({
        ok: false,
        error: { code: "framework-namespace", type },
      })
    }
  })

  it("scaffolds nothing the starter library registers", () => {
    for (const type of scaffoldedTypes()) {
      expect(starterTypes(), type).not.toContain(type)
    }
  })

  /**
   * Installation, then *Scaffolding a project*, then *Rendering a tree* — the
   * documentation site's own reading order. Combining what those three pages
   * give you is what used to fail.
   */
  it("builds one registry out of the scaffold and the starter library", () => {
    const combined = createStarterPrimitiveRegistry([appPage])

    expect(combined.ok ? undefined : combined.error).toBeUndefined()
  })
})
