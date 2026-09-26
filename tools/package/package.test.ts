import { readFile } from "node:fs/promises"

import { describe, expect, it } from "vitest"

import { rewrite, licenseIdOf, withoutMapComment } from "./build.js"
import { describeError, describeReadiness } from "./report.js"
import { ENTRY_POINTS, manifest, publishedSpecifier, runtimeTarget, RUNTIME_RANGE, VERSION } from "./manifest.js"

/**
 * What has to be true for `@loom/primitives` to resolve in somebody else's
 * `node_modules`, held here because none of it is visible from inside this
 * repository.
 *
 * Every import in `src/primitives/**` resolves during development, during the
 * build, in every test in `library.test.ts` and in every specimen — by relative
 * path, inside one compiled tree. The published package is the **only** place
 * those specifiers have to be something else, and the failure mode is a host
 * running `npm install` and getting a package whose every module imports a file
 * that is not there.
 *
 * So these are the assertions that stand in for an install. The end-to-end
 * proof is a real one — pack both packages, install them into an empty project,
 * import the registry and render a page — and it is in the report rather than
 * here, because it needs a network and two tarballs and this suite needs
 * neither.
 */

describe("where a specifier points once it is published", () => {
  /**
   * The two directions, on the two shapes of file the library actually has: a
   * primitive at the top of `dist/primitives`, and a band one level down in
   * `compositions/`. The second is the one a naive rewrite gets wrong —
   * `../../tree/builders.js` and `../tree/builders.js` are the same module, and
   * a rule written against only the first would leave 44 bands importing a
   * directory above the package root.
   */
  it("resolves a primitive's and a band's view of the same module to one place", () => {
    expect(runtimeTarget("", "../tree/builders.js")).toBe("tree/builders.js")
    expect(runtimeTarget("compositions", "../../tree/builders.js")).toBe("tree/builders.js")
    expect(publishedSpecifier("", "../tree/builders.js")).toBe("@loom/runtime")
    expect(publishedSpecifier("compositions", "../../tree/builders.js")).toBe("@loom/runtime")
  })

  /**
   * The library talking to itself, which is several hundred specifiers and every
   * one of them has to survive untouched. `tokens.js` is the one every primitive
   * imports: a rewrite that caught it would break the whole library while
   * leaving the outward-facing assertions above green.
   */
  it("leaves the library's own imports exactly as they were", () => {
    expect(runtimeTarget("", "./tokens.js")).toBeUndefined()
    expect(runtimeTarget("compositions", "./composition.js")).toBeUndefined()
    expect(runtimeTarget("compositions", "../loom.hero.js")).toBeUndefined()
    expect(publishedSpecifier("", "./stylesheet.js")).toBe("./stylesheet.js")
    expect(publishedSpecifier("compositions", "../loom.hero.js")).toBe("../loom.hero.js")
  })

  it("leaves a package specifier alone", () => {
    expect(runtimeTarget("", "react")).toBeUndefined()
    expect(publishedSpecifier("", "zod")).toBe("zod")
  })

  /** The two subpaths, which are the only reason this is a map and not a constant. */
  it("sends the two subpath modules to their own doors", () => {
    expect(publishedSpecifier("", "../sdk/definition.js")).toBe("@loom/runtime/sdk")
    expect(publishedSpecifier("", "../sdk/registry.js")).toBe("@loom/runtime/sdk")
    expect(publishedSpecifier("", "../render/primitive.js")).toBe("@loom/runtime/react")
    expect(publishedSpecifier("", "../render/text.js")).toBe("@loom/runtime/react")
  })

  /**
   * **The assertion this file exists for.** The map above is a claim about the
   * runtime's published surface, and a claim about someone else's package goes
   * stale the moment they change it. This holds it against the runtime's own
   * `exports` field: every entry point this tool will emit has to be a door the
   * runtime actually opens.
   */
  it("names only entry points the runtime publishes", async () => {
    const root: { exports?: Record<string, unknown> } = JSON.parse(
      await readFile(new URL("../../package.json", import.meta.url), "utf8")
    )
    const published = Object.keys(root.exports ?? {})

    for (const { specifier } of ENTRY_POINTS) {
      const subpath = specifier === "@loom/runtime" ? "." : `.${specifier.slice("@loom/runtime".length)}`

      expect(published, `the runtime does not export ${subpath}`).toContain(subpath)
    }
  })
})

describe("what the rewrite does to a file", () => {
  it("rewrites the three forms tsc emits and nothing else", () => {
    const source = [
      `import { definePrimitive } from "../sdk/definition.js";`,
      `import "./stylesheet.js";`,
      `export declare const x: import("../tree/node.js").ElementNode;`,
      `const copy = "install ../sdk/definition.js from the docs";`,
    ].join("\n")

    const out = rewrite("", source)

    expect(out).toContain(`from "@loom/runtime/sdk"`)
    expect(out).toContain(`import "./stylesheet.js"`)
    expect(out).toContain(`import("@loom/runtime")`)
    /**
     * The fourth line is the one that matters. `code-band.ts` ships the literal
     * text `@loom/runtime` inside a marketing band, and several primitives hold
     * paths in their copy — a blunter rewrite would edit the library's
     * *content* while every other assertion here stayed green.
     */
    expect(out).toContain(`"install ../sdk/definition.js from the docs"`)
  })

  it("takes the map comment away with the map", () => {
    expect(withoutMapComment(`export const x = 1;\n//# sourceMappingURL=x.js.map`)).toBe("export const x = 1;\n")
    expect(withoutMapComment(`export const x = 1;\n`)).toBe("export const x = 1;\n")
  })
})

describe("what the manifest promises", () => {
  it("keeps the runtime a peer and pins it to the version they ship together at", () => {
    const built: Record<string, unknown> = manifest("MIT")
    const peers = built["peerDependencies"] as Record<string, string>

    expect(built["version"]).toBe(VERSION)
    expect(peers["@loom/runtime"]).toBe(RUNTIME_RANGE)
    expect(RUNTIME_RANGE).toContain(VERSION)
    /**
     * A dependency rather than a peer would put a second runtime in a host's
     * tree, which is two `PrimitiveType` brands and a registry that refuses its
     * own entries. Asserted because it is one word's difference in a generated
     * file nobody reads.
     */
    expect(built["dependencies"]).not.toHaveProperty("@loom/runtime")
    expect(built["dependencies"]).not.toHaveProperty("react")
  })

  it("publishes publicly, which a scoped package does not do by default", () => {
    expect(manifest("MIT")["publishConfig"]).toEqual({ access: "public" })
  })

  /**
   * The license is read from the repository rather than decided here, so the
   * manifest has to carry whatever the file says — including the honest answer
   * when it says something this cannot reduce to an identifier.
   */
  it("says what the LICENSE says", () => {
    expect(licenseIdOf("MIT\n\nCopyright (c) 2026")).toBe("MIT")
    expect(licenseIdOf("Apache-2.0")).toBe("Apache-2.0")
    expect(licenseIdOf("All rights reserved. Contact us.")).toBe("SEE LICENSE IN LICENSE")
    expect(manifest("MIT")["license"]).toBe("MIT")
  })

  /** Only what is built, plus the two files a reader opens first. */
  it("ships the build and the two documents, and nothing else", () => {
    expect(manifest("MIT")["files"]).toEqual(["dist", "README.md", "LICENSE"])
  })
})

/**
 * What the command says when it is not ready, which is the part of this tool a
 * person actually reads.
 *
 * A readiness line that names a missing thing and not who can supply it is a
 * line somebody clears by deleting it, so the two that matter are asserted: the
 * license is called BLOCKED and attributed, and the runtime's ordering is
 * stated as a consequence rather than as a preference.
 */
describe("what the command tells whoever runs it", () => {
  it("calls the license blocked, and says whose decision it is", () => {
    const lines = describeReadiness({ files: 620, rewritten: 310, license: false }).join("\n")

    expect(lines).toContain("BLOCKED")
    expect(lines).toContain("maintainer")
    expect(lines).not.toContain("  ready     license")
  })

  it("stops calling it blocked once there is one", () => {
    const lines = describeReadiness({ files: 620, rewritten: 310, license: true }).join("\n")

    expect(lines).not.toContain("BLOCKED")
    expect(lines).toContain("ready     license")
  })

  /**
   * The three nobody in this repository can clear are listed whether or not the
   * license is there, because they are the reason "ready" is a table rather
   * than a boolean.
   */
  it("always names the three that are not this repository's to satisfy", () => {
    for (const license of [true, false]) {
      const lines = describeReadiness({ files: 1, rewritten: 1, license }).join("\n")

      expect(lines).toContain("npm auth")
      expect(lines).toContain("@loom scope")
      expect(lines).toContain("published first")
    }
  })

  it("names the command that makes a build when there is none", () => {
    expect(describeError({ code: "no-build" })).toContain("pnpm build")
  })

  /**
   * An unmapped specifier is the one failure that would ship a broken package,
   * so the message names every one rather than the first.
   */
  it("names every specifier it could not map", () => {
    const described = describeError({ code: "unmapped", specifiers: ["a.js: ../../x.js", "b.js: ../../y.js"] })

    expect(described).toContain("../../x.js")
    expect(described).toContain("../../y.js")
  })
})
