import { describe, expect, it } from "vitest"

import type { Result } from "@jam-overture/loom"
import { applicationIdSchema } from "@jam-overture/loom/store"

import { issuePublishKey, publishKeyDigest, type PublishKeyStore } from "./publish-keys"

/** Both implementations of the publish keys, held to the same behaviour. */

const SHOP = applicationIdSchema.parse("app_shop")
const BLOG = applicationIdSchema.parse("app_blog")
const AT = 1_760_000_000_000

const unwrap = <TValue>(result: Result<TValue, { readonly detail: string }>): TValue => {
  if (!result.ok) throw new Error(`expected ok, got ${result.error.detail}`)

  return result.value
}

export const describePublishKeyStoreContract = (
  name: string,
  make: () => PublishKeyStore | Promise<PublishKeyStore>
): void => {
  describe(`${name} — PublishKeyStore contract`, () => {
    it("finds the application a key was issued to, by its digest", async () => {
      const store = await make()
      const key = unwrap(await issuePublishKey(store)(SHOP, AT))

      expect(unwrap(await store.applicationWithDigest(await publishKeyDigest(key)))).toBe(SHOP)
      expect(unwrap(await store.mintedAt(SHOP))).toBe(AT)
    })

    it("answers nobody for a digest it never held, and no key for an application without one", async () => {
      const store = await make()

      expect(unwrap(await store.applicationWithDigest("0".repeat(64)))).toBeNull()
      expect(unwrap(await store.mintedAt(SHOP))).toBeNull()
    })

    it("ends the first key when an application is issued a second", async () => {
      const store = await make()
      const first = unwrap(await issuePublishKey(store)(SHOP, AT))
      const second = unwrap(await issuePublishKey(store)(SHOP, AT + 1))

      expect(unwrap(await store.applicationWithDigest(await publishKeyDigest(first)))).toBeNull()
      expect(unwrap(await store.applicationWithDigest(await publishKeyDigest(second)))).toBe(SHOP)
      expect(unwrap(await store.mintedAt(SHOP))).toBe(AT + 1)
    })

    it("keeps two applications' keys apart", async () => {
      const store = await make()
      const shop = unwrap(await issuePublishKey(store)(SHOP, AT))
      const blog = unwrap(await issuePublishKey(store)(BLOG, AT))

      expect(unwrap(await store.applicationWithDigest(await publishKeyDigest(shop)))).toBe(SHOP)
      expect(unwrap(await store.applicationWithDigest(await publishKeyDigest(blog)))).toBe(BLOG)
    })
  })
}
