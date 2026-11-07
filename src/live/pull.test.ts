import { describe, expect, it } from "vitest"

import { treeIdSchema } from "../ids.js"
import { sampleTree } from "../testing/fixtures.js"
import type { LoomTree } from "../tree/tree.js"

import { NO_LIVE_PAGES, type LivePages } from "./pages.js"
import {
  describeSitePullFailure,
  LIVE_PAGES_PATH,
  livePagesUrlOf,
  pullLivePages,
  withPullOutcome,
  type PullFetch,
  type SitePullOutcome,
} from "./pull.js"

const DEPLOYMENT = "https://loom.example.com"
const KEY = "lk_0123456789abcdef0123456789abcdef"

const page = sampleTree().tree
const other: LoomTree = { ...sampleTree().tree, treeId: treeIdSchema.parse("t_second") }

type Asked = { url: string; headers: Readonly<Record<string, string>> }

/** A door that answers whatever it is handed, and remembers what it was asked. */
const door = (
  answer: Response | (() => Promise<Response>),
  asked: Asked[] = []
): { fetch: PullFetch; asked: Asked[] } => ({
  asked,
  fetch: (url, init) => {
    asked.push({ url, headers: init.headers })

    return typeof answer === "function" ? answer() : Promise.resolve(answer)
  },
})

const answersPages = (pages: readonly unknown[], headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify({ pages }), {
    status: 200,
    headers: { "content-type": "application/json", ...headers },
  })

const pull = (
  over: Partial<Parameters<typeof pullLivePages>[0]> = {},
  held: LivePages = NO_LIVE_PAGES
): Promise<SitePullOutcome> =>
  pullLivePages({ deployment: DEPLOYMENT, key: KEY, ...over }, held)

describe("the URL a pull asks for", () => {
  it("is the door's path on the configured deployment", () => {
    const url = livePagesUrlOf(DEPLOYMENT)

    expect(url.ok && url.value.toString()).toBe(`${DEPLOYMENT}${LIVE_PAGES_PATH}`)
  })

  it("keeps a deployment served under a path, rather than resolving the path away", () => {
    const url = livePagesUrlOf("https://example.com/loom")

    expect(url.ok && url.value.toString()).toBe(`https://example.com/loom${LIVE_PAGES_PATH}`)
  })

  it("takes a trailing slash off rather than asking for a doubled one", () => {
    const url = livePagesUrlOf("https://loom.example.com///")

    expect(url.ok && url.value.toString()).toBe(`${DEPLOYMENT}${LIVE_PAGES_PATH}`)
  })

  /**
   * The door refuses any query with a `400`, because a pull that could name a
   * reader or an audience would put Loom in the render path. A configured
   * address that carries one must therefore not become a request that does.
   */
  it("carries no query and no fragment, whatever the configuration holds", () => {
    const url = livePagesUrlOf("https://loom.example.com/?audience=aud_vips#live")

    expect(url.ok && url.value.search).toBe("")
    expect(url.ok && url.value.hash).toBe("")
    expect(url.ok && url.value.toString()).toBe(`${DEPLOYMENT}${LIVE_PAGES_PATH}`)
  })

  it("says so when nothing was configured, rather than asking a nowhere", () => {
    expect(livePagesUrlOf("   ")).toEqual({
      ok: false,
      error: {
        reason: "unconfigured",
        detail: "no Loom deployment was configured to pull live pages from",
      },
    })
  })

  it("refuses a deployment that is not a URL, and one that is not over http", () => {
    expect(livePagesUrlOf("loom.example.com").ok).toBe(false)
    expect(livePagesUrlOf("file:///etc").ok).toBe(false)
    expect(livePagesUrlOf("http://localhost:3000").ok).toBe(true)
  })
})

describe("one pull", () => {
  it("sends the project's key as a bearer, and asks for nothing else", async () => {
    const asking = door(answersPages([]))

    await pull({ fetch: asking.fetch })

    const [asked] = asking.asked

    expect(asked?.url).toBe(`${DEPLOYMENT}${LIVE_PAGES_PATH}`)
    expect(asked?.headers.authorization).toBe(`Bearer ${KEY}`)
    expect(asked?.headers["if-none-match"]).toBeUndefined()
  })

  it("names what it holds, so a door with nothing new answers in a few bytes", async () => {
    const asking = door(new Response(null, { status: 304 }))
    const held: LivePages = { ...NO_LIVE_PAGES, tag: '"abc"', pages: new Map([[page.treeId, page]]) }

    expect(await pull({ fetch: asking.fetch }, held)).toEqual({ kind: "unchanged" })
    expect(asking.asked[0]?.headers["if-none-match"]).toBe('"abc"')
  })

  it("reads the pages and the tag the door answered", async () => {
    const asking = door(answersPages([page, other], { etag: '"fresh"' }))

    expect(await pull({ fetch: asking.fetch })).toEqual({
      kind: "fresh",
      pages: [page, other],
      tag: '"fresh"',
    })
  })

  it("is fresh with no pages when the site has published none", async () => {
    const asking = door(answersPages([], { etag: '"empty"' }))

    expect(await pull({ fetch: asking.fetch })).toEqual({ kind: "fresh", pages: [], tag: '"empty"' })
  })

  it("keeps the last pages when one of the answered trees cannot be read", async () => {
    const asking = door(answersPages([page, { treeId: "t_broken" }]))
    const outcome = await pull({ fetch: asking.fetch })

    expect(outcome.kind).toBe("failed")
    expect(outcome.kind === "failed" && outcome.failure.reason).toBe("unreadable")
    expect(outcome.kind === "failed" && outcome.failure.detail).toContain("page 2 of 2")
  })

  it("refuses an answer that names one page twice, which has no single reading", async () => {
    const asking = door(answersPages([page, page]))
    const outcome = await pull({ fetch: asking.fetch })

    expect(outcome.kind === "failed" && outcome.failure.reason).toBe("unreadable")
    expect(outcome.kind === "failed" && outcome.failure.detail).toContain(page.treeId)
  })

  it("refuses an answer that is not the envelope, and one that is not JSON at all", async () => {
    const shaped = await pull({ fetch: door(new Response("{}", { status: 200 })).fetch })
    const garbage = await pull({ fetch: door(new Response("<html>", { status: 200 })).fetch })

    expect(shaped.kind === "failed" && shaped.failure.reason).toBe("unreadable")
    expect(garbage.kind === "failed" && garbage.failure.reason).toBe("unreadable")
  })

  it("calls a rejected key and a closed project refused, with the sentence for a log", async () => {
    const wrongKey = await pull({ fetch: door(new Response("no", { status: 401 })).fetch })
    const closed = await pull({ fetch: door(new Response("no", { status: 403 })).fetch })

    expect(wrongKey.kind === "failed" && wrongKey.failure.reason).toBe("refused")
    expect(wrongKey.kind === "failed" && wrongKey.failure.status).toBe(401)
    expect(closed.kind === "failed" && closed.failure.detail).toContain("closed project")
  })

  it("calls a store that cannot be read, and any other status, unreachable", async () => {
    const unavailable = await pull({ fetch: door(new Response("no", { status: 503 })).fetch })
    const teapot = await pull({ fetch: door(new Response("no", { status: 418 })).fetch })

    expect(unavailable.kind === "failed" && unavailable.failure.reason).toBe("unreachable")
    expect(unavailable.kind === "failed" && unavailable.failure.status).toBe(503)
    expect(teapot.kind === "failed" && teapot.failure.detail).toBe("Loom answered 418")
  })

  it("reports a thrown request rather than throwing it at the server", async () => {
    const outcome = await pull({
      fetch: () => Promise.reject(new Error("getaddrinfo ENOTFOUND")),
    })

    expect(outcome.kind === "failed" && outcome.failure.reason).toBe("unreachable")
    expect(outcome.kind === "failed" && outcome.failure.detail).toContain("ENOTFOUND")
  })

  it("gives up at its ceiling rather than waiting for ever", async () => {
    const outcome = await pull({
      ceilingMs: 5,
      fetch: (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () => reject(new Error("aborted")))
        }),
    })

    expect(outcome.kind === "failed" && outcome.failure.reason).toBe("expired")
    expect(outcome.kind === "failed" && outcome.failure.detail).toBe("no answer in 5ms")
  })

  it("does not ask at all when the deployment or the key is missing", async () => {
    const asking = door(answersPages([]))
    const noKey = await pull({ fetch: asking.fetch, key: "  " })
    const noDoor = await pull({ fetch: asking.fetch, deployment: "" })

    expect(noKey.kind === "failed" && noKey.failure.reason).toBe("unconfigured")
    expect(noDoor.kind === "failed" && noDoor.failure.reason).toBe("unconfigured")
    expect(asking.asked).toEqual([])
  })

  /**
   * Only a door that answers `304` to a request naming no pages can produce
   * this, and recording it as a pull would say the server is current with pages
   * it does not hold.
   */
  it("refuses a `304` for a request that named no pages", async () => {
    const outcome = await pull({ fetch: door(new Response(null, { status: 304 })).fetch })

    expect(outcome.kind === "failed" && outcome.failure.reason).toBe("unreadable")
    expect(outcome.kind === "failed" && outcome.failure.detail).toContain("named no pages")
  })
})

describe("what an outcome does to what is held", () => {
  it("holds fresh pages by their own ids, with the tag that names them", () => {
    const held = withPullOutcome(
      NO_LIVE_PAGES,
      { kind: "fresh", pages: [page, other], tag: '"one"' },
      1_000
    )

    expect([...held.pages.keys()]).toEqual([page.treeId, other.treeId])
    expect(held.tag).toBe('"one"')
    expect(held.pulledAt).toBe(1_000)
    expect(held.freshAt).toBe(1_000)
    expect(held.failures).toBe(0)
  })

  it("drops a page the newest answer no longer names, so it renders as built", () => {
    const both = withPullOutcome(NO_LIVE_PAGES, { kind: "fresh", pages: [page, other], tag: undefined }, 1)
    const one = withPullOutcome(both, { kind: "fresh", pages: [page], tag: undefined }, 2)

    expect([...one.pages.keys()]).toEqual([page.treeId])
  })

  it("moves only the moment of the pull when nothing had changed", () => {
    const fresh = withPullOutcome(NO_LIVE_PAGES, { kind: "fresh", pages: [page], tag: '"one"' }, 1_000)
    const again = withPullOutcome(fresh, { kind: "unchanged" }, 2_000)

    expect(again.pages).toBe(fresh.pages)
    expect(again.tag).toBe('"one"')
    expect(again.freshAt).toBe(1_000)
    expect(again.pulledAt).toBe(2_000)
  })

  /** Clause 4 of the decision behind the pull, as the one line that keeps it. */
  it("keeps every page, and the tag that names them, through a failure", () => {
    const fresh = withPullOutcome(NO_LIVE_PAGES, { kind: "fresh", pages: [page], tag: '"one"' }, 1_000)
    const failed = withPullOutcome(
      fresh,
      { kind: "failed", failure: { reason: "unreachable", detail: "down" } },
      2_000
    )

    expect(failed.pages).toBe(fresh.pages)
    expect(failed.tag).toBe('"one"')
    expect(failed.freshAt).toBe(1_000)
    expect(failed.pulledAt).toBe(1_000)
    expect(failed.failures).toBe(1)
  })

  it("counts failures until the door answers again", () => {
    const failure: SitePullOutcome = {
      kind: "failed",
      failure: { reason: "unreachable", detail: "down" },
    }
    const twice = withPullOutcome(withPullOutcome(NO_LIVE_PAGES, failure, 1), failure, 2)

    expect(twice.failures).toBe(2)
    expect(withPullOutcome(twice, { kind: "unchanged" }, 3).failures).toBe(0)
  })

  it("never edits what it was handed", () => {
    const fresh = withPullOutcome(NO_LIVE_PAGES, { kind: "fresh", pages: [page], tag: '"one"' }, 1)

    withPullOutcome(fresh, { kind: "fresh", pages: [other], tag: '"two"' }, 2)

    expect([...fresh.pages.keys()]).toEqual([page.treeId])
    expect(NO_LIVE_PAGES.pages.size).toBe(0)
  })
})

describe("the sentence a failed pull leaves in a log", () => {
  it("names the reason and what it was", () => {
    expect(
      describeSitePullFailure({ reason: "refused", detail: "the project is closed", status: 403 })
    ).toBe("live pages were not pulled (refused): the project is closed")
  })
})
