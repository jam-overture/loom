import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { AuthReadout } from "@/app/(portal)/_lib/signin-view"

import { SignInHero } from "./sign-in-hero"

const okReadout: AuthReadout = { ok: true }

const brokenReadout: AuthReadout = {
  ok: false,
  headline: "This portal isn't set up yet.",
  detail: "Whoever runs this deployment has to finish configuring sign-in.",
  technical:
    "LOOM_PORTAL_SESSION_SECRET is unset or shorter than 32 characters, so no session can be signed. Generate one with: openssl rand -hex 32",
}

/**
 * The properties the finding-that-caused-this-run named: a way back, a way
 * forward for somebody without a key, and — when the deployment is misconfigured
 * — no environment-variable name at the altitude a visitor reads.
 */
describe("SignInHero", () => {
  it("carries a link back to the marketing home, so the loop closes", () => {
    render(<SignInHero readout={okReadout} destination="/portal/pages" />)

    const back = screen.getByRole("link", { name: /back to loom/i })

    expect(back.getAttribute("href")).toBe("/")
  })

  it("offers the live demo as the next-action for a visitor who does not hold a key", () => {
    render(<SignInHero readout={okReadout} destination="/portal/pages" />)

    const demo = screen.getByRole("link", { name: /see the live demo/i })

    /*
     * `/portal/demo` is a public path (see `_lib/auth/paths.ts`), so linking
     * a signed-out visitor at it does not send them straight back through the
     * proxy's redirector to this page.
     */
    expect(demo.getAttribute("href")).toBe("/portal/demo")
  })

  it("does not name environment variables in the prose a visitor reads first", () => {
    const { container } = render(<SignInHero readout={brokenReadout} destination="/portal/pages" />)

    /*
     * The disclosure keeps the operator string in the DOM (find-in-page still
     * finds it, deliberately), so this assertion has to look outside the
     * disclosure rather than at the whole tree. The rule the finding named is
     * that a visitor never reads a variable name *unasked*.
     */
    const disclosure = container.querySelector("details")
    expect(disclosure).not.toBeNull()
    if (!disclosure) return

    const visible = container.cloneNode(true) as HTMLElement
    visible.querySelectorAll("details").forEach((node) => node.remove())

    expect(visible.textContent ?? "").not.toContain("LOOM_PORTAL")
    expect(visible.textContent ?? "").not.toContain("openssl")
  })

  it("keeps the operator's message word for word behind the disclosure", () => {
    const { container } = render(<SignInHero readout={brokenReadout} destination="/portal/pages" />)

    const disclosure = container.querySelector("details")
    expect(disclosure).not.toBeNull()
    if (!disclosure) return

    /*
     * "Nothing is ever removed" — the exact bytes `describeAuthProblem`
     * returned still live on the page, one click away rather than at the top
     * of it.
     */
    expect(within(disclosure).getByText(/LOOM_PORTAL_SESSION_SECRET/)).toBeTruthy()
    expect(within(disclosure).getByText(/openssl rand -hex 32/)).toBeTruthy()
  })

  it("disables the form when the deployment is misconfigured, so nobody can type into a form that will never accept", () => {
    render(<SignInHero readout={brokenReadout} destination="/portal/pages" />)

    /*
     * Two properties in one assertion: the form still shows (an operator
     * setting this up wants to see the shape of what will work), and it will
     * not submit while the config is broken. `disabled` on both the input and
     * the button covers a keyboard user who tab-presses "Enter" in the field.
     */
    const input = screen.getByLabelText(/access key/i) as HTMLInputElement
    expect(input.disabled).toBe(true)

    const submit = screen.getByRole("button", { name: /sign in/i }) as HTMLButtonElement
    expect(submit.disabled).toBe(true)
  })

  it("threads the return path through the form's hidden field, so a redirected visitor lands where they were going", () => {
    const { container } = render(
      <SignInHero readout={okReadout} destination="/portal/pages/t_1?tab=held" />
    )

    const hidden = container.querySelector('input[name="from"]') as HTMLInputElement | null
    expect(hidden?.value).toBe("/portal/pages/t_1?tab=held")
  })
})
