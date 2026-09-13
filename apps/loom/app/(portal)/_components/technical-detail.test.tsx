import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { TechnicalDetail } from "./technical-detail"

/**
 * The disclosure carries the whole "nothing is ever removed" half of the
 * plain-language rule, so what has to be pinned is not how it looks but that
 * the content is genuinely still there when it is shut. A disclosure that
 * unmounted its children would be a deletion wearing an arrow.
 */
describe("TechnicalDetail", () => {
  it("keeps its content in the document while closed", () => {
    render(
      <TechnicalDetail>
        <p>policy fingerprint 9f2c…</p>
      </TechnicalDetail>
    )

    expect(screen.queryByText("policy fingerprint 9f2c…")).not.toBeNull()
  })

  it("starts closed, so the plain language is what a reader meets first", () => {
    const { container } = render(
      <TechnicalDetail>
        <p>rule code</p>
      </TechnicalDetail>
    )

    expect(container.querySelector("details")?.open).toBe(false)
  })

  it("names itself, and can be told what it is hiding", () => {
    render(
      <TechnicalDetail summary="How this was decided">
        <p>within-policy</p>
      </TechnicalDetail>
    )

    expect(screen.queryByText("How this was decided")).not.toBeNull()
  })

  /**
   * The one thing about how it looks that is worth a test, because it is not a
   * matter of taste: the record's volume must not depend on what the record
   * happens to be mounted inside.
   *
   * For a fortnight it did. The body set no ink, so a disclosure in a card
   * inherited the body ink — the altitude of the plain sentence it is a
   * footnote to — and the same component in a `StateNotice` inherited muted.
   * jsdom computes no inheritance, so what is checkable is the thing that was
   * actually missing: **the body names its own altitude**.
   */
  it("sets the record's altitude itself rather than inheriting it", () => {
    const { container } = render(
      <div className="text-ink">
        <TechnicalDetail>
          <p>rule code</p>
        </TechnicalDetail>
      </div>
    )

    const body = container.querySelector("details > div")

    expect(body?.className).toContain("text-ink-muted")
  })

  it("never sets the body ink, which is the altitude of a plain sentence", () => {
    const { container } = render(
      <TechnicalDetail>
        <p>rule code</p>
      </TechnicalDetail>
    )

    const body = container.querySelector("details > div")

    expect(body?.className.split(/\s+/u)).not.toContain("text-ink")
  })

  it("falls back to a summary rather than an unlabelled arrow", () => {
    render(
      <TechnicalDetail>
        <p>within-policy</p>
      </TechnicalDetail>
    )

    expect(screen.queryByText("Technical details")).not.toBeNull()
  })
})
