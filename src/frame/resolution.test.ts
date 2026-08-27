import { describe, expect, it } from "vitest"

import { createFrameOriginRegistry, type FrameOriginRegistry } from "./origin.js"
import { describeFrameRefusal, resolveFrame } from "./resolution.js"
import { frameCatalogue } from "./catalogue.js"

const registry = (): FrameOriginRegistry => {
  const built = createFrameOriginRegistry([
    { origin: "https://player.vimeo.com", description: "Vimeo player embeds" },
    { origin: "https://app.example", description: "our own product tour", self: true },
  ])

  if (!built.ok) throw new Error("fixture registry did not build")

  return built.value
}

describe("resolving a frame", () => {
  it("allows a URL on a registered origin and hands back the normalised href", () => {
    const outcome = resolveFrame("https://player.vimeo.com/video/42", registry())

    expect(outcome).toEqual({
      status: "allowed",
      url: "https://player.vimeo.com/video/42",
      origin: "https://player.vimeo.com",
      sameOrigin: false,
    })
  })

  /**
   * What the browser resolves has to be what the allowlist checked. A `src`
   * echoed back verbatim could differ from the string that was parsed, which
   * would make the check advisory rather than binding.
   */
  it("hands back the parsed URL rather than the string it was given", () => {
    const outcome = resolveFrame("https://PLAYER.vimeo.com:443/video/42", registry())

    expect(outcome.status === "allowed" && outcome.url).toBe("https://player.vimeo.com/video/42")
  })

  it("marks a frame on the deployment's own origin, which is permitted and inert", () => {
    const outcome = resolveFrame("https://app.example/tour", registry())

    expect(outcome.status === "allowed" && outcome.sameOrigin).toBe(true)
  })

  it("refuses an origin nobody registered, naming the origin and not the path", () => {
    const outcome = resolveFrame("https://evil.example/steal?token=abc", registry())

    expect(outcome.status === "refused" && outcome.refusal.reason).toBe("unlisted-origin")
    expect(outcome.status === "refused" && outcome.refusal.detail).toBe(
      '"https://evil.example" is not registered'
    )
  })

  /**
   * The whole reason this seam exists beside 0053: a scheme allowlist passes
   * every one of these, and none of them is a document anyone chose to run.
   */
  it("refuses every URL on an unregistered origin that a scheme check would pass", () => {
    const permitted = registry()

    for (const url of [
      "https://collect.example.com/harvest",
      "http://player.vimeo.com/video/42",
      "https://player.vimeo.com.evil.example/video/42",
    ]) {
      expect(resolveFrame(url, permitted).status).toBe("refused")
    }
  })

  it("refuses a non-http scheme as unframeable, whether or not an allowlist was wired", () => {
    for (const wired of [registry(), undefined]) {
      const outcome = resolveFrame("javascript:alert(1)", wired)

      expect(outcome.status === "refused" && outcome.refusal.reason).toBe("unframeable")
    }
  })

  it("refuses a value that is not a string, rather than throwing on the page", () => {
    for (const value of [42, null, true, undefined, { src: "x" }] as const) {
      const outcome = resolveFrame(value as never, registry())

      expect(outcome.status === "refused" && outcome.refusal.reason).toBe("unframeable")
    }
  })

  it("refuses a relative URL, which has no origin to check", () => {
    expect(resolveFrame("/video/42", registry()).status).toBe("refused")
  })

  /**
   * The seam fails closed for the same reason the submission seam does: the
   * registry *is* the allowlist, so a deployment that has not written one has
   * not agreed to run anybody's script inside its pages.
   */
  it("refuses everything when no allowlist was wired, and says that is why", () => {
    const outcome = resolveFrame("https://player.vimeo.com/video/42", undefined)

    expect(outcome.status === "refused" && outcome.refusal.reason).toBe("no-registry")
  })

  it("describes every refusal in a sentence naming what was wrong", () => {
    for (const reason of ["no-registry", "unlisted-origin", "unframeable"] as const) {
      expect(describeFrameRefusal({ reason, detail: "the detail" })).toContain("the detail")
    }
  })
})

describe("the frame catalogue", () => {
  it("lists an origin and its line, in registration order", () => {
    expect(frameCatalogue(registry())).toEqual([
      { origin: "https://player.vimeo.com", description: "Vimeo player embeds" },
      { origin: "https://app.example", description: "our own product tour" },
    ])
  })

  /**
   * Whether an origin is the deployment's own is a fact about the deployment's
   * security posture and tells a model nothing about which video belongs on the
   * page.
   */
  it("does not project `self`, which is none of a model's business", () => {
    for (const entry of frameCatalogue(registry())) {
      expect(Object.keys(entry).sort()).toEqual(["description", "origin"])
    }
  })
})
