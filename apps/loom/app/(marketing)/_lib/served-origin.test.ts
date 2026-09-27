import { describe, expect, it } from "vitest"

import { originFromHost, siteOrigin } from "./site"

/**
 * The two hosts, and the month this site spent assuming they were one.
 *
 * `siteOrigin()` answers *where does this page live* from the environment.
 * `originFromHost` answers *where did this request arrive* from the headers.
 * They are equal on a laptop with nothing set and on production with
 * `LOOM_SITE_ORIGIN` pinned, and they are **different on every preview
 * deployment**: `VERCEL_URL` is the deployment-unique hostname and a reader is
 * on the branch alias.
 *
 * The cost of the confusion was visible and was reported by the maintainer: the
 * front door's framed demonstration carried an absolute `src` on the *other*
 * host, a preview's deployment protection answered that frame with a sign-in
 * page that refuses to be framed, and the band rendered as the browser's
 * broken-document glyph. The same fault with a different second host is why
 * `pnpm shoot --serve` had been photographing the same hole for weeks.
 */

describe("the origin a request arrived on", () => {
  it("is the forwarded host, which is the one the reader is looking at", () => {
    expect(
      originFromHost("loom-git-marketing-40-a-band-65d54f.vercel.app", "https")
    ).toBe("https://loom-git-marketing-40-a-band-65d54f.vercel.app")
  })

  /**
   * The case the maintainer hit, as a single assertion: the two answers are not
   * the same string, and the frame needs the first one.
   */
  it("disagrees with the environment on a preview, which is the whole finding", () => {
    const declared = siteOrigin({ VERCEL_URL: "loom-9kd3jf.vercel.app" })
    const arrived = originFromHost("loom-git-marketing-40.vercel.app", "https")

    expect(declared).toBe("https://loom-9kd3jf.vercel.app")
    expect(arrived).not.toBe(declared)
  })

  /** Several proxies append to one header; the client-facing entry is first. */
  it("takes the first entry of a list", () => {
    expect(originFromHost("front.example, inner.example", "https, http")).toBe(
      "https://front.example"
    )
  })

  it("keeps a port", () => {
    expect(originFromHost("127.0.0.1:41234")).toBe("http://127.0.0.1:41234")
  })

  /**
   * `next start` on a laptop sets no `x-forwarded-proto`. Guessing `https`
   * there would aim the frame at a port serving plain HTTP — which is the
   * screenshot-harness half of this finding, so it has a case of its own.
   */
  it.each([
    ["localhost:3000", "http://localhost:3000"],
    ["127.0.0.1:40473", "http://127.0.0.1:40473"],
    ["[::1]:8080", "http://[::1]:8080"],
    ["loom.example", "https://loom.example"],
  ])("assumes the right scheme for %s when nothing said", (host, expected) => {
    expect(originFromHost(host)).toBe(expected)
  })

  it("prefers what the proxy said over the guess", () => {
    expect(originFromHost("localhost:3000", "https")).toBe("https://localhost:3000")
  })

  /**
   * **A `Host` header is attacker-controlled where nothing pins one**, and what
   * it reaches is an address the visitor's own page tells their browser to
   * load. Anything that is not a bare authority is refused so the caller falls
   * back to the environment, which is the safe answer rather than the useful
   * one.
   */
  it.each([
    ["nothing at all", undefined],
    ["an empty string", ""],
    ["only a comma", ","],
    ["a path smuggled in", "evil.example/redirect"],
    ["credentials", "user:password@evil.example"],
    ["a second scheme", "https://evil.example"],
    ["a space", "evil example"],
    ["a backslash", "evil.example\\@good.example"],
  ])("refuses %s", (_name, host) => {
    expect(originFromHost(host)).toBeUndefined()
  })

  /**
   * The fallback is the caller's, and this says the refusal is usable: a
   * rejected header leaves the site exactly where it was before this existed.
   */
  it("leaves a caller with something to fall back to", () => {
    expect(originFromHost("evil.example/redirect") ?? siteOrigin({})).toBe(
      "http://localhost:3000"
    )
  })
})
