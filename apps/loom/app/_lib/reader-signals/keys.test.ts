import { describe, expect, it } from "vitest"

import { ingestKeySchema, mintIngestKey } from "./keys"

describe("an ingest key", () => {
  it("is minted in the shape it is parsed in", () => {
    expect(ingestKeySchema.safeParse(mintIngestKey()).success).toBe(true)
  })

  it("is never minted twice", () => {
    const minted = new Set(Array.from({ length: 64 }, mintIngestKey))

    expect(minted.size).toBe(64)
  })

  /** The prefix is what tells it apart from an account key, which is a secret of the same length. */
  it("refuses an account key's bare shape", () => {
    expect(ingestKeySchema.safeParse("0123456789abcdef0123456789abcdef").success).toBe(false)
  })
})
