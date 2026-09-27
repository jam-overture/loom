import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { entryPoints } from "./entry-points"
import { publishedSpecifier } from "./packages"

/**
 * The documented doors, against the doors that exist.
 *
 * §4c settles that the API reference is generated rather than written, for
 * exactly the reason this test exists: a hand-maintained list of what a package
 * publishes is wrong within a week of anyone adding an export. Until the
 * generated reference lands, this is the cheapest version of the same
 * guarantee — the *summaries* are written, the *set* is not allowed to drift.
 *
 * **It used to read the wrong map**, and that is worth knowing because the test
 * was green the whole time it was wrong. `exports` is the map this *workspace*
 * resolves against; `publishConfig.exports` is the one that goes to the
 * registry, and since 0194 the two differ by the starter library. So the test
 * named after *what the runtime publishes* was checking the sixteen doors this
 * repository can open rather than the fifteen a reader can, and the sixteenth
 * was a page telling a stranger to import something that throws on their
 * machine. It reads the published map now, and the library is listed under the
 * package it really ships as.
 */

const manifest = (): {
  readonly exports: Record<string, unknown>
  readonly publishConfig?: { readonly exports?: Record<string, unknown> }
} => {
  const path = fileURLToPath(new URL("../../../../../package.json", import.meta.url))

  return JSON.parse(readFileSync(path, "utf8"))
}

/**
 * Every specifier a reader could write, from the manifest that reaches them.
 *
 * The workspace's own map is the fallback rather than the source: a repository
 * that stops narrowing its exports would be one where the two are the same map,
 * and this should follow that rather than fail.
 */
const published = (): readonly string[] => {
  const { exports, publishConfig } = manifest()

  return Object.keys(publishConfig?.exports ?? exports)
    .map((subpath) => (subpath === "." ? "@jam-overture/loom" : `@jam-overture/loom${subpath.slice(1)}`))
    .sort()
}

/** The framework's doors, plus the packages a withheld one now ships as. */
const reachable = (): readonly string[] => {
  const { exports, publishConfig } = manifest()

  const withheld = Object.keys(exports)
    .filter((subpath) => !Object.keys(publishConfig?.exports ?? exports).includes(subpath))
    .map((subpath) => publishedSpecifier(`@jam-overture/loom${subpath.slice(1)}`))

  return [...published(), ...withheld].sort()
}

describe("the documented entry points", () => {
  it("names exactly what a reader can import", () => {
    expect([...entryPoints.map((entry) => entry.specifier)].sort()).toEqual([...reachable()])
  })

  /**
   * The sharper half, and the one the old test could not make: **nothing on this
   * table is a subpath the registry refuses.** A door withheld from the
   * published manifest may appear here only under the name of the package it
   * really ships as.
   */
  it("offers no door that is not on the registry", () => {
    const { exports, publishConfig } = manifest()

    const withheld = Object.keys(exports)
      .filter((subpath) => !Object.keys(publishConfig?.exports ?? exports).includes(subpath))
      .map((subpath) => `@jam-overture/loom${subpath.slice(1)}`)

    for (const door of withheld) {
      expect(entryPoints.map((entry) => entry.specifier), door).not.toContain(door)
    }
  })

  it("names each of them once", () => {
    const specifiers = entryPoints.map((entry) => entry.specifier)

    expect(new Set(specifiers).size).toBe(specifiers.length)
  })

  it("says something about each in a sentence", () => {
    for (const entry of entryPoints) {
      expect(entry.summary.length).toBeGreaterThan(20)
      expect(entry.summary.endsWith(".")).toBe(true)
    }
  })

  it("leads with the one an application starts from", () => {
    expect(entryPoints[0]?.specifier).toBe("@jam-overture/loom")
  })
})
