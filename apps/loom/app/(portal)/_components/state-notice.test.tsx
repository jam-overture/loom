import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { StateNotice } from "./state-notice"

/**
 * The property under test is the one the component exists for: a failed read and
 * an empty store must not be the same object on screen. Everything else here is
 * in service of that — the tone reaches the DOM, the failure is announced, the
 * other two are not.
 */
describe("StateNotice", () => {
  it("carries its tone into the DOM, so emptiness and failure are distinguishable", () => {
    const { container } = render(
      <>
        <StateNotice tone="empty">nothing yet</StateNotice>
        <StateNotice tone="failure">it broke</StateNotice>
        <StateNotice tone="notice">worth knowing</StateNotice>
      </>
    )

    const tones = [...container.querySelectorAll("[data-tone]")].map((element) =>
      element.getAttribute("data-tone")
    )

    expect(tones).toEqual(["empty", "failure", "notice"])
  })

  it("styles a failure differently from an empty state rather than only rewording it", () => {
    const { container: empty } = render(<StateNotice tone="empty">nothing yet</StateNotice>)
    const { container: failure } = render(<StateNotice tone="failure">it broke</StateNotice>)

    const emptyClasses = empty.querySelector("[data-tone]")?.className ?? ""
    const failureClasses = failure.querySelector("[data-tone]")?.className ?? ""

    expect(emptyClasses).not.toBe(failureClasses)
    /*
     * Named rather than merely "different", because "different" would pass if
     * both were grey. Dashed reads as a space something goes in; the refusal
     * background is the one that cannot be skimmed past.
     */
    expect(emptyClasses).toContain("border-dashed")
    expect(failureClasses).toContain("bg-rejected")
    expect(failureClasses).not.toContain("border-dashed")
  })

  it("announces a failure and stays quiet for the other two", () => {
    render(
      <>
        <StateNotice tone="failure">the store did not answer</StateNotice>
        <StateNotice tone="empty">no trees</StateNotice>
        <StateNotice tone="notice">no database</StateNotice>
      </>
    )

    const announced = screen.getAllByRole("status")

    expect(announced).toHaveLength(1)
    expect(announced[0]?.textContent).toContain("the store did not answer")
  })

  it("renders the title only when there is one, so a notice has no headline to ignore", () => {
    const { container: titled } = render(
      <StateNotice tone="empty" title="The store has no trees in it.">
        body
      </StateNotice>
    )
    const { container: bare } = render(<StateNotice tone="notice">body</StateNotice>)

    expect(titled.textContent).toContain("The store has no trees in it.")
    expect(bare.textContent).toBe("body")
  })

  it("renders the action, because an empty state that names no next step is a dead end", () => {
    render(
      <StateNotice tone="empty" title="nothing here" action={<a href="/portal/demo">try the demo</a>}>
        body
      </StateNotice>
    )

    expect(screen.getByRole("link", { name: "try the demo" }).getAttribute("href")).toBe("/portal/demo")
  })
})
