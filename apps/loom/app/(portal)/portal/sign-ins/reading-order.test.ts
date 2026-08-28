import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * The order a reader meets this screen in, pinned at the source.
 *
 * The fourth guard of this shape, after the page screen's, Activity's and
 * History's, and written for the same reason: every component test renders a
 * component, so none of them can see what order the page puts them in.
 *
 * What it pins here is that the screen says what it is for before it says
 * anything about a number, and that a failed read no longer prints the store's
 * own words at the same altitude as the sentence explaining them — which is how
 * this screen shipped and stayed for a month.
 */
const file = join(process.cwd(), "app", "(portal)", "portal", "sign-ins", "page.tsx")

/**
 * Comments first, on the rule the other three guards follow: the comments here
 * are where the words this screen stopped using are recorded, and a check that
 * could not tell a warning from the thing it warns about would make the warning
 * unwriteable. This file's own comment quotes `sign-ins` and cites 0034.
 */
const source = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/gu, "")

describe("the sign-ins screen's reading order", () => {
  /**
   * A reader arriving here has been sent by the nav and has not been told what
   * the screen is. "Whether anybody has been trying keys against your portal"
   * is the sentence that makes the numbers under it mean anything.
   */
  it("says what the screen is before it reports a single number", () => {
    const heading = source.indexOf("<h1")
    const purpose = source.indexOf("trying keys against your portal")

    expect(heading).toBeGreaterThan(-1)
    expect(purpose).toBeGreaterThan(heading)
    expect(source.indexOf("<PressureSummary")).toBeGreaterThan(purpose)
  })

  /**
   * The defect, pinned as itself. `survey.error.detail` is the store's own
   * message and it was a bare `<p className="font-mono">` directly under the
   * failure notice's body — the exact altitude collapse the disclosure exists
   * to prevent. It is still on the page, verbatim; it is one click down.
   */
  it("keeps the store's own error behind a disclosure rather than beside the explanation", () => {
    const raw = source.indexOf("survey.error.detail")
    const disclosure = source.indexOf("<TechnicalDetail", source.indexOf('tone="failure"'))

    expect(raw).toBeGreaterThan(-1)
    expect(disclosure).toBeGreaterThan(-1)
    expect(raw).toBeGreaterThan(disclosure)
    expect(source.indexOf("</TechnicalDetail>", raw)).toBeGreaterThan(raw)
  })

  /**
   * A failed read and an empty log are opposites that look alike, and this is
   * the screen where mistaking one for the other means concluding that nobody
   * is knocking. The notice has to say so in a person's words.
   */
  it("refuses to let a failed read be mistaken for a quiet deployment", () => {
    expect(source).toContain("never as &ldquo;quiet&rdquo;")
  })
})
