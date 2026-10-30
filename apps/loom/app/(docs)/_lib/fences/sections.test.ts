import { describe, expect, it } from "vitest"

import { blockSectionsIn, LANDING_LEVELS } from "./sections"

/**
 * Which heading a block is under, against markdown written to exercise the
 * rules rather than against whichever page happens to exercise them this week —
 * the reason `search/code.test.ts` gives, and this is the module that scan was
 * lifted out of.
 */
describe("the section a block sits in", () => {
  const anchors = (source: string) => blockSectionsIn(source).map((block) => block.anchor)

  it("gives a block the nearest heading above it", () => {
    const source = [
      "# A page",
      "",
      "## Building a tree",
      "",
      "```ts",
      "const page = buildElement(ids, { type: 'loom.page' })",
      "```",
      "",
      "## Rendering it",
      "",
      "```tsx",
      "<LoomTree tree={page} />",
      "```",
    ].join("\n")

    expect(blockSectionsIn(source)).toEqual([
      {
        opensAt: 5,
        anchor: "building-a-tree",
        heading: "Building a tree",
        code: "const page = buildElement(ids, { type: 'loom.page' })",
      },
      { opensAt: 11, anchor: "rendering-it", heading: "Rendering it", code: "<LoomTree tree={page} />" },
    ])
  })

  it("gives a block above the first heading to the page itself", () => {
    const source = ["# A page", "", "```bash", "pnpm add @jam-overture/loom", "```"].join("\n")

    expect(blockSectionsIn(source)).toEqual([
      { opensAt: 3, anchor: "", heading: "", code: "pnpm add @jam-overture/loom" },
    ])
  })

  /*
   * The level rule is the half worth sharing. A `####` is a label inside a
   * section a reader was already sent to, and no index on this site hands out a
   * fragment for one — so a block under it belongs to the section above, which
   * is the anchor a reader can actually land on.
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

    expect(anchors(source)).toEqual(["what-the-gate-decides"])
  })

  it("lets a third-level heading open one, because the search box links to it", () => {
    expect(LANDING_LEVELS).toEqual([2, 3])
    expect(anchors(["## Themes", "", "### The third answer", "", "```ts", "const a = 1", "```"].join("\n"))).toEqual(
      ["the-third-answer"]
    )
  })

  /*
   * The failure the shared scanner exists to stop. A `## heading` inside a fence
   * is a shell comment or a markdown example, not a section, so it must not move
   * where the code after it belongs.
   */
  it("does not take a heading inside a block for a heading", () => {
    const source = [
      "## Installation",
      "",
      "```bash",
      "## not a section",
      "pnpm add @jam-overture/loom",
      "```",
      "",
      "```ts",
      "import { buildElement } from '@jam-overture/loom'",
      "```",
    ].join("\n")

    expect(anchors(source)).toEqual(["installation", "installation"])
  })

  it("keeps a block with nothing in it, which is a block a page still has", () => {
    expect(blockSectionsIn(["## A heading", "", "```ts", "```"].join("\n"))).toEqual([
      { opensAt: 3, anchor: "a-heading", heading: "A heading", code: "" },
    ])
  })

  it("finds nothing on a page with no blocks on it", () => {
    expect(blockSectionsIn("# A page\n\n## A heading\n\nWords only.")).toEqual([])
  })
})
