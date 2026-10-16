import { describe, expect, it } from "vitest"

import { actorSchema, digestOf, KEY_LENGTH, keySchema, mintKey } from "./accounts"

/**
 * What a key is, and what is stored instead of it.
 *
 * The decisions here are 0285's and they are the kind that look like details
 * until one is wrong: a key short enough to guess, a digest that is actually
 * the key, a mint that repeats itself.
 */

describe("mintKey", () => {
  it("mints a key of the declared shape", () => {
    expect(keySchema.safeParse(mintKey()).success).toBe(true)
  })

  it("mints 128 bits, which is what makes a plain digest enough", () => {
    expect(mintKey()).toHaveLength(KEY_LENGTH)
  })

  /**
   * Not a test of the platform's randomness — that is not this suite's to
   * prove — but of the thing that has actually gone wrong in credential code:
   * a value generated once and reused, or seeded from something that repeats.
   */
  it("does not mint the same key twice", () => {
    const minted = new Set(Array.from({ length: 64 }, mintKey))

    expect(minted.size).toBe(64)
  })
})

describe("digestOf", () => {
  it("is not the key", async () => {
    const key = mintKey()

    expect(await digestOf(key)).not.toBe(key)
  })

  it("answers the same digest for the same key, which is what makes the lookup work", async () => {
    const key = mintKey()

    expect(await digestOf(key)).toBe(await digestOf(key))
  })

  it("answers differently for two keys", async () => {
    expect(await digestOf(mintKey())).not.toBe(await digestOf(mintKey()))
  })

  it("is a SHA-256, as hex", async () => {
    expect(await digestOf("a-key")).toMatch(/^[0-9a-f]{64}$/)
  })

  /**
   * A known vector, so this cannot quietly become some other function.
   * Rotation, and every row already written, depend on the digest of a key
   * staying the digest of that key across every build.
   */
  it("is the SHA-256 everyone else computes for the same input", async () => {
    expect(await digestOf("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    )
  })
})

describe("actorSchema", () => {
  it("takes an email address, which is what a person reaches for first", () => {
    expect(actorSchema.safeParse("ana@example.com").success).toBe(true)
  })

  it("refuses what would not survive being rendered or stored in provenance", () => {
    for (const actor of ["", " ", "a", "ana bruno", "<script>", "ana/bruno", "a".repeat(65)]) {
      expect(actorSchema.safeParse(actor).success).toBe(false)
    }
  })
})
