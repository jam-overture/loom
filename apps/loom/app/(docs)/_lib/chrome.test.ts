import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import {
  ARTICLE_HREF,
  ARTICLE_ID,
  BAR_CONTROL_CLASS,
  CHROME_CLASSES,
  HEADER_ROW_CLASS,
  PAGE_RAIL_CLASS,
  RAIL_SCROLLER_SELECTOR,
  railScrollerAttr,
  SITE_RAIL_CLASS,
  UNDER_HEADER_CLASS,
} from "./chrome"
import { propertiesNamedIn, rootProperties, soleDeclaration } from "./chrome-css"
import { readDocsStylesheet, withoutComments } from "./prose-barrier"

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

const ROUTE_GROUP = fileURLToPath(new URL("..", import.meta.url))

/**
 * Every component and layout in the route group, named the way `source` takes
 * them. Tests are left out: what a test may spell is the subject of the test
 * doing the sweeping.
 */
const componentsAndLayouts = (): readonly string[] => {
  const walk = (at: string): readonly string[] =>
    readdirSync(join(ROUTE_GROUP, at), { withFileTypes: true }).flatMap((entry) => {
      if (entry.isDirectory()) return walk(join(at, entry.name))

      return entry.name.endsWith(".tsx") && !entry.name.includes(".test.") ? [join(at, entry.name)] : []
    })

  return walk(".")
}

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
    const declared = ["docs/layout.tsx", "_components/docs-bar.tsx"].filter((file) =>
      source(file).includes("{...railScrollerAttr}")
    )

    expect(declared).toHaveLength(2)
  })
})

/**
 * The chrome's height, from the number to the element that wears it.
 *
 * The open finding of 17 October: `scroll-padding-top` was `7rem` against 102
 * pixels of chrome, the 102 was read off a screenshot and typed into a test,
 * and the header's height was spelled six times across three files and a
 * stylesheet. Every number was right. Nothing would have noticed one of them
 * stop being right, and the symptom is quiet — a keyboard reader tabbing down
 * a long page gets the link they just focused half-hidden behind the bar.
 *
 * What is held here is the **chain**, in four links, because a break anywhere
 * along it is the same silent defect:
 *
 * 1. the three parts are declared, on `:root`, in `globals.css`;
 * 2. every property anything reads is one of the declared ones — an undeclared
 *    `var()` is not an error, it is a height of zero;
 * 3. the inset is still a function of the bar's own row, transitively, so a
 *    taller bar moves what clears it;
 * 4. the markup reads them through `chrome.ts` and spells none of them.
 *
 * The arithmetic itself is not recomputed here, which is `chrome-css.ts`'
 * argument: the expressions are asserted exactly as written, and adding them up
 * is the browser's job rather than this repository's.
 */
describe("the chrome's height", () => {
  const css = (): string => readDocsStylesheet()

  /** Every property reachable from a starting set, through the declarations. */
  const reachedFrom = (names: readonly string[]): readonly string[] => {
    const declared = rootProperties(css())

    const walk = (found: readonly string[], queue: readonly string[]): readonly string[] => {
      const [head, ...rest] = queue

      if (head === undefined) return found
      if (found.includes(head)) return walk(found, rest)

      return walk([...found, head], [...rest, ...propertiesNamedIn(declared.get(head) ?? "")])
    }

    return walk([], names)
  }

  it("declares the three parts the rest of it is arithmetic over", () => {
    const declared = rootProperties(css())

    expect(declared.get("--chrome-header")).toBe("3.5rem")
    expect(declared.get("--chrome-bar")).toBe("2.75rem")
    expect(declared.get("--chrome-edge")).toBe("1px")
  })

  /**
   * The link that makes the other three worth having. `h-[var(--chrome-bar)]`
   * on an element the stylesheet never gave a `--chrome-bar` is a declaration
   * the browser discards: no error, no warning, and a bar with no height.
   */
  it("declares every property the classes ask the browser for", () => {
    const declared = rootProperties(css())

    for (const property of propertiesNamedIn(CHROME_CLASSES.join(" "))) {
      expect(declared.has(property), `globals.css declares ${property}`).toBe(true)
    }
  })

  it("declares every property its own declarations read, so the chain has no gap", () => {
    const declared = rootProperties(css())
    const chrome = [...declared.keys()].filter((name) => name.startsWith("--chrome") || name === "--press-landing")

    for (const property of propertiesNamedIn(chrome.map((name) => declared.get(name) ?? "").join(" "))) {
      expect(declared.has(property), `globals.css declares ${property}`).toBe(true)
    }
  })

  /**
   * The point of the whole unit, as one assertion: the number that keeps a
   * scrolled-to heading out from behind the chrome is a function of the two
   * bands' own heights. A run that gives the bar a second line changes
   * `--chrome-bar` and the inset follows, which is exactly what did not happen
   * before today.
   */
  it("insets the scrollport by something that reads both bands' heights", () => {
    const inset = soleDeclaration(css(), "scroll-padding-top")

    expect(propertiesNamedIn(inset)).toEqual(["--chrome-inset"])
    expect(reachedFrom(["--chrome-inset"])).toContain("--chrome-header")
    expect(reachedFrom(["--chrome-inset"])).toContain("--chrome-bar")
  })

  /**
   * And where a press of a contents row lands a heading stays one declared
   * number while the chrome above it moves, because the heading's own margin is
   * the difference rather than a second figure.
   *
   * Asserted as the expression and not as a sum. The browser adds the inset to
   * the margin, so these two strings are the proof that a press lands at
   * `--press-landing`; `on-this-page.test.ts` is where that landing is held
   * against the reading line, which is the one figure in TypeScript.
   */
  it("makes the heading's own margin the difference between the landing and the inset", () => {
    expect(soleDeclaration(css(), "scroll-margin-top")).toBe("calc(var(--press-landing) - var(--chrome-inset))")
  })

  it("keeps the landing a plain length, because a number in TypeScript is chosen against it", () => {
    expect(rootProperties(css()).get("--press-landing")).toBe("10rem")
  })

  /**
   * The four places that used to spell it, each wearing the class instead —
   * and, as the two names above are held, **spelling none of it**. A file that
   * imported the constant and also wrote `h-14` beside it would agree with the
   * stylesheet today and be the finding again tomorrow.
   */
  it("is read by the header, the bar and both rails, through this module", () => {
    const wears = [
      ["layout.tsx", "HEADER_ROW_CLASS", HEADER_ROW_CLASS],
      ["_components/docs-bar.tsx", "UNDER_HEADER_CLASS", UNDER_HEADER_CLASS],
      ["_components/docs-bar.tsx", "BAR_CONTROL_CLASS", BAR_CONTROL_CLASS],
      ["docs/layout.tsx", "SITE_RAIL_CLASS", SITE_RAIL_CLASS],
      ["docs/layout.tsx", "PAGE_RAIL_CLASS", PAGE_RAIL_CLASS],
    ] as const

    for (const [file, name, value] of wears) {
      const text = source(file)

      expect(text, `${file} reads ${name}`).toContain(`\${${name}}`)
      expect(text, `${file} spells ${name}'s own value`).not.toContain(value)
    }
  })

  /**
   * And nothing in the route group spells it any more.
   *
   * A sweep rather than four assertions, because the finding's whole subject is
   * the instance nobody notices: the fifth place to want the header's height
   * fails here rather than agreeing with the other four until one of them
   * moves. Comments are stripped, since the two modules that closed this
   * quote the old spellings in order to explain them; what that costs is a
   * spelling on the same line as a `//` in a string, which is the one case this
   * would miss.
   */
  it("is spelled by no component or layout in the route group", () => {
    const spelled = componentsAndLayouts().filter((file) =>
      /(?<![\w-])(?:h|top)-14(?![\d.])|100vh-3\.5rem/.test(withoutComments(source(file)).replace(/\/\/[^\n]*/g, ""))
    )

    expect(spelled).toEqual([])
  })
})
