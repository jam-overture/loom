import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { StateNotice } from "./state-notice"

/** The shape an `empty` now has to have, so the tests below say why rather than repeat it. */
const somewhereToGo = <a href="/demo">try the demo</a>

/**
 * The property under test is the one the component exists for: a failed read, an
 * empty store and a clean result must not be the same object on screen.
 * Everything else here is in service of that — the tone reaches the DOM, the
 * failure is announced, the others are not.
 */
describe("StateNotice", () => {
  it("carries its tone into the DOM, so emptiness and failure are distinguishable", () => {
    const { container } = render(
      <>
        <StateNotice tone="empty" title="nothing yet" action={somewhereToGo}>
          nothing yet
        </StateNotice>
        <StateNotice tone="settled">all clear</StateNotice>
        <StateNotice tone="failure">it broke</StateNotice>
        <StateNotice tone="notice">worth knowing</StateNotice>
      </>
    )

    const tones = [...container.querySelectorAll("[data-tone]")].map((element) =>
      element.getAttribute("data-tone")
    )

    expect(tones).toEqual(["empty", "settled", "failure", "notice"])
  })

  it("styles a failure differently from an empty state rather than only rewording it", () => {
    const { container: empty } = render(
      <StateNotice tone="empty" title="nothing yet" action={somewhereToGo}>
        nothing yet
      </StateNotice>
    )
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

  /**
   * The distinction this tone was added for, asserted where it can be seen.
   *
   * "You're all caught up." was rendered in the dashed box that means "nothing
   * here yet" — so the reader who did not open the disclosure met a blank slot
   * where a clean bill of health should be. `settled` must not be dashed, and it
   * must not be grey either: a good result carries the same colour the portal
   * already uses for a change that went through.
   */
  it("shows a good result as a result rather than as a space something goes in", () => {
    const { container: settled } = render(
      <StateNotice tone="settled" title="You're all caught up.">
        nothing has stopped for you
      </StateNotice>
    )
    const { container: empty } = render(
      <StateNotice tone="empty" title="nothing yet" action={somewhereToGo}>
        nothing yet
      </StateNotice>
    )

    const settledClasses = settled.querySelector("[data-tone]")?.className ?? ""

    expect(settledClasses).not.toContain("border-dashed")
    expect(settledClasses).toContain("bg-applied")
    expect(settledClasses).not.toBe(empty.querySelector("[data-tone]")?.className ?? "")
  })

  it("announces a failure and stays quiet for the other three", () => {
    render(
      <>
        <StateNotice tone="failure">the store did not answer</StateNotice>
        <StateNotice tone="empty" title="no trees" action={somewhereToGo}>
          no trees
        </StateNotice>
        <StateNotice tone="settled">nothing is waiting</StateNotice>
        <StateNotice tone="notice">no database</StateNotice>
      </>
    )

    const announced = screen.getAllByRole("status")

    expect(announced).toHaveLength(1)
    expect(announced[0]?.textContent).toContain("the store did not answer")
  })

  it("renders the title only when there is one, so a notice has no headline to ignore", () => {
    const { container: titled } = render(
      <StateNotice tone="empty" title="The store has no trees in it." action={somewhereToGo}>
        body
      </StateNotice>
    )
    const { container: bare } = render(<StateNotice tone="notice">body</StateNotice>)

    expect(titled.textContent).toContain("The store has no trees in it.")
    expect(bare.textContent).toBe("body")
  })

  it("renders the action, because an empty state that names no next step is a dead end", () => {
    render(
      <StateNotice tone="empty" title="nothing here" action={somewhereToGo}>
        body
      </StateNotice>
    )

    expect(screen.getByRole("link", { name: "try the demo" }).getAttribute("href")).toBe("/demo")
  })

  /**
   * The guarantee itself, asserted at the only place it can be: the compiler.
   *
   * "Every screen answers *what do I do now?*" is the brief's third rule, and an
   * empty state is where a new person actually starts — so an `empty` with no
   * `action` is the dead end that rule exists to forbid. A runtime test could
   * only check the screens somebody remembered to write one for; a type error
   * catches the screen nobody thought about.
   *
   * `@ts-expect-error` is the assertion. It fails the typecheck if the line
   * below stops being an error, so this cannot rot into a comment.
   */
  it("will not compile an empty state with nothing to do, or with nothing to read", () => {
    render(
      <>
        {/* @ts-expect-error an `empty` without an `action` is a dead end */}
        <StateNotice tone="empty" title="nothing here">
          body
        </StateNotice>
        {/* @ts-expect-error an `empty` without a `title` has buried the state it announces */}
        <StateNotice tone="empty" action={somewhereToGo}>
          body
        </StateNotice>
      </>
    )

    /* Both rendered anyway — the guarantee is at build time, not a runtime throw. */
    expect(screen.getAllByText("body")).toHaveLength(2)
  })
})
