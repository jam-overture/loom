import { describe, expect, it } from "vitest"

import { docsEntryAt, docsOrder } from "../nav"
import { readPageHeadings } from "../search/headings"

import {
  entryProseFor,
  namedExportsIn,
  proseMentions,
  prosePagesFor,
  publishedNames,
  type ProseMention,
  type ProseMentionIndex,
} from "./mentions"
import type { ApiEntry } from "./model"

/**
 * What the link from a signature back to the prose has to get right.
 *
 * Two halves. The rules with a wrong answer — what counts as a mention, and
 * which heading it belongs to — are held against markdown written to exercise
 * them, because the pages that exercise them today will not be the pages that
 * exercise them next week. Everything the real index claims about the real site
 * is then held against the site: a link this produces has to land somewhere.
 */

const PUBLISHED = new Set(["createTree", "buildText", "ok", "renderLoomTree"])

describe("what counts as naming an export", () => {
  it("counts a name inside a fenced block", () => {
    const found = namedExportsIn("```ts\nconst tree = createTree(root)\n```", PUBLISHED)

    expect([...found.keys()]).toEqual(["createTree"])
  })

  it("counts a name between backticks in a sentence", () => {
    const found = namedExportsIn("Every node is made by `buildText` or its siblings.", PUBLISHED)

    expect([...found.keys()]).toEqual(["buildText"])
  })

  it("does not count a name written as plain prose", () => {
    const found = namedExportsIn("You can create a tree and render it however you like.", PUBLISHED)

    expect(found.size).toBe(0)
  })

  it("does not count a property read that happens to share a name", () => {
    const found = namedExportsIn("```ts\nif (!built.ok) return built.error\n```", PUBLISHED)

    expect(found.has("ok")).toBe(false)
  })

  it("counts the same spelling when it is not behind a dot", () => {
    const found = namedExportsIn("```ts\nreturn ok(tree)\n```", PUBLISHED)

    expect(found.has("ok")).toBe(true)
  })

  it("does not count a name the package does not publish", () => {
    const found = namedExportsIn("```ts\nconst x = createTreeish()\n```", PUBLISHED)

    expect(found.size).toBe(0)
  })

  it("does not count a longer name that merely contains one", () => {
    const found = namedExportsIn("```ts\ncreateTreeFromNothing()\n```", PUBLISHED)

    expect(found.size).toBe(0)
  })

  it("stops reading at a closing fence rather than treating the next prose as code", () => {
    const source = "```ts\ncreateTree()\n```\n\nThen render it — renderLoomTree does the rest."

    expect([...namedExportsIn(source, PUBLISHED).keys()]).toEqual(["createTree"])
  })
})

describe("which heading a mention belongs to", () => {
  const source = [
    "# A page",
    "",
    "Opening words about `createTree`.",
    "",
    "## Making the tree",
    "",
    "```ts",
    "buildText('hello')",
    "```",
    "",
    "### What `ok` means",
    "",
    "More words.",
    "",
    "```ts",
    "renderLoomTree(tree)",
    "```",
  ].join("\n")

  const found = namedExportsIn(source, PUBLISHED)

  it("gives a mention above every heading no heading at all", () => {
    expect(found.get("createTree")).toBe("")
  })

  it("gives a mention the nearest heading above it", () => {
    expect(found.get("buildText")).toBe("Making the tree")
  })

  it("counts a heading's own backticks under that heading rather than the last one", () => {
    expect(found.get("ok")).toBe("What ok means")
  })

  it("keeps a heading in force until the next one", () => {
    expect(found.get("renderLoomTree")).toBe("What ok means")
  })

  it("keeps the first mention on a page and not the last", () => {
    const twice = namedExportsIn(
      ["## First", "`createTree`", "## Second", "`createTree`"].join("\n"),
      PUBLISHED
    )

    expect(twice.get("createTree")).toBe("First")
  })
})

describe("the index built from the site's own pages", () => {
  it("finds something — a reader that read no pages would fail silently", () => {
    expect(proseMentions.size).toBeGreaterThan(0)
  })

  it("only ever names an export the package publishes", () => {
    for (const name of proseMentions.keys()) expect(publishedNames.has(name)).toBe(true)
  })

  it("offers a page that exists, every time", () => {
    for (const mentions of proseMentions.values()) {
      for (const mention of mentions) {
        expect(docsEntryAt(mention.href.split("#")[0] ?? "")).toBeTruthy()
      }
    }
  })

  it("offers an anchor that is really a heading on that page, every time", () => {
    for (const mentions of proseMentions.values()) {
      for (const mention of mentions) {
        const [href, anchor] = mention.href.split("#")

        if (anchor === undefined) continue

        const entry = docsEntryAt(href ?? "")

        expect(entry).toBeTruthy()
        if (entry === undefined) continue

        expect(
          readPageHeadings(entry.section.slug, entry.page.slug).map((heading) => heading.anchor)
        ).toContain(anchor)
      }
    }
  })

  it("lists a name's pages in reading order", () => {
    const positionOf = (mention: ProseMention): number =>
      docsOrder.findIndex((entry) => entry.href === (mention.href.split("#")[0] ?? ""))

    for (const mentions of proseMentions.values()) {
      const positions = mentions.map(positionOf)

      expect(positions).toEqual([...positions].sort((a, b) => a - b))
    }
  })

  it("names more than one page — a single-page index would pass every check above", () => {
    const pages = new Set(
      [...proseMentions.values()].flatMap((mentions) =>
        mentions.map((mention) => mention.href.split("#")[0] ?? "")
      )
    )

    expect(pages.size).toBeGreaterThan(1)
  })
})

describe("what one reference page is told about the prose", () => {
  const mention = (href: string, pageTitle: string, sectionTitle: string): ProseMention => ({
    href,
    pageTitle,
    sectionTitle,
    headingText: "",
  })

  const index: ProseMentionIndex = new Map<string, readonly ProseMention[]>([
    ["createTree", [mention("/docs/getting-started/your-first-tree", "Your first tree", "Getting started")]],
    ["buildText", [mention("/docs/getting-started/your-first-tree", "Your first tree", "Getting started")]],
    ["renderLoomTree", [mention("/docs/getting-started/rendering-a-tree", "Rendering a tree", "Getting started")]],
    ["elsewhere", [mention("/docs/the-runtime/proposing-a-change", "Proposing a change", "The runtime")]],
  ])

  const entry: ApiEntry = {
    specifier: "@loom/runtime",
    slug: "runtime",
    types: "./dist/index.d.ts",
    requires: [],
    files: 0,
    narrower: [],
    standing: { packageNames: 0, otherDoors: 0, doorsSharingNothing: 0, widest: true, sharedWith: [], collisions: [] },
    groups: [
      {
        module: "tree/tree",
        title: "Tree",
        summary: "",
        symbols: [
          { name: "createTree", kind: "function", signature: "", truncated: false, summary: "" },
          { name: "buildText", kind: "function", signature: "", truncated: false, summary: "" },
          { name: "parseTree", kind: "function", signature: "", truncated: false, summary: "" },
        ],
      },
      {
        module: "render/render",
        title: "Render",
        summary: "",
        symbols: [
          { name: "renderLoomTree", kind: "function", signature: "", truncated: false, summary: "" },
        ],
      },
    ],
  }

  it("counts only the exports this entry point actually has", () => {
    expect(entryProseFor(entry, index).named).toBe(3)
  })

  it("leaves out an export no page names", () => {
    expect(entryProseFor(entry, index).byName.has("parseTree")).toBe(false)
  })

  it("does not carry a mention that belongs to another entry point's export", () => {
    expect(entryProseFor(entry, index).byName.has("elsewhere")).toBe(false)
  })

  it("puts the page that reaches most of the door first", () => {
    expect(prosePagesFor(entry, index).map((page) => page.title)).toEqual([
      "Your first tree",
      "Rendering a tree",
    ])
    expect(prosePagesFor(entry, index)[0]?.named).toBe(2)
  })

  it("offers the page itself rather than one paragraph of it", () => {
    const withHeading: ProseMentionIndex = new Map([
      [
        "createTree",
        [
          {
            href: "/docs/getting-started/your-first-tree#making-the-tree",
            pageTitle: "Your first tree",
            sectionTitle: "Getting started",
            headingText: "Making the tree",
          },
        ],
      ],
    ])

    expect(prosePagesFor(entry, withHeading)[0]?.href).toBe("/docs/getting-started/your-first-tree")
  })
})
