import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { UnderConstruction } from "./under-construction"

/**
 * The banner exists so a stranger who followed *Portal* from the marketing
 * site's menu learns, before they judge anything else on the screen, that most
 * of this surface is not built yet.
 *
 * What is asserted is the **claim and its reachability**, not the wording. The
 * copy is the maintainer's to change; a test that pinned the sentence would
 * make his own edit go red.
 */
describe("UnderConstruction", () => {
  it("says the surface is unfinished and says it is coming", () => {
    const { container } = render(<UnderConstruction />)
    const words = (container.textContent ?? "").toLowerCase()

    expect(words).toContain("still being built")
    expect(words).toContain("coming soon")
  })

  /**
   * `status` and not `alert`. This is a standing condition rather than
   * something that just happened, and an alert would interrupt a screen reader
   * on every navigation within the portal — the behaviour `StateNotice` already
   * reasons about and reserves for a read that failed.
   */
  it("is announced as a standing condition rather than an interruption", () => {
    render(<UnderConstruction />)

    expect(screen.getByRole("status")).toBeTruthy()
    expect(screen.queryByRole("alert")).toBeNull()
  })

  /**
   * The amber the portal already uses for something held and waiting on a
   * person, rather than the red it uses for a refusal. Nothing here is broken,
   * and red would say it was.
   */
  it("wears the waiting colour rather than the refusal colour", () => {
    const banner = render(<UnderConstruction />).container.querySelector(
      "[data-under-construction]"
    )
    const classes = banner?.className ?? ""

    expect(classes).toContain("bg-awaiting")
    expect(classes).not.toContain("refuse")
    expect(classes).not.toContain("rejected")
  })
})
