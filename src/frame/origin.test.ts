import { describe, expect, it } from "vitest"

import {
  createFrameOriginRegistry,
  describeFrameOriginRegistryError,
  frameOriginSchema,
} from "./origin.js"

const registryOf = (...definitions: Parameters<typeof createFrameOriginRegistry>[0]) => {
  const built = createFrameOriginRegistry(definitions)
  if (!built.ok) throw new Error(describeFrameOriginRegistryError(built.error))

  return built.value
}

describe("a framable origin", () => {
  it("normalises case, the default port and a bare trailing slash to one registration", () => {
    expect(frameOriginSchema.parse("HTTPS://Player.Vimeo.com")).toBe("https://player.vimeo.com")
    expect(frameOriginSchema.parse("https://player.vimeo.com:443/")).toBe(
      "https://player.vimeo.com"
    )
  })

  it("keeps a non-default port, which is a different origin", () => {
    expect(frameOriginSchema.parse("https://player.vimeo.com:8443")).toBe(
      "https://player.vimeo.com:8443"
    )
  })

  /**
   * The one that matters most. `https://example.com/embed` reads as an
   * allowlist scoped to a directory, and an origin check cannot scope to one —
   * so it is refused rather than accepted and silently widened to the whole
   * host.
   */
  it("refuses a path, a query and a fragment rather than ignoring them", () => {
    for (const value of [
      "https://example.com/embed",
      "https://example.com/?a=1",
      "https://example.com/#x",
    ]) {
      expect(frameOriginSchema.safeParse(value).success).toBe(false)
    }
  })

  it("refuses a scheme that is not http(s), and anything that does not parse", () => {
    for (const value of ["javascript:alert(1)", "data:text/html,x", "player.vimeo.com", ""]) {
      expect(frameOriginSchema.safeParse(value).success).toBe(false)
    }
  })

  /**
   * `new URL` drops credentials from `origin` without complaint, so registering
   * one would be a deployment believing it had scoped an allowlist to an
   * authenticated host when it had scoped it to the whole host.
   */
  it("refuses embedded credentials rather than dropping them", () => {
    expect(frameOriginSchema.safeParse("https://user:secret@example.com").success).toBe(false)
  })
})

describe("the framable origin registry", () => {
  it("answers a URL with the registration covering its origin, whatever the path", () => {
    const registry = registryOf({ origin: "https://player.vimeo.com", description: "Vimeo" })

    const found = registry.origin(new URL("https://player.vimeo.com/video/42?h=abc"))

    expect(found?.origin).toBe("https://player.vimeo.com")
    expect(found?.self).toBe(false)
  })

  it("answers nothing for a sibling host, because a host is not an origin's suffix", () => {
    const registry = registryOf({ origin: "https://player.vimeo.com", description: "Vimeo" })

    expect(registry.origin(new URL("https://evil-player.vimeo.com.example/x"))).toBeUndefined()
    expect(registry.origin(new URL("http://player.vimeo.com/x"))).toBeUndefined()
  })

  it("carries `self` through, so the render can say a sandbox is inert", () => {
    const registry = registryOf({ origin: "https://app.example", description: "us", self: true })

    expect(registry.origin(new URL("https://app.example/tour"))?.self).toBe(true)
  })

  it("refuses an unparseable origin, naming it and what was wrong", () => {
    const built = createFrameOriginRegistry([{ origin: "example.com", description: "x" }])

    expect(built.ok).toBe(false)
    if (built.ok) return

    expect(built.error.code).toBe("invalid-frame-origin")
    expect(describeFrameOriginRegistryError(built.error)).toContain("example.com")
  })

  /**
   * Two registrations of one origin can only disagree about `self`, and
   * last-wins would make whether a sandbox is reported inert depend on
   * registration order.
   */
  it("refuses a duplicate, including one that only normalises to a duplicate", () => {
    const built = createFrameOriginRegistry([
      { origin: "https://example.com", description: "a" },
      { origin: "HTTPS://Example.com:443/", description: "b", self: true },
    ])

    expect(built.ok).toBe(false)
    if (!built.ok) expect(built.error.code).toBe("duplicate-frame-origin")
  })

  it("keeps registration order, so a catalogue reads predictably", () => {
    const registry = registryOf(
      { origin: "https://b.example", description: "b" },
      { origin: "https://a.example", description: "a" }
    )

    expect(registry.origins.map((entry) => entry.description)).toEqual(["b", "a"])
  })
})
