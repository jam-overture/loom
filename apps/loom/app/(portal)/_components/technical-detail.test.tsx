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

  it("falls back to a summary rather than an unlabelled arrow", () => {
    render(
      <TechnicalDetail>
        <p>within-policy</p>
      </TechnicalDetail>
    )

    expect(screen.queryByText("Technical details")).not.toBeNull()
  })
})
