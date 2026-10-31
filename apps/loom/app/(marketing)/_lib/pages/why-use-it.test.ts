import { describe, expect, it } from "vitest"

import { FACTS } from "../copy"
import { LIBRARY_PARTS } from "../library"
import type { ElementNode } from "@jam-overture/loom"

import { elementsIn } from "../measure"
import { siteRegistry } from "../registry"
import { treeFor } from "../builders"
import { WHY_USE_IT, SITE_ROUTES, type SiteThemeName } from "../site"
import { readerCopy } from "../words"

import { whyUseItPageTree } from "./why-use-it"

/**
 * The build case, held to the properties a reader cannot check by reading it.
 *
 * The copy itself is swept by `voice.test.ts` along with every other page of
 * this site — register, spelling, headline shape, sentence length — and nothing
 * here repeats any of that. What is left is three things that are true of *this*
 * page's argument and would survive a rewrite of every word on it.
 */

const DEFAULT_THEME: SiteThemeName = "minimal"

const page = () => whyUseItPageTree({ theme: DEFAULT_THEME })

const elementsOf = (type: string) =>
  elementsIn(page().root).filter((node) => node.type === type)

describe("the page a stranger meets before the mechanism", () => {
  it("is a page of this site, and the second one", () => {
    expect(SITE_ROUTES[1]?.path).toBe(WHY_USE_IT.path)
  })

  /**
   * The builder is reached through the map rather than called directly, which
   * is the half a route file depends on. `builders.test` has no such file, so
   * the assertion lives with the page it would be about.
   */
  it("is what the site serves at its own address", () => {
    expect(treeFor(WHY_USE_IT, { theme: DEFAULT_THEME }).root).toEqual(page().root)
  })
})

/**
 * **The whole page is registered primitives**, which is §4d's rule and 0067's.
 *
 * A marketing site quietly carrying three bespoke components would be evidence
 * against the library rather than for it, so this reads every element type on
 * the page against the registry the site is built with. It is the assertion
 * that fails the day somebody reaches for a local component instead of filing
 * a finding.
 */
describe("what it is built from", () => {
  it("names nothing the starter library has not registered", () => {
    const registered = new Set<string>(
      siteRegistry.primitives.map((primitive) => primitive.type)
    )
    const unregistered = [
      ...new Set(elementsIn(page().root).map((node) => node.type)),
    ].filter((type) => !registered.has(type))

    expect(unregistered).toEqual([])
  })

  it("uses the band the library has for exactly this question", () => {
    expect(elementsOf("loom.comparison-table")).toHaveLength(1)
  })
})

/**
 * The property that keeps the table from being an advertisement.
 *
 * `compositions/comparison-band.ts` states it about its own band and it is the
 * reason that one carries a `partial`: *"a comparison band where the first
 * column is `yes` all the way down is an advertisement rather than a
 * comparison; a reader discounts the whole table on sight."*
 *
 * This page's version of the same honesty is the two rows answered with the
 * same word in both columns — your components, and which model it uses. Held as
 * *at least one such row* rather than as two, because which jobs are on the
 * table is copy and this is a rule about the shape of the argument.
 */
describe("the comparison it offers", () => {
  const rows = () => elementsOf("loom.comparison-row")

  /** The subjects' row is in the `columns` region, so it is one of these too. */
  it("answers every criterion once per column", () => {
    const bodyRows = rows().filter((row) => typeof row.props["heading"] === "string")

    expect(bodyRows.length).toBeGreaterThanOrEqual(5)

    for (const row of bodyRows) {
      expect(row.children).toHaveLength(2)
    }
  })

  it("gives at least one criterion the same answer in both columns", () => {
    const sameBothSides = rows()
      .filter((row) => typeof row.props["heading"] === "string")
      .filter((row) => {
        const [left, right] = row.children

        if (left?.kind !== "element" || right?.kind !== "element") return false

        const words = (node: typeof left): string =>
          node.children
            .map((child) => (child.kind === "text" ? child.value : ""))
            .join("")
            .trim()

        return words(left) !== "" && words(left) === words(right)
      })

    expect(sameBothSides.length).toBeGreaterThanOrEqual(1)
  })

  /**
   * Every criterion carries its own words, which is the copy the marks mean
   * nothing without. `words.ts` added `heading` to the props a sweep reads for
   * this reason, after six of them went unread on a page that is now gone.
   */
  it("names every criterion it marks", () => {
    for (const row of rows().filter((row) => row.children.length === 2)) {
      const heading = row.props["heading"]

      if (heading === undefined) continue

      expect(typeof heading).toBe("string")
      expect(String(heading).length).toBeGreaterThan(0)
    }
  })
})

/**
 * **No outcome claim.** `docs/positioning.md` allows this site exactly one, and
 * it is the maintainer's own phrasing on the front door's last rung: *greater
 * user engagement and conversion.* A second page promising a result is this
 * lane inventing positioning, which is the one thing its brief says it may not
 * do, so the words a result would be written in are held off this page.
 *
 * It is a substring check and it is blunt on purpose, for `copy.ts`' reason
 * about the reserved vocabulary: a rule that cannot be argued with is worth
 * more here than a subtle one that erodes an exception at a time.
 */
const OUTCOME_WORDS: readonly string[] = [
  "conversion",
  "engagement",
  "revenue",
  "faster",
  "x more",
  "uplift",
  "boost",
]

describe("what it promises", () => {
  it("promises nothing but that the code exists", () => {
    const words = readerCopy(page().root)
      .map(({ text }) => text.toLowerCase())
      .join(" ")

    const promised = OUTCOME_WORDS.filter((word) => words.includes(word))

    expect(promised).toEqual([])
  })
})

/**
 * The band that shows the set, held to the one thing a reader cannot check.
 *
 * A reader can see that there are a lot of them. What they cannot see is
 * whether the page is showing **the set** or a selection somebody made once:
 * the difference matters here more than anywhere else on the site, because the
 * band's caption says *all of them* and a page that said that of ninety would
 * be a false claim rather than an incomplete one.
 */
describe("the set it shows", () => {
  const chips = () =>
    elementsOf("loom.badge").map((node) =>
      node.children
        .map((child) => (child.kind === "text" ? child.value : ""))
        .join("")
    )

  it("prints every part the library registered, and nothing it did not", () => {
    expect([...chips()].sort((a, b) => a.localeCompare(b))).toEqual([...LIBRARY_PARTS])
  })

  /**
   * Read off the registry rather than off a number typed here, so this is a
   * comparison of two readings of the same thing rather than a tautology: the
   * figure the band prints comes from `copy.ts`, the chips come from
   * `library.ts`, and a page claiming a count it does not show is the failure.
   */
  it("prints as many as it claims", () => {
    const claimed = readerCopy(page().root)
      .map(({ text }) => text)
      .filter((text) => text.includes(FACTS.primitives))

    expect(claimed.length).toBeGreaterThanOrEqual(1)
    expect(chips()).toHaveLength(Number(FACTS.primitives))
  })

  /**
   * After the argument and before the way out. A reader who has not been told
   * what the jobs are has no use for a hundred names, and a reader who has
   * just read them is the one most likely to press *Read the docs*.
   */
  it("comes after the explanation and before the next step", () => {
    const bands = page().root.children.flatMap((node) =>
      node.kind === "element" && node.type === "loom.section"
        ? [String(node.props["eyebrow"] ?? "")]
        : []
    )

    expect(bands.indexOf("What you build with")).toBeGreaterThan(bands.indexOf("What comes with it"))
    expect(bands.indexOf("What you build with")).toBeLessThan(bands.indexOf("Next"))
  })
})

/**
 * The example page, which is the same question answered a second way.
 *
 * `example.test.ts` holds what is inside the frame. What belongs here is the
 * only thing about it that is this page's rather than the example's: **where
 * it stands.** The set and a page made out of the set are one argument read in
 * two steps, and the step after them is the one that asks the reader to go and
 * do it.
 */
describe("the page it shows made out of the set", () => {
  const bands = () =>
    page().root.children.flatMap((node) =>
      node.kind === "element" && node.type === "loom.section"
        ? [String(node.props["eyebrow"] ?? "")]
        : []
    )

  it("stands between the set and the way out", () => {
    expect(bands().indexOf("On a page")).toBeGreaterThan(bands().indexOf("What you build with"))
    expect(bands().indexOf("On a page")).toBeLessThan(bands().indexOf("Next"))
  })

  /**
   * **Two frames, and the guard is that they are not the same frame.**
   *
   * This read `toHaveLength(1)` until the comparison band landed, on the
   * reason *"a second would mean a band had been copied rather than
   * written"*. That reason is still the one worth holding and a count of one
   * is no longer the way to hold it: the second frame is written rather than
   * copied, and the thing that says so is that one of them is a still page
   * with marks over it and the other is a comparison with none.
   *
   * A count would have gone green for a band that was genuinely a duplicate,
   * which is the failure the original line was about. These four do not.
   */
  it("shows three frames and they are not the same frame", () => {
    expect(elementsOf("loom.frame")).toHaveLength(3)
  })

  /**
   * The marks name the parts under them, which is the band above's argument
   * and not this one's. On the pair they would also have to be drawn twice
   * and would be the only thing on the two screens that differed for a reason
   * having nothing to do with the reader.
   */
  it("keeps the marks on the still page and off both arrangements", () => {
    const [still, ...compared] = elementsOf("loom.frame")

    expect(
      elementsIn(still as ElementNode).filter((node) => node.type === "loom.pin")
    ).not.toEqual([])
    expect(
      compared.flatMap((frame) => elementsIn(frame).filter((node) => node.type === "loom.pin"))
    ).toEqual([])
  })

  /**
   * The one a duplicated band would fail. Two frames rendering the same words
   * is the thing nobody wants and the thing a count of frames cannot see.
   */
  it("does not say the same thing in any two frames", () => {
    const said = elementsOf("loom.frame").map((frame) => JSON.stringify(readerCopy(frame)))

    expect(new Set(said).size).toBe(said.length)
  })
})
