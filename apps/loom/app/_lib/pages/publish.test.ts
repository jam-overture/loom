import { describe, expect, it } from "vitest"

import { ok } from "@jam-overture/loom"
import { DEFAULT_APPLICATION_ID, projectIdSchema, type Application } from "@jam-overture/loom/store"

import { sitePageTrees } from "@/app/(marketing)/_lib/stored"

import { pageFixture } from "./fixtures"
import { issuePublishKey, mintPublishKey, type PublishKey } from "./publish-keys"
import { memoryPublishKeyStore } from "./publish-keys-memory"
import { pagesAddress, publishPages } from "./publish"
import { memoryPublishedPageStore } from "./published-memory"
import { MAX_SNAPSHOT_BYTES, readSnapshot, receivePages, type PublishDoor } from "./receive"

const SITE: Application = {
  applicationId: DEFAULT_APPLICATION_ID,
  projectId: projectIdSchema.parse("prj_default"),
  name: "Your application",
  createdAt: "1970-01-01T00:00:00.000Z",
}

/** The real door, with one key issued, as the far end of the publication. */
const doorWithKey = async () => {
  const keys = memoryPublishKeyStore()
  const issued = await issuePublishKey(keys)(SITE.applicationId, 1)
  if (!issued.ok) throw new Error(issued.error.detail)

  const pages = memoryPublishedPageStore()
  const door: PublishDoor = {
    keys,
    applicationOf: () => Promise.resolve(ok(SITE)),
    pagesFor: () => pages,
    now: () => 2,
  }

  return { key: issued.value, pages, send: (request: Request) => receivePages(request, door) }
}

const publish = (send: (request: Request) => Promise<Response>, key: PublishKey) =>
  publishPages({ origin: "https://loom.test/", key, pages: [pageFixture("home", "Welcome")], send })

describe("publishPages", () => {
  it("hands the door a snapshot it keeps, and says what the door said", async () => {
    const { key, pages, send } = await doorWithKey()

    expect(await publish(send, key)).toEqual(ok("published 1 page"))
    expect(await pages.list()).toMatchObject({
      ok: true,
      value: [{ tree: { treeId: pageFixture("home", "Welcome").treeId } }],
    })
  })

  it("reports a refusal with its status and the door's reason", async () => {
    const { send } = await doorWithKey()

    const sent = await publish(send, mintPublishKey())

    expect(sent.ok).toBe(false)
    if (!sent.ok) expect(sent.error).toMatch(/^401: that is not a publish key/u)
  })

  it("posts to the pages address however the origin ends", () => {
    expect(pagesAddress("https://loom.test")).toBe("https://loom.test/api/pages")
    expect(pagesAddress("https://loom.test//")).toBe("https://loom.test/api/pages")
  })
})

/**
 * 6b: this deployment's own site is the first to publish (0312). A page added
 * to it that the door would refuse fails here, not in somebody's build log.
 */
describe("this site's own pages, as a snapshot", () => {
  const body = JSON.stringify({ pages: sitePageTrees() })

  it("are every page the door would take, under its size limit", () => {
    expect(readSnapshot(body).ok).toBe(true)
    expect(new TextEncoder().encode(body).byteLength).toBeLessThan(MAX_SNAPSHOT_BYTES)
  })
})
