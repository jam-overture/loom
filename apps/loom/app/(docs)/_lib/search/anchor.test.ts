import { compile } from "@mdx-js/mdx"
import { describe, expect, it } from "vitest"

import { docsRehypePlugins } from "../mdx"
import { writtenDocsSections } from "../nav"

import { headingAnchor } from "./anchor"
import { headingsIn, readPageHeadings } from "./headings"

/**
 * The two slug algorithms, held against each other on the site's own headings.
 *
 * `rehype-slug` mints the id that ends up in the HTML; `headingAnchor` mints
 * the id that ends up in the search index. Nothing forces them to agree, and
 * disagreement does not fail — a link to a fragment that is not on the page
 * loads the page and puts the reader at the top of it, which reads as a search
 * that is not very good rather than as a bug.
 *
 * So the check compiles **every heading really on this site** through the same
 * plugin list `next.config.ts` hands the loader, pulls the `id` back out of the
 * compiled output, and asserts it is the one the index would have written. A
 * heading with a character `headingAnchor` has not been taught about fails here
 * on the day it is written.
 */

type RehypePlugins = NonNullable<NonNullable<Parameters<typeof compile>[1]>["rehypePlugins"]>

const resolvePlugins = async (): Promise<RehypePlugins> =>
  Promise.all(
    docsRehypePlugins.map(async ([name, options]) => {
      const loaded: { readonly default: unknown } = await import(name)

      return [loaded.default, options] as RehypePlugins[number]
    })
  )

const ID = /id:\s*"([^"]+)"/

/** The id `rehype-slug` puts on a single heading, compiled the way the site is. */
const compiledIdFor = async (heading: string): Promise<string | undefined> => {
  const output = String(
    await compile(`## ${heading}\n`, { rehypePlugins: [...(await resolvePlugins())] })
  )

  return ID.exec(output)?.[1]
}

const siteHeadings = (): readonly { readonly where: string; readonly text: string; readonly anchor: string }[] =>
  writtenDocsSections.flatMap((section) =>
    section.pages.flatMap((page) =>
      readPageHeadings(section.slug, page.slug).map((heading) => ({
        where: `${section.slug}/${page.slug} — ${heading.text}`,
        text: heading.text,
        anchor: heading.anchor,
      }))
    )
  )

describe("the id a heading is given", () => {
  it("is the same one the build puts on the page, for every heading on the site", async () => {
    const headings = siteHeadings()

    expect(headings.length).toBeGreaterThan(20)

    for (const heading of headings) {
      expect(await compiledIdFor(heading.text), heading.where).toBe(heading.anchor)
    }
  })

  it("is minted at all, which is the plugin being wired up rather than merely listed", async () => {
    expect(await compiledIdFor("The two questions it asks")).toBe("the-two-questions-it-asks")
  })

  it("lower-cases, drops punctuation and hyphenates the spaces", () => {
    expect(headingAnchor("Prop or child?")).toBe("prop-or-child")
    expect(headingAnchor("Children: order is the meaning")).toBe("children-order-is-the-meaning")
    expect(headingAnchor("Four operations, and no fifth")).toBe("four-operations-and-no-fifth")
  })

  it("keeps a hyphen and a digit, because a heading may carry either", () => {
    expect(headingAnchor("Well-formed trees, step 2")).toBe("well-formed-trees-step-2")
  })
})

describe("the headings a page is read for", () => {
  it("finds no two with the same id on one page", () => {
    for (const section of writtenDocsSections) {
      for (const page of section.pages) {
        const anchors = readPageHeadings(section.slug, page.slug).map((heading) => heading.anchor)

        expect(new Set(anchors).size, `${section.slug}/${page.slug}`).toBe(anchors.length)
      }
    }
  })

  it("ignores a heading inside a fenced code block", () => {
    /*
     * The one case this reader can get wrong in a way nothing else catches: a
     * `#` comment inside a fence is a comment, not a section, and indexing one
     * would offer a reader an anchor no page has.
     */
    const source = ["## Real", "", "```sh", "## Not a heading", "```", "", "### Also real"].join("\n")

    expect(headingsIn(source).map((heading) => heading.text)).toEqual(["Real", "Also real"])
  })

  it("takes the page's own title as the page rather than as a section", () => {
    expect(headingsIn("# The page\n\n## A section\n").map((heading) => heading.level)).toEqual([2])
  })

  it("reads a heading as a reader sees it, without its backticks", () => {
    expect(headingsIn("## What `loom.editable` does\n")).toEqual([
      { level: 2, text: "What loom.editable does", anchor: "what-loomeditable-does" },
    ])
  })
})
