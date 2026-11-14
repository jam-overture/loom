import { describe, expect, it } from "vitest"

import { DEFAULT_THEME, SITE_THEME_NAMES } from "../site"

import { READER_CONTEXT_KEYS, readerContextFrom } from "./context"

const sending = (headers: Record<string, string> = {}): Headers => new Headers(headers)

describe("the context this server sets for a reader", () => {
  it("always names the palette, so there is always a context to match rules against", () => {
    for (const theme of SITE_THEME_NAMES) {
      expect(readerContextFrom(sending(), theme)).toEqual({ palette: theme })
    }
  })

  it("names the device the browser said it is", () => {
    expect(readerContextFrom(sending({ "sec-ch-ua-mobile": "?1" }), DEFAULT_THEME)).toEqual({
      palette: DEFAULT_THEME,
      device: "phone",
    })

    expect(readerContextFrom(sending({ "sec-ch-ua-mobile": "?0" }), DEFAULT_THEME)).toEqual({
      palette: DEFAULT_THEME,
      device: "desktop",
    })
  })

  /**
   * The asymmetry the module's docblock is about, stated as a case because it
   * is the behaviour somebody will be surprised by: Safari and Firefox send no
   * client hints, so their readers have no `device` and are served the base.
   *
   * It is here to be read rather than to catch a regression. A run that decides
   * to parse `User-Agent` instead will delete this case, and deleting it is the
   * point — it is the sentence that says what was given up and why.
   */
  it("names no device when the browser did not say, rather than inferring one", () => {
    const safari =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"

    expect(readerContextFrom(sending({ "user-agent": safari }), DEFAULT_THEME)).toEqual({
      palette: DEFAULT_THEME,
    })
  })

  it("names no device for a hint it does not recognise, rather than guessing at it", () => {
    for (const hint of ["", "1", "true", "?2", "mobile", "?1, ?0"]) {
      expect(readerContextFrom(sending({ "sec-ch-ua-mobile": hint }), DEFAULT_THEME)).toEqual({
        palette: DEFAULT_THEME,
      })
    }
  })

  /**
   * A key holding `undefined` is not JSON, and `clauseMatches` reads structure
   * as a non-match rather than as absence — the same answer by a longer route,
   * and one that would survive a change to how absence is read.
   */
  it("holds only keys it has answers for", () => {
    const context = readerContextFrom(sending(), DEFAULT_THEME)

    expect(Object.keys(context)).toEqual(["palette"])
    expect("device" in context).toBe(false)
  })

  /**
   * The published list and what the function sets are two statements of one
   * agreement — the portal prints the published one as *the keys a site's
   * server must set* — so a key added to the function and not to the list, or
   * the other way round, fails here.
   */
  it("sets every key it publishes and no others", () => {
    const everything = readerContextFrom(sending({ "sec-ch-ua-mobile": "?1" }), DEFAULT_THEME)

    expect(Object.keys(everything).sort()).toEqual([...READER_CONTEXT_KEYS].sort())
  })

  /**
   * Nothing a reader is, only what their browser announced and what they asked
   * for. The headers below are the ones that would identify somebody; a key
   * built from any of them would fail this.
   */
  it("reads nothing that says who the reader is", () => {
    const identifying = {
      cookie: "session=abc123",
      authorization: "Bearer abc123",
      "x-forwarded-for": "203.0.113.7",
      referer: "https://example.com/some/private/path?token=abc123",
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      "accept-language": "en-GB,en;q=0.9",
    }

    const context = readerContextFrom(sending(identifying), DEFAULT_THEME)

    expect(context).toEqual({ palette: DEFAULT_THEME })

    const said = JSON.stringify(context)

    for (const value of Object.values(identifying)) {
      expect(said).not.toContain(value)
    }
  })
})
