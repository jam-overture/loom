import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { HOME } from "@/app/(marketing)/_lib/site"

import { DemoBar } from "./demo-bar"

/**
 * The bar's own comment has always said it says three things: whose page this
 * is, that it is live rather than a recording, and where to go next. Two of the
 * three were not actually said, and both are asserted here because both are a
 * sentence of copy away from quietly going again.
 *
 * *Whose page* is the one that matters most. The specimen is a clinic that does
 * not exist, and a page invented for a demonstration must disclose that where
 * it cannot be missed — not in a footer, and not left to be inferred from a
 * hero that no longer mentions Loom at all.
 *
 * *Where to go next* is `Loom marketing`'s finding of 22 August: this whole
 * route group contained one `<a>` and it was the skip link, while the front
 * door had begun offering `/demo` from six places.
 */
describe("the demo bar", () => {
  it("says the page below belongs to somebody who does not exist", () => {
    render(<DemoBar revision={0} policyId="demo" />)

    const said = document.body.textContent ?? ""

    expect(said).toContain("Someone else’s page")
    expect(said).toContain("doesn’t exist")
  })

  it("is a way out: the wordmark goes to the front page", () => {
    render(<DemoBar revision={0} policyId="demo" />)

    const home = screen.getByRole("link", { name: /back to the front page/i })

    expect(home.getAttribute("href")).toBe(HOME.path)
  })

  /**
   * The revision counter is the cheapest possible proof the page is real, so it
   * stays — demoted to the far end where it reads as an instrument panel rather
   * than as an explanation a visitor is owed before they press anything.
   */
  it("still shows the revision it was given", () => {
    render(<DemoBar revision={4} policyId="demo" />)

    expect(screen.getByText("revision").parentElement?.textContent).toContain("4")
  })
})
