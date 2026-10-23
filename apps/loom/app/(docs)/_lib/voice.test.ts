import { describe, expect, it } from "vitest"

import { docsOrder } from "./nav"
import { britishSpellingsIn } from "./spelling"
import { readerPages } from "./voice"

/**
 * One spelling for the reader, held over every page of the site.
 *
 * `spelling.ts` has the rule and `voice.ts` has the reader. What is worth
 * saying here is the shape of the two assertions, because a sweep is only as
 * good as its floor: the first one below is what stops this file passing on a
 * morning when the reader is broken and every page comes back empty.
 */

describe("the spelling a reader meets", () => {
  it("is reading every page the rail lists, with words on each of them", () => {
    const pages = readerPages()

    expect(pages.length).toBe(docsOrder.length)
    expect(pages.length).toBeGreaterThan(40)

    for (const page of pages) {
      expect(page.words.length, page.id).toBeGreaterThan(200)
    }
  })

  it.each(readerPages())("$id is written in US English", (page) => {
    expect({ page: page.id, british: britishSpellingsIn(page.words) }).toEqual({
      page: page.id,
      british: [],
    })
  })

  /**
   * And the sweep can see a British spelling when there is one, which is the
   * assertion that stops every row above passing because the matcher stopped
   * matching. Written as a page rather than as a word, because what the rows
   * above read is a page's `words` and that is the join being checked.
   */
  it("would say so if a page had one", () => {
    const page = readerPages()[0]

    expect(page).toBeDefined()
    expect(britishSpellingsIn(`${page?.words ?? ""} The colours are grey.`)).toEqual([
      "colours",
      "grey",
    ])
  })
})
