import { describe, expect, it } from "vitest"

import { applicationIdSchema } from "@jam-overture/loom/store"

import { memoryModelKeyStore } from "./model-keys-memory"
import { hintOf, keepModelKey, modelKeySchema, readModelKey, standingOf } from "./model-keys"
import { sealerFrom } from "./seal"

const KEY = modelKeySchema.parse("sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123WXYZ")
const SHOP = applicationIdSchema.parse("app_shop")

describe("readModelKey", () => {
  it("takes an Anthropic key, trimmed of the space a paste brings with it", () => {
    expect(readModelKey(`  ${KEY}\n`)).toEqual({ ok: true, value: KEY })
  })

  it.each([
    ["nothing", ""],
    ["another provider's key", "sk-proj-abcdefghijklmnopqrstuvwxyz"],
    ["a key with a space in it", "sk-ant-api03 abcdefghijklmnopqrstuvwxyz"],
    ["the prefix alone", "sk-ant-"],
    ["not text", 42],
  ])("refuses %s", (_name, typed) => {
    expect(readModelKey(typed).ok).toBe(false)
  })
})

describe("standingOf", () => {
  const sealer = sealerFrom("s".repeat(64))

  it("opens a key that was kept, and shows its last four characters", async () => {
    const store = memoryModelKeyStore()
    await keepModelKey(store, sealer)(SHOP, KEY, 5)
    const kept = await store.kept(SHOP)

    expect(kept.ok && kept.value?.sealed).not.toContain(KEY)
    expect(standingOf(kept.ok ? kept.value : null, sealer)).toEqual({
      kind: "set",
      key: KEY,
      hint: "WXYZ",
      setAt: 5,
    })
    expect(hintOf(KEY)).toBe("WXYZ")
  })

  it("says none where nothing was kept", () => {
    expect(standingOf(null, sealer)).toEqual({ kind: "none" })
  })

  it("says unreadable for a key kept under a secret the deployment no longer has", () => {
    const sealed = sealerFrom("t".repeat(64)).seal(KEY)

    expect(standingOf({ sealed, hint: "WXYZ", setAt: 5 }, sealer)).toEqual({
      kind: "unreadable",
      hint: "WXYZ",
      setAt: 5,
    })
  })
})
