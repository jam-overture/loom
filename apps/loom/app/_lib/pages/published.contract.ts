import { describe, expect, it } from "vitest"

import type { Result } from "@jam-overture/loom"
import { applicationIdSchema, type ApplicationId } from "@jam-overture/loom/store"

import { pageFixture } from "./fixtures"
import type { PublishedPageStore } from "./published"

/** Both implementations of the published pages, held to the same behaviour. */

const SHOP = applicationIdSchema.parse("app_shop")
const BLOG = applicationIdSchema.parse("app_blog")
const AT = 1_760_000_000_000

const unwrap = <TValue>(result: Result<TValue, { readonly detail: string }>): TValue => {
  if (!result.ok) throw new Error(`expected ok, got ${result.error.detail}`)

  return result.value
}

export const describePublishedPageStoreContract = (
  name: string,
  make: () => Promise<(application: ApplicationId) => PublishedPageStore>
): void => {
  describe(`${name} — PublishedPageStore contract`, () => {
    it("reads nothing published as an empty list", async () => {
      expect(unwrap(await (await make())(SHOP).list())).toEqual([])
    })

    it("keeps each page's tree and when it arrived, newest first", async () => {
      const store = (await make())(SHOP)
      const home = pageFixture("home", "Welcome")
      const pricing = pageFixture("pricing", "Pricing")

      await store.publish([home], AT)
      await store.publish([pricing], AT + 1)

      expect(unwrap(await store.list())).toEqual([
        { tree: pricing, receivedAt: AT + 1 },
        { tree: home, receivedAt: AT },
      ])
    })

    it("replaces a page with its newer tree and keeps pages a snapshot left out", async () => {
      const store = (await make())(SHOP)
      const home = pageFixture("home", "Welcome")
      const pricing = pageFixture("pricing", "Pricing")
      const newer = { ...pageFixture("home", "Welcome back"), treeId: home.treeId, revision: 4 }

      await store.publish([home, pricing], AT)
      await store.publish([newer], AT + 5)

      expect(unwrap(await store.list())).toEqual([
        { tree: newer, receivedAt: AT + 5 },
        { tree: pricing, receivedAt: AT },
      ])
    })

    it("keeps two applications' pages apart", async () => {
      const storeFor = await make()
      await storeFor(SHOP).publish([pageFixture("home", "Welcome")], AT)

      expect(unwrap(await storeFor(BLOG).list())).toEqual([])
    })
  })
}
