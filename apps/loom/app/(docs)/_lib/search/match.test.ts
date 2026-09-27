import { describe, expect, it } from "vitest"

import { buildSearchIndex, searchProse } from "./build"
import { searchDocs, searchTerms } from "./match"
import { SEARCH_RESULT_LIMIT, withProse, type SearchEntry, type SearchIndex } from "./model"

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
  body: "",
  code: "",
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

describe("what the prose is worth", () => {
  const serverless = entry({
    href: "/a#serverless",
    title: "Memory is a real answer, for exactly one shape of deployment",
    context: "Going to production",
    kind: "heading",
    body: "They are the wrong choice on a serverless host, where a change lands in the memory of whichever process served the request.",
  })

  it("finds a section by a word that is only in its prose", () => {
    expect(titles(of(serverless), "serverless")).toEqual([serverless.title])
  })

  it("finds it halfway through the word, the way somebody types", () => {
    expect(titles(of(serverless), "server")).toEqual([serverless.title])
  })

  /**
   * A paragraph is long enough for a substring to be wrong in a way a title
   * never is: `ai` is inside *said*, `gate` is inside *propagate*, and a reader
   * who typed either would be handed a section that never mentions their
   * subject.
   */
  it("does not find a word buried inside another word", () => {
    expect(titles(of(entry({ title: "Elsewhere", body: "Nothing propagates here." })), "gate")).toEqual([])
  })

  it("is worth less than a summary, which is worth less than a title", () => {
    const index = of(
      entry({ href: "/a", title: "Elsewhere", body: "All about holds." }),
      entry({ href: "/b", title: "Elsewhere too", summary: "All about holds." }),
      entry({ href: "/c", title: "Holds" })
    )

    expect(titles(index, "holds")).toEqual(["Holds", "Elsewhere too", "Elsewhere"])
  })

  /**
   * The reason `prose.ts` drops a name in backticks. Prose outranks names by
   * design, so a page whose *body* held `definePrimitive` would be handed to a
   * reader who typed the export letter-for-letter — the one query where the
   * export is the right answer, and the one this site would then get wrong.
   */
  it("never lets a page's words outrank the export somebody typed exactly", () => {
    const index = of(
      entry({ href: "/a", title: "definePrimitive", kind: "export", context: "@jam-overture/loom/sdk" }),
      entry({ href: "/b", title: "Primitives and the registry", kind: "page", body: "You define a primitive." })
    )

    expect(titles(index, "definePrimitive")).toEqual(["definePrimitive"])
  })

  it("still narrows on two words when one of them is only in the prose", () => {
    const index = of(
      serverless,
      entry({ href: "/b", title: "Memory", kind: "heading", body: "Kept in one process." })
    )

    expect(titles(index, "memory serverless")).toEqual([serverless.title])
  })
})

describe("the sentence a result is shown with", () => {
  const hit = (over: Partial<SearchEntry>, query: string) =>
    searchDocs(of(entry(over)), query, SEARCH_RESULT_LIMIT)[0]

  const excerpt = (over: Partial<SearchEntry>, query: string): string =>
    (hit(over, query)?.excerpt ?? []).map((part) => part.text).join("")

  it("is the words around the one the prose was found by", () => {
    expect(excerpt({ body: "A hold waits for a person to answer it, and is not thrown away." }, "answer")).toBe(
      "A hold waits for a person to answer it, and is not thrown away."
    )
  })

  it("marks every word the reader typed", () => {
    const marked = (hit({ body: "A hold waits for a person to answer it." }, "hold answer")?.excerpt ?? [])
      .filter((part) => part.match)
      .map((part) => part.text)

    expect(marked).toEqual(["hold", "answer"])
  })

  it("is not shown when the title already carried the whole query", () => {
    expect(excerpt({ title: "Holds", body: "A hold waits for a person." }, "holds")).toBe("")
  })

  it("says where it was cut, and does not claim a cut that is not there", () => {
    const long = `${"padding word ".repeat(40)}serverless host ${"trailing word ".repeat(40)}`

    expect(excerpt({ body: long }, "serverless")).toMatch(/^….*…$/)
    expect(excerpt({ body: "Short and serverless." }, "serverless")).toBe("Short and serverless.")
  })

  it("prints one ellipsis where the paragraph had already left a name out", () => {
    /* The name the paragraph left out lands exactly where the window ends. */
    const body = `hold ${"word ".repeat(25)}… and then the rest of the paragraph`

    expect(excerpt({ body }, "hold")).toMatch(/…$/)
    expect(excerpt({ body }, "hold")).not.toContain("……")
  })

  it("begins and ends on a whole word", () => {
    const long = `${"padding word ".repeat(40)}serverless host ${"trailing word ".repeat(40)}`

    expect(excerpt({ body: long }, "serverless").replace(/…/g, "")).toMatch(/^\S.*\S$/)
    expect(excerpt({ body: long }, "serverless")).toContain("serverless host")
  })

  it("centres on the word the prose carried rather than one the title already had", () => {
    const body = `Holds are ${"described at length ".repeat(20)}and only much later, serverless.`

    expect(excerpt({ title: "Holds", body }, "holds serverless")).toContain("serverless")
  })

  /**
   * The rule that matters on a page-long body, which is what a generated page
   * contributes: its words are not cut up by heading, so the first place a term
   * appears is nowhere in particular.
   */
  it("cuts where the most of the reader's words are together, not where the first one is", () => {
    const body = [
      "Two minutes is all it takes to pick one.",
      "word ".repeat(60),
      "It is the same declaration reached two ways, so either import gives you the same thing.",
    ].join(" ")

    expect(excerpt({ body }, "same declaration reached two ways")).toContain(
      "same declaration reached two ways"
    )
  })

  it("takes the earliest of two places that answer equally well", () => {
    const body = `the hold answer here ${"word ".repeat(60)} the hold answer again`

    expect(excerpt({ body }, "hold answer")).toContain("the hold answer here")
  })

  it("still cuts at the only place there is, when there is only one", () => {
    const body = `${"word ".repeat(60)}the serverless host${" word".repeat(60)}`

    expect(excerpt({ body }, "serverless")).toContain("serverless host")
  })

  it("is nothing at all for an entry with no prose and no code", () => {
    expect(excerpt({ title: "planReverts", kind: "export", context: "@jam-overture/loom" }, "planreverts")).toBe("")
  })

  /**
   * The same field, cut by a different rule.
   *
   * Code is written in lines, so an excerpt from it is one line rather than a
   * window: a cut that ignored them would hand a reader half a call and half of
   * the next one, which is worse than useless in a row whose whole job is to
   * account for why the result is there.
   */
  it("is the one line of code a name was found on", () => {
    const code = [
      'import { commitIntent } from "@jam-overture/loom/write"',
      "",
      "const outcome = await commitIntent(path, intent)",
    ].join("\n")

    expect(excerpt({ code }, "commitintent")).toBe('import { commitIntent } from "@jam-overture/loom/write"')
    expect(hit({ code }, "commitintent")?.excerptIsCode).toBe(true)
  })

  it("drops the indentation, which is not information in one line", () => {
    const code = ["const path = {", "  store,", "  interpret: withHermes,", "}"].join("\n")

    expect(excerpt({ code }, "interpret")).toBe("interpret: withHermes,")
  })

  it("marks the typed word inside a line of code", () => {
    const marked = (hit({ code: "const next = applyDelta(page, delta)" }, "applydelta")?.excerpt ?? [])
      .filter((part) => part.match)
      .map((part) => part.text)

    expect(marked).toEqual(["applyDelta"])
  })

  /**
   * Prose wins where both could answer, and says so rather than mixing them.
   *
   * A sentence means more to somebody who does not have the model in their head
   * than a snippet does, and one rule a person can repeat beats an arithmetic
   * nobody can predict from the screen.
   */
  it("shows the sentence rather than the snippet when both carried a word", () => {
    const found = hit(
      { body: "A hold waits for somebody to answer it.", code: "await confirmHeld(path, answer)" },
      "waits confirmHeld"
    )

    expect(found?.excerptIsCode).toBe(false)
    expect((found?.excerpt ?? []).map((part) => part.text).join("")).toContain("waits")
  })

  it("says the excerpt is not code when there is no excerpt", () => {
    expect(hit({ title: "Holds", body: "A hold waits." }, "holds")?.excerptIsCode).toBe(false)
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
      entry({ href: "/a", title: "isUnrevertable", kind: "export", context: "@jam-overture/loom" }),
      entry({ href: "/b", title: "planReverts", kind: "export", context: "@jam-overture/loom" })
    )

    expect(titles(index, "revert")).toEqual(["planReverts", "isUnrevertable"])
  })

  it("puts a page above an export where the two would otherwise tie", () => {
    const index = of(
      entry({ href: "/a", title: "Themes and tokens", kind: "export", context: "@jam-overture/loom" }),
      entry({ href: "/b", title: "Themes and tokens", kind: "page", context: "The runtime" })
    )

    expect(searchDocs(index, "themes", SEARCH_RESULT_LIMIT)[0]?.entry.kind).toBe("page")
  })

  it("prefers prose to a name where the two tie", () => {
    const index = of(
      entry({ href: "/a", title: "render", kind: "export", context: "@jam-overture/loom/react" }),
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
      entry({ href: "/a", title: "gate", kind: "export", context: "@jam-overture/loom" }),
      entry({ href: "/b", title: "GatePolicy", kind: "export", context: "@jam-overture/loom" }),
      entry({ href: "/c", title: "What the Gate decides", kind: "page", context: "The runtime" })
    )

    expect(titles(index, "gate")).toEqual(["What the Gate decides", "gate", "GatePolicy"])
  })

  it("still puts a name first when no page or section matches at all", () => {
    const index = of(
      entry({ href: "/a", title: "Primitives and the registry", kind: "page", context: "Building" }),
      entry({ href: "/b", title: "definePrimitive", kind: "export", context: "@jam-overture/loom/sdk" })
    )

    expect(titles(index, "definePrimitive")).toEqual(["definePrimitive"])
  })

  it("returns the same order for the same query, every time", () => {
    const index = withProse(buildSearchIndex(), searchProse())

    expect(titles(index, "tree")).toEqual(titles(index, "tree"))
  })

  it("shows no more than it said it would", () => {
    expect(searchDocs(withProse(buildSearchIndex(), searchProse()), "a", SEARCH_RESULT_LIMIT).length).toBeLessThanOrEqual(
      SEARCH_RESULT_LIMIT
    )
  })
})

describe("the queries a stranger arrives with", () => {
  const index = withProse(buildSearchIndex(), searchProse())

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

  /**
   * The query the site could not answer at all until the blocks were indexed.
   *
   * `pnpm` appears on this site in shell blocks and nowhere else — the prose
   * elides every span between backticks — so before the code was searched a
   * reader who typed it was told the site says nothing. Asserted as *something
   * comes back* rather than as a page title, because which page carries the
   * command is the site's business and that it is findable is this file's.
   */
  it("finds the install command, which lives only in a block", () => {
    expect(titles(index, "pnpm").length).toBeGreaterThan(0)
  })

  /**
   * And it does not do so at the expense of the rule above it.
   *
   * A published name typed letter-for-letter goes to the name. Pages that only
   * print it in a snippet come after, never before — which is the whole of the
   * care the code band needed, and the one thing about it that could regress
   * without anything else noticing.
   */
  it("keeps a page that only shows a name in a block below the name itself", () => {
    const ranked = titles(index, "commitIntent")

    expect(ranked[0]).toBe("commitIntent")
    expect(ranked.length).toBeGreaterThan(1)
  })

  /**
   * The thing this site could not do until the prose was indexed, asserted
   * without naming a word any page is obliged to keep saying.
   *
   * The word is *found* rather than written down: the first long one that
   * appears in some paragraph and in no title, section or summary anywhere on
   * the site. Whatever it turns out to be today, a reader typing it used to be
   * told the site had never heard of it, and the excerpt is what makes the
   * answer accountable — the row shows the sentence it came from.
   */
  const onlyInProse = (): { readonly href: string; readonly word: string } => {
    const named = index.entries
      .map((entry) => `${entry.title} ${entry.context} ${entry.summary}`.toLowerCase())
      .join(" ")

    for (const entry of index.entries) {
      for (const word of entry.body.toLowerCase().split(/[^\p{L}]+/u)) {
        if (word.length >= 9 && !named.includes(word)) return { href: entry.href, word }
      }
    }

    throw new Error("every word on this site is in a title, which cannot be right")
  }

  it("finds a section by a word that is in its paragraph and nowhere else", () => {
    const { href, word } = onlyInProse()

    expect(
      searchDocs(index, word, SEARCH_RESULT_LIMIT).map((hit) => hit.entry.href),
      word
    ).toContain(href)
  })

  it("shows that reader the sentence it found, with their word in it", () => {
    const { word } = onlyInProse()

    const [first] = searchDocs(index, word, SEARCH_RESULT_LIMIT)

    expect(first?.excerpt.some((part) => part.match), word).toBe(true)
    expect(first?.excerpt.map((part) => part.text).join("").toLowerCase(), word).toContain(word)
  })

  it("finds a section by its own words rather than only its page", () => {
    const hit = searchDocs(index, "prop or child", SEARCH_RESULT_LIMIT)[0]

    expect(hit?.entry.kind).toBe("heading")
    expect(hit?.entry.href).toContain("#prop-or-child")
  })
})
