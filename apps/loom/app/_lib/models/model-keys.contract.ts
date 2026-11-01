import { describe, expect, it } from "vitest"

import type { Result } from "@jam-overture/loom"
import { applicationIdSchema } from "@jam-overture/loom/store"

import type { KeptModelKey, ModelKeyStore } from "./model-keys"

/** Both implementations of the model keys, held to the same behaviour. */

const SHOP = applicationIdSchema.parse("app_shop")
const BLOG = applicationIdSchema.parse("app_blog")

const kept = (hint: string, setAt: number): KeptModelKey => ({
  sealed: `v1.nonce.tag.${hint}`,
  hint,
  setAt,
})

const unwrap = <TValue>(result: Result<TValue, { readonly detail: string }>): TValue => {
  if (!result.ok) throw new Error(`expected ok, got ${result.error.detail}`)

  return result.value
}

export const describeModelKeyStoreContract = (
  name: string,
  make: () => ModelKeyStore | Promise<ModelKeyStore>
): void => {
  describe(`${name} — ModelKeyStore contract`, () => {
    it("has no key for an application nobody set one for", async () => {
      const store = await make()

      expect(unwrap(await store.kept(SHOP))).toBeNull()
    })

    it("keeps what it was given, and a second key replaces the first", async () => {
      const store = await make()

      unwrap(await store.put(SHOP, kept("aaaa", 1)))
      unwrap(await store.put(SHOP, kept("bbbb", 2)))

      expect(unwrap(await store.kept(SHOP))).toEqual(kept("bbbb", 2))
    })

    it("keeps two applications' keys apart", async () => {
      const store = await make()

      unwrap(await store.put(SHOP, kept("aaaa", 1)))
      unwrap(await store.put(BLOG, kept("bbbb", 1)))

      expect(unwrap(await store.kept(SHOP))?.hint).toBe("aaaa")
      expect(unwrap(await store.kept(BLOG))?.hint).toBe("bbbb")
    })

    it("removes one application's key and leaves the other's", async () => {
      const store = await make()

      unwrap(await store.put(SHOP, kept("aaaa", 1)))
      unwrap(await store.put(BLOG, kept("bbbb", 1)))
      unwrap(await store.remove(SHOP))
      unwrap(await store.remove(SHOP))

      expect(unwrap(await store.kept(SHOP))).toBeNull()
      expect(unwrap(await store.kept(BLOG))?.hint).toBe("bbbb")
    })
  })
}
