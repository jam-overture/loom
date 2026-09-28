import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { REPOSITORY_ROOT } from "./architecture/source"
import { DOCS_HOME, HOME, LICENSE_NOTICE, OTHER_SURFACES } from "./surfaces"

/**
 * The list of surfaces, held to the application rather than to a memory of it.
 *
 * A footer naming four places is only a way back for as long as those four are
 * the places. The list below is derived from `apps/loom/app/` on every run, so
 * a sixth route group, or a front door that moves, is a failure here instead of
 * a surface this site quietly stopped mentioning.
 */

const appRoot = fileURLToPath(new URL("../..", import.meta.url))

/** The route a directory serves, with the segments Next does not put in a URL removed. */
const routeOf = (segments: readonly string[]): string => {
  const addressed = segments.filter((segment) => !segment.startsWith("("))

  return addressed.length === 0 ? "/" : `/${addressed.join("/")}`
}

/**
 * Every static route a route group serves.
 *
 * Private directories (`_lib`, `_components`) hold no routes, and a dynamic
 * segment is not an address anybody can be sent to, so neither is a candidate
 * for a front door.
 */
const routesUnder = (directory: string, segments: readonly string[] = []): readonly string[] => {
  const entries = readdirSync(directory, { withFileTypes: true })

  const here = entries.some((entry) => entry.isFile() && /^page\.(tsx|mdx)$/.test(entry.name))
    ? [routeOf(segments)]
    : []

  const below = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_") && !entry.name.startsWith("["))
    .flatMap((entry) => routesUnder(join(directory, entry.name), [...segments, entry.name]))

  return [...here, ...below]
}

/** A group's front door is its shortest address. */
const frontDoorOf = (group: string): string =>
  [...routesUnder(join(appRoot, group), [group])].sort(
    (one: string, other: string) => one.length - other.length || one.localeCompare(other)
  )[0] ?? ""

const groups = (): readonly string[] =>
  readdirSync(appRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("("))
    .map((entry) => entry.name)
    .sort()

describe("the other surfaces of this application", () => {
  it("is every route group except this one", () => {
    const doors = groups()
      .filter((group) => group !== "(docs)")
      .map(frontDoorOf)
      .sort()

    expect([...OTHER_SURFACES].map((surface) => surface.path).sort()).toEqual(doors)
  })

  it("knows this surface's own front door, and does not offer it as somewhere else", () => {
    expect(frontDoorOf("(docs)")).toBe(DOCS_HOME)
    expect(OTHER_SURFACES.map((surface) => surface.path)).not.toContain(DOCS_HOME)
  })

  it("offers the front door first, because it is the one a reader came in through", () => {
    expect(OTHER_SURFACES[0]).toBe(HOME)
  })

  /**
   * The rule the module is written under, made checkable. A path with two
   * segments in it is a link into another lane's interior, which is the kind
   * that breaks silently when that lane reorganises.
   */
  it("knows each surface by its front door and nothing deeper", () => {
    const deeper = OTHER_SURFACES.filter(
      (surface) => surface.path !== "/" && surface.path.split("/").length !== 2
    )

    expect(deeper).toEqual([])
  })

  it("says what each one is in words a stranger could act on", () => {
    for (const surface of OTHER_SURFACES) {
      expect(surface.label.length, surface.path).toBeGreaterThan(0)
      expect(surface.blurb.split(" ").length, surface.path).toBeGreaterThan(4)
    }
  })
})

/**
 * The one sentence in the chrome that is a claim about a file.
 *
 * "Loom is open source under the MIT license" is the answer a reader comes to a
 * footer for, and it is the only thing this site says that a reader could act on
 * without reading a page. It was true on the day it was written — the licence
 * was chosen on 26 September — and nothing on this surface could have noticed if
 * the file it describes were replaced tomorrow.
 */
describe("the licence the footer names", () => {
  it("is the licence the repository carries", () => {
    const licence = readFileSync(join(REPOSITORY_ROOT, "LICENSE"), "utf8")

    expect(licence).toContain("MIT License")
    expect(LICENSE_NOTICE).toContain("MIT license")
  })
})
