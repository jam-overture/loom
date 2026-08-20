import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { TopBarChrome } from "./topbar"

/**
 * The wordmark was a `<span>` for two months and a finding for one week.
 *
 * A visitor who followed the marketing site's Sign-in action landed on
 * `/portal/sign-in`, and the only interactive element on the page they had
 * arrived at was the sign-in form itself — which they could not fill in — and
 * the browser's back button. This locks the fix in: the wordmark is a link, and
 * where it points depends on whether there is a session to keep on.
 */
describe("TopBarChrome", () => {
  it("links a signed-out visitor back to the marketing home", () => {
    render(<TopBarChrome actor={null} />)

    /*
     * `getByRole("link")` finds only one link — the wordmark — because the
     * signed-out topbar carries no other. Once a session exists there is also
     * the sign-out form; that is a form, not a link, so this stays unambiguous.
     */
    const home = screen.getByRole("link")

    expect(home.getAttribute("href")).toBe("/")
    expect(home.getAttribute("aria-label")).toBe("Loom home")
  })

  it("keeps a signed-in reviewer inside the portal rather than pushing them out", () => {
    render(<TopBarChrome actor="reviewer@example.com" />)

    const home = screen.getByRole("link")

    /*
     * `/portal`, not `/`. A reviewer who is here to work does not want to be
     * dropped back on the marketing site every time they misclick — the docs'
     * wordmark points at `/docs` for exactly this reason.
     */
    expect(home.getAttribute("href")).toBe("/portal")
    expect(home.getAttribute("aria-label")).toBe("Portal home")
  })

  it("still holds the wordmark's parts, so nothing was traded to make it a link", () => {
    render(<TopBarChrome actor={null} />)

    expect(screen.getByText("loom")).toBeTruthy()
    expect(screen.getByText("portal · alpha")).toBeTruthy()
  })

  it("shows the actor when there is one, and no sign-out control when there is not", () => {
    const { rerender } = render(<TopBarChrome actor={null} />)

    expect(screen.queryByRole("button", { name: "sign out" })).toBeNull()

    rerender(<TopBarChrome actor="reviewer@example.com" />)

    expect(screen.getByText("reviewer@example.com")).toBeTruthy()
    expect(screen.getByRole("button", { name: "sign out" })).toBeTruthy()
  })
})
