import { describe, expect, it } from "vitest"

import { viewKeySchema } from "./signal.js"
import { mintViewKey, VIEW_KEY_BYTES, VIEW_KEY_LENGTH, viewKeyPattern } from "./view.js"

const counting = (): ((count: number) => Uint8Array) => {
  let next = 0

  return (count) => Uint8Array.from({ length: count }, () => next++ % 256)
}

describe("mintViewKey", () => {
  it("mints a key the schema accepts", () => {
    expect(viewKeySchema.safeParse(mintViewKey(counting())).success).toBe(true)
  })

  it("spends the full width on randomness", () => {
    const key = mintViewKey(counting())

    expect(key).toHaveLength(VIEW_KEY_LENGTH)
    expect(key).toMatch(viewKeyPattern)
  })

  it("asks for every byte it needs and uses all of them", () => {
    const asked: number[] = []
    mintViewKey((count) => {
      asked.push(count)

      return new Uint8Array(count)
    })

    expect(asked).toEqual([VIEW_KEY_BYTES])
  })

  it("pads a byte below sixteen rather than dropping its nibble", () => {
    expect(mintViewKey(() => new Uint8Array(VIEW_KEY_BYTES).fill(1))).toBe("01".repeat(VIEW_KEY_BYTES))
  })

  it("gives two broadcasts different keys", () => {
    const random = counting()

    expect(mintViewKey(random)).not.toBe(mintViewKey(random))
  })

  it("reaches the browser's randomness when nothing is passed", () => {
    expect(mintViewKey()).not.toBe(mintViewKey())
  })
})

describe("what the view key refuses to be", () => {
  /**
   * The shape is the enforcement, not a convention. A free-form column here is
   * somewhere a host could put a visitor id and have everything downstream keep
   * working, which is precisely what 0146 refuses.
   */
  it.each([
    ["an email address", "reader@example.com"],
    ["a hashed address", "sha256:9f86d081884c7d659a2feaa0c55ad015"],
    ["an account id", "user-4821"],
    ["a uuid with its dashes", "3f2504e0-4f89-11d3-9a0c-0305e82c3301"],
    ["uppercase hex", "3F2504E04F8911D39A0C0305E82C3301"],
    ["too few characters", "0".repeat(VIEW_KEY_LENGTH - 1)],
    ["too many characters", "0".repeat(VIEW_KEY_LENGTH + 1)],
  ])("refuses %s", (_name, candidate) => {
    expect(viewKeySchema.safeParse(candidate).success).toBe(false)
  })
})
