import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  describeRunTogether,
  runTogethersIn,
  separatorsIn,
  tagJunctionsIn,
  tagRunTogethersIn,
} from "./hazards.js"
import { describePrerenderError, prerenderedPages } from "./pages.js"

/**
 * The paragraph from the finding, as `next build` wrote it.
 *
 * Quoted rather than reconstructed. This is the sentence a reader was served on
 * 9 September, and the point of the check is that it fails on exactly this.
 */
const THE_DEFECT = `<p class="mt-3">16<!-- -->of those blocks are TypeScript, checked by the compiler.</p>`

/** The same paragraph with the space the source meant to have. */
const THE_FIX = `<p class="mt-3">16<!-- --> of those blocks are TypeScript, checked by the compiler.</p>`

describe("runTogethersIn", () => {
  it("fails on the sentence that shipped", () => {
    const [hazard, ...rest] = runTogethersIn("docs/introduction.html", THE_DEFECT)

    expect(rest).toEqual([])
    expect(hazard?.joined).toBe("6o")
    expect(hazard?.page).toBe("docs/introduction.html")
  })

  it("passes the same sentence once the space is back", () => {
    expect(runTogethersIn("docs/introduction.html", THE_FIX)).toEqual([])
  })

  it("says enough about where it is to recognise the sentence", () => {
    const [hazard] = runTogethersIn("docs/introduction.html", THE_DEFECT)

    expect(describeRunTogether(hazard!)).toContain("of those blocks are TypeScript")
    expect(describeRunTogether(hazard!)).toContain("docs/introduction.html")
  })

  it("prints the sentence a reader sees, with the markup taken out", () => {
    const html = `<div class="sr-only" hidden=""><!--$--><!--/$--></div><p>16<!-- -->of those blocks are TypeScript, checked</p>`
    const [hazard] = runTogethersIn("p.html", html)

    expect(hazard?.context).toBe("16of those blocks are TypeScript, checked")
  })

  it("leaves a junction alone when either side is not a joining character", () => {
    expect(runTogethersIn("p.html", `<p>$<!-- -->16</p>`)).toEqual([])
    expect(runTogethersIn("p.html", `<p>16<!-- -->%</p>`)).toEqual([])
    expect(runTogethersIn("p.html", `<p>16<!-- -->, and more</p>`)).toEqual([])
  })

  it("leaves a junction alone when a tag follows, which it cannot see through", () => {
    expect(runTogethersIn("p.html", `<p>16<!-- --><span>of</span></p>`)).toEqual([])
  })

  it("reports every junction on a page rather than the first", () => {
    const html = `<p>16<!-- -->of those</p><p>4<!-- -->kinds</p>`

    expect(runTogethersIn("p.html", html).map((hazard) => hazard.joined)).toEqual(["6o", "4k"])
  })

  it("finds nothing in a page with no adjacent text children", () => {
    expect(runTogethersIn("p.html", `<p>16 of those blocks are TypeScript.</p>`)).toEqual([])
  })

  it("does not read an ordinary HTML comment as a separator", () => {
    expect(runTogethersIn("p.html", `<p>16<!-- a note -->of those</p>`)).toEqual([])
  })
})

describe("separatorsIn", () => {
  it("counts what was read, so a clean page and an unread one are different numbers", () => {
    expect(separatorsIn(THE_DEFECT)).toBe(1)
    expect(separatorsIn(`<p>16 of those</p>`)).toBe(0)
    expect(separatorsIn(`${THE_DEFECT}${THE_FIX}`)).toBe(2)
  })
})

const withTempRoot = async (run: (root: string) => Promise<void>): Promise<void> => {
  const root = await mkdtemp(join(tmpdir(), "loom-prerender-"))

  try {
    await run(root)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

describe("prerenderedPages", () => {
  it("reads every page under the root, nested and sorted", async () => {
    await withTempRoot(async (root) => {
      await mkdir(join(root, "docs", "getting-started"), { recursive: true })
      await writeFile(join(root, "index.html"), "<p>one</p>", "utf8")
      await writeFile(join(root, "docs", "getting-started", "install.html"), "<p>two</p>", "utf8")
      await writeFile(join(root, "docs", "route.js"), "// not a page", "utf8")

      const found = await prerenderedPages(root)

      expect(found.ok).toBe(true)
      expect(found.ok && found.value.map((page) => page.path)).toEqual([
        join("docs", "getting-started", "install.html"),
        "index.html",
      ])
    })
  })

  it("fails rather than passing when the build has not run", async () => {
    const found = await prerenderedPages(join(tmpdir(), "loom-prerender-absent"))

    expect(found.ok).toBe(false)
    expect(!found.ok && describePrerenderError(found.error)).toContain("pnpm --filter @loom/app build")
  })

  it("fails rather than passing when the build produced no pages", async () => {
    await withTempRoot(async (root) => {
      await writeFile(join(root, "route.js"), "// not a page", "utf8")

      const found = await prerenderedPages(root)

      expect(found.ok).toBe(false)
      expect(!found.ok && describePrerenderError(found.error)).toContain("nothing was checked")
    })
  })
})

/**
 * The sentence from the 23 October finding, as `next build` wrote it.
 *
 * Quoted rather than reconstructed, for `THE_DEFECT`'s reason: this is what a
 * reader was served on the theming page, and the point of the second class is
 * that it fails on exactly this.
 */
const THE_SWALLOWED = `<p>…so a page can say <em>color</em>in a sentence and show you a name…</p>`

/** The same sentence with the space the source had. */
const THE_SPACE_BACK = `<p>…so a page can say <em>color</em> in a sentence and show you a name…</p>`

describe("tagRunTogethersIn", () => {
  it("fails on the sentence that shipped", () => {
    const [hazard, ...rest] = tagRunTogethersIn("docs/theming.html", THE_SWALLOWED)

    expect(rest).toEqual([])
    expect(hazard?.joined).toBe("ri")
    expect(hazard?.page).toBe("docs/theming.html")
  })

  it("passes the same sentence once the space is back", () => {
    expect(tagRunTogethersIn("docs/theming.html", THE_SPACE_BACK)).toEqual([])
  })

  it("prints the sentence a reader sees, with the markup taken out", () => {
    const [hazard] = tagRunTogethersIn("docs/theming.html", THE_SWALLOWED)

    expect(describeRunTogether(hazard!)).toContain("colorin a sentence")
    expect(describeRunTogether(hazard!)).toContain("docs/theming.html")
  })

  it("leaves the element alone when it carries its own space inside", () => {
    expect(tagRunTogethersIn("p.html", `<p><span>Asked: </span>Make the main heading</p>`)).toEqual([])
  })

  it("leaves a plural hung on the element's text alone, and only a plural", () => {
    expect(tagRunTogethersIn("p.html", `<p>two <code>Map</code>s, for a test</p>`)).toEqual([])
    expect(tagRunTogethersIn("p.html", `<p>two <code>Map</code>some, for a test</p>`)).not.toEqual([])
  })

  it("leaves a block element's end alone, because the next line is not run together", () => {
    expect(tagRunTogethersIn("p.html", `<div><p>colour</p>in a sentence</div>`)).toEqual([])
    expect(tagRunTogethersIn("p.html", `<ul><li>one</li>two</ul>`)).toEqual([])
  })

  it("leaves a junction alone when either side is not a joining character", () => {
    expect(tagRunTogethersIn("p.html", `<p>a <em>price</em>, and more</p>`)).toEqual([])
    expect(tagRunTogethersIn("p.html", `<p>a <em>$</em>16</p>`)).toEqual([])
  })

  it("reports every junction on a page rather than the first", () => {
    const html = `<p>say <em>color</em>in a sentence</p><p>and <code>four</code>kinds</p>`

    expect(tagRunTogethersIn("p.html", html).map((hazard) => hazard.joined)).toEqual(["ri", "rk"])
  })

  it("cannot see a space lost across a nested element, which 0398 records as open", () => {
    expect(tagRunTogethersIn("p.html", `<p><span>Asked:<b>x</b></span>Make</p>`)).toEqual([])
  })

  it("does not read an attribute that looks like an end tag", () => {
    expect(tagRunTogethersIn("p.html", `<p data-x="</em>in">colour</p>`)).toEqual([])
  })
})

describe("tagJunctionsIn", () => {
  it("counts what was read, so a clean page and an unread one are different numbers", () => {
    expect(tagJunctionsIn(THE_SWALLOWED)).toBe(1)
    expect(tagJunctionsIn(THE_SPACE_BACK)).toBe(0)
    expect(tagJunctionsIn(`<p><span>Asked: </span>Make</p>`)).toBe(1)
    expect(tagJunctionsIn(`<p>two <code>Map</code>s</p>`)).toBe(1)
  })

  it("counts no junction at a block element's end", () => {
    expect(tagJunctionsIn(`<div><p>colour</p>in</div>`)).toBe(0)
  })
})
