import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { ARTICLE_HREF, ARTICLE_ID, RAIL_SCROLLER_SELECTOR, railScrollerAttr } from "./chrome"

/**
 * The two names, read back out of the files that are supposed to be getting
 * them from here.
 *
 * This is `browser-bar-chrome.test.ts`'s method — read the other file and hold
 * the two together — applied to the problem it was written for rather than to
 * a colour. A constant two files import is not a guarantee that neither of them
 * also spells it: the literal that was there before still works, still agrees
 * today, and is exactly what would be reintroduced by somebody adding a second
 * skip link or a second landmark without finding this file.
 *
 * The id is the one worth the test. A skip link pointing at an id nothing
 * carries is a link that silently does nothing, and it is the single hardest
 * thing in this repository to notice: `prerender:check` reads addresses and a
 * fragment is the one broken link nothing here can report, which this lane
 * filed on 26 September and is still open.
 */
const source = (file: string): string =>
  readFileSync(fileURLToPath(new URL(`../${file}`, import.meta.url)), "utf8")

const LAYOUTS = ["layout.tsx", "docs/layout.tsx"] as const

describe("the names the chrome agrees on", () => {
  it("is the fragment the id answers", () => {
    expect(ARTICLE_HREF).toBe(`#${ARTICLE_ID}`)
  })

  it("is imported by every layout that uses it, and spelled by none", () => {
    for (const file of LAYOUTS) {
      const text = source(file)

      expect(text, file).toContain('from "@/app/(docs)/_lib/chrome"')
      expect(text, `${file} spells the article's id`).not.toContain(`"${ARTICLE_ID}"`)
      expect(text, `${file} spells the article's fragment`).not.toContain(`"${ARTICLE_HREF}"`)
    }
  })

  /**
   * One of the two has the id and the other has the fragment, which is the only
   * reason there are two exports rather than one. Asserted so that a layout
   * quietly losing its half reads as a failure here rather than as a skip link
   * that stops working.
   */
  it("puts the landmark in one layout and the link to it in the other", () => {
    expect(source("docs/layout.tsx")).toContain("id={ARTICLE_ID}")
    expect(source("layout.tsx")).toContain("href={ARTICLE_HREF}")
  })

  it("names one attribute, and a selector that asks for it", () => {
    const names = Object.keys(railScrollerAttr)

    expect(names).toHaveLength(1)
    expect(RAIL_SCROLLER_SELECTOR).toBe(`[${names[0]}]`)
  })

  /**
   * And the scroller is declared where a scroller is, in both places — the
   * sticky rail on a wide screen and the panel under the menu button on a
   * phone. Those are the two, and a third would be a third place a reader can
   * be lost in.
   */
  it("is declared by the two elements that scroll the rail", () => {
    const declared = ["docs/layout.tsx", "_components/mobile-nav.tsx"].filter((file) =>
      source(file).includes("{...railScrollerAttr}")
    )

    expect(declared).toHaveLength(2)
  })
})
