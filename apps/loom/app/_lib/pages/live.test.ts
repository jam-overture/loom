import { describe, expect, it } from "vitest"

import { err, ok, type LoomTree } from "@jam-overture/loom"
import {
  DEFAULT_APPLICATION_ID,
  applicationIdSchema,
  projectIdSchema,
  type Application,
  type ApplicationId,
} from "@jam-overture/loom/store"

import { issueIngestKey, type IngestKey } from "@/app/_lib/reader-signals/keys"
import { memoryIngestKeyStore } from "@/app/_lib/reader-signals/keys-memory"

import { pageFixture } from "./fixtures"
import { entityTagOf, matchesTag, serveLivePages, type ReadDoor } from "./live"
import type { SitePull } from "./pulls"

const SITE: Application = {
  applicationId: DEFAULT_APPLICATION_ID,
  projectId: projectIdSchema.parse("prj_default"),
  name: "Your application",
  createdAt: "1970-01-01T00:00:00.000Z",
}

const OTHER = applicationIdSchema.parse("app_other")
const AT = 1_760_000_000_000
const HOME = pageFixture("home", "Welcome")
const PRICING = pageFixture("pricing", "Pricing")

type Fixture = {
  readonly door: ReadDoor
  readonly key: IngestKey
  /** Which applications the door was asked for live pages of. */
  readonly asked: ApplicationId[]
  /** What the door said the site took. */
  readonly pulls: SitePull[]
}

/** A deployment that has issued its own application a key, and another application one too. */
const fixtureOf = async (
  over: Partial<ReadDoor> & {
    readonly application?: Application | null
    readonly pages?: readonly LoomTree[]
  } = {}
): Promise<Fixture & { readonly otherKey: IngestKey }> => {
  const keys = memoryIngestKeyStore()
  const issued = await issueIngestKey(keys)(SITE.applicationId, AT)
  const other = await issueIngestKey(keys)(OTHER, AT)
  if (!issued.ok || !other.ok) throw new Error("expected keys")

  const application = over.application === undefined ? SITE : over.application
  const asked: ApplicationId[] = []
  const pulls: SitePull[] = []

  return {
    key: issued.value,
    otherKey: other.value,
    asked,
    pulls,
    door: {
      keys,
      applicationOf: (id) =>
        Promise.resolve(
          ok(
            id === application?.applicationId
              ? application
              : id === OTHER
                ? { ...SITE, applicationId: OTHER }
                : null
          )
        ),
      livePagesOf: (id) => {
        asked.push(id)

        return Promise.resolve(ok(id === SITE.applicationId ? (over.pages ?? [HOME, PRICING]) : []))
      },
      pulled: (taken) => {
        pulls.push(taken)
      },
      now: () => AT,
      ...over,
    },
  }
}

const pull = (
  authorization: string | null,
  { query = "", ifNoneMatch }: { readonly query?: string; readonly ifNoneMatch?: string } = {}
): Request =>
  new Request(`https://loom.test/api/pages/live${query}`, {
    headers: {
      ...(authorization === null ? {} : { authorization }),
      ...(ifNoneMatch === undefined ? {} : { "if-none-match": ifNoneMatch }),
    },
  })

const DOWN = { detail: "down" } as const

describe("serveLivePages", () => {
  it("answers the project's live pages to its key, with a tag to ask again with", async () => {
    const { door, key, asked } = await fixtureOf()

    const response = await serveLivePages(pull(`Bearer ${key}`), door)
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toMatch(/^application\/json/)
    expect(JSON.parse(body)).toEqual({ pages: [HOME, PRICING] })
    expect(response.headers.get("etag")).toBe(await entityTagOf(body))
    expect(response.headers.get("cache-control")).toBe("private, no-cache")
    expect(asked).toEqual([SITE.applicationId])
  })

  it("answers each key with its own project's pages and never another's", async () => {
    const { door, otherKey, asked } = await fixtureOf()

    const response = await serveLivePages(pull(`Bearer ${otherKey}`), door)

    expect(await response.json()).toEqual({ pages: [] })
    expect(asked).toEqual([OTHER])
  })

  it("answers 304 with no body when the server already holds these pages", async () => {
    const { door, key } = await fixtureOf()
    const first = await serveLivePages(pull(`Bearer ${key}`), door)
    const tag = first.headers.get("etag") ?? ""

    const again = await serveLivePages(pull(`Bearer ${key}`, { ifNoneMatch: tag }), door)

    expect(again.status).toBe(304)
    expect(again.headers.get("etag")).toBe(tag)
    expect(await again.text()).toBe("")
  })

  it("answers the pages again once they have changed since the tag", async () => {
    const { door, key } = await fixtureOf()
    const first = await serveLivePages(pull(`Bearer ${key}`), door)
    const { door: changed } = await fixtureOf({ pages: [HOME] })

    const again = await serveLivePages(
      pull(`Bearer ${key}`, { ifNoneMatch: first.headers.get("etag") ?? "" }),
      { ...changed, keys: door.keys }
    )

    expect(again.status).toBe(200)
    expect(await again.json()).toEqual({ pages: [HOME] })
  })

  it("tells of each answer the site took, the 304s as well as the 200s, under its project", async () => {
    const { door, key, pulls } = await fixtureOf()
    const first = await serveLivePages(pull(`Bearer ${key}`), door)
    const tag = first.headers.get("etag") ?? ""

    await serveLivePages(pull(`Bearer ${key}`, { ifNoneMatch: tag }), door)

    expect(pulls).toEqual([
      { application: SITE.applicationId, tag, at: AT, kept: false },
      { application: SITE.applicationId, tag, at: AT, kept: true },
    ])
  })

  it("tells of an answer not kept when the site goes on naming the pages it held before", async () => {
    const { door, key, pulls } = await fixtureOf()
    const { door: changed } = await fixtureOf({ pages: [HOME] })
    const older = (await serveLivePages(pull(`Bearer ${key}`), door)).headers.get("etag") ?? ""
    const changedDoor = { ...changed, keys: door.keys, pulled: door.pulled }

    const newest = await serveLivePages(pull(`Bearer ${key}`, { ifNoneMatch: older }), changedDoor)
    await serveLivePages(pull(`Bearer ${key}`, { ifNoneMatch: older }), changedDoor)

    expect(pulls.slice(1).map(({ tag, kept }) => ({ tag, kept }))).toEqual([
      { tag: newest.headers.get("etag"), kept: false },
      { tag: newest.headers.get("etag"), kept: false },
    ])
  })

  it("tells of no pull it refused, so a site that is turned away is not said to pull", async () => {
    const closed = await fixtureOf({
      application: { ...SITE, closedAt: "2026-11-01T00:00:00.000Z" },
    })
    const down = await fixtureOf({ livePagesOf: () => Promise.resolve(err(DOWN)) })

    await serveLivePages(pull(`Bearer ${closed.key}`), closed.door)
    await serveLivePages(pull(`Bearer ${down.key}`), down.door)
    await serveLivePages(pull(`Bearer ${down.key}`, { query: "?reader=r_1" }), down.door)
    await serveLivePages(pull(null), down.door)

    expect([...closed.pulls, ...down.pulls]).toEqual([])
  })

  it("refuses a request that says anything but the key, so no reader or audience can be named", async () => {
    const { door, key, asked } = await fixtureOf()

    for (const query of ["?reader=r_1", "?audience=aud_1", "?key=x"]) {
      const response = await serveLivePages(pull(`Bearer ${key}`, { query }), door)

      expect(response.status).toBe(400)
      expect(await response.text()).toMatch(/no reader, no audience/)
    }
    expect(asked).toEqual([])
  })

  it("refuses without a key, saying where the key is, with the challenge 401 promises", async () => {
    const { door } = await fixtureOf()

    const response = await serveLivePages(pull(null), door)

    expect(response.status).toBe(401)
    expect(response.headers.get("www-authenticate")).toBe('Bearer realm="loom live pages"')
    expect(await response.text()).toMatch(/Connect your site/)
  })

  it("refuses a publish key, which is a build's secret and not the project's key", async () => {
    const { door } = await fixtureOf()

    const response = await serveLivePages(pull(`Bearer lp_${"a".repeat(32)}`), door)

    expect(response.status).toBe(401)
  })

  it("refuses a key this deployment never issued or has replaced", async () => {
    const { door } = await fixtureOf()

    const response = await serveLivePages(pull(`Bearer lk_${"0".repeat(32)}`), door)

    expect(response.status).toBe(401)
    expect(await response.text()).toMatch(/replaced/)
  })

  it("refuses a key whose project is gone", async () => {
    const { door, key } = await fixtureOf({ application: null })

    expect((await serveLivePages(pull(`Bearer ${key}`), door)).status).toBe(401)
  })

  it("refuses a closed project, so its site keeps what it last pulled", async () => {
    const { door, key, asked } = await fixtureOf({
      application: { ...SITE, closedAt: "2026-11-01T00:00:00.000Z" },
    })

    const response = await serveLivePages(pull(`Bearer ${key}`), door)

    expect(response.status).toBe(403)
    expect(asked).toEqual([])
  })

  it("answers 503 when a store cannot be read, and never an empty site", async () => {
    const keysDown = await fixtureOf()
    const applicationsDown = await fixtureOf({ applicationOf: () => Promise.resolve(err(DOWN)) })
    const pagesDown = await fixtureOf({ livePagesOf: () => Promise.resolve(err(DOWN)) })

    const answers = await Promise.all([
      serveLivePages(pull(`Bearer ${keysDown.key}`), {
        ...keysDown.door,
        keys: {
          applicationWithKey: () =>
            Promise.resolve(err({ code: "unavailable", detail: "down" } as const)),
        },
      }),
      serveLivePages(pull(`Bearer ${applicationsDown.key}`), applicationsDown.door),
      serveLivePages(pull(`Bearer ${pagesDown.key}`), pagesDown.door),
    ])

    expect(answers.map((response) => response.status)).toEqual([503, 503, 503])
    expect(await Promise.all(answers.map((response) => response.text()))).toEqual([
      "live pages are unavailable: down\n",
      "live pages are unavailable: down\n",
      "live pages are unavailable: down\n",
    ])
  })
})

describe("matchesTag", () => {
  it("matches the tag alone, in a list, weak, or as any", () => {
    expect(matchesTag('"abc"', '"abc"')).toBe(true)
    expect(matchesTag('"x", "abc"', '"abc"')).toBe(true)
    expect(matchesTag('W/"abc"', '"abc"')).toBe(true)
    expect(matchesTag("*", '"abc"')).toBe(true)
    expect(matchesTag('"x"', '"abc"')).toBe(false)
    expect(matchesTag(null, '"abc"')).toBe(false)
  })
})
