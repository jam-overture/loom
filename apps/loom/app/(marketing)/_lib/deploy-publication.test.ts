import { describe, expect, it } from "vitest"

import { deployPublicationOf } from "./deploy-publication"

const KEY = `lp_${"0a".repeat(16)}`
const ORIGIN = "https://www.loomjs.org"

const production = {
  VERCEL_ENV: "production",
  LOOM_PUBLISH_KEY: KEY,
  LOOM_SITE_ORIGIN: ORIGIN,
}

describe("whether a build publishes the site's pages", () => {
  it("publishes a production build that holds a key, to its pinned domain", () => {
    expect(deployPublicationOf(production)).toEqual({
      ok: true,
      value: { origin: ORIGIN, key: KEY },
    })
  })

  it("publishes a build off Vercel too, since the key is what opts it in", () => {
    const { VERCEL_ENV: _, ...selfHosted } = production

    expect(deployPublicationOf(selfHosted).ok).toBe(true)
  })

  it("leaves a preview out, even when it holds the key", () => {
    const answer = deployPublicationOf({ ...production, VERCEL_ENV: "preview" })

    expect(answer).toEqual({ ok: false, error: expect.stringContaining("preview") })
  })

  it("leaves a build with no key out", () => {
    const { LOOM_PUBLISH_KEY: _, ...keyless } = production

    expect(deployPublicationOf(keyless)).toEqual({
      ok: false,
      error: expect.stringContaining("no LOOM_PUBLISH_KEY"),
    })
    expect(deployPublicationOf({ ...production, LOOM_PUBLISH_KEY: "" }).ok).toBe(false)
  })

  it("names a key that is not a publish key, without printing it", () => {
    const ingestKey = `lk_${"0a".repeat(16)}`
    const answer = deployPublicationOf({ ...production, LOOM_PUBLISH_KEY: ingestKey })

    expect(answer).toEqual({ ok: false, error: expect.stringContaining("not a publish key") })
    expect(JSON.stringify(answer)).not.toContain(ingestKey)
  })

  it("leaves a build with no pinned domain out, since nothing else is answering yet", () => {
    const { LOOM_SITE_ORIGIN: _, ...unpinned } = production

    expect(deployPublicationOf({ ...unpinned, VERCEL_URL: "loom-abc.vercel.app" })).toEqual({
      ok: false,
      error: expect.stringContaining("no LOOM_SITE_ORIGIN"),
    })
    expect(deployPublicationOf({ ...production, LOOM_SITE_ORIGIN: "loomjs.org" }).ok).toBe(false)
  })
})
