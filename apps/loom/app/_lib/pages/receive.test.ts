import { describe, expect, it } from "vitest"

import { err, ok } from "@jam-overture/loom"
import {
  DEFAULT_APPLICATION_ID,
  projectIdSchema,
  type Application,
  type ApplicationId,
} from "@jam-overture/loom/store"

import { pageFixture } from "./fixtures"
import { issuePublishKey, type PublishKey } from "./publish-keys"
import { memoryPublishKeyStore } from "./publish-keys-memory"
import type { PublishedPageStore } from "./published"
import { memoryPublishedPageStore } from "./published-memory"
import {
  MAX_SNAPSHOT_BYTES,
  MAX_SNAPSHOT_PAGES,
  readSnapshot,
  receivePages,
  type PublishDoor,
} from "./receive"

const SITE: Application = {
  applicationId: DEFAULT_APPLICATION_ID,
  projectId: projectIdSchema.parse("prj_default"),
  name: "Your application",
  createdAt: "1970-01-01T00:00:00.000Z",
}

const AT = 1_760_000_000_000
const DOWN = { code: "unavailable", detail: "down" } as const
const HOME = pageFixture("home", "Welcome")
const PRICING = pageFixture("pricing", "Pricing")

type Fixture = {
  readonly door: PublishDoor
  readonly key: PublishKey
  readonly pages: PublishedPageStore
}

/** A deployment that has issued one publish key, to its own application. */
const fixtureOf = async (
  over: Partial<PublishDoor> & { readonly application?: Application | null } = {}
): Promise<Fixture> => {
  const keys = memoryPublishKeyStore()
  const issued = await issuePublishKey(keys)(SITE.applicationId, AT)
  if (!issued.ok) throw new Error(issued.error.detail)

  const pages = memoryPublishedPageStore()
  const application = over.application === undefined ? SITE : over.application

  return {
    key: issued.value,
    pages,
    door: {
      keys,
      applicationOf: (id: ApplicationId) =>
        Promise.resolve(ok(id === application?.applicationId ? application : null)),
      pagesFor: () => pages,
      now: () => AT + 1,
      ...over,
    },
  }
}

const post = (body: unknown, authorization: string | null): Request =>
  new Request("https://loom.test/api/pages", {
    method: "POST",
    headers: authorization === null ? {} : { authorization },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })

const listed = async (pages: PublishedPageStore) => {
  const read = await pages.list()
  if (!read.ok) throw new Error(read.error.detail)

  return read.value
}

describe("receivePages", () => {
  it("keeps every page of a snapshot sent with the project's publish key", async () => {
    const { door, key, pages } = await fixtureOf()

    const response = await receivePages(post({ pages: [HOME, PRICING] }, `Bearer ${key}`), door)

    expect(response.status).toBe(200)
    expect(await response.text()).toBe("published 2 pages\n")
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect((await listed(pages)).map((page) => page.tree.treeId).sort()).toEqual(
      [HOME.treeId, PRICING.treeId].sort()
    )
  })

  it("says one page, not one pages", async () => {
    const { door, key } = await fixtureOf()

    expect(await (await receivePages(post({ pages: [HOME] }, `Bearer ${key}`), door)).text()).toBe(
      "published 1 page\n"
    )
  })

  it.each([
    ["no key", null],
    ["another scheme", "Basic dXNlcjpwYXNz"],
    ["the public ingest key", "Bearer lk_0123456789abcdef0123456789abcdef"],
    ["a key nobody issued", "Bearer lp_0123456789abcdef0123456789abcdef"],
  ])("refuses %s with a Bearer challenge and keeps nothing", async (_name, authorization) => {
    const { door, pages } = await fixtureOf()

    const response = await receivePages(post({ pages: [HOME] }, authorization), door)

    expect(response.status).toBe(401)
    expect(response.headers.get("www-authenticate")).toBe('Bearer realm="loom pages"')
    expect(await listed(pages)).toEqual([])
  })

  it("refuses a key whose project this deployment no longer holds", async () => {
    const { door, key } = await fixtureOf({ application: null })

    expect((await receivePages(post({ pages: [HOME] }, `Bearer ${key}`), door)).status).toBe(401)
  })

  it("refuses a closed project and keeps nothing", async () => {
    const { door, key, pages } = await fixtureOf({
      application: { ...SITE, closedAt: "2026-10-19T12:00:00.000Z" },
    })

    const response = await receivePages(post({ pages: [HOME] }, `Bearer ${key}`), door)

    expect(response.status).toBe(403)
    expect(await response.text()).toContain("closed")
    expect(await listed(pages)).toEqual([])
  })

  it("refuses a body over the limit", async () => {
    const { door, key } = await fixtureOf()

    const response = await receivePages(
      post("x".repeat(MAX_SNAPSHOT_BYTES + 1), `Bearer ${key}`),
      door
    )

    expect(response.status).toBe(413)
  })

  it("refuses a snapshot with one bad tree, keeping none of it", async () => {
    const { door, key, pages } = await fixtureOf()

    const response = await receivePages(
      post({ pages: [HOME, { treeId: "t_x" }] }, `Bearer ${key}`),
      door
    )

    expect(response.status).toBe(400)
    expect(await response.text()).toContain("page 1 is not a Loom tree")
    expect(await listed(pages)).toEqual([])
  })

  it.each([
    [
      "the keys cannot be read",
      { keys: { applicationWithDigest: () => Promise.resolve(err(DOWN)) } },
    ],
    ["the project cannot be read", { applicationOf: () => Promise.resolve(err(DOWN)) }],
    [
      "the pages cannot be kept",
      { pagesFor: () => ({ publish: () => Promise.resolve(err(DOWN)) }) },
    ],
  ])("answers 503 when %s", async (_name, over) => {
    const { door, key } = await fixtureOf(over)

    const response = await receivePages(post({ pages: [HOME] }, `Bearer ${key}`), door)

    expect(response.status).toBe(503)
    expect(await response.text()).toContain("down")
  })
})

describe("readSnapshot", () => {
  it("reads the trees of a snapshot", () => {
    expect(readSnapshot(JSON.stringify({ pages: [HOME] }))).toEqual(ok([HOME]))
  })

  it.each([
    ["is not JSON", "{", "is JSON"],
    ["has no pages array", JSON.stringify({ trees: [] }), '"pages" array'],
    ["names no page", JSON.stringify({ pages: [] }), "at least one page"],
    [
      "carries too many pages",
      JSON.stringify({ pages: Array.from({ length: MAX_SNAPSHOT_PAGES + 1 }, () => HOME) }),
      `may carry ${MAX_SNAPSHOT_PAGES} pages`,
    ],
    ["names a page twice", JSON.stringify({ pages: [HOME, HOME] }), "appears twice"],
  ])("refuses a body that %s", (_name, text, says) => {
    const read = readSnapshot(text)

    expect(read.ok).toBe(false)
    if (!read.ok) expect(read.error).toContain(says)
  })
})
