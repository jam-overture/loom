import { describe, expect, it } from "vitest"

import type { Result } from "@jam-overture/loom"
import { applicationIdSchema } from "@jam-overture/loom/store"

import { mintIngestKey, type IngestKeyStore } from "./keys"

/**
 * Both implementations of the keys, held to the same behaviour.
 *
 * This is the store that decides whose readers a delivery is filed under, so
 * an implementation that drifted would be two deployments of the same code
 * disagreeing about which customer a page view belongs to.
 */

const SHOP = applicationIdSchema.parse("app_shop")
const BLOG = applicationIdSchema.parse("app_blog")

const AT = 1_760_000_000_000

const unwrap = <TValue>(result: Result<TValue, { readonly detail: string }>): TValue => {
  if (!result.ok) throw new Error(`expected ok, got ${result.error.detail}`)

  return result.value
}

export const describeIngestKeyStoreContract = (
  name: string,
  make: () => IngestKeyStore | Promise<IngestKeyStore>
): void => {
  describe(`${name} — IngestKeyStore contract`, () => {
    it("finds the application a key was given to", async () => {
      const store = await make()
      const key = mintIngestKey()
      await store.put(SHOP, key, AT)

      expect(unwrap(await store.applicationWithKey(key))).toBe(SHOP)
    })

    it("answers nothing for a key it never issued", async () => {
      const store = await make()
      await store.put(SHOP, mintIngestKey(), AT)

      expect(unwrap(await store.applicationWithKey(mintIngestKey()))).toBeNull()
    })

    it("reads an empty store as nobody rather than as a failure", async () => {
      const store = await make()

      expect(unwrap(await store.applicationWithKey(mintIngestKey()))).toBeNull()
    })

    /** The property the whole table exists for: two customers' keys never cross. */
    it("keeps two applications' keys apart", async () => {
      const store = await make()
      const shop = mintIngestKey()
      const blog = mintIngestKey()
      await store.put(SHOP, shop, AT)
      await store.put(BLOG, blog, AT)

      expect(unwrap(await store.applicationWithKey(shop))).toBe(SHOP)
      expect(unwrap(await store.applicationWithKey(blog))).toBe(BLOG)
    })

    it("reads back the key an application holds", async () => {
      const store = await make()
      const key = mintIngestKey()
      await store.put(SHOP, key, AT)

      expect(unwrap(await store.keyOf(SHOP))).toBe(key)
      expect(unwrap(await store.keyOf(BLOG))).toBeNull()
    })

    /**
     * Rotation, and the half that is easy to leave out: the new key has to
     * **end the old one**. A store that only added would leave a key that
     * leaked into somebody else's site filing their readers under this
     * project for ever, and every test above would still pass.
     */
    it("ends the previous key when an application is given another", async () => {
      const store = await make()
      const first = mintIngestKey()
      const second = mintIngestKey()
      await store.put(SHOP, first, AT)
      await store.put(SHOP, second, AT + 1)

      expect(unwrap(await store.applicationWithKey(second))).toBe(SHOP)
      expect(unwrap(await store.applicationWithKey(first))).toBeNull()
      expect(unwrap(await store.keyOf(SHOP))).toBe(second)
    })
  })
}
