import { describe, expect, it } from "vitest"

import { keptOrigin } from "./refusals"

describe("keptOrigin", () => {
  it("keeps the origin a header names", () => {
    expect(keptOrigin("https://loomjs.org")).toBe("https://loomjs.org")
    expect(keptOrigin("https://shop.example:8443")).toBe("https://shop.example:8443")
  })

  it('keeps no origin for none, for a sandboxed frame\'s "null", and for anything else', () => {
    expect(keptOrigin(null)).toBeNull()
    expect(keptOrigin("null")).toBeNull()
    expect(keptOrigin("not a url")).toBeNull()
  })

  /** The header is the sender's to write; only what `URL` makes of it reaches a screen. */
  it("keeps only the origin of a header carrying more", () => {
    expect(keptOrigin("https://shop.example/a/path?q=<script>")).toBe("https://shop.example")
  })
})
