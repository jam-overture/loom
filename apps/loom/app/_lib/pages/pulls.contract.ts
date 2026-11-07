import { describe, expect, it } from "vitest"

import type { Result } from "@jam-overture/loom"
import { applicationIdSchema } from "@jam-overture/loom/store"

import type { SitePull, SitePullStore } from "./pulls"

/** Both implementations of the pulls, held to the same behaviour. */

const SHOP = applicationIdSchema.parse("app_shop")
const BLOG = applicationIdSchema.parse("app_blog")
const AT = 1_760_000_000_000

const pull = (at: number, tag = '"a"', application = SHOP): SitePull => ({ application, tag, at })

const unwrap = <TValue>(result: Result<TValue, { readonly detail: string }>): TValue => {
  if (!result.ok) throw new Error(`expected ok, got ${result.error.detail}`)

  return result.value
}

export const describeSitePullStoreContract = (
  name: string,
  make: () => SitePullStore | Promise<SitePullStore>
): void => {
  describe(`${name} — SitePullStore contract`, () => {
    it("answers no span for a site that never pulled", async () => {
      const store = await make()

      expect(unwrap(await store.span(SHOP))).toBeNull()
    })

    it("spans the first pull to the last, across the answers taken", async () => {
      const store = await make()

      unwrap(await store.record(pull(AT)))
      unwrap(await store.record(pull(AT + 60_000)))
      unwrap(await store.record(pull(AT + 120_000, '"b"')))
      unwrap(await store.record(pull(AT + 180_000, '"b"')))

      expect(unwrap(await store.span(SHOP))).toEqual({ first: AT, last: AT + 180_000 })
    })

    it("keeps the earliest and latest moment whatever order pulls are recorded in", async () => {
      const store = await make()

      unwrap(await store.record(pull(AT + 60_000)))
      unwrap(await store.record(pull(AT)))
      unwrap(await store.record(pull(AT + 30_000)))

      expect(unwrap(await store.span(SHOP))).toEqual({ first: AT, last: AT + 60_000 })
    })

    it("takes the same pull twice as once", async () => {
      const store = await make()

      unwrap(await store.record(pull(AT)))
      unwrap(await store.record(pull(AT)))

      expect(unwrap(await store.span(SHOP))).toEqual({ first: AT, last: AT })
    })

    it("keeps one project's pulls from another's, even under the same tag", async () => {
      const store = await make()

      unwrap(await store.record(pull(AT)))
      unwrap(await store.record(pull(AT + 1, '"a"', BLOG)))

      expect(unwrap(await store.span(SHOP))).toEqual({ first: AT, last: AT })
      expect(unwrap(await store.span(BLOG))).toEqual({ first: AT + 1, last: AT + 1 })
    })
  })
}
