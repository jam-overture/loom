import { describe, expect, it } from "vitest"

import { err, ok } from "@jam-overture/loom"

import { READER_WINDOWS } from "@/app/_lib/pages/reader-windows"

import { WINDOW_LABEL, privacyNoticeSentence, windowSentence } from "./reader-window"

const SET_AT = Date.UTC(2026, 10, 13, 21, 30)

describe("windowSentence", () => {
  it("says the store did not answer rather than calling it Off", () => {
    const said = windowSentence(err({ detail: "relation does not exist" }))

    expect(said).toMatch(/^The store did not say/)
    expect(said).not.toMatch(/^Off/)
  })

  it("says Off when nobody has changed it", () => {
    expect(windowSentence(ok(null))).toBe(
      "Off: every page view shows the newest pages. Nobody has changed it."
    )
  })

  it("says since when for an Off somebody chose", () => {
    expect(windowSentence(ok({ window: "off", setAt: SET_AT }))).toMatch(
      /^Off since 13 November 2026.*: every page view shows the newest pages\.$/
    )
  })

  it("says how long a reader is kept, and since when", () => {
    expect(windowSentence(ok({ window: "1d", setAt: SET_AT }))).toMatch(
      /^A reader keeps the pages they first saw for a day, since 13 November 2026/
    )
  })
})

describe("privacyNoticeSentence", () => {
  it("has nothing to paste for Off, which sets no cookie", () => {
    expect(privacyNoticeSentence("off")).toBeUndefined()
  })

  it("names the longest a reader is kept for every window that sets one", () => {
    expect(privacyNoticeSentence("7d")).toMatch(/for up to seven days after your first visit/)
    expect(privacyNoticeSentence("1h")).toMatch(/for up to an hour after your first visit/)
  })
})

describe("WINDOW_LABEL", () => {
  it("labels the four choices as the record lists them", () => {
    expect(READER_WINDOWS.map((window) => WINDOW_LABEL[window])).toEqual([
      "Off",
      "1 hour",
      "1 day",
      "7 days",
    ])
  })
})
