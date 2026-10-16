import { describe, expect, it } from "vitest"

import {
  atEndOfPage,
  READING_LINE_PX,
  sectionBeingRead,
  sectionsIn,
  sectionsSummary,
  SECTION_SCOPE_SELECTOR,
  SECTION_SELECTOR,
  type HeadingFound,
} from "./on-this-page"
import { ARTICLE_ID } from "./chrome"
import { readDocsStylesheet } from "./prose-barrier"

const heading = (level: number, id: string, text: string): HeadingFound => ({ level, id, text })

describe("what counts as a section", () => {
  it("keeps the two levels a page on this site uses, in the order they were found", () => {
    const rows = sectionsIn([
      heading(2, "the-bargain", "The bargain"),
      heading(3, "said-once-more", "Said once more"),
      heading(2, "what-it-costs", "What it costs"),
    ])

    expect(rows.map((row) => row.id)).toEqual(["the-bargain", "said-once-more", "what-it-costs"])
    expect(rows.map((row) => row.level)).toEqual([2, 3, 2])
  })

  it("drops the page's own title, which the rail and the pager already name", () => {
    expect(sectionsIn([heading(1, "quickstart", "Quickstart")])).toEqual([])
  })

  it("drops a level deeper than a section inside a section", () => {
    expect(sectionsIn([heading(4, "a-block", "A block")])).toEqual([])
  })

  /* The whole reason the selector asks for `[id]`, stated twice so that a
     relaxed selector is caught here rather than by a reader pressing a row. */
  it("drops a heading with no id, because there is nowhere to send the reader", () => {
    expect(sectionsIn([heading(2, "", "Three asks, three answers")])).toEqual([])
  })

  it("drops a heading with nothing in it but space", () => {
    expect(sectionsIn([heading(2, "blank", "  \n ")])).toEqual([])
  })

  it("collapses the whitespace a heading written over two lines arrives with", () => {
    expect(sectionsIn([heading(2, "a-b", "What your app\n   has to do")])[0]?.text).toBe("What your app has to do")
  })

  it("keeps the first of a repeated id and drops the rest", () => {
    const rows = sectionsIn([
      heading(2, "the-seam", "The seam"),
      heading(3, "the-seam", "The seam, again"),
    ])

    expect(rows).toEqual([{ id: "the-seam", text: "The seam", level: 2 }])
  })
})

describe("which row is marked", () => {
  const tops = [
    { id: "first", top: -400 },
    { id: "second", top: -20 },
    { id: "third", top: 700 },
  ]

  it("is the last section whose heading has gone past the reading line", () => {
    expect(sectionBeingRead({ tops, line: READING_LINE_PX, atEnd: false })).toBe("second")
  })

  it("is nothing while the reader is still in the page's opening", () => {
    const below = tops.map((top) => ({ ...top, top: top.top + 1000 }))

    expect(sectionBeingRead({ tops: below, line: READING_LINE_PX, atEnd: false })).toBeUndefined()
  })

  it("marks a heading that has reached the line exactly", () => {
    expect(sectionBeingRead({ tops: [{ id: "only", top: READING_LINE_PX }], line: READING_LINE_PX, atEnd: false })).toBe(
      "only"
    )
  })

  /* The defect the second clause exists for: a short last section on a tall
     window never reaches the line, so without this the last row of every page
     is one that cannot light up. */
  it("is the last section once there is no more page to scroll, however far down its heading is", () => {
    expect(sectionBeingRead({ tops, line: READING_LINE_PX, atEnd: true })).toBe("third")
  })

  it("is nothing on a page with no sections, at the end of it as well", () => {
    expect(sectionBeingRead({ tops: [], line: READING_LINE_PX, atEnd: false })).toBeUndefined()
    expect(sectionBeingRead({ tops: [], line: READING_LINE_PX, atEnd: true })).toBeUndefined()
  })
})

describe("the bottom of the page", () => {
  it("is where the viewport's foot meets the document's", () => {
    expect(atEndOfPage(1200, 900, 2100)).toBe(true)
  })

  it("is still the bottom a pixel short of it, which is the slack a fractional report needs", () => {
    expect(atEndOfPage(1199, 900, 2100)).toBe(true)
    expect(atEndOfPage(1199.6, 900, 2100)).toBe(true)
  })

  it("is not the bottom two pixels above it, so the slack is slack and not a rule", () => {
    expect(atEndOfPage(1198, 900, 2100)).toBe(false)
  })

  it("is true on a page shorter than the window, where there is nothing to scroll", () => {
    expect(atEndOfPage(0, 900, 600)).toBe(true)
  })
})

/**
 * The one number in here that is a function of something else in the
 * repository, held against that thing rather than against a comment about it.
 *
 * `prose-barrier.ts` established that a claim about the stylesheet can be a
 * test; this is the same move for the declarations the mark depends on. A run
 * that changes the header's height, and the offsets a press is given with it,
 * moves where a pressed row lands — and if the reading line does not move too,
 * the symptom is that pressing a row marks the section *above* the one you
 * asked for. Nothing else in this repository would notice.
 *
 * **It said that, and it did not notice**, because until 16 October it read one
 * of the two declarations that decide the landing. `html`'s
 * `scroll-padding-top` insets the scrollport and the heading's
 * `scroll-margin-top` grows the target, and the two add: a press lands a
 * heading 160 pixels down, not 80. The line was 120, which is above one number
 * and below the sum, so the defect this file describes was live on every page
 * while these three tests passed. `pnpm shoot`' `measure` found it, printing
 * `h2#the-bar-above-your-page x 20 y 160` on a press of a contents row.
 *
 * So the helper reads **both** and sums them, and it holds each to one
 * declaration rather than to a count of the pair — a third rule naming either
 * property fails here rather than being silently averaged in.
 */
describe("the reading line and where a press lands a heading", () => {
  const REM_PX = 16

  const soleRemValue = (property: string): number => {
    const found = [...readDocsStylesheet().matchAll(new RegExp(`${property}:\\s*([\\d.]+)rem`, "g"))]

    /* One declaration each, so the sum below is not read off a rule for
       something else. A second would make this quietly pick whichever came
       first, which is the shape of the defect that was already here. */
    expect(found, `globals.css has one ${property}`).toHaveLength(1)

    return Number(found[0]?.[1]) * REM_PX
  }

  /** Where a press of a row puts a heading: the scrollport's inset plus the heading's own margin. */
  const pressLandsAtPx = (): number => soleRemValue("scroll-padding-top") + soleRemValue("scroll-margin-top")

  it("adds the two declarations, because that is what the browser does", () => {
    expect(pressLandsAtPx()).toBe(160)
  })

  it("puts the line below where a press of a row lands the heading", () => {
    expect(READING_LINE_PX).toBeGreaterThan(pressLandsAtPx())
  })

  it("leaves slack between the two, rather than sitting on the boundary", () => {
    expect(READING_LINE_PX - pressLandsAtPx()).toBeGreaterThanOrEqual(16)
  })

  it("keeps the line near the top of a window rather than halfway down it", () => {
    expect(READING_LINE_PX).toBeLessThan(300)
  })
})

describe("the selectors", () => {
  it("scope the walk to the page rather than to the chrome around it", () => {
    expect(SECTION_SCOPE_SELECTOR).toBe(`#${ARTICLE_ID}`)
  })

  /* A regression guard with a reason: the `[id]` here and the `id === ""` rule
     above are one decision in two places, and relaxing the selector alone would
     leave the rule looking satisfied while the walk handed over headings the
     browser cannot scroll to. */
  it("ask for an id on both levels", () => {
    expect(SECTION_SELECTOR).toBe("h2[id], h3[id]")
  })
})

/**
 * The words on the closed disclosure, which is the only thing a reader on a
 * phone has to go on before pressing it.
 */
describe("how many sections a page has, in words", () => {
  it("says the number and the noun, which together are a reason to press it", () => {
    expect(sectionsSummary(14)).toBe("14 sections")
  })

  /* The pages with one `##` in them are real — several *Getting started* pages
     are a single section — so the plural is a case and not a hypothetical. */
  it("says it in the singular for the pages that have one section", () => {
    expect(sectionsSummary(1)).toBe("1 section")
  })

  it("is plural for none, which is a phrase no reader sees because the line does not render", () => {
    expect(sectionsSummary(0)).toBe("0 sections")
  })
})
