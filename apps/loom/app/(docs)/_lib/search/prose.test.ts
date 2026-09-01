import { describe, expect, it } from "vitest"

import { writtenDocsSections } from "../nav"

import { readPageHeadings } from "./headings"
import { proseSectionsIn, readPageProse } from "./prose"

/**
 * What counts as a word on a page, checked twice over.
 *
 * The first half is markdown written here to exercise one rule each. Every rule
 * in `prose.ts` has a wrong answer — a fence that gets indexed sends a reader
 * looking for a sentence they will never find in the prose; a code span that
 * gets indexed puts a page above the export somebody typed letter-for-letter —
 * and a rule held only against the pages as they are written today is a rule
 * that another lane's ordinary writing can turn red.
 *
 * The second half is the site itself, and it asserts the only thing that
 * matters there: that every body belongs to a heading the reader can actually
 * be sent to.
 */

const textAt = (source: string, anchor: string): string =>
  proseSectionsIn(source).find((section) => section.anchor === anchor)?.text ?? ""

describe("what a page's words are", () => {
  it("keeps the paragraphs above the first heading for the page itself", () => {
    const sections = proseSectionsIn("# The page\n\nWhat it is for.\n\n## A section\n\nDetail.\n")

    expect(sections).toEqual([
      { anchor: "", text: "What it is for." },
      { anchor: "a-section", text: "Detail." },
    ])
  })

  it("gives each section the words under its own heading", () => {
    const source = "## First\n\nOne.\n\n### Second\n\nTwo.\n\n## Third\n\nThree.\n"

    expect(proseSectionsIn(source).map((section) => [section.anchor, section.text])).toEqual([
      ["first", "One."],
      ["second", "Two."],
      ["third", "Three."],
    ])
  })

  it("keeps a deeper heading's words in the section a reader was sent to", () => {
    const source = "## A section\n\nOne.\n\n#### A label\n\nTwo.\n"

    expect(proseSectionsIn(source)).toEqual([{ anchor: "a-section", text: "One. Two." }])
  })

  it("does not index fenced code", () => {
    const source = "## A section\n\nProse.\n\n```ts\nconst hidden = 1\n```\n\nMore prose.\n"

    expect(textAt(source, "a-section")).toBe("Prose. More prose.")
  })

  it("does not index a heading that is inside a fence", () => {
    const source = "## Real\n\nProse.\n\n```sh\n## not a section\n```\n\nAfter.\n"

    expect(proseSectionsIn(source).map((section) => section.anchor)).toEqual(["real"])
    expect(textAt(source, "real")).toBe("Prose. After.")
  })

  /**
   * The rule this file exists to hold. A name in backticks is answered by the
   * API reference and by the band that links an export to the pages showing it;
   * letting it in here would put a page above the export it names, which is the
   * one query where the export is the right answer.
   */
  it("does not index a name in backticks, and says where it took one out", () => {
    expect(textAt("## A section\n\nThe `memoryHoldStore` keeps holds in memory.\n", "a-section")).toBe(
      "The … keeps holds in memory."
    )
  })

  /**
   * Because the first excerpt this produced read *"it asks the you passed"* —
   * a sentence with a noun quietly removed, which a reader takes for a typo on
   * the site rather than for a rule about searching.
   */
  it("reads as one omission where a list of names sits together", () => {
    expect(textAt("## A section\n\nPass `trees`, `holds`, `journal` in.\n", "a-section")).toBe("Pass … in.")
    expect(textAt("## A section\n\nPass `trees` and `holds` in.\n", "a-section")).toBe("Pass … and … in.")
  })

  it("keeps the words inside a component and drops the tag", () => {
    const source = '## A section\n\n<Callout kind="warning">\n  A change applies and vanishes.\n</Callout>\n'

    expect(textAt(source, "a-section")).toBe("A change applies and vanishes.")
  })

  it("keeps nothing from a component that carries no words", () => {
    expect(proseSectionsIn('## A section\n\n<Example id="first-tree" />\n')).toEqual([])
  })

  it("keeps a link's words and drops its address", () => {
    expect(textAt("## A section\n\nSee [decision 0067](../decisions/0067-x.md) for the ruling.\n", "a-section")).toBe(
      "See decision 0067 for the ruling."
    )
  })

  it("drops an image, which is a caption for a picture nobody is searching", () => {
    expect(textAt("## A section\n\n![A screenshot of the rail](rail.png)\n\nAfter.\n", "a-section")).toBe("After.")
  })

  it("drops the page's own machinery", () => {
    const source =
      'import { pageMetadata } from "@/app/(docs)/_lib/metadata"\n\n' +
      'export const metadata = pageMetadata("a", "b")\n\n' +
      "# The page\n\nWords.\n"

    expect(proseSectionsIn(source)).toEqual([{ anchor: "", text: "Words." }])
  })

  it("reads a list and a quote as the sentences they are", () => {
    const source = "## A section\n\n- **One** thing\n- Another thing\n\n> A quoted sentence.\n"

    expect(textAt(source, "a-section")).toBe("One thing Another thing A quoted sentence.")
  })

  it("has nothing to say about a section that is only a code block", () => {
    expect(proseSectionsIn("## A section\n\n```ts\nconst x = 1\n```\n")).toEqual([])
  })
})

describe("the words on the site itself", () => {
  const pages = writtenDocsSections.flatMap((section) =>
    section.pages.map((page) => ({ section: section.slug, page: page.slug }))
  )

  it("belong to a heading a reader can be sent to, or to the page itself", () => {
    for (const { section, page } of pages) {
      const anchors = new Set(readPageHeadings(section, page).map((heading) => heading.anchor))

      for (const anchor of readPageProse(section, page).keys()) {
        expect(anchor === "" || anchors.has(anchor), `${section}/${page}#${anchor}`).toBe(true)
      }
    }
  })

  it("carry no backtick, no fence and no tag off any page", () => {
    for (const { section, page } of pages) {
      for (const [anchor, text] of readPageProse(section, page)) {
        expect(text, `${section}/${page}#${anchor}`).not.toMatch(/[`<>]/)
      }
    }
  })

  it("are there at all — every written page says something above its first heading", () => {
    for (const { section, page } of pages) {
      expect(readPageProse(section, page).get("")?.length ?? 0, `${section}/${page}`).toBeGreaterThan(40)
    }
  })
})
