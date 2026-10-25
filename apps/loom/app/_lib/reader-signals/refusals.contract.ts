import { describe, expect, it } from "vitest"

import type { Result } from "@jam-overture/loom"
import { applicationIdSchema, type ApplicationId } from "@jam-overture/loom/store"

import type { RefusalCounter } from "./refusals"

/** Both implementations of the refusal counts, held to the same behaviour. */

const SHOP = applicationIdSchema.parse("app_shop")
const BLOG = applicationIdSchema.parse("app_blog")

const AT = 1_760_000_000_000

const unwrap = <TValue>(result: Result<TValue, { readonly detail: string }>): TValue => {
  if (!result.ok) throw new Error(`expected ok, got ${result.error.detail}`)

  return result.value
}

export const describeRefusalCounterContract = (
  name: string,
  make: () => Promise<(application: ApplicationId) => RefusalCounter>
): void => {
  describe(`${name} — RefusalCounter contract`, () => {
    it("reads nothing refused as an empty list rather than as a failure", async () => {
      const counter = (await make())(SHOP)

      expect(unwrap(await counter.read())).toEqual([])
    })

    it("counts each reason apart, in the order a screen lists them", async () => {
      const counter = (await make())(SHOP)
      await counter.record("unreadable", "https://shop.example", AT)
      await counter.record("wrong-site", "https://copy.example", AT + 1)
      await counter.record("wrong-site", "https://copy.example", AT + 2)

      expect(unwrap(await counter.read())).toEqual([
        { reason: "wrong-site", refused: 2, lastAt: AT + 2, lastOrigin: "https://copy.example" },
        { reason: "unreadable", refused: 1, lastAt: AT, lastOrigin: "https://shop.example" },
      ])
    })

    it("keeps the newest time and origin when a late refusal is recorded", async () => {
      const counter = (await make())(SHOP)
      await counter.record("wrong-site", "https://newer.example", AT + 10)
      await counter.record("wrong-site", "https://older.example", AT)

      expect(unwrap(await counter.read())).toEqual([
        { reason: "wrong-site", refused: 2, lastAt: AT + 10, lastOrigin: "https://newer.example" },
      ])
    })

    it("keeps a refusal that named no site as no site", async () => {
      const counter = (await make())(SHOP)
      await counter.record("wrong-site", null, AT)

      expect(unwrap(await counter.read())[0]?.lastOrigin).toBeNull()
    })

    /** The property scoping exists for: one project's refusals never show on another's screen. */
    it("keeps two applications' refusals apart", async () => {
      const counterFor = await make()
      await counterFor(SHOP).record("closed", null, AT)

      expect(unwrap(await counterFor(BLOG).read())).toEqual([])
      expect(unwrap(await counterFor(SHOP).read())).toHaveLength(1)
    })
  })
}
