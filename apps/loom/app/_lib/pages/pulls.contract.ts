import { describe, expect, it } from "vitest"

import type { Result } from "@jam-overture/loom"
import { applicationIdSchema } from "@jam-overture/loom/store"

import type { SitePull, SitePullStore } from "./pulls"

/** Both implementations of the pulls, held to the same behaviour. */

const SHOP = applicationIdSchema.parse("app_shop")
const BLOG = applicationIdSchema.parse("app_blog")
const AT = 1_760_000_000_000

const pull = (at: number, tag = '"a"', application = SHOP, kept = false): SitePull => ({
  application,
  tag,
  at,
  kept,
})

const kept = (at: number, tag = '"a"', application = SHOP): SitePull =>
  pull(at, tag, application, true)

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

    it("lists nothing taken since a moment for a site that never pulled", async () => {
      const store = await make()

      expect(unwrap(await store.takenSince(SHOP, AT))).toEqual({ answers: [], namesBack: false })
    })

    it("lists the answers first given at or after a moment, earliest first, not one given again", async () => {
      const store = await make()

      unwrap(await store.record(pull(AT + 120_000, '"c"')))
      unwrap(await store.record(pull(AT)))
      unwrap(await store.record(pull(AT + 60_000)))
      unwrap(await store.record(pull(AT + 90_000, '"b"')))
      unwrap(await store.record(pull(AT + 150_000, '"c"')))

      const b = { first: AT + 90_000, last: AT + 90_000, kept: false }
      const c = { first: AT + 120_000, last: AT + 150_000, kept: false }

      expect(unwrap(await store.takenSince(SHOP, AT + 30_000)).answers).toEqual([b, c])
      expect(unwrap(await store.takenSince(SHOP, AT + 90_000)).answers).toEqual([b, c])
      expect(unwrap(await store.takenSince(SHOP, AT + 120_001)).answers).toEqual([])
    })

    it("says which answers were named back, and whether any ever was, before the moment too", async () => {
      const store = await make()

      unwrap(await store.record(pull(AT)))
      unwrap(await store.record(kept(AT + 60_000)))
      unwrap(await store.record(pull(AT + 120_000, '"b"')))
      unwrap(await store.record(pull(AT + 180_000, '"c"')))
      unwrap(await store.record(kept(AT + 240_000, '"c"')))

      expect(unwrap(await store.takenSince(SHOP, AT + 120_000))).toEqual({
        answers: [
          { first: AT + 120_000, last: AT + 120_000, kept: false },
          { first: AT + 180_000, last: AT + 240_000, kept: true },
        ],
        namesBack: true,
      })
      expect(unwrap(await store.takenSince(SHOP, AT + 300_000))).toEqual({
        answers: [],
        namesBack: true,
      })
    })

    it("lists one project's answers and never another's", async () => {
      const store = await make()

      unwrap(await store.record(kept(AT, '"a"', BLOG)))

      expect(unwrap(await store.takenSince(SHOP, AT))).toEqual({ answers: [], namesBack: false })
      expect(unwrap(await store.takenSince(BLOG, AT))).toEqual({
        answers: [{ first: AT, last: AT, kept: true }],
        namesBack: true,
      })
    })

    it("answers no newest answer for a site that never pulled", async () => {
      const store = await make()

      expect(unwrap(await store.newest(SHOP))).toBeNull()
    })

    it("names the answer first taken latest, and whether it or any answer was kept", async () => {
      const store = await make()

      unwrap(await store.record(pull(AT)))
      unwrap(await store.record(kept(AT + 60_000)))
      unwrap(await store.record(pull(AT + 120_000, '"b"')))
      unwrap(await store.record(pull(AT + 180_000, '"b"')))

      expect(unwrap(await store.newest(SHOP))).toEqual({
        first: AT + 120_000,
        last: AT + 180_000,
        kept: false,
        anyKept: true,
      })
    })

    it("keeps an answer kept once, whatever is recorded after", async () => {
      const store = await make()

      unwrap(await store.record(kept(AT)))
      unwrap(await store.record(pull(AT + 60_000)))

      expect(unwrap(await store.newest(SHOP))).toEqual({
        first: AT,
        last: AT + 60_000,
        kept: true,
        anyKept: true,
      })
    })

    it("says nothing was kept by a site that never named an answer back", async () => {
      const store = await make()

      unwrap(await store.record(pull(AT)))
      unwrap(await store.record(pull(AT + 60_000)))

      expect(unwrap(await store.newest(SHOP))).toEqual({
        first: AT,
        last: AT + 60_000,
        kept: false,
        anyKept: false,
      })
    })

    it("reads one project's answers and never another's", async () => {
      const store = await make()

      unwrap(await store.record(kept(AT, '"a"', BLOG)))
      unwrap(await store.record(pull(AT + 60_000, '"b"', BLOG)))
      unwrap(await store.record(pull(AT)))

      expect(unwrap(await store.newest(SHOP))).toEqual({
        first: AT,
        last: AT,
        kept: false,
        anyKept: false,
      })
      expect(unwrap(await store.newest(BLOG))).toMatchObject({ first: AT + 60_000, anyKept: true })
    })
  })
}
