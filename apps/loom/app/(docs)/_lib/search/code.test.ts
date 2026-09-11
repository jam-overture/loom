import { describe, expect, it } from "vitest"

import { codeSectionsIn, readPageCode } from "./code"

/**
 * The rules for what code belongs where, against markdown written to exercise
 * them.
 *
 * Held here rather than against whichever page happens to exercise them this
 * week, for the reason `prose.test.ts` gives: another lane's ordinary writing
 * should not be able to turn this directory red. The one check against the real
 * site is at the bottom, and it asks only what the site is certain to keep
 * being true.
 */
describe("the code under a heading", () => {
  it("belongs to the nearest heading above it", () => {
    const source = [
      "# A page",
      "",
      "## Building a tree",
      "",
      "```ts",
      "const page = buildElement({ type: 'stack' })",
      "```",
      "",
      "## Rendering it",
      "",
      "```tsx",
      "<LoomTree tree={page} />",
      "```",
    ].join("\n")

    expect(codeSectionsIn(source)).toEqual([
      { anchor: "building-a-tree", code: "const page = buildElement({ type: 'stack' })" },
      { anchor: "rendering-it", code: "<LoomTree tree={page} />" },
    ])
  })

  it("gives a block above the first heading to the page itself", () => {
    const source = ["# A page", "", "```bash", "pnpm add @loom/runtime", "```"].join("\n")

    expect(codeSectionsIn(source)).toEqual([{ anchor: "", code: "pnpm add @loom/runtime" }])
  })

  /**
   * The rule that makes this index the same shape as the prose one: a heading
   * deeper than `###` is a label inside a section a reader was already sent to,
   * so it does not open one of its own.
   */
  it("does not let a fourth-level heading open a section", () => {
    const source = [
      "## What the Gate decides",
      "",
      "#### An aside",
      "",
      "```ts",
      "const verdict = evaluateGate(policy, change)",
      "```",
    ].join("\n")

    expect(codeSectionsIn(source)).toEqual([
      { anchor: "what-the-gate-decides", code: "const verdict = evaluateGate(policy, change)" },
    ])
  })

  /**
   * The failure the shared scanner exists to stop, from this side.
   *
   * A `## heading` inside a fence is a shell comment or a markdown example, not
   * a section, so it must not move where the code after it belongs.
   */
  it("does not take a heading inside a block for a heading", () => {
    const source = [
      "## Installation",
      "",
      "```bash",
      "## not a section",
      "pnpm add @loom/runtime",
      "```",
      "",
      "```ts",
      "import { buildElement } from '@loom/runtime'",
      "```",
    ].join("\n")

    expect(codeSectionsIn(source).map((section) => section.anchor)).toEqual([
      "installation",
      "installation",
    ])
  })

  it("keeps every language, because a reader can see every block", () => {
    const source = [
      "## Getting it",
      "",
      "```bash",
      "pnpm add @loom/runtime",
      "```",
      "",
      "```ts sketch",
      "const store = …",
      "```",
    ].join("\n")

    expect(codeSectionsIn(source).map((section) => section.code)).toEqual([
      "pnpm add @loom/runtime",
      "const store = …",
    ])
  })

  it("drops a block with nothing in it, which is nothing to find", () => {
    expect(codeSectionsIn(["## A heading", "", "```ts", "```"].join("\n"))).toEqual([])
  })

  it("finds nothing on a page with no blocks on it", () => {
    expect(codeSectionsIn("# A page\n\n## A heading\n\nWords only.")).toEqual([])
  })
})

describe("the code of a page, keyed by anchor", () => {
  it("joins two blocks under one heading without running their lines together", () => {
    const source = [
      "## Two ways",
      "",
      "```ts",
      "const a = 1",
      "```",
      "",
      "and then",
      "",
      "```ts",
      "const b = 2",
      "```",
    ].join("\n")

    const gathered = new Map(
      codeSectionsIn(source).reduce<readonly (readonly [string, string])[]>(
        (kept, { anchor, code }) => {
          const already = kept.find(([at]) => at === anchor)

          return already === undefined
            ? [...kept, [anchor, code] as const]
            : kept.map((pair) => (pair[0] === anchor ? ([anchor, `${pair[1]}\n\n${code}`] as const) : pair))
        },
        []
      )
    )

    expect(gathered.get("two-ways")).toBe("const a = 1\n\nconst b = 2")
  })

  /**
   * One check against the real site, and deliberately a weak one.
   *
   * What it asserts is the thing the index exists for and the thing the site
   * cannot stop being true: *Installation* tells a stranger how to install the
   * runtime, in a block, and so the install command is findable. A stronger
   * assertion here would be a test of this week's wording.
   */
  it("holds the install command off the page that gives it", () => {
    const code = [...readPageCode("getting-started", "installation").values()].join("\n")

    expect(code).toContain("@loom/runtime")
  })
})
