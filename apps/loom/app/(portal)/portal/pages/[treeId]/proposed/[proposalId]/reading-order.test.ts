import { describe, expect, it } from "vitest"

import { portalFile, screenSource } from "@/app/(portal)/_lib/screen-source"

/**
 * The order this screen reads in, which is the argument for its existence made
 * mechanical: **look, then read, then decide.**
 *
 * Every rule below is about a *position*, and each one is a defect that would be
 * invisible to a component test. A screen whose parts are all individually right
 * can still ask somebody to approve a change above the picture of what it would
 * do — and that is not a cosmetic complaint on this screen in particular, because
 * the whole reason it exists is that the queue card asks for a decision the
 * reviewer cannot see.
 */
const file = portalFile("portal", "pages", "[treeId]", "proposed", "[proposalId]", "page.tsx")
const source = screenSource(file)

const at = (needle: string): number => {
  const index = source.indexOf(needle)
  if (index === -1) throw new Error(`the screen no longer contains ${needle}`)

  return index
}

describe("the reading order of a change, drawn", () => {
  it("says what the reader is looking at before it draws anything", () => {
    expect(at("<h1")).toBeLessThan(at("<DrawnPage"))
  })

  /**
   * The key before the pictures, which is the one ordering here that is not
   * obvious. A reader who meets an outlined band before they have been told what
   * an outline means has to scroll past the evidence to find out and then scroll
   * back to use it.
   */
  it("explains the outlines before the page wearing them", () => {
    expect(at("<MarkLegendView")).toBeLessThan(at("<DrawnPage"))
  })

  it("draws the page as it is before the page it would become", () => {
    expect(at("Your page now")).toBeLessThan(at("If you say yes"))
  })

  /**
   * The rule the screen is for. The card carries the two buttons, and a reviewer
   * meeting them above the pictures is being asked for the decision this screen
   * exists to inform.
   */
  it("offers the answer only after both pictures", () => {
    expect(at("<DrawnPage")).toBeLessThan(at("<HeldProposalCard"))
  })

  /**
   * And the card is not given a link to the screen the reader is already on. The
   * prop is optional precisely so that this screen can leave it off, which is a
   * thing a source read can check and a render cannot easily.
   */
  it("does not offer the reader a link to where they are", () => {
    expect(source).not.toContain("pictureHref")
  })

  /**
   * Plain language first, the record one click down — the lane-wide rule, and it
   * is checked here as well because this screen opens two disclosures and the
   * sweep in `every-screen.test.ts` only looks at the first.
   */
  it("names its subject before any technical record", () => {
    expect(at("<h1")).toBeLessThan(at("<TechnicalDetail"))
  })

  /**
   * This screen shows one change and cannot be asked for another. The page screen
   * is where a reader addresses into the page as it stands; an outline or a prompt
   * box beside a picture of a page nobody has been served would be addressing into
   * a page that does not exist.
   */
  it("offers no way to ask for a change of its own", () => {
    expect(source).not.toContain("<PromptBox")
    expect(source).not.toContain("<TreeOutline")
    expect(source).not.toContain("<PickedParts")
  })

  /**
   * Both pictures are drawn with one set of options. Two call sites with their own
   * options is how a before and an after come to differ for a reason that has
   * nothing to do with the change being reviewed — a band reading a data source
   * would draw empty in one and filled in the other.
   */
  it("draws both pictures with the same options", () => {
    expect(source.match(/DRAWING/gu)?.length).toBeGreaterThan(2)
    expect(source).not.toMatch(/resolver:\s*portalRegistry[\s\S]*resolver:\s*portalRegistry/u)
  })
})
