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

  /**
   * The assertion, inverted on 12 October, and kept rather than deleted.
   *
   * This screen offered the demo as the next action for a visitor without a
   * key, and the test said so. The maintainer asked for the demo gone from the
   * portal — by his count, for about the twentieth time — so the useful thing
   * to pin is the absence, not the removal: a test that is merely deleted
   * leaves nothing standing between the link and whoever adds it back next.
   */
  it("offers a visitor without a key no demo, anywhere on the screen", () => {
    const { container } = render(<SignInHero readout={okReadout} destination="/portal/pages" />)

    const hrefs = [...container.querySelectorAll("a")].map((link) => link.getAttribute("href"))

    expect(hrefs.filter((href) => href !== null && href.includes("demo"))).toEqual([])
    expect(container.textContent).not.toMatch(/demo/i)
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

  /**
   * **The one screen a stranger can actually reach**, and the one the banner was
   * missing from. 28 September put it on `/portal`, which is behind this page —
   * so a person following *Portal* from the marketing site read a page
   * describing a working review surface and never met the warning written for
   * them. The maintainer found it by opening the live site.
   */
  it("says the portal is still being built", () => {
    render(<SignInHero readout={okReadout} destination="/portal" />)

    expect(screen.getByText("The portal is still being built.")).toBeTruthy()
    expect(screen.getByRole("status")).toBeTruthy()
  })

  /**
   * Above the heading, which is where `/portal` puts it. A reader needs to have
   * seen it **before** they judge anything else on the screen — and on this page
   * the thing they would otherwise judge is a sentence written in the present
   * tense about a surface that is mostly unbuilt.
   */
  it("puts the banner before the page says what the portal is", () => {
    const { container } = render(<SignInHero readout={okReadout} destination="/portal" />)
    const text = container.textContent ?? ""

    expect(text.indexOf("The portal is still being built.")).toBeGreaterThan(-1)
    expect(text.indexOf("The portal is still being built.")).toBeLessThan(text.indexOf("Sign in"))
  })

  /**
   * Including the path where the deployment is misconfigured. A visitor who
   * arrives at a portal that cannot accept a key at all is the *most* likely to
   * conclude the product is broken rather than unfinished.
   */
  it("says it on the path where the deployment cannot accept a key", () => {
    render(<SignInHero readout={brokenReadout} destination="/portal" />)

    expect(screen.getByText("The portal is still being built.")).toBeTruthy()
  })
})
