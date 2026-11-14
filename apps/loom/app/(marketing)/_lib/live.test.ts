import {
  buildElement,
  buildText,
  sequentialIdFactory,
  type LoomTree,
  type TreeDelta,
} from "@jam-overture/loom"
import {
  NO_LIVE_PAGES,
  type AudienceForm,
  type LivePages,
  type LivePullLoop,
  type StartPullingOptions,
} from "@jam-overture/loom/live"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { audienceIdSchema, type AudienceRule } from "@jam-overture/loom/store"

import { HEADLINE } from "./copy"
import { pullDeploymentOf, pullsByKey, servedPageOf, type SiteLive } from "./live"
import { readerContextFrom } from "./readers/context"
import { pageTreeFor, renderSitePage, servedPageFor, treeFor } from "./render"
import { DEFAULT_THEME, HOME, SITE_ROUTES, SITE_THEME_NAMES } from "./site"
import { sitePageTrees } from "./stored"

const ORIGIN = "https://www.loomjs.org"
const KEY = `lk_${"0a".repeat(16)}`
const PRODUCTION = { VERCEL_ENV: "production", LOOM_SITE_ORIGIN: ORIGIN }

/** A loop that has already pulled, holding exactly these pages and this overlay. */
const holding = (pages: readonly LoomTree[], over: Partial<LivePages> = {}): LivePullLoop => {
  const held = {
    ...NO_LIVE_PAGES,
    pages: new Map(pages.map((page) => [page.treeId, page])),
    ...over,
  }

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

/** The context a reader of this site arrives with, built the way the server builds it. */
const reader = (headers: Record<string, string> = {}) =>
  readerContextFrom(new Headers(headers), DEFAULT_THEME)

const ANY_READER = reader()

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
    expect((await servedPageOf(built, ANY_READER, liveWith([accepted]))).tree).toBe(accepted)
  })

  it("is the page as built when Loom has no version of it", async () => {
    expect((await servedPageOf(built, ANY_READER, liveWith([]))).tree).toBe(built)
  })

  it("is the page as built on a deployment that does not pull, which asks for no key", async () => {
    const keyOf = vi.fn(() => Promise.resolve(KEY))
    const live = liveWith([accepted], { env: { VERCEL_ENV: "preview" }, keyOf })

    expect((await servedPageOf(built, ANY_READER, live)).tree).toBe(built)
    expect(keyOf).not.toHaveBeenCalled()
  })

  it("is the page as built when the site has no key, and nothing pulls", async () => {
    const pullFor = vi.fn(() => holding([accepted]))
    const live = liveWith([accepted], { keyOf: () => Promise.resolve(null), pullFor })

    expect((await servedPageOf(built, ANY_READER, live)).tree).toBe(built)
    expect(pullFor).not.toHaveBeenCalled()
  })

  it("carries an accepted change in whichever palette the reader asked for", async () => {
    for (const theme of SITE_THEME_NAMES) {
      const { tree: served } = await servedPageFor(HOME, { theme }, liveWith([accepted]))

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
        expect((await servedPageFor(route, { theme }, published)).tree).toEqual(
          pageTreeFor(route, { theme })
        )
      }
    }
  })
})

/**
 * `audienceIdSchema` is the control plane's, and a test may reach for it where
 * the server may not: what is being stood in for here is **the portal**, which
 * is where a segment's id is minted and its rule authored. `live.ts` itself
 * imports `@jam-overture/loom/live` and `@jam-overture/loom/react` and nothing
 * else, which is the property `src/live/index.ts` asks for and
 * `ServedSitePage`'s own field type keeps.
 */
const segment = (word: string) => audienceIdSchema.parse(`aud_${word}`)

const PHONES = segment("phones")

/** A rule the portal would have written: readers whose browser said it is a phone. */
const phoneRule: AudienceRule = {
  audienceId: PHONES,
  clauses: [{ key: "device", anyOf: ["phone"] }],
}

const spare = sequentialIdFactory("form")

/** A form over the front door: one banner, at the top. */
const bannerForm = (page: LoomTree, baseRevision = page.revision): AudienceForm => ({
  audienceId: PHONES,
  delta: {
    deltaId: spare.deltaId(),
    treeId: page.treeId,
    baseRevision,
    operations: [
      {
        op: "insert",
        parentId: page.root.id,
        index: 0,
        node: buildElement(spare, {
          type: "loom.banner",
          children: [buildText(spare, "Read on a phone")],
        }),
      },
    ],
  } satisfies TreeDelta,
})

const serving = (forms: readonly AudienceForm[], page: LoomTree = built): SiteLive =>
  liveWith([page], {
    pullFor: () =>
      holding([page], {
        rules: new Map([[page.treeId, [phoneRule]]]),
        forms: new Map([[page.treeId, forms]]),
      }),
  })

const PHONE = reader({ "sec-ch-ua-mobile": "?1" })
const DESKTOP = reader({ "sec-ch-ua-mobile": "?0" })

/**
 * The half this site could not do until today. Every reader of loomjs.org was
 * served the base because nothing composed; `pageForReader` composes, so these
 * are the first cases on this surface about one reader getting a different page
 * from another.
 */
describe("the form a reader's segment earns", () => {
  it("is applied for a reader the project's rules sort into that segment", async () => {
    const served = await servedPageOf(built, PHONE, serving([bannerForm(built)]))

    expect(JSON.stringify(served.tree)).toContain("Read on a phone")
    expect(served.audience).toBe(PHONES)
  })

  it("is not applied for a reader no rule matches, who gets the base under no segment", async () => {
    const served = await servedPageOf(built, DESKTOP, serving([bannerForm(built)]))

    expect(JSON.stringify(served.tree)).not.toContain("Read on a phone")
    expect(served.audience).toBeUndefined()
  })

  /**
   * The key the browser did not send is the case `readers/context.ts` is about,
   * seen from the render path: a reader on Safari has no `device`, so the rule
   * does not match and they are served the base. Nothing infers a phone for
   * them, and that is the trade this lane took deliberately.
   */
  it("is not applied for a reader whose browser said nothing about its device", async () => {
    const served = await servedPageOf(built, ANY_READER, serving([bannerForm(built)]))

    expect(JSON.stringify(served.tree)).not.toContain("Read on a phone")
    expect(served.audience).toBeUndefined()
  })

  /**
   * **A form that cannot be applied costs the reader their segment, not their
   * page.** The page is still served, and it is served under no segment rather
   * than under a name it does not match — which is what keeps the portal's
   * comparison between two segments a comparison of forms readers were served.
   */
  it("costs the reader their segment and not their page when it cannot be applied", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const stale = serving([bannerForm(built, built.revision + 9)])

    try {
      const served = await servedPageOf(built, PHONE, stale)

      expect(served.tree).toBe(built)
      expect(served.audience).toBeUndefined()
      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn.mock.calls[0]?.[0]).toContain("segment was dropped")
    } finally {
      warn.mockRestore()
    }
  })

  it("says nothing in the log on a request the deployment intends", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)

    try {
      await servedPageOf(built, PHONE, serving([bannerForm(built)]))
      await servedPageOf(built, DESKTOP, serving([bannerForm(built)]))

      expect(warn).not.toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })

  /**
   * **The whole path, end to end, with nothing mocked.** Every case above hands
   * `servedPageOf` a context directly; this one goes in at the top, through
   * `servedPageFor`, which reads the context itself — so what it proves is the
   * wiring this run added rather than the framework call underneath it.
   *
   * It is keyed on the palette because the palette is the one key this server
   * knows **without a request** (`readers/context.ts` says why it is always
   * set), which makes the whole route testable without faking `next/headers` —
   * the fake `serving.ts` records as having been flaky, and the reason
   * `headersOrNone` answers the no-request case itself.
   *
   * And it proves the layering: the form is applied inside `servedPageOf` and
   * the palette goes on after it, so a reader asking for `bold` gets the
   * segment's form *and* the palette they asked for, rather than one at the
   * cost of the other.
   */
  it("is applied, and the palette still goes on after it, for a rule this server can match", async () => {
    const readers = segment("bold")
    const page = treeFor(HOME, { theme: "bold" })
    const form: AudienceForm = { ...bannerForm(page), audienceId: readers }
    const live = liveWith([page], {
      pullFor: () =>
        holding([page], {
          rules: new Map([
            [page.treeId, [{ audienceId: readers, clauses: [{ key: "palette", anyOf: ["bold"] }] }]],
          ]),
          forms: new Map([[page.treeId, [form]]]),
        }),
    })

    const served = await servedPageFor(HOME, { theme: "bold" }, live)

    expect(served.audience).toBe(readers)
    expect(JSON.stringify(served.tree)).toContain("Read on a phone")
    expect(served.tree.root.props).toEqual(pageTreeFor(HOME, { theme: "bold" }).root.props)
  })

  /**
   * **What a segment does to the markup, which on this deployment is nothing
   * until it counts.** `RenderOptions.audience` is written *"on the root of an
   * addressed page so its reader signals are filed under that segment (0284),
   * and nowhere else: it changes no node and no prop"* — so the coupling is to
   * `addressed`, and `addressed` is this deployment's answer to whether it
   * counts anybody at all.
   *
   * That is the right way round and is worth pinning rather than assuming: a
   * segment's name is only of use to a signal, so a deployment with nowhere to
   * post one should not be spending bytes saying which segment a reader was in.
   * The two cases below are the same render asked for twice, and what separates
   * them is only whether this deployment counts.
   */
  it("writes nothing on the markup of a deployment that counts nobody", async () => {
    const live = serving([bannerForm(built)])
    const quiet = { addressed: false } as const

    const named = renderToStaticMarkup(
      (await renderSitePage(HOME, { theme: DEFAULT_THEME }, { ...quiet, audience: PHONES }, live))
        .element
    )
    const unnamed = renderToStaticMarkup(
      (await renderSitePage(HOME, { theme: DEFAULT_THEME }, quiet, live)).element
    )

    expect(named).toBe(unnamed)
    expect(named).not.toContain(PHONES)
  })

  it("names the segment on the markup of a deployment that counts", async () => {
    const live = serving([bannerForm(built)])
    const counting = { addressed: true } as const

    const named = renderToStaticMarkup(
      (
        await renderSitePage(
          HOME,
          { theme: DEFAULT_THEME },
          { ...counting, audience: PHONES },
          live
        )
      ).element
    )

    expect(named).toContain(PHONES)

    const unnamed = renderToStaticMarkup(
      (await renderSitePage(HOME, { theme: DEFAULT_THEME }, counting, live)).element
    )

    expect(unnamed).not.toContain(PHONES)
  })

  it("is not applied to a reader who asked for another palette", async () => {
    const readers = segment("bold")
    const page = treeFor(HOME, { theme: "minimal" })
    const live = liveWith([page], {
      pullFor: () =>
        holding([page], {
          rules: new Map([
            [page.treeId, [{ audienceId: readers, clauses: [{ key: "palette", anyOf: ["bold"] }] }]],
          ]),
          forms: new Map([[page.treeId, [{ ...bannerForm(page), audienceId: readers }]]]),
        }),
    })

    const served = await servedPageFor(HOME, { theme: "minimal" }, live)

    expect(served.audience).toBeUndefined()
    expect(JSON.stringify(served.tree)).not.toContain("Read on a phone")
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
