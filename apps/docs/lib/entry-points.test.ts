import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { entryPoints } from "./entry-points"

/**
 * The documented doors, against the doors that exist.
 *
 * §4c settles that the API reference is generated rather than written, for
 * exactly the reason this test exists: a hand-maintained list of what a package
 * publishes is wrong within a week of anyone adding an export. Until the
 * generated reference lands, this is the cheapest version of the same
 * guarantee — the *summaries* are written, the *set* is not allowed to drift.
 */

const runtimeManifest = (): { readonly exports: Record<string, unknown> } => {
  const path = fileURLToPath(new URL("../../../package.json", import.meta.url))

  return JSON.parse(readFileSync(path, "utf8")) as { readonly exports: Record<string, unknown> }
}

const published = (): readonly string[] =>
  Object.keys(runtimeManifest().exports)
    .map((subpath) => (subpath === "." ? "@loom/runtime" : `@loom/runtime${subpath.slice(1)}`))
    .sort()

describe("the documented entry points", () => {
  it("names exactly what the runtime publishes", () => {
    expect([...entryPoints.map((entry) => entry.specifier)].sort()).toEqual([...published()])
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
    expect(entryPoints[0]?.specifier).toBe("@loom/runtime")
  })
})
