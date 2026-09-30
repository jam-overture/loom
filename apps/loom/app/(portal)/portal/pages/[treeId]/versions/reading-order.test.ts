import { describe, expect, it } from "vitest"

import { portalFile, screenSource } from "@/app/(portal)/_lib/screen-source"

/**
 * The progression's reading order, which is the same rule every screen in this
 * portal keeps and one addition that is this screen's own.
 *
 * The addition: **a qualification comes after the thing it qualifies.** Two of
 * the four states here are qualifications on a player that is working correctly
 * — *these are the most recent twelve of ninety* and *we can't rebuild it past
 * here* — and a reader who meets either of those first reads it as a warning
 * about the screen rather than as a fact about their page. That is not a
 * cosmetic ordering: on this screen the qualification is only true *of the
 * pictures above it*, and one placed above them has nothing to point at.
 */
const file = portalFile("portal", "pages", "[treeId]", "versions", "page.tsx")
const source = screenSource(file)

describe("the progression's reading order", () => {
  it("names the page before it offers anywhere else to go", () => {
    expect(source.indexOf("<h1")).toBeGreaterThan(-1)
    expect(source.indexOf("<h1")).toBeLessThan(source.indexOf("<PageViews"))
  })

  it("puts the strip before the pictures", () => {
    expect(source.indexOf("<PageViews")).toBeLessThan(source.indexOf("<VersionPlayer"))
  })

  it("says how much of the page's life it is showing after it has shown it", () => {
    expect(source.indexOf("<VersionPlayer")).toBeLessThan(source.indexOf("in all"))
  })

  it("says where the record stopped after everything it could rebuild", () => {
    expect(source.indexOf("<VersionPlayer")).toBeLessThan(source.indexOf("past this point"))
  })

  /**
   * This screen cannot ask for anything, and that is the reason it is a screen
   * rather than a control on the page screen: every address on
   * `/portal/pages/[treeId]` — the outline, the parts you picked, the box you
   * type in — is into the page **as it stands**, and a version selector beside
   * them would make each one ambiguous about which version it addressed.
   */
  it("offers no way to ask for a change", () => {
    expect(source).not.toContain("<PromptBox")
    expect(source).not.toContain("<TreeOutline")
  })
})
