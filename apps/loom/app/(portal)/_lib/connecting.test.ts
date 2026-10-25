import { describe, expect, it } from "vitest"

import { ingestKeySchema } from "@/app/_lib/reader-signals/keys"

import { runtimeWordsIn } from "../_test/plain-language"
import { acceptedFrom, publishCommandFor, signalAddress, snippetFor } from "./connecting"

const KEY = ingestKeySchema.parse("lk_0123456789abcdef0123456789abcdef")

describe("where a project's pages post", () => {
  it("is the deployment's door, in full, carrying the project's key", () => {
    expect(signalAddress("https://loom.example", KEY)).toBe(
      `https://loom.example/api/reader-signals?key=${KEY}`
    )
  })

  /** An origin read off a header can arrive with a trailing slash, and a doubled one is a different path. */
  it("does not double the slash an origin arrives with", () => {
    expect(signalAddress("https://loom.example/", KEY)).toBe(
      `https://loom.example/api/reader-signals?key=${KEY}`
    )
  })

  /** A relative address on a customer's page posts to the customer's own server. */
  it("is never relative", () => {
    expect(URL.canParse(signalAddress("https://loom.example", KEY))).toBe(true)
  })
})

describe("the snippet a customer pastes", () => {
  const snippet = snippetFor(signalAddress("https://loom.example", KEY))

  it("posts to the address it was given", () => {
    expect(snippet).toContain(
      `deliverReaderSignals({ url: "https://loom.example/api/reader-signals?key=${KEY}" })`
    )
  })

  it("watches the root the renderer addresses", () => {
    expect(snippet).toContain('document.querySelector("[data-loom-tree]")')
  })

  /** A page with no rendered tree is left alone rather than thrown on. */
  it("does nothing on a page with no tree", () => {
    expect(snippet).toContain("if (page !== null)")
  })

  /** Imported from where the runtime publishes the pair, so the line works as pasted. */
  it("imports both calls from the runtime's broadcast entry", () => {
    expect(snippet.split("\n")[0]).toBe(
      'import { broadcastReaderSignals, deliverReaderSignals } from "@jam-overture/loom/signals/broadcast"'
    )
  })

  /** The key is public (0298), so nothing is left for somebody to fill in. */
  it("leaves no blank to fill in", () => {
    expect(snippet).not.toMatch(/process\.env|<[A-Z_]+>|YOUR_/u)
  })
})

describe("where deliveries are taken from", () => {
  it("names the one host a project names, and says it means exactly that", () => {
    expect(acceptedFrom("shop.example.com")).toContain("shop.example.com and nowhere else")
  })

  it("says plainly when a project names no host", () => {
    expect(acceptedFrom(undefined)).toContain("any site that sends this key")
  })

  it.each([["shop.example.com"], [undefined]])(
    "says it without the runtime's vocabulary (%s)",
    (host) => {
      expect(runtimeWordsIn(acceptedFrom(host))).toEqual([])
    }
  )
})

describe("the command a build publishes its pages with", () => {
  it("posts to this deployment's pages address, once, however the origin ends", () => {
    expect(publishCommandFor("https://loom.test/")).toContain('"https://loom.test/api/pages"')
  })

  it("reads the key from the build's secrets rather than printing it", () => {
    const command = publishCommandFor("https://loom.test")

    expect(command).toContain("Bearer $LOOM_PUBLISH_KEY")
    expect(command).not.toMatch(/lp_[0-9a-f]/u)
  })
})
