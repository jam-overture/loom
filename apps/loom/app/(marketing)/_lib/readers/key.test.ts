import { describe, expect, it } from "vitest"

import { err } from "@jam-overture/loom"
import {
  DEFAULT_APPLICATION_ID,
  DEFAULT_PROJECT_ID,
  applicationIdSchema,
  memoryApplicationStore,
  projectIdSchema,
  type Application,
} from "@jam-overture/loom/store"

import { memoryIngestKeyStore } from "@/app/_lib/reader-signals/keys-memory"
import { mintIngestKey } from "@/app/_lib/reader-signals/keys"

import { SITE_PROJECT_KEY, siteSignalUrl } from "./key"

const SHOP = applicationIdSchema.parse("app_shop")

const shop = (over: Partial<Application> = {}): Application => ({
  applicationId: SHOP,
  projectId: projectIdSchema.parse("prj_shop"),
  name: "shop",
  createdAt: "2026-10-19T00:00:00.000Z",
  ...over,
})

const named = (project: string) => ({ [SITE_PROJECT_KEY]: project })

describe("where this site posts its readers' signals", () => {
  it("posts with the key of the project it belongs to", async () => {
    const keys = memoryIngestKeyStore()
    const key = mintIngestKey()
    await keys.put(DEFAULT_APPLICATION_ID, key, 1)

    expect(await siteSignalUrl(keys)).toBe(`/api/reader-signals?key=${key}`)
  })

  /** Another project's key is not this site's, however it got into the table. */
  it("does not post with a key some other project holds", async () => {
    const keys = memoryIngestKeyStore()
    await keys.put(applicationIdSchema.parse("app_shop"), mintIngestKey(), 1)

    expect(await siteSignalUrl(keys)).toBeNull()
  })

  it("posts nowhere when it has no key", async () => {
    expect(await siteSignalUrl(memoryIngestKeyStore())).toBeNull()
  })

  it("posts nowhere when the key cannot be read", async () => {
    const down = {
      ...memoryIngestKeyStore(),
      keyOf: () => Promise.resolve(err({ code: "unavailable" as const, detail: "no database" })),
    }

    expect(await siteSignalUrl(down)).toBeNull()
  })

  describe("counted under a project the deployment names", () => {
    it("posts with that project's key and not the deployment's own", async () => {
      const keys = memoryIngestKeyStore()
      const key = mintIngestKey()
      await keys.put(DEFAULT_APPLICATION_ID, mintIngestKey(), 1)
      await keys.put(SHOP, key, 1)

      expect(await siteSignalUrl(keys, named(" prj_shop "), memoryApplicationStore([shop()]))).toBe(
        `/api/reader-signals?key=${key}`
      )
    })

    /** Naming the deployment's own is naming nothing, and costs no listing. */
    it("reads no listing for the deployment's own project", async () => {
      const keys = memoryIngestKeyStore()
      const key = mintIngestKey()
      await keys.put(DEFAULT_APPLICATION_ID, key, 1)
      const applications = {
        list: () => Promise.reject(new Error("the deployment's own needs no listing")),
      }

      expect(await siteSignalUrl(keys, named(DEFAULT_PROJECT_ID), applications)).toBe(
        `/api/reader-signals?key=${key}`
      )
      expect(await siteSignalUrl(keys, named(""), applications)).toBe(
        `/api/reader-signals?key=${key}`
      )
    })

    /**
     * Each is a setting that would otherwise fall back to the deployment's own
     * project, and so count the site somewhere its owner did not say.
     */
    it.each([
      ["is not a project", "shop", [shop()]],
      ["names a project with nothing in it", "prj_shop", []],
      ["names a closed project", "prj_shop", [shop({ closedAt: "2026-10-20T00:00:00.000Z" })]],
      [
        "names a project holding more than one site",
        "prj_shop",
        [shop(), shop({ applicationId: applicationIdSchema.parse("app_shoptwo") })],
      ],
    ])("posts nowhere when the setting %s", async (_, project, held) => {
      const keys = memoryIngestKeyStore()
      await keys.put(DEFAULT_APPLICATION_ID, mintIngestKey(), 1)
      await keys.put(SHOP, mintIngestKey(), 1)

      expect(await siteSignalUrl(keys, named(project), memoryApplicationStore(held))).toBeNull()
    })

    it("posts nowhere when the listing cannot be read", async () => {
      const keys = memoryIngestKeyStore()
      await keys.put(SHOP, mintIngestKey(), 1)
      const down = {
        list: () => Promise.resolve(err({ code: "unavailable" as const, detail: "no database" })),
      }

      expect(await siteSignalUrl(keys, named("prj_shop"), down)).toBeNull()
    })
  })
})
