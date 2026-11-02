import { describe, expect, it } from "vitest"

import { publishedFields } from "./api/fields"
import { publishedNames } from "./api/mentions"
import { writtenDocsSections } from "./nav"
import { readPageSource } from "./search/headings"
import {
  everyDocsPage,
  fieldsNamedIn,
  namesNamedIn,
  openingOf,
  pagesWithoutAnOpening,
  plainFaults,
  plainFaultSentence,
  summariesRead,
  writtenHeadings,
} from "./plain"

/**
 * **The plain version first**, held against the site rather than written down.
 *
 * `plain.ts` carries the argument and the numbers. What this file adds is the
 * split every claim about these pages is made of: the **rule** is checked
 * against the thirty-five real pages, and the **reader** is checked against
 * markdown written here to exercise it. A reader held only against the site is
 * a reader whose rules are whatever today's pages happen to do, which is how a
 * check goes quietly vacuous — the failure the September sweep was written to
 * stop and the one `landing.test.ts` is split the same way to avoid.
 */
describe("the plain version first", () => {
  /**
   * The one that matters. Every other test here is about whether this one can
   * be trusted.
   *
   * The count is asserted as a list rather than a number so a failure prints
   * the pages and the sentences instead of `expected 1 to be 0` — the author
   * who broke it is looking at a test failure and wants the file to open.
   */
  it("hands a reader no name before the page has said what it is for", () => {
    expect(plainFaults().map(plainFaultSentence)).toEqual([])
  })

  /**
   * The same claim, stated about the vocabulary that was added second, so a
   * failure says which rule went red.
   *
   * Two hundred and ninety-two camelCase field names, twenty of them printed
   * somewhere on these pages and `baseRevision` three times — and none of them
   * in a place a reader meets before the page has explained anything.
   */
  it("hands a reader no field name either, which has no page to look it up on", () => {
    expect(plainFaults().filter(({ fields }) => fields.length > 0)).toEqual([])
  })

  /**
   * The other half, and it is a different failure: a page can keep the rule by
   * saying nothing at all before its first heading.
   *
   * The shortest opening on the site is the Architecture landing's two
   * sentences, so there is room above this floor rather than a page sitting on
   * it.
   */
  it("gives every written page something to read before its first heading", () => {
    expect(pagesWithoutAnOpening()).toEqual([])
  })

  /**
   * Non-vacuity, which for this check is not a formality.
   *
   * Every assertion above is satisfied by a reader that finds nothing, and a
   * reader that finds nothing is exactly what a broken one looks like. So the
   * same reader is pointed at the names the site really does print and has to
   * come back with them.
   */
  it("finds the names this site prints, so finding none above means something", () => {
    const named = everyDocsPage()

    expect(named.length).toBeGreaterThan(30)
    expect(publishedNames.size).toBeGreaterThan(1_000)
    expect(namesNamedIn("A `renderLoomTree` call and a `createTree` call.")).toEqual([
      "renderLoomTree",
      "createTree",
    ])
  })

  /**
   * The same guard for the second vocabulary, and it has to be the stronger
   * version: the field reader is pointed at the names **this site really
   * prints**, not at a sentence written here. Twenty of the two hundred and
   * ninety-two appear in these pages' prose, so a reader that comes back empty
   * from the whole site is broken rather than vindicated.
   */
  it("finds the field names this site prints, so finding none in an opening means something", () => {
    expect(publishedFields.size).toBeGreaterThan(200)
    expect(fieldsNamedIn("Each delta carries a `baseRevision`.")).toEqual(["baseRevision"])

    const printed = new Set(
      writtenDocsSections.flatMap((section) =>
        section.pages.flatMap((page) =>
          fieldsNamedIn(readPageSource(section.slug, page.slug))
        )
      )
    )

    expect(printed.size).toBeGreaterThan(10)
    expect(printed).toContain("baseRevision")
  })

  /**
   * The third place, measured and deliberately not enforced — recorded for the
   * field vocabulary the same way it is for the export one, because a heading is
   * an address and somebody who typed a name should be able to land on it.
   */
  it("records that no heading names a field either, without forbidding one", () => {
    expect(writtenHeadings().flatMap(fieldsNamedIn)).toEqual([])
  })

  /**
   * The measurement `plain.ts` records and deliberately does not enforce.
   *
   * A heading is an address — the search box and the rail hand them out — so a
   * heading that *is* an export name answers somebody who typed it exactly.
   * What is held here is only that the headings were really read, because the
   * number in that doc comment is worth nothing if this list is empty.
   */
  it("reads the headings the recorded measurement is about", () => {
    expect(writtenHeadings().length).toBeGreaterThan(150)
  })

  /**
   * The boundary a mutation moved, and it is worth a test of its own because it
   * is the one place this check reads a file it does not write.
   */
  describe("which summaries it is about", () => {
    it("reads a landing page's summary even where the pages under it are generated", () => {
      const landing = summariesRead().find(({ href }) => href === "/docs/api-reference")

      expect(landing?.summary).not.toBe(undefined)
    })

    /**
     * The sixteen doors take `entry.summary` from the runtime's declaration
     * files. A rule over them is this lane's test going red because another
     * lane wrote a sentence, which `search/build.test.ts` already names as the
     * mistake to avoid.
     */
    it("leaves the reference's own doors to the lane that writes them", () => {
      const read = summariesRead().map(({ href }) => href)

      expect(read).toContain("/docs/api-reference")
      expect(read.some((href) => href.startsWith("/docs/api-reference/"))).toBe(false)
    })
  })

  describe("a page's opening", () => {
    it("is everything above the first heading a reader can be sent to", () => {
      const source = ["# A page", "", "Plain words.", "", "## The first heading", "", "`renderLoomTree`."].join("\n")

      expect(openingOf(source)).toContain("Plain words.")
      expect(openingOf(source)).not.toContain("renderLoomTree")
      expect(namesNamedIn(openingOf(source))).toEqual([])
    })

    it("includes the page's own title, which is held to the same rule", () => {
      const source = ["# What `renderLoomTree` returns", "", "Plain words.", "", "## Next"].join("\n")

      expect(namesNamedIn(openingOf(source))).toEqual(["renderLoomTree"])
    })

    /**
     * The boundary the rule is most likely to be read as forbidding, and it
     * does not: a block in an opening is the precise version arriving on cue.
     * *Quickstart* opens with the file you are about to save.
     */
    it("does not read a fenced block, because a block is the precise version", () => {
      const source = [
        "# A page",
        "",
        "Plain words.",
        "",
        "```ts",
        'import { renderLoomTree } from "@jam-overture/loom/react"',
        "```",
        "",
        "## Next",
      ].join("\n")

      expect(namesNamedIn(openingOf(source))).toEqual([])
    })

    it("is closed by a `###` as well as a `##`", () => {
      const source = ["# A page", "", "Plain words.", "", "### A sub-heading", "", "`createTree`."].join("\n")

      expect(namesNamedIn(openingOf(source))).toEqual([])
    })

    /**
     * An `####` is a label inside a section a reader was already sent to, so it
     * opens nothing — the same level rule `search/prose.ts` and
     * `fences/sections.ts` apply, for the same reason.
     */
    it("is not closed by an `####`, which is a label rather than an address", () => {
      const source = ["# A page", "", "Plain words.", "", "#### A label", "", "`createTree`."].join("\n")

      expect(namesNamedIn(openingOf(source))).toEqual(["createTree"])
    })

    it("drops an MDX import, which is machinery rather than prose", () => {
      const source = ['import { Callout } from "@/x"', "", "# A page", "", "Plain words.", "", "## Next"].join("\n")

      expect(openingOf(source)).not.toContain("import")
    })
  })

  describe("what counts as naming an export", () => {
    it("reads a span between backticks and not a sentence that means the idea", () => {
      expect(namesNamedIn("The registry hands it back.")).toEqual([])
      expect(namesNamedIn("`createPrimitiveRegistry` hands it back.")).toEqual([
        "createPrimitiveRegistry",
      ])
    })

    /**
     * The one rule here with a wrong answer, and `api/mentions.ts` owns it:
     * `result.ok` is a property read on a value, and the `ok` this package
     * exports is the function that made it.
     */
    it("does not read a property behind a dot as the export that shares its spelling", () => {
      expect(publishedNames.has("ok")).toBe(true)
      expect(namesNamedIn("Check `result.ok` before you read the value.")).toEqual([])
    })

    it("does not read a name the package does not publish", () => {
      expect(namesNamedIn("Call `notAnExportAnywhere` first.")).toEqual([])
    })
  })

  /**
   * The sentence a failure prints.
   *
   * Asserted because it is the whole value of the check to whoever hits it: a
   * page has two openings a reader meets, they are edited in two different
   * files, and a fault that did not say which would send its author to the
   * wrong one.
   */
  describe("the sentence it fails with", () => {
    const fault = {
      where: "getting-started/introduction",
      href: "/docs/getting-started/introduction",
      place: "opening" as const,
      names: ["TreeDelta"] as const,
      fields: [] as const,
      text: "A `TreeDelta` is an ordered list of operations.",
    }

    it("names the page, the place, the name and what the reader would have read", () => {
      const sentence = plainFaultSentence(fault)

      expect(sentence).toContain("getting-started/introduction")
      expect(sentence).toContain("opening, above the first heading")
      expect(sentence).toContain("`TreeDelta`")
      expect(sentence).toContain("A `TreeDelta` is an ordered list of operations.")
    })

    it("says which of a page's two openings it is about", () => {
      expect(plainFaultSentence({ ...fault, place: "summary" })).toContain("summary the rail carries")
    })

    it("agrees with itself about one name and several", () => {
      expect(plainFaultSentence(fault)).toContain("what it is for")
      expect(plainFaultSentence({ ...fault, names: ["TreeDelta", "createTree"] })).toContain(
        "what they are for"
      )
    })

    /**
     * The clause an author will not guess the remedy for. Told that an opening
     * names `TreeDelta`, the obvious fix is to link the reference page; told
     * that it names `baseRevision`, they need to know there is no page to link
     * to.
     */
    it("says a field has no page of its own, because that changes the remedy", () => {
      const sentence = plainFaultSentence({ ...fault, names: [], fields: ["baseRevision"] })

      expect(sentence).toContain("`baseRevision`")
      expect(sentence).toContain("a field, with no page of its own")
      expect(sentence).toContain("what it is for")
    })

    it("says it of several fields in the plural", () => {
      expect(
        plainFaultSentence({ ...fault, names: [], fields: ["baseRevision", "treeId"] })
      ).toContain("fields, with no page of their own")
    })

    /**
     * One place that hands a reader an export and two fields is **one** fault
     * naming three things, and the count has to agree across both halves — the
     * author opens one file and rewrites one paragraph.
     */
    it("counts both vocabularies when it agrees about one name and several", () => {
      const both = { ...fault, names: ["TreeDelta"] as const, fields: ["baseRevision"] }

      expect(plainFaultSentence(both)).toContain("what they are for")
      expect(plainFaultSentence(both)).toContain("`TreeDelta` and `baseRevision`")
    })
  })
})
