import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  describePublicationFault,
  inventedSubpaths,
  packExclusions,
  parseManifest,
  publicationFaults,
  publishedExports,
  publishedTargets,
  withheldSubpaths,
} from "./manifest.js"

const ROOT = process.cwd()

const manifestOf = (source: unknown) => {
  const parsed = parseManifest(source)
  if (!parsed.ok) throw new Error(parsed.error)

  return parsed.value
}

const base = {
  name: "@loom/runtime",
  version: "0.1.0",
  license: "MIT",
  repository: { url: "git+https://github.com/jam-overture/loom.git" },
  files: ["dist", "!dist/primitives"],
  exports: { ".": "./dist/index.js", "./primitives": "./dist/primitives/index.js" },
  publishConfig: { access: "public", exports: { ".": "./dist/index.js" } },
}

describe("the two manifests either side of publishConfig", () => {
  it("publishes the repository's own exports when publishConfig does not override them", () => {
    const manifest = manifestOf({ ...base, publishConfig: { access: "public" } })

    expect(Object.keys(publishedExports(manifest))).toEqual([".", "./primitives"])
    expect(withheldSubpaths(manifest)).toEqual([])
  })

  it("names what the repository resolves and the registry will not", () => {
    expect(withheldSubpaths(manifestOf(base))).toEqual(["./primitives"])
  })

  /**
   * The drift this whole file exists for. A run adds `./marketplace` to
   * `exports`, the workspace resolves it, every test passes, and the published
   * package does not have it — discovered by a consumer, on a version that
   * cannot be edited.
   */
  it("catches a subpath added to the repository and forgotten in publishConfig", () => {
    const manifest = manifestOf({
      ...base,
      exports: { ...base.exports, "./marketplace": "./dist/marketplace/index.js" },
    })

    expect(withheldSubpaths(manifest)).toEqual(["./primitives", "./marketplace"])
  })

  it("catches a subpath invented in publishConfig that nothing in the workspace resolves", () => {
    const manifest = manifestOf({
      ...base,
      publishConfig: { exports: { ".": "./dist/index.js", "./ghost": "./dist/ghost.js" } },
    })

    expect(inventedSubpaths(manifest)).toEqual(["./ghost"])
    expect(publicationFaults(manifest).map((fault) => fault.code)).toContain("invented-subpath")
  })

  it("reads the negations out of files, which is the only thing that keeps a directory back", () => {
    expect(packExclusions(manifestOf(base))).toEqual(["dist/primitives"])
  })

  it("flattens a conditional export to the files it names", () => {
    const manifest = manifestOf({
      ...base,
      exports: { ".": { types: "./dist/index.d.ts", default: "./dist/index.js" } },
      publishConfig: { exports: { ".": { types: "./dist/index.d.ts", default: "./dist/index.js" } } },
    })

    expect(publishedTargets(manifest)).toEqual(["dist/index.d.ts", "dist/index.js"])
  })
})

describe("what would be wrong with publishing", () => {
  it("has nothing to say about a manifest that is ready", () => {
    expect(publicationFaults(manifestOf(base))).toEqual([])
  })

  it("refuses a draft, an unlicensed package and one with nowhere to send a reader", () => {
    const manifest = manifestOf({
      name: "x",
      version: "0.0.1",
      private: true,
      exports: { ".": "./dist/index.js" },
    })

    expect(publicationFaults(manifest).map((fault) => fault.code)).toEqual([
      "still-private",
      "no-license",
      "no-repository",
    ])
  })

  /**
   * The two opposite failures at the seam, and neither is visible from inside
   * the repository, where both manifests happen to tell the truth.
   */
  it("catches code that ships with no way to import it", () => {
    const manifest = manifestOf({ ...base, files: ["dist"] })
    const faults = publicationFaults(manifest)

    expect(faults.map((fault) => fault.code)).toEqual(["withheld-but-packed"])
    expect(describePublicationFault(faults[0] as never)).toContain("dist/primitives/index.js")
  })

  it("catches a published subpath whose file the tarball leaves out", () => {
    const manifest = manifestOf({
      ...base,
      files: ["dist", "!dist/primitives", "!dist/index.js"],
    })

    expect(publicationFaults(manifest).map((fault) => fault.code)).toContain("published-but-excluded")
  })
})

/**
 * The repository's own manifest, held against the same rules. `pnpm verify`
 * builds before it tests, so `dist` is on disk by the time this runs — the
 * existence half is the one that would catch a subpath pointing at a file the
 * build stopped emitting.
 */
describe("this package, as it would go out", () => {
  const manifest = manifestOf(JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")))

  it("is ready to publish", () => {
    expect(publicationFaults(manifest).map(describePublicationFault)).toEqual([])
  })

  it("withholds the starter library and nothing else", () => {
    expect(withheldSubpaths(manifest)).toEqual(["./primitives"])
  })

  it("names a file that exists for every subpath a consumer will get", () => {
    const missing = publishedTargets(manifest).filter((target) => !existsSync(join(ROOT, target)))

    expect(missing).toEqual([])
  })

  it("still resolves the starter library inside this workspace, which five surfaces need", () => {
    expect(manifest.exports["./primitives"]).toBeDefined()
    expect(existsSync(join(ROOT, "dist", "primitives", "index.js"))).toBe(true)
  })

  it("ships a binary whose file the tarball carries", () => {
    const binary = Object.values(manifest.bin ?? {})[0]

    expect(binary).toBeDefined()
    expect(existsSync(join(ROOT, (binary as string).replace(/^\.\//, "")))).toBe(true)
  })
})
