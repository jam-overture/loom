import { describe, expect, it } from "vitest"

import type { Result } from "@jam-overture/loom"
import { applicationIdSchema } from "@jam-overture/loom/store"

import type { ReaderWindowStore } from "./reader-windows"

/** Both implementations of the reader windows, held to the same behaviour. */

const SHOP = applicationIdSchema.parse("app_shop")
const BLOG = applicationIdSchema.parse("app_blog")

const unwrap = <TValue>(result: Result<TValue, { readonly detail: string }>): TValue => {
  if (!result.ok) throw new Error(`expected ok, got ${result.error.detail}`)

  return result.value
}

export const describeReaderWindowStoreContract = (
  name: string,
  make: () => ReaderWindowStore | Promise<ReaderWindowStore>
): void => {
  describe(`${name} — ReaderWindowStore contract`, () => {
    it("has no window for an application nobody chose one for", async () => {
      const store = await make()

      expect(unwrap(await store.kept(SHOP))).toBeNull()
    })

    it("keeps what it was given, and a second choice replaces the first", async () => {
      const store = await make()

      unwrap(await store.put(SHOP, { window: "1d", setAt: 1 }))
      unwrap(await store.put(SHOP, { window: "7d", setAt: 2 }))

      expect(unwrap(await store.kept(SHOP))).toEqual({ window: "7d", setAt: 2 })
    })

    it("keeps Off as a choice made, apart from never having chosen", async () => {
      const store = await make()

      unwrap(await store.put(SHOP, { window: "off", setAt: 3 }))

      expect(unwrap(await store.kept(SHOP))).toEqual({ window: "off", setAt: 3 })
    })

    it("keeps two applications' windows apart", async () => {
      const store = await make()

      unwrap(await store.put(SHOP, { window: "1h", setAt: 1 }))
      unwrap(await store.put(BLOG, { window: "1d", setAt: 1 }))

      expect(unwrap(await store.kept(SHOP))?.window).toBe("1h")
      expect(unwrap(await store.kept(BLOG))?.window).toBe("1d")
    })
  })
}
