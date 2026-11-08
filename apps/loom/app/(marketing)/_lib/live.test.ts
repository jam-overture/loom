import type { LoomTree } from "@jam-overture/loom"
import { NO_LIVE_PAGES, type LivePullLoop, type StartPullingOptions } from "@jam-overture/loom/live"
import { describe, expect, it, vi } from "vitest"

import { HEADLINE } from "./copy"
import { liveTreeOf, pullDeploymentOf, pullsByKey, type SiteLive } from "./live"
import { pageTreeFor, servedTreeFor, treeFor } from "./render"
import { DEFAULT_THEME, HOME, SITE_ROUTES, SITE_THEME_NAMES } from "./site"
import { sitePageTrees } from "./stored"

const ORIGIN = "https://www.loomjs.org"
const KEY = `lk_${"0a".repeat(16)}`
const PRODUCTION = { VERCEL_ENV: "production", LOOM_SITE_ORIGIN: ORIGIN }

/** A loop that has already pulled, holding exactly these pages. */
const holding = (pages: readonly LoomTree[]): LivePullLoop => {
  const held = { ...NO_LIVE_PAGES, pages: new Map(pages.map((page) => [page.treeId, page])) }

  return {
    ready: () => Promise.resolve(held),
    held: () => held,
    pullNow: () => Promise.resolve({ kind: "unchanged" }),
    stop: () => undefined,
  }
}

const liveWith = (pages: readonly LoomTree[], given: Partial<SiteLive> = {}): SiteLive => ({
  env: PRODUCTION,
  keyOf: () => Promise.resolve(KEY),
  pullFor: () => holding(pages),
  ...given,
})

const built = treeFor(HOME, { theme: DEFAULT_THEME })

/** The home page with its headline changed, as an accepted change would leave it. */
const accepted: LoomTree = JSON.parse(
  JSON.stringify(built).replace(HEADLINE, "A headline somebody accepted")
) as LoomTree

describe("where the site pulls its live pages from", () => {
  it("is its own pinned domain, on the public deployment", () => {
    expect(pullDeploymentOf(PRODUCTION)).toBe(ORIGIN)
  })

  it("is nowhere on a preview, which serves what its code builds", () => {
    expect(pullDeploymentOf({ ...PRODUCTION, VERCEL_ENV: "preview" })).toBeUndefined()
  })

  it("is nowhere without a pinned domain, rather than a guess at one", () => {
    expect(pullDeploymentOf({ VERCEL_ENV: "production", VERCEL_URL: "x.vercel.app" })).toBe(
      undefined
    )
    expect(pullDeploymentOf({ ...PRODUCTION, LOOM_SITE_ORIGIN: "loomjs.org" })).toBeUndefined()
  })
})

describe("the page a reader is served", () => {
  it("is the live version when Loom has one", async () => {
    expect(await liveTreeOf(built, liveWith([accepted]))).toBe(accepted)
  })

  it("is the page as built when Loom has no version of it", async () => {
    expect(await liveTreeOf(built, liveWith([]))).toBe(built)
  })

  it("is the page as built on a deployment that does not pull, which asks for no key", async () => {
    const keyOf = vi.fn(() => Promise.resolve(KEY))
    const live = liveWith([accepted], { env: { VERCEL_ENV: "preview" }, keyOf })

    expect(await liveTreeOf(built, live)).toBe(built)
    expect(keyOf).not.toHaveBeenCalled()
  })

  it("is the page as built when the site has no key, and nothing pulls", async () => {
    const pullFor = vi.fn(() => holding([accepted]))
    const live = liveWith([accepted], { keyOf: () => Promise.resolve(null), pullFor })

    expect(await liveTreeOf(built, live)).toBe(built)
    expect(pullFor).not.toHaveBeenCalled()
  })

  it("carries an accepted change in whichever palette the reader asked for", async () => {
    for (const theme of SITE_THEME_NAMES) {
      const served = await servedTreeFor(HOME, { theme }, liveWith([accepted]))

      expect(JSON.stringify(served)).toContain("A headline somebody accepted")
      expect(served.root.props).toEqual(pageTreeFor(HOME, { theme }).root.props)
    }
  })

  /**
   * What makes the swap sound: the build publishes each page once, in one
   * palette, and a reader asks in any. A live page that is exactly what the
   * build published must be served exactly as the built page would have been.
   */
  it("is the built page in every palette when the live page is what was published", async () => {
    const published = liveWith(sitePageTrees())

    for (const route of SITE_ROUTES) {
      for (const theme of SITE_THEME_NAMES) {
        expect(await servedTreeFor(route, { theme }, published)).toEqual(
          pageTreeFor(route, { theme })
        )
      }
    }
  })
})

describe("the pull a process runs", () => {
  const starting = () => {
    const stops: string[] = []
    const start = vi.fn(
      (options: StartPullingOptions): LivePullLoop => ({
        ...holding([]),
        stop: () => stops.push(options.key),
      })
    )

    return { start, stops, pullFor: pullsByKey(start) }
  }

  it("is one loop for as long as the key is the same", () => {
    const { start, pullFor } = starting()

    expect(pullFor(ORIGIN, KEY)).toBe(pullFor(ORIGIN, KEY))
    expect(start).toHaveBeenCalledTimes(1)
  })

  it("starts again with a replaced key, and stops the loop using the old one", () => {
    const { start, stops, pullFor } = starting()
    const replaced = `lk_${"0b".repeat(16)}`

    pullFor(ORIGIN, KEY)
    pullFor(ORIGIN, replaced)

    expect(start).toHaveBeenCalledTimes(2)
    expect(start.mock.calls[1]?.[0]).toMatchObject({ deployment: ORIGIN, key: replaced })
    expect(stops).toEqual([KEY])
  })
})
