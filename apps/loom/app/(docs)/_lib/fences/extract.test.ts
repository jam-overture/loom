import { describe, expect, it } from "vitest"

import { fencesIn, pagesWithFences } from "./extract"
import { ELLIPSIS, isCheckable } from "./model"

/**
 * Reading the code out of a page.
 *
 * The scanner is the one place a mistake would be silent. A word it did not
 * recognise could plausibly be treated as a program, or as "leave this one
 * alone", and both are wrong in a way nobody would notice: the first buries a
 * real failure in noise on a block that was never meant to compile, the second
 * stops the check looking at a block that was.
 *
 * So the cases below are mostly refusals.
 */

describe("fences on a page", () => {
  it("reads the code between the fences, verbatim", () => {
    const [fence] = fencesIn('before\n\n```ts\nconst a = 1\n\nconst b = 2\n```\n\nafter\n', "a page")

    expect(fence?.code).toBe("const a = 1\n\nconst b = 2")
    expect(fence?.line).toBe(3)
  })

  it("treats a fence with no word after its language as a program", () => {
    const fences = fencesIn("```ts\nconst a = 1\n```", "a page")

    expect(fences.map((fence) => fence.kind)).toEqual(["program"])
    expect(fences.map(isCheckable)).toEqual([true])
  })

  it("reads the word that says what kind of block it is", () => {
    const kinds = fencesIn(
      "```ts object-body\na: 1\n```\n\n```ts function-body\nreturn 1\n```\n\n```ts sketch\nf(1, …)\n```",
      "a page"
    ).map((fence) => fence.kind)

    expect(kinds).toEqual(["object-body", "function-body", "sketch"])
  })

  it("does not compile a sketch, or anything that is not TypeScript", () => {
    const fences = fencesIn("```ts sketch\nf(…)\n```\n\n```bash\npnpm install\n```", "a page")

    expect(fences.map(isCheckable)).toEqual([false, false])
  })

  it("refuses a word it does not know rather than guessing which kind it meant", () => {
    expect(() => fencesIn("```ts objectbody\na: 1\n```", "a page")).toThrow(/not a kind of fence/)
  })

  it("refuses a language nobody has decided about", () => {
    expect(() => fencesIn("```python\nprint(1)\n```", "a page")).toThrow(/has decided about/)
  })

  it("refuses a fence with no language at all", () => {
    expect(() => fencesIn("```\nsomething\n```", "a page")).toThrow(/no language/)
  })

  it("refuses more than one word after the language", () => {
    expect(() => fencesIn("```ts object-body sketch\na: 1\n```", "a page")).toThrow(/one word/)
  })

  it("refuses a fence that is never closed", () => {
    expect(() => fencesIn("```ts\nconst a = 1\n", "a page")).toThrow(/never closed/)
  })

  it("does not end a fence on the tildes that did not open it", () => {
    const [fence] = fencesIn("~~~ts\nconst a = 1\n```\nconst b = 2\n~~~", "a page")

    expect(fence?.code).toBe("const a = 1\n```\nconst b = 2")
  })
})

/**
 * The rule that keeps `sketch` from becoming a place to hide a broken snippet.
 *
 * It is the only way out of the check, so it costs something: a sketch has to be
 * visibly incomplete. A reader looking at an ellipsis knows they cannot copy the
 * block; a reader looking at a block that quietly stopped compiling does not.
 */
describe("every sketch on the site", () => {
  it("says so, with an ellipsis a reader can see", () => {
    const sketches = pagesWithFences().flatMap((page) =>
      page.fences
        .filter((fence) => fence.kind === "sketch")
        .map((fence) => ({ where: `${page.sectionSlug}/${page.pageSlug}:${fence.line}`, code: fence.code }))
    )

    expect(sketches.length).toBeGreaterThan(0)

    sketches.forEach((sketch) => {
      expect(sketch.code, `${sketch.where} is a sketch and does not show it`).toContain(ELLIPSIS)
    })
  })
})

/**
 * The rule that keeps `alternative` meaning something.
 *
 * The word says *the same job as the block above, done differently*. A page
 * opening with one would be claiming to redo a block that is not there, and the
 * damage is silent: the block gets a module of its own, the page's one program
 * loses its first half, and everything still compiles.
 */
describe("an alternative on a page", () => {
  it("is refused when there is no block above it to be an alternative to", () => {
    expect(() => fencesIn("```ts alternative\nconst a = 1\n```", "a page")).toThrow(
      /the first code block on a page cannot be an alternative/
    )
  })

  it("is allowed once the page has said something for it to redo", () => {
    expect(() =>
      fencesIn("```ts\nconst a = 1\n```\n\n```ts alternative\nconst a = 2\n```", "a page")
    ).not.toThrow()
  })

  it("does not count a block nobody compiles as the block above it", () => {
    expect(() =>
      fencesIn("```bash\npnpm add loom\n```\n\n```ts alternative\nconst a = 2\n```", "a page")
    ).toThrow(/cannot be an alternative/)
  })
})
