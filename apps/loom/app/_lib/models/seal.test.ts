import { describe, expect, it } from "vitest"

import { sealerFrom } from "./seal"

const SECRET = "s".repeat(64)
const KEY = "sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789"

describe("sealerFrom", () => {
  it("opens what it sealed", () => {
    const sealer = sealerFrom(SECRET)

    expect(sealer.open(sealer.seal(KEY))).toEqual({ ok: true, value: KEY })
  })

  it("never stores the key readable, and seals the same key differently each time", () => {
    const sealer = sealerFrom(SECRET)
    const once = sealer.seal(KEY)

    expect(once).not.toContain(KEY)
    expect(once).not.toContain("sk-ant")
    expect(sealer.seal(KEY)).not.toBe(once)
  })

  it("cannot open what another secret sealed", () => {
    const sealed = sealerFrom(SECRET).seal(KEY)

    expect(sealerFrom("t".repeat(64)).open(sealed)).toEqual({ ok: false, error: "unreadable" })
  })

  it("refuses a sealed value that was altered or is not one at all", () => {
    const sealer = sealerFrom(SECRET)
    const [version, nonce, tag, body] = sealer.seal(KEY).split(".")
    const flipped = `${body?.startsWith("A") ? "B" : "A"}${body?.slice(1) ?? ""}`

    expect(sealer.open([version, nonce, tag, flipped].join(".")).ok).toBe(false)
    expect(sealer.open(KEY).ok).toBe(false)
    expect(sealer.open("v2.a.b.c").ok).toBe(false)
    expect(sealer.open("").ok).toBe(false)
  })
})
