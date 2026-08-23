import { describe, expect, it } from "vitest"

import { buildSearchIndex } from "./build"
import { searchDocs, searchTerms } from "./match"
import { SEARCH_RESULT_LIMIT, type SearchEntry, type SearchIndex } from "./model"

/**
 * The ranking, checked twice over: on a handful of entries where the right
 * answer is obvious, and on the real index with the queries a stranger actually
 * types.
 *
 * The second half is the one worth having. A ranking test against a fixture
 * proves the arithmetic; a ranking test against the site proves the arithmetic
 * was the right arithmetic. Every query below is one somebody arrives with —
 * "gate", "install", "undo", "theme" — and each asserts the page a maintainer
 * would have pointed them at is in the first few results.
 */

const entry = (over: Partial<SearchEntry>): SearchEntry => ({
  href: "/docs/x/y",
  title: "A title",
  context: "A section",
  kind: "page",
  summary: "",
  ...over,
})

const of = (...entries: readonly SearchEntry[]): SearchIndex => ({ entries })

const titles = (index: SearchIndex, query: string): readonly string[] =>
  searchDocs(index, query, SEARCH_RESULT_LIMIT).map((hit) => hit.entry.title)

describe("what a query is", () => {
  it("is the words in it, lower-cased", () => {
    expect(searchTerms("  The  GATE ")).toEqual(["the", "gate"])
  })

  it("is nothing when nothing was typed", () => {
    expect(searchTerms("   ")).toEqual([])
    expect(searchDocs(of(entry({})), "", SEARCH_RESULT_LIMIT)).toEqual([])
  })
})

describe("what matches", () => {
  const index = of(
    entry({ href: "/a", title: "What the Gate decides", context: "The runtime" }),
    entry({ href: "/b", title: "Reversibility", context: "What the Gate decides", kind: "heading" }),
    entry({ href: "/c", title: "Installation", context: "Getting started", summary: "Install the runtime." })
  )

  it("needs every word to be found somewhere", () => {
    expect(titles(index, "gate reversibility")).toEqual(["Reversibility"])
    expect(titles(index, "gate installation")).toEqual([])
  })

  it("narrows as you type rather than widening", () => {
    expect(titles(index, "the").length).toBeGreaterThan(titles(index, "the gate").length)
  })

  it("finds a word in a summary when it is nowhere better", () => {
    expect(titles(index, "install")).toContain("Installation")
  })

  it("finds nothing for a word the site does not use", () => {
    expect(titles(index, "kubernetes")).toEqual([])
  })
})

describe("what comes first", () => {
  it("prefers a title over a section over a summary", () => {
    const index = of(
      entry({ href: "/a", title: "Elsewhere", summary: "All about themes." }),
      entry({ href: "/b", title: "Elsewhere too", context: "Themes" }),
      entry({ href: "/c", title: "Themes" })
    )

    expect(titles(index, "themes")).toEqual(["Themes", "Elsewhere too", "Elsewhere"])
  })

  it("prefers the start of a title to the middle of one", () => {
    const index = of(
      entry({ href: "/a", title: "Undoing a change with an inverse delta" }),
      entry({ href: "/b", title: "Delta" })
    )

    expect(titles(index, "delta")).toEqual(["Delta", "Undoing a change with an inverse delta"])
  })

  it("gives a word behind a camel hump the credit a word after a space gets", () => {
    /*
     * The runtime names its exports `planReverts`, not `plan_reverts`, so
     * without this the library's own convention would be the thing making its
     * exports hard to find. Both entries here are exports, so nothing but the
     * hump separates them: in one, `revert` starts a word; in the other it is
     * buried inside one.
     */
    const index = of(
      entry({ href: "/a", title: "isUnrevertable", kind: "export", context: "@loom/runtime" }),
      entry({ href: "/b", title: "planReverts", kind: "export", context: "@loom/runtime" })
    )

    expect(titles(index, "revert")).toEqual(["planReverts", "isUnrevertable"])
  })

  it("puts a page above an export where the two would otherwise tie", () => {
    const index = of(
      entry({ href: "/a", title: "Themes and tokens", kind: "export", context: "@loom/runtime" }),
      entry({ href: "/b", title: "Themes and tokens", kind: "page", context: "The runtime" })
    )

    expect(searchDocs(index, "themes", SEARCH_RESULT_LIMIT)[0]?.entry.kind).toBe("page")
  })

  it("prefers prose to a name where the two tie", () => {
    const index = of(
      entry({ href: "/a", title: "render", kind: "export", context: "@loom/runtime/react" }),
      entry({ href: "/b", title: "render", kind: "heading", context: "Rendering a tree" })
    )

    expect(searchDocs(index, "render", SEARCH_RESULT_LIMIT)[0]?.entry.kind).toBe("heading")
  })

  /**
   * The regression that made this a band rather than a bonus. `gate` names an
   * export exactly and three more by prefix, and a reader typing it almost
   * certainly does not yet know what a Gate is. No field score may lift a name
   * above a page.
   */
  it("puts prose above a name even when the name matches exactly and the page does not", () => {
    const index = of(
      entry({ href: "/a", title: "gate", kind: "export", context: "@loom/runtime" }),
      entry({ href: "/b", title: "GatePolicy", kind: "export", context: "@loom/runtime" }),
      entry({ href: "/c", title: "What the Gate decides", kind: "page", context: "The runtime" })
    )

    expect(titles(index, "gate")).toEqual(["What the Gate decides", "gate", "GatePolicy"])
  })

  it("still puts a name first when no page or section matches at all", () => {
    const index = of(
      entry({ href: "/a", title: "Primitives and the registry", kind: "page", context: "Building" }),
      entry({ href: "/b", title: "definePrimitive", kind: "export", context: "@loom/runtime/sdk" })
    )

    expect(titles(index, "definePrimitive")).toEqual(["definePrimitive"])
  })

  it("returns the same order for the same query, every time", () => {
    const index = buildSearchIndex()

    expect(titles(index, "tree")).toEqual(titles(index, "tree"))
  })

  it("shows no more than it said it would", () => {
    expect(searchDocs(buildSearchIndex(), "a", SEARCH_RESULT_LIMIT).length).toBeLessThanOrEqual(
      SEARCH_RESULT_LIMIT
    )
  })
})

describe("the queries a stranger arrives with", () => {
  const index = buildSearchIndex()

  const firstFew = (query: string): readonly string[] => titles(index, query).slice(0, 4)

  it("sends 'install' to the installation page", () => {
    expect(firstFew("install")).toContain("Installation")
  })

  it("sends 'gate' to the page about the Gate, ahead of every export named after it", () => {
    expect(titles(index, "gate")[0]).toBe("What the Gate decides")
  })

  it("sends 'registry' somewhere about the registry", () => {
    expect(firstFew("registry").join(" · ")).toMatch(/registry/i)
  })

  it("sends an export name to that export", () => {
    const [first] = titles(index, "definePrimitive")

    expect(first).toBe("definePrimitive")
  })

  it("finds a section by its own words rather than only its page", () => {
    const hit = searchDocs(index, "prop or child", SEARCH_RESULT_LIMIT)[0]

    expect(hit?.entry.kind).toBe("heading")
    expect(hit?.entry.href).toContain("#prop-or-child")
  })
})
