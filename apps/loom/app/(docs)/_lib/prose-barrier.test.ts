import { describe, expect, it } from "vitest"

import {
  componentsLayer,
  hasBarrier,
  needsBarrier,
  readDocsStylesheet,
  selectorsIn,
  unguardedProseSelectors,
} from "./prose-barrier"

/**
 * The stylesheet's own claim, held.
 *
 * `globals.css` opens by saying that none of it reaches an example — that a
 * primitive draws itself from the theme mounted on its tree, and a docs site
 * which tinted its own examples would be showing a reader a page they cannot
 * reproduce. That was written as a description and it was not true: every
 * heading inside every rendered example was taking `letter-spacing` from
 * `.prose`, and a level-2 heading was taking a `border-top` as well — a rule
 * drawn across an example by the documentation site, which no reader copying
 * that tree would ever see.
 *
 * Nothing could have caught it. The examples render, so the registry's own
 * check passes; the values are plausible, so a screenshot looks fine. What was
 * missing is a test of the sheet, which is what this is.
 *
 * The parser is exercised against strings written for the purpose rather than
 * against `globals.css`, so ordinary work on the stylesheet cannot turn these
 * red for the wrong reason — the pattern `headings.ts` established. Two tests
 * at the end read the real file, and those are the invariant itself.
 */

const layer = (body: string): string => `@layer components {\n${body}\n}`

describe("which selectors need the barrier", () => {
  it("wants it on a rule that names an element under .prose", () => {
    expect(needsBarrier(".prose h2")).toBe(true)
    expect(needsBarrier(".prose li::marker")).toBe(true)
    expect(needsBarrier(".prose :not(pre) > code")).toBe(true)
  })

  it("does not want it on .prose itself, which reaches the region by inheritance", () => {
    expect(needsBarrier(".prose")).toBe(false)
  })

  it("does not want it on a direct child of .prose, which is the region and not its contents", () => {
    expect(needsBarrier(".prose > * + *")).toBe(false)
  })

  it("does not want it on a rule that addresses the region on purpose", () => {
    expect(needsBarrier(".prose .not-prose")).toBe(false)
  })

  it("ignores a rule that has nothing to do with prose", () => {
    expect(needsBarrier(".code-chip")).toBe(false)
    expect(needsBarrier(".callout-prose a")).toBe(false)
  })

  it("does not mistake a deeper descendant for a direct child", () => {
    expect(needsBarrier(".prose > div h2")).toBe(true)
  })
})

describe("reading the layer", () => {
  it("takes the whole block, braces inside it included", () => {
    const body = componentsLayer(layer(".a {\n  color: red;\n}\n.b {\n  color: blue;\n}"))

    expect(body).toContain(".a")
    expect(body).toContain(".b")
  })

  it("splits a grouped selector, because the barrier has to be on every part", () => {
    const css = layer(".prose h1,\n.prose h2 {\n  color: red;\n}")

    expect(selectorsIn(componentsLayer(css), css).map((rule) => rule.selector)).toEqual([
      ".prose h1",
      ".prose h2",
    ])
  })

  it("reports the line the selector is written on, past the blank ones before it", () => {
    const css = `@layer components {\n\n\n  .prose h2 {\n    color: red;\n  }\n}`

    expect(selectorsIn(componentsLayer(css), css)[0]?.line).toBe(4)
  })

  it("reports the selector's line and not the line the rule before it closed on", () => {
    const css = `@layer components {\n  .a {\n    color: red;\n  }\n\n  /* why */\n  .prose h2 {\n    color: red;\n  }\n}`

    expect(selectorsIn(componentsLayer(css), css).map((rule) => rule.line)).toEqual([2, 7])
  })

  it("does not read a selector out of a comment", () => {
    const css = layer("/* .prose h2 is not a rule */\n.code-chip {\n  color: red;\n}")

    expect(selectorsIn(componentsLayer(css), css).map((rule) => rule.selector)).toEqual([".code-chip"])
  })

  it("refuses a sheet with no components layer rather than reporting it clean", () => {
    expect(() => componentsLayer(".prose h2 { color: red; }")).toThrow(/no `@layer components`/)
  })

  it("refuses an at-rule it cannot read rather than guessing past it", () => {
    const css = layer("@media (min-width: 40rem) {\n  .prose h2 {\n    color: red;\n  }\n}")

    expect(() => selectorsIn(componentsLayer(css), css)).toThrow(/unreadable at-rule/)
  })
})

describe("finding what is unguarded", () => {
  it("names a rule that reaches into a region", () => {
    const css = layer(".prose h2 {\n  border-top: 1px solid red;\n}")

    expect(unguardedProseSelectors(css).map((rule) => rule.selector)).toEqual([".prose h2"])
  })

  it("accepts the same rule once it carries the barrier", () => {
    const css = layer(".prose h2:not(.not-prose *) {\n  border-top: 1px solid red;\n}")

    expect(unguardedProseSelectors(css)).toEqual([])
  })

  it("catches the half of a grouped selector that was missed", () => {
    const css = layer(".prose h1:not(.not-prose *),\n.prose h2 {\n  color: red;\n}")

    expect(unguardedProseSelectors(css).map((rule) => rule.selector)).toEqual([".prose h2"])
  })

  it("recognizes the barrier before a pseudo-element as well as after a type", () => {
    expect(hasBarrier(".prose li:not(.not-prose *)::marker")).toBe(true)
  })
})

describe("the documentation stylesheet itself", () => {
  const css = readDocsStylesheet()

  it("has no prose rule that can reach inside a .not-prose region", () => {
    const unguarded = unguardedProseSelectors(css)

    expect(
      unguarded.map((rule) => `globals.css:${rule.line}  ${rule.selector}`),
      "a rule under `.prose` without `:not(.not-prose *)` reaches into every rendered example on this site"
    ).toEqual([])
  })

  it("still has prose rules to guard, so an empty result is not an empty parse", () => {
    const guarded = selectorsIn(componentsLayer(css), css).filter(
      (rule) => needsBarrier(rule.selector) && hasBarrier(rule.selector)
    )

    expect(guarded.length).toBeGreaterThan(10)
  })

  it("defines the code chip once, shared between markdown and the components that ask for it", () => {
    const chip = selectorsIn(componentsLayer(css), css).filter(
      (rule) => rule.selector === ".code-chip" || rule.selector.endsWith("code:not(.not-prose *)")
    )

    expect(chip.map((rule) => rule.line)).toHaveLength(2)
    expect(new Set(chip.map((rule) => rule.line)).size, "the chip is two selectors on one rule").toBe(1)
  })
})
