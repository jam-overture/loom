import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  appRouteKeys,
  describeMetadataError,
  describeUnserved,
  metadataSources,
  servedRoutePattern,
  unservedMetadata,
} from "./metadata.js"

/**
 * The keys `next build` wrote for this application on 25 September, quoted
 * rather than reconstructed.
 *
 * They are the reason this compares spellings rather than modelling URLs: the
 * route group is in the key, the sitemap's extension is not the file's, and the
 * generated image carries a hash nothing in the source knows about.
 */
const BUILT = [
  "/(demo)/demo/opengraph-image-4n72ri/route",
  "/(demo)/demo/page",
  "/(marketing)/page",
  "/(marketing)/sitemap.xml/route",
  "/robots.txt/route",
]

const withTempRoot = async (run: (root: string) => Promise<void>): Promise<void> => {
  const root = await mkdtemp(join(tmpdir(), "loom-metadata-"))

  try {
    await run(root)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

const write = async (root: string, path: string): Promise<void> => {
  const at = join(root, path)
  const dir = at.slice(0, at.lastIndexOf("/"))

  await mkdir(dir, { recursive: true })
  await writeFile(at, "export default () => []", "utf8")
}

describe("metadataSources", () => {
  it("reads every convention in the tree and says where each should answer", async () => {
    await withTempRoot(async (root) => {
      await write(root, "robots.ts")
      await write(root, "(marketing)/sitemap.ts")
      await write(root, "(demo)/demo/opengraph-image.tsx")

      const sources = await metadataSources(root)

      expect(
        sources.map((source) => [source.file, source.segment, source.servedAs])
      ).toEqual([
        ["(demo)/demo/opengraph-image.tsx", "(demo)/demo/", "opengraph-image"],
        ["(marketing)/sitemap.ts", "(marketing)/", "sitemap.xml"],
        ["robots.ts", "", "robots.txt"],
      ])
    })
  })

  it("leaves a test beside a convention alone, because its stem is not one", async () => {
    await withTempRoot(async (root) => {
      await write(root, "(marketing)/sitemap.ts")
      await write(root, "(marketing)/sitemap.test.ts")

      expect((await metadataSources(root)).map((source) => source.file)).toEqual([
        "(marketing)/sitemap.ts",
      ])
    })
  })

  it("does not look inside a folder Next does not route from", async () => {
    await withTempRoot(async (root) => {
      await write(root, "(docs)/_components/icon.tsx")
      await write(root, "(docs)/_lib/manifest.ts")

      expect(await metadataSources(root)).toEqual([])
    })
  })

  it("reads a numbered variant as the convention it is a variant of", async () => {
    await withTempRoot(async (root) => {
      await write(root, "(marketing)/icon1.tsx")

      const [source] = await metadataSources(root)

      expect(source?.convention).toBe("icon")
      expect(source?.servedAs).toBe("icon1")
    })
  })

  it("ignores a name that merely contains a convention, and a non-module beside one", async () => {
    await withTempRoot(async (root) => {
      await write(root, "(marketing)/sitemap-notes.ts")
      await write(root, "(marketing)/robots.md")

      expect(await metadataSources(root)).toEqual([])
    })
  })
})

describe("servedRoutePattern", () => {
  it("matches the key the build wrote for each of the three shapes", async () => {
    await withTempRoot(async (root) => {
      await write(root, "robots.ts")
      await write(root, "(marketing)/sitemap.ts")
      await write(root, "(demo)/demo/opengraph-image.tsx")

      const matched = (await metadataSources(root)).map(
        (source) => BUILT.find((route) => servedRoutePattern(source).test(route)) ?? null
      )

      expect(matched).toEqual([
        "/(demo)/demo/opengraph-image-4n72ri/route",
        "/(marketing)/sitemap.xml/route",
        "/robots.txt/route",
      ])
    })
  })

  it("does not match the same convention in another segment", async () => {
    await withTempRoot(async (root) => {
      await write(root, "(docs)/sitemap.ts")

      const [source] = await metadataSources(root)

      expect(BUILT.some((route) => servedRoutePattern(source!).test(route))).toBe(false)
    })
  })
})

describe("unservedMetadata", () => {
  /**
   * The file as `Loom marketing` wrote it on 24 September, in the place it was
   * written, against the build that ignored it. This is the finding, and it is
   * the assertion the check exists for.
   */
  it("fails on the robots.ts that was written in a route group", async () => {
    await withTempRoot(async (root) => {
      await write(root, "(marketing)/robots.ts")
      await write(root, "(marketing)/sitemap.ts")

      const unserved = unservedMetadata(await metadataSources(root), BUILT)

      expect(unserved.map((source) => source.file)).toEqual(["(marketing)/robots.ts"])
      expect(describeUnserved(unserved[0]!)).toContain("honoured only at the application root")
      expect(describeUnserved(unserved[0]!)).toContain("app/(marketing)/robots.ts")
    })
  })

  it("passes the same file once it is at the root", async () => {
    await withTempRoot(async (root) => {
      await write(root, "robots.ts")
      await write(root, "(marketing)/sitemap.ts")

      expect(unservedMetadata(await metadataSources(root), BUILT)).toEqual([])
    })
  })

  it("says nothing about the root-only pair for a convention that is not in it", async () => {
    await withTempRoot(async (root) => {
      await write(root, "(docs)/sitemap.ts")

      const [unserved] = unservedMetadata(await metadataSources(root), BUILT)

      expect(describeUnserved(unserved!)).not.toContain("application root")
      expect(describeUnserved(unserved!)).toContain("/(docs)/sitemap.xml")
    })
  })
})

describe("appRouteKeys", () => {
  it("reads the routes the build recorded", async () => {
    await withTempRoot(async (root) => {
      const path = join(root, "app-paths-manifest.json")
      await writeFile(path, JSON.stringify({ "/robots.txt/route": "app/robots.txt/route.js" }))

      const routes = await appRouteKeys(path)

      expect(routes.ok && routes.value).toEqual(["/robots.txt/route"])
    })
  })

  it("fails rather than passing when the build has not run", async () => {
    const routes = await appRouteKeys(join(tmpdir(), "loom-metadata-absent.json"))

    expect(routes.ok).toBe(false)
    expect(!routes.ok && describeMetadataError(routes.error)).toContain(
      "pnpm --filter @loom/app build"
    )
  })
})
