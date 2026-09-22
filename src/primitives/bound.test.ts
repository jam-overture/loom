import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { z } from "zod"

import { createDataRegistry, defineSource, type DataRegistry, type SourceEntry } from "../data/adapter.js"
import { resolveTreeData } from "../data/resolve.js"
import { sequentialIdFactory, type IdFactory } from "../ids.js"
import { jsonValueSchema, type JsonObject, type JsonValue } from "../json.js"
import { renderLoomTree } from "../render/render.js"
import { THEME_PROP_KEY } from "../render/theme.js"
import { DATA_PROP_KEY } from "../reserved-props.js"
import { ok, err } from "../result.js"
import { describeRegistryError, type PrimitiveRegistry } from "../sdk/registry.js"
import { createThemeRegistry } from "../theme/registry.js"
import { buildElement, buildSlot, buildText } from "../tree/builders.js"
import { createTree, type LoomTree } from "../tree/tree.js"

import { createStarterPrimitiveRegistry } from "./index.js"

/**
 * The two primitives that read an answer, held to the thing the rest of the
 * library is never asked: **that the same node draws four different pages
 * depending on what came back, and that a reader can tell which one they got.**
 *
 * Every other fixture in this repository renders a tree. These render a tree
 * *and* a resolution, through the real seam — a registered source, a planned
 * question, an adapter that answers or does not — because the failures worth
 * catching live between the two. A handwritten `DataResolution` would prove the
 * component's branches and nothing about whether a binding a tree declares ever
 * reaches the primitive that declared it.
 */

const registryOf = (): PrimitiveRegistry => {
  const built = createStarterPrimitiveRegistry()
  if (!built.ok) throw new Error(describeRegistryError(built.error))

  return built.value
}

const primitives = registryOf()
const themes = createThemeRegistry()

const EDITORIAL = { palette: "editorial", fontPack: "editorial-serif", stylePreset: "comfortable" }
const BOLD = { palette: "bold", fontPack: "bold-sans", stylePreset: "airy-modern" }

const POSTS = [
  {
    title: "What a gate is for",
    detail: "Every change is weighed before it lands, and the weighing is the product.",
    meta: "12 September",
    href: "https://example.com/posts/gate",
  },
  {
    title: "Nothing is written",
    detail: "The runtime never generates code. It proposes operations against a tree.",
    meta: "3 September",
  },
  { title: "A year of ports", meta: "28 August", href: "https://example.com/posts/ports" },
] as const

/** A source answering whatever it was built with, under one id. */
const sourceAnswering = (value: JsonValue): SourceEntry =>
  defineSource({
    id: "catalogue.posts",
    description: "The latest posts",
    params: z.object({}).passthrough(),
    answers: jsonValueSchema,
    adapter: { fetch: () => Promise.resolve(ok(value)) },
  })

const sourceDown = (): SourceEntry =>
  defineSource({
    id: "catalogue.posts",
    description: "The latest posts, from a service that is not answering",
    params: z.object({}).passthrough(),
    answers: jsonValueSchema,
    adapter: { fetch: () => Promise.resolve(err({ code: "unavailable", detail: "timed out" })) },
  })

const dataRegistry = (entry: SourceEntry): DataRegistry => {
  const built = createDataRegistry([entry])
  if (!built.ok) throw new Error(`test data registry refused: ${built.error.code}`)

  return built.value
}

/**
 * A page holding one bound node, with the region the tree supplies for an
 * answer of none. `declared` is the node's own `loom:data` — `undefined` is a
 * node that never asked, which is a different page from one that asked and was
 * told nothing.
 */
const boundTree = (
  type: string,
  props: JsonObject,
  declared: unknown,
  theme: Record<string, string> = EDITORIAL
): LoomTree => {
  const ids: IdFactory = sequentialIdFactory()
  const text = (value: string) => buildText(ids, value)

  const empty = buildSlot(ids, "empty", [
    buildElement(ids, {
      type: "loom.empty-state",
      props: { outline: "dashed", align: "center", cause: "empty" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 3 },
            children: [text("Nothing published yet")],
          }),
        ]),
        text("The first post you publish appears here."),
      ],
    }),
  ])

  const node = buildElement(ids, {
    type,
    props: (declared === undefined ? props : { ...props, [DATA_PROP_KEY]: declared }) as JsonObject,
    children: type === "loom.feed" ? [empty] : [],
  })

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide" },
      children: [node],
    }),
    ids
  )
}

const renderWith = async (tree: LoomTree, entry: SourceEntry | undefined) => {
  const data = entry === undefined ? undefined : await resolveTreeData(tree, { registry: dataRegistry(entry) })
  const rendered = renderLoomTree(tree, {
    resolver: primitives,
    validator: primitives,
    themes,
    ...(data ? { data } : {}),
  })

  return { markup: renderToStaticMarkup(rendered.element), diagnostics: rendered.diagnostics }
}

const ASKING = { entries: { source: "catalogue.posts" } }

describe("loom.feed — a list that came from somewhere else", () => {
  it("draws the rows an answer carried, in the order it carried them", async () => {
    const { markup, diagnostics } = await renderWith(
      boundTree("loom.feed", {}, ASKING),
      sourceAnswering([...POSTS])
    )

    expect(diagnostics).toEqual([])
    expect(markup).toContain("What a gate is for")
    expect(markup).toContain("Every change is weighed before it lands")
    expect(markup).toContain("12 September")
    expect(markup).toContain('href="https://example.com/posts/gate"')
    expect(markup.indexOf("What a gate is for")).toBeLessThan(markup.indexOf("Nothing is written"))
    expect(markup.indexOf("Nothing is written")).toBeLessThan(markup.indexOf("A year of ports"))

    /** The region for an answer of none is not on a page that had rows. */
    expect(markup).not.toContain("Nothing published yet")
  })

  /**
   * The row without an `href` is the ordinary case — a post that is not linked
   * anywhere yet — and it has to draw its words rather than be skipped for a
   * field it never had.
   */
  it("draws a row with no address as an entry that is not a link", async () => {
    const { markup } = await renderWith(boundTree("loom.feed", {}, ASKING), sourceAnswering([...POSTS]))

    expect(markup).toContain("Nothing is written")
    /** Three rows, two of them addressed: the unaddressed one is drawn and is not an anchor. */
    expect([...markup.matchAll(/<a /g)]).toHaveLength(2)
  })

  /**
   * The first URL in this library that arrives from a host's data rather than
   * from a tree, so it is the first one the Gate never saw. It is held to the
   * same allowlist every authored `href` is (0053), and the row still draws:
   * the words are worth reading, and dropping a post over a field nobody can
   * see is a silent omission.
   */
  it("refuses an address a row carried that is not a scheme this library links to", async () => {
    const { markup } = await renderWith(
      boundTree("loom.feed", {}, ASKING),
      sourceAnswering([{ title: "Press me", href: "javascript:alert(1)" }])
    )

    expect(markup).toContain("Press me")
    expect(markup).not.toContain("javascript:")
    expect(markup).not.toContain("<a ")
  })

  it("places the region the tree gave it when the answer is none", async () => {
    const { markup, diagnostics } = await renderWith(boundTree("loom.feed", {}, ASKING), sourceAnswering([]))

    expect(diagnostics).toEqual([])
    expect(markup).toContain("Nothing published yet")
    expect(markup).toContain("The first post you publish appears here.")
    expect(markup).not.toContain("could not be loaded")
  })

  /**
   * A band dropped onto a page before anybody has connected a source. It asks
   * nothing, so the walk reports nothing, and what a reader meets is the region
   * for an absence rather than a failure — which is the only honest rendering
   * of a question that was never put.
   */
  it("shows the same region, and raises nothing, for a node that never asked", async () => {
    const { markup, diagnostics } = await renderWith(boundTree("loom.feed", {}, undefined), undefined)

    expect(diagnostics).toEqual([])
    expect(markup).toContain("Nothing published yet")
    expect(markup).not.toContain("could not be loaded")
  })

  /**
   * 0058's distinction, surviving to the pixels: *nothing to report* and *could
   * not be reached* are different answers, and a reader who takes one for the
   * other concludes their data is gone. The empty region must be absent here —
   * asserted, because the failure that matters is the one where a page says
   * "nothing published yet" about a source that is down.
   */
  it("says a source that could not answer is a different thing from one with nothing to say", async () => {
    const { markup, diagnostics } = await renderWith(boundTree("loom.feed", {}, ASKING), sourceDown())

    expect(markup).toContain("This list could not be loaded.")
    expect(markup).toContain('role="status"')
    expect(markup).not.toContain("Nothing published yet")
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["data-unavailable"])
  })

  it("says so rather than drawing nothing when the answer is a shape it cannot draw", async () => {
    const { markup } = await renderWith(
      boundTree("loom.feed", {}, ASKING),
      sourceAnswering({ posts: 3 })
    )

    expect(markup).toContain("This list could not be shown.")
    expect(markup).not.toContain("Nothing published yet")
  })

  /**
   * 0175, one layer down. One row written by a schema this build is older than
   * must not take the whole band off the page — and what it dropped is said out
   * loud rather than announced only, because a note only a screen reader meets
   * is the silent omission wearing an accessibility feature as a disguise.
   */
  it("skips a row it cannot read, draws the rest, and says that it did", async () => {
    const { markup } = await renderWith(
      boundTree("loom.feed", {}, ASKING),
      sourceAnswering([{ title: "A year of ports" }, { headline: "written by a later schema" }])
    )

    expect(markup).toContain("A year of ports")
    expect(markup).toContain("Some entries could not be shown.")
  })

  /**
   * The other half of the same rule, and the one a naive implementation gets
   * wrong: an answer where *nothing* reads is not a list with holes in it. A
   * hundred rows of some other shape is an answer to a question this primitive
   * did not ask, and "some entries could not be shown" over an empty region is
   * the least useful true sentence available.
   */
  it("calls an answer where no row reads a shape it cannot draw, not a list with holes", async () => {
    const { markup } = await renderWith(
      boundTree("loom.feed", {}, ASKING),
      sourceAnswering([{ headline: "one" }, { headline: "two" }])
    )

    expect(markup).toContain("This list could not be shown.")
    expect(markup).not.toContain("Some entries could not be shown.")
  })

  it("reads the binding it was pointed at rather than whichever answer came first", async () => {
    const { markup } = await renderWith(
      boundTree("loom.feed", { binding: "posts" }, { posts: { source: "catalogue.posts" } }),
      sourceAnswering([{ title: "Named, not first" }])
    )

    expect(markup).toContain("Named, not first")
  })

  it("draws nothing of its own when the name it was given is not one the node asked", async () => {
    const { markup } = await renderWith(
      boundTree("loom.feed", { binding: "elsewhere" }, ASKING),
      sourceAnswering([...POSTS])
    )

    expect(markup).toContain("Nothing published yet")
    expect(markup).not.toContain("What a gate is for")
  })
})

describe("loom.tally — one figure that is read rather than written", () => {
  const ASKING_FIGURE = { value: { source: "catalogue.posts" } }

  it("prints the figure a source answered, with the marks the page put around it", async () => {
    const { markup, diagnostics } = await renderWith(
      boundTree("loom.tally", { label: "Teams shipping weekly", prefix: "$", suffix: "+" }, ASKING_FIGURE),
      sourceAnswering("12,480")
    )

    expect(diagnostics).toEqual([])
    expect(markup).toContain("12,480")
    expect(markup).toContain("$")
    expect(markup).toContain("+")
    expect(markup).toContain("Teams shipping weekly")
    expect(markup).not.toContain('role="status"')
  })

  /**
   * A number answers, and it prints exactly as it arrived. Grouping it would
   * mean `Intl.NumberFormat` reading the *server's* locale, which is two
   * renders of one revision disagreeing by machine — so the separator is the
   * adapter's to supply, and this is the test that says so.
   */
  it("prints a number as it arrived rather than grouping it to a locale nobody chose", async () => {
    const { markup } = await renderWith(
      boundTree("loom.tally", { label: "Teams" }, ASKING_FIGURE),
      sourceAnswering(12480)
    )

    expect(markup).toContain("12480")
    expect(markup).not.toContain("12,480")
  })

  it("stands a declared word where the figure would have been, and announces it", async () => {
    const { markup, diagnostics } = await renderWith(
      boundTree("loom.tally", { label: "Teams shipping weekly" }, ASKING_FIGURE),
      sourceDown()
    )

    expect(markup).toContain("Unavailable")
    expect(markup).toContain('role="status"')
    /** The label stays: a figure that failed must not leave the page a word short of a sentence. */
    expect(markup).toContain("Teams shipping weekly")
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["data-unavailable"])
  })

  /**
   * `[object Object]` on a landing page is the failure the answer schema exists
   * to turn into a word. A boolean and an object are not figures, and printing
   * them is worse than saying the figure is not available.
   */
  it("refuses an answer that is not a figure rather than stringifying it", async () => {
    const { markup } = await renderWith(
      boundTree("loom.tally", { label: "Teams" }, ASKING_FIGURE),
      sourceAnswering({ count: 12 })
    )

    expect(markup).toContain("Unavailable")
    expect(markup).not.toContain("object Object")
  })
})

describe("what a bound region looks like under a second palette", () => {
  /**
   * The rule every primitive in this library is held to, applied to the two
   * that have a rendering no other fixture reaches: the failure line and the
   * skipped-row note are drawn by the primitive rather than by the tree, so
   * they are the two strings in this library most likely to carry a colour of
   * their own.
   */
  it("renders every state identically under both starter palettes, with no colour of its own", async () => {
    const states: readonly (readonly [string, SourceEntry])[] = [
      ["rows", sourceAnswering([...POSTS])],
      ["none", sourceAnswering([])],
      ["down", sourceDown()],
      ["mismatched", sourceAnswering({ posts: 3 })],
      ["partial", sourceAnswering([{ title: "A year of ports" }, { headline: "later" }])],
    ]

    for (const [name, entry] of states) {
      const editorial = await renderWith(boundTree("loom.feed", {}, ASKING, EDITORIAL), entry)
      const bold = await renderWith(boundTree("loom.feed", {}, ASKING, BOLD), entry)

      const bodyOf = (markup: string): string => markup.slice(markup.indexOf("<main"))

      expect(bodyOf(bold.markup), name).toBe(bodyOf(editorial.markup))
      expect(bodyOf(bold.markup), name).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
      expect(bodyOf(bold.markup), name).not.toMatch(/\b(rgba?|hsla?)\(/)
    }
  })

  it("holds the figure to the same rule", async () => {
    const tally = (theme: Record<string, string>) =>
      boundTree("loom.tally", { label: "Teams", suffix: "+" }, { value: { source: "catalogue.posts" } }, theme)

    for (const entry of [sourceAnswering("12,480"), sourceDown()]) {
      const editorial = await renderWith(tally(EDITORIAL), entry)
      const bold = await renderWith(tally(BOLD), entry)

      const bodyOf = (markup: string): string => markup.slice(markup.indexOf("<main"))

      expect(bodyOf(bold.markup)).toBe(bodyOf(editorial.markup))
      expect(bodyOf(bold.markup)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    }
  })
})
