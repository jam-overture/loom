import { describe, expect, it } from "vitest"

import { err } from "@jam-overture/loom"
import { DEFAULT_APPLICATION_ID, applicationIdSchema } from "@jam-overture/loom/store"

import { memoryIngestKeyStore } from "@/app/_lib/reader-signals/keys-memory"
import { mintIngestKey } from "@/app/_lib/reader-signals/keys"

import { siteSignalUrl } from "./key"

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
})
