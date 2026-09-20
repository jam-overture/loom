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

  /**
   * **Two rows on a narrow screen, not three**, and the measurement is why it
   * is a test rather than a look.
   *
   * At 348px — this demonstration inside the front door's embed on a phone —
   * the bar wrapped once per child and stood 108px against 44px wide: the mark
   * alone on a line, the disclosure on the next, and `revision 0` alone on a
   * third. That is 23% of a 465px box spent on chrome, on the one screen where
   * the first control was already below the fold.
   *
   * The sentence is the child that takes its own row, because it is the only
   * one of the three that wraps. Losing either class puts the third row back
   * and nothing else would notice.
   */
  it("gives the disclosure its own row below the mark, on a narrow screen only", () => {
    render(<DemoBar revision={0} policyId="demo" />)

    const said = screen.getByText(/Someone else’s page/i)

    expect(said.className).toContain("basis-full")
    expect(said.className).toContain("order-last")
    expect(said.className).toContain("lg:basis-auto")
    expect(said.className).toContain("lg:order-none")
  })

  /**
   * The row it is moved to is a *visual* one. The bar still reads mark,
   * disclosure, instrument in the document, so a screen reader meets "a
   * physiotherapy clinic that doesn't exist" before the numbers rather than
   * after them — which is the order the disclosure was put first for.
   */
  it("keeps the disclosure ahead of the instrument in the document", () => {
    render(<DemoBar revision={0} policyId="demo" />)

    const said = screen.getByText(/Someone else’s page/i)
    const instrument = screen.getByText("revision")

    expect(
      said.compareDocumentPosition(instrument) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })
})
