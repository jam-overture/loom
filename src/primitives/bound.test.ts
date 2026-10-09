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
 * The five primitives that read an answer, held to the thing the rest of the
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
  theme: Record<string, string> = EDITORIAL,
  /**
   * Whether the tree also places the region a bound primitive draws when its
   * source did not answer (0246). Off by default, because the default is the
   * page every existing tree is — one that places `empty` and lets the
   * primitive's own sentence stand for the failure.
   */
  failureRegion = false
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

  /**
   * Every bound primitive but `loom.tally` places a region for an answer of
   * none, which is 0233's first obligation on a twin and the state a catalogue
   * band drops in as. The list is written out rather than derived from the
   * registry so that a primitive quietly losing its region fails here.
   */
  const PLACES_A_REGION: readonly string[] = ["loom.feed", "loom.trend", "loom.voices", "loom.plate"]

  /**
   * What a page says for itself when its data is down: a heading, a sentence
   * and a way out. The point of the region is that none of this was sayable
   * before — the primitive's own line is one sentence of muted body text, and a
   * page that wanted to send a reader somewhere had nowhere to put the link.
   */
  const unavailable = buildSlot(ids, "unavailable", [
    buildElement(ids, {
      type: "loom.empty-state",
      props: { outline: "solid", align: "center", cause: "unavailable" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 3 },
            children: [text("We cannot reach this right now")],
          }),
        ]),
        text("Our status page has the latest."),
        buildSlot(ids, "actions", [
          buildElement(ids, {
            type: "loom.action",
            props: { href: "https://example.com/status", variant: "secondary", scale: "small" },
            children: [text("Check status")],
          }),
        ]),
      ],
    }),
  ])

  const regions = PLACES_A_REGION.includes(type)
    ? failureRegion
      ? [empty, unavailable]
      : [empty]
    : []

  const node = buildElement(ids, {
    type,
    props: (declared === undefined ? props : { ...props, [DATA_PROP_KEY]: declared }) as JsonObject,
    children: regions,
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

      expect(bodyOnly(bold.markup), name).toBe(bodyOnly(editorial.markup))
      expect(bodyOnly(bold.markup), name).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
      expect(bodyOnly(bold.markup), name).not.toMatch(/\b(rgba?|hsla?)\(/)
    }
  })

  it("holds the figure to the same rule", async () => {
    const tally = (theme: Record<string, string>) =>
      boundTree("loom.tally", { label: "Teams", suffix: "+" }, { value: { source: "catalogue.posts" } }, theme)

    for (const entry of [sourceAnswering("12,480"), sourceDown()]) {
      const editorial = await renderWith(tally(EDITORIAL), entry)
      const bold = await renderWith(tally(BOLD), entry)

      expect(bodyOnly(bold.markup)).toBe(bodyOnly(editorial.markup))
      expect(bodyOnly(bold.markup)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    }
  })
})

/**
 * The series, the wall and the picture — the three twins 0233 admits, each
 * driven through the same real seam as the two above.
 *
 * Every one of them is tested in the four states 0058 insists are four and not
 * two: answered, answered with nothing, unreachable, and answered in a shape
 * the primitive cannot draw. The last two are the pair whose collapsing is the
 * mistake the record names — a reader who takes *we could not reach your
 * reviews* for *you have no reviews* concludes their data is gone.
 */

const SERIES = [
  { label: "Apr", value: 99.1 },
  { label: "May", value: 99.4 },
  { label: "Jun", value: 98.8 },
  { label: "Jul", value: 99.9 },
] as const

const REVIEWS = [
  {
    quote: "We moved four tools onto this in a fortnight and nobody asked for the old ones back.",
    author: "Hanna Ochoa",
    role: "Head of Platform, Northwind",
  },
  {
    quote: "The record of who asked for what is the part I did not know I needed.",
    author: "Theo Barros",
    role: "Founder, Keelhaul",
    avatar: "javascript:alert(1)",
  },
] as const

const PICTURE = {
  src: "https://example.com/shots/board.png",
  alt: "The board view, with three columns of work in progress",
  caption: "The board, mid-sprint",
} as const

/**
 * The page below its own root, with the hoisted stylesheet taken out.
 *
 * Both removals are load-bearing and each one was found by this helper being
 * wrong. The **stylesheet** has to go because the library's whole CSS is in the
 * output of every page, so a test asserting that a class or a custom property is
 * *absent* finds it in the rules rather than on an element. The **root element's
 * own style attribute** has to go because that is where the theme's palette is
 * written as seventeen literal hexes — which is the point of a theme and is
 * exactly what an assertion about literal colour must not read.
 *
 * It replaces `markup.slice(markup.indexOf("<main"))`, which this file used in
 * two palette assertions and which **never matched anything**: `loom.page`
 * renders a `div`, there is no `main` in this output, `indexOf` returned `-1`,
 * and `slice(-1)` is the last character of the document. Both assertions were
 * comparing `">"` to `">"` and finding no hex in `">"`. They were green for as
 * long as they have existed and were proving nothing, which is the shape lesson
 * 28 costs: a check nobody had reason to doubt.
 */
const bodyOnly = (markup: string): string => {
  const withoutStylesheet = markup.replace(/<style[^>]*>[\s\S]*?<\/style>/g, "")

  return withoutStylesheet.slice(withoutStylesheet.indexOf(">") + 1)
}

describe("loom.trend — a series plotted from a source", () => {
  const ASKING_SERIES = { series: { source: "catalogue.posts" } }

  it("plots a column per point, in the order the answer carried them", async () => {
    const { markup, diagnostics } = await renderWith(
      boundTree("loom.trend", { max: 100, suffix: "%" }, ASKING_SERIES),
      sourceAnswering([...SERIES])
    )

    expect(diagnostics).toEqual([])
    for (const point of SERIES) expect(markup).toContain(point.label)
    expect(markup.indexOf("Apr")).toBeLessThan(markup.indexOf("Jul"))

    /** The region for an answer of none is not on a page that had points. */
    expect(markup).not.toContain("Nothing published yet")
  })

  /**
   * The whole of why this primitive emits its twin's markup: the bar's height is
   * a `calc` in the stylesheet against a ceiling this element declares and a
   * magnitude each column declares. If either stopped being written the chart
   * would render as a row of labels with no bars and nothing else would fail.
   */
  it("declares the ceiling once and each column's magnitude on the column", async () => {
    const { markup } = await renderWith(
      boundTree("loom.trend", { max: 100 }, ASKING_SERIES),
      sourceAnswering([...SERIES])
    )

    expect(markup).toContain("--loom-chart-max:100")
    expect(markup).toContain("--loom-chart-plot")
    expect(markup).toContain("--loom-stat-magnitude:99.9")
    expect(markup).toContain("loom-stat-plotted")
  })

  /**
   * The one way this primitive's situation differs from its twin's, asserted so
   * that a future simplification that drops the wrapper fails here rather than
   * in a photograph. An author picks four columns; an answer carried twelve, and
   * twelve columns under the shared rule are nineteen pixels wide with their
   * figures hanging off the page.
   */
  it("puts a plot it did not choose the width of inside a named, focusable scroll region", async () => {
    const { markup } = await renderWith(
      boundTree("loom.trend", {}, ASKING_SERIES),
      sourceAnswering([...SERIES])
    )

    const body = bodyOnly(markup)

    expect(body).toContain("loom-scroll-x")
    expect(body).toContain("loom-trend-plot")
    expect(body).toMatch(/tabindex="0"[^>]*role="group"|role="group"[^>]*tabindex="0"/)
    /** A focus stop with no name is a focus stop a screen reader arrives at and cannot describe. */
    expect(body).toContain('aria-label="Chart"')
  })

  it("puts the page's own mark against each figure rather than asking the row for it", async () => {
    const { markup } = await renderWith(
      boundTree("loom.trend", { suffix: "%", prefix: "~" }, ASKING_SERIES),
      sourceAnswering([{ label: "Apr", value: 99.1 }])
    )

    expect(markup).toContain("~")
    expect(markup).toContain("99.1")
    expect(markup).toContain("%")
  })

  it("places the region the tree gave it when the answer is none", async () => {
    const { markup, diagnostics } = await renderWith(
      boundTree("loom.trend", {}, ASKING_SERIES),
      sourceAnswering([])
    )

    expect(diagnostics).toEqual([])
    expect(markup).toContain("Nothing published yet")
    /**
     * The custom property rather than the class: `.loom-stat-plotted` is in the
     * hoisted stylesheet on every page, and only an element carries a magnitude.
     */
    expect(bodyOnly(markup)).not.toContain("--loom-stat-magnitude")
  })

  it("says a source that could not answer is a different thing from one with nothing to plot", async () => {
    const { markup } = await renderWith(boundTree("loom.trend", {}, ASKING_SERIES), sourceDown())

    expect(markup).toContain("This chart could not be loaded.")
    expect(markup).not.toContain("Nothing published yet")
  })

  it("calls an answer where no point reads a shape it cannot draw, not a plot with holes", async () => {
    const { markup } = await renderWith(
      boundTree("loom.trend", {}, ASKING_SERIES),
      sourceAnswering([{ month: "Apr", uptime: 99.1 }])
    )

    expect(markup).toContain("This chart could not be shown.")
    expect(bodyOnly(markup)).not.toContain("--loom-stat-magnitude")
  })

  it("skips a point it cannot read, plots the rest, and says that it did", async () => {
    const { markup } = await renderWith(
      boundTree("loom.trend", {}, ASKING_SERIES),
      sourceAnswering([{ label: "Apr", value: 99.1 }, { label: "May" }])
    )

    expect(markup).toContain("Apr")
    expect(markup).toContain("Some points could not be plotted.")
  })
})

describe("loom.voices — a wall of testimonials nobody authored", () => {
  const ASKING_REVIEWS = { voices: { source: "catalogue.posts" } }

  it("draws a card per row, with the words and the attribution the row carried", async () => {
    const { markup, diagnostics } = await renderWith(
      boundTree("loom.voices", { columns: "three" }, ASKING_REVIEWS),
      sourceAnswering([...REVIEWS])
    )

    expect(diagnostics).toEqual([])
    expect(markup).toContain("nobody asked for the old ones back")
    expect(markup).toContain("Hanna Ochoa")
    expect(markup).toContain("Head of Platform, Northwind")
    expect(markup).toContain("Theo Barros")
  })

  /**
   * The one field whose failure must not cost the row. A review whose avatar URL
   * is on a scheme the allowlist refuses is still a review worth reading, so the
   * address is dropped and the initials are drawn — and the refused string must
   * not reach the page at all.
   */
  it("refuses a portrait address the allowlist does not link to and keeps the quote", async () => {
    const { markup } = await renderWith(
      boundTree("loom.voices", {}, ASKING_REVIEWS),
      sourceAnswering([...REVIEWS])
    )

    expect(markup).not.toContain("javascript:alert")
    expect(markup).toContain("The record of who asked for what")
    /** `portrait.ts`'s fallback, from the author's name. */
    expect(markup).toContain("TB")
  })

  it("caps the wall where the band said, without calling the rest unshown", async () => {
    const many = Array.from({ length: 9 }, (_, index) => ({
      quote: `The ${index + 1}th thing somebody said about it, at length.`,
      author: `Reviewer ${index + 1}`,
    }))

    const { markup } = await renderWith(
      boundTree("loom.voices", { limit: "three" }, ASKING_REVIEWS),
      sourceAnswering(many)
    )

    expect(markup).toContain("Reviewer 3")
    expect(markup).not.toContain("Reviewer 4")
    /** A cap is not a row that could not be read, and must not be reported as one. */
    expect(markup).not.toContain("Some testimonials could not be shown.")
  })

  it("places the region the tree gave it when the answer is none", async () => {
    const { markup, diagnostics } = await renderWith(
      boundTree("loom.voices", {}, ASKING_REVIEWS),
      sourceAnswering([])
    )

    expect(diagnostics).toEqual([])
    expect(markup).toContain("Nothing published yet")
  })

  it("says a source that could not answer is a different thing from one with nothing to say", async () => {
    const { markup } = await renderWith(boundTree("loom.voices", {}, ASKING_REVIEWS), sourceDown())

    expect(markup).toContain("These testimonials could not be loaded.")
    expect(markup).not.toContain("Nothing published yet")
  })

  it("skips a row with no attribution, draws the rest, and says that it did", async () => {
    const { markup } = await renderWith(
      boundTree("loom.voices", {}, ASKING_REVIEWS),
      sourceAnswering([{ ...REVIEWS[0] }, { quote: "Said by nobody in particular." }])
    )

    expect(markup).toContain("nobody asked for the old ones back")
    expect(markup).not.toContain("Said by nobody in particular")
    expect(markup).toContain("Some testimonials could not be shown.")
  })
})

describe("loom.plate — a picture read from a source", () => {
  const ASKING_IMAGE = { image: { source: "catalogue.posts" } }

  it("draws the picture the row carried, with the row's own alt text", async () => {
    const { markup, diagnostics } = await renderWith(
      boundTree("loom.plate", { aspect: "wide" }, ASKING_IMAGE),
      sourceAnswering({ ...PICTURE })
    )

    expect(diagnostics).toEqual([])
    expect(markup).toContain('src="https://example.com/shots/board.png"')
    expect(markup).toContain("The board view, with three columns of work in progress")
    expect(markup).toContain("The board, mid-sprint")
    expect(markup).not.toContain("Nothing published yet")
  })

  /**
   * The primitive's whole argument, asserted: a row with no alt text does not
   * read, so there is no route by which this primitive puts an undescribed image
   * on a page.
   */
  it("refuses a row with no alt text rather than drawing an undescribed picture", async () => {
    const { markup } = await renderWith(
      boundTree("loom.plate", {}, ASKING_IMAGE),
      sourceAnswering({ src: "https://example.com/shots/board.png" })
    )

    expect(markup).not.toContain("https://example.com/shots/board.png")
    expect(markup).toContain("This picture could not be shown.")
  })

  it("refuses an address the allowlist does not serve pictures from", async () => {
    const { markup } = await renderWith(
      boundTree("loom.plate", {}, ASKING_IMAGE),
      sourceAnswering({ src: "javascript:alert(1)", alt: "Nothing good" })
    )

    expect(markup).not.toContain("javascript:alert")
    expect(markup).toContain("This picture could not be shown.")
  })

  /**
   * The page says this picture plays a decorative part, the row still carries
   * its description, and the convention wins: an empty `alt` and
   * `role="presentation"`.
   */
  it("empties the alt text when the tree says the picture is decorative on this page", async () => {
    const { markup } = await renderWith(
      boundTree("loom.plate", { decorative: true }, ASKING_IMAGE),
      sourceAnswering({ ...PICTURE })
    )

    expect(markup).toContain('alt=""')
    expect(markup).toContain('role="presentation"')
    expect(markup).not.toContain("three columns of work in progress")
  })

  it("places the region the tree gave it when the source says it has no picture", async () => {
    const { markup, diagnostics } = await renderWith(
      boundTree("loom.plate", {}, ASKING_IMAGE),
      sourceAnswering(null)
    )

    expect(diagnostics).toEqual([])
    expect(markup).toContain("Nothing published yet")
  })

  /**
   * The reason this primitive has a frame where `loom.media` has none: the box
   * holds its shape in every state, so connecting a source changes what is in
   * the frame and never the shape of the band around it.
   */
  it("holds the declared aspect whether or not a picture arrived", async () => {
    const answered = await renderWith(
      boundTree("loom.plate", { aspect: "square" }, ASKING_IMAGE),
      sourceAnswering({ ...PICTURE })
    )
    const unanswered = await renderWith(
      boundTree("loom.plate", { aspect: "square" }, ASKING_IMAGE),
      sourceAnswering(null)
    )

    expect(answered.markup).toContain("aspect-ratio:1 / 1")
    expect(unanswered.markup).toContain("aspect-ratio:1 / 1")
  })
})

/**
 * What each of them says it could not show, which is the half of 0206 the
 * library owed from 30 September — and now the only instrument that reaches the
 * one person who can fix any of it.
 *
 * Every case here resolves cleanly. There is no error, no unavailable source
 * and nothing on the page a reader would read as broken: a shorter band, a
 * placeholder, a word where a figure goes. That is exactly why the diagnostic
 * is the whole point — these are the failures that were invisible from both
 * ends before it existed.
 */
describe("what a bound primitive says it could not show", () => {
  const unshownIn = (diagnostics: readonly unknown[]): readonly Record<string, unknown>[] =>
    diagnostics.filter(
      (diagnostic): diagnostic is Record<string, unknown> =>
        typeof diagnostic === "object" &&
        diagnostic !== null &&
        (diagnostic as Record<string, unknown>)["code"] === "data-unshown"
    )

  it("counts eleven of twelve rows for a feed whose source renamed a column", async () => {
    const rows = [
      ...POSTS.slice(0, 1),
      ...Array.from({ length: 11 }, (_, index) => ({ headline: `renamed ${index}` })),
    ]

    const { markup, diagnostics } = await renderWith(
      boundTree("loom.feed", {}, ASKING),
      sourceAnswering(rows)
    )

    /** The reader's sentence, which 0175 keeps countless. */
    expect(markup).toContain("Some entries could not be shown.")

    const reported = unshownIn(diagnostics)
    expect(reported).toHaveLength(1)
    expect(reported[0]?.["given"]).toBe(12)
    expect(reported[0]?.["shown"]).toBe(1)
    expect(reported[0]?.["binding"] ?? reported[0]?.["name"]).toBe("entries")
  })

  it("says nothing at all about a feed that read every row it was given", async () => {
    const { diagnostics } = await renderWith(
      boundTree("loom.feed", {}, ASKING),
      sourceAnswering([...POSTS])
    )

    expect(unshownIn(diagnostics)).toEqual([])
  })

  /**
   * The case that is otherwise indistinguishable from a source being down. A
   * figure that arrived and could not be printed puts the declared word on the
   * page at display size, and nothing anywhere said the answer had in fact
   * arrived.
   */
  it("reports one row for a figure that arrived and could not be printed", async () => {
    const { markup, diagnostics } = await renderWith(
      boundTree("loom.tally", { label: "Teams" }, { value: { source: "catalogue.posts" } }),
      sourceAnswering({ total: 12480 })
    )

    expect(markup).toContain("Unavailable")

    const reported = unshownIn(diagnostics)
    expect(reported).toHaveLength(1)
    expect(reported[0]?.["given"]).toBe(1)
    expect(reported[0]?.["shown"]).toBe(0)
  })

  it("says nothing about a figure that printed, or about a source that was down", async () => {
    const printed = await renderWith(
      boundTree("loom.tally", { label: "Teams" }, { value: { source: "catalogue.posts" } }),
      sourceAnswering(12480)
    )
    const down = await renderWith(
      boundTree("loom.tally", { label: "Teams" }, { value: { source: "catalogue.posts" } }),
      sourceDown()
    )

    expect(unshownIn(printed.diagnostics)).toEqual([])
    expect(unshownIn(down.diagnostics)).toEqual([])
  })

  it("counts the points a trend could not plot", async () => {
    const { diagnostics } = await renderWith(
      boundTree("loom.trend", {}, { series: { source: "catalogue.posts" } }),
      sourceAnswering([{ label: "Apr", value: 99.1 }, { label: "May" }, { label: "Jun" }])
    )

    const reported = unshownIn(diagnostics)
    expect(reported).toHaveLength(1)
    expect(reported[0]?.["given"]).toBe(3)
    expect(reported[0]?.["shown"]).toBe(1)
  })

  /**
   * The sharpest one in the run. A reviews table whose `author` column was
   * renamed answers perfectly and draws a wall that is simply shorter than it
   * was — and the count must be of the rows that could not be *read*, never of
   * the rows the band's own cap chose not to draw.
   */
  it("counts the reviews a wall could not read, and not the ones its cap left out", async () => {
    const rows = [
      { quote: "A real one, with a name on it.", author: "Hanna Ochoa" },
      { quote: "Another real one.", author: "Theo Barros" },
      { quote: "A third." , author: "Ida Melville" },
      { quote: "A fourth." , author: "Jun Watanabe" },
      { reviewer: "renamed", body: "nothing reads this" },
    ]

    const { diagnostics } = await renderWith(
      boundTree("loom.voices", { limit: "three" }, { voices: { source: "catalogue.posts" } }),
      sourceAnswering(rows)
    )

    const reported = unshownIn(diagnostics)
    expect(reported).toHaveLength(1)
    expect(reported[0]?.["given"]).toBe(5)
    /** Four read; the cap drew three of them, and the cap is nobody's defect. */
    expect(reported[0]?.["shown"]).toBe(4)
  })

  it("reports the one row a plate could not draw, and nothing for a source with no picture", async () => {
    const unreadable = await renderWith(
      boundTree("loom.plate", {}, { image: { source: "catalogue.posts" } }),
      sourceAnswering({ src: "https://example.com/a.png" })
    )
    const none = await renderWith(
      boundTree("loom.plate", {}, { image: { source: "catalogue.posts" } }),
      sourceAnswering(null)
    )

    expect(unshownIn(unreadable.diagnostics)).toHaveLength(1)
    expect(unshownIn(unreadable.diagnostics)[0]?.["given"]).toBe(1)
    expect(unshownIn(none.diagnostics)).toEqual([])
  })
})

/**
 * The library's standing rule over all three, which is the one the brief sets:
 * the markup is identical under both starter palettes and no colour in it is the
 * primitive's own. Taken over every state each of them can be in, because a
 * literal hex in a failure branch is a literal hex nobody photographs.
 */
describe("what the three new twins look like under a second palette", () => {
  const cases: readonly (readonly [string, string, JsonObject, unknown, readonly SourceEntry[]])[] = [
    [
      "loom.trend",
      "series",
      { max: 100, suffix: "%" },
      { series: { source: "catalogue.posts" } },
      [
        sourceAnswering([...SERIES]),
        sourceAnswering([]),
        sourceDown(),
        sourceAnswering({ months: 4 }),
        sourceAnswering([{ label: "Apr", value: 99.1 }, { label: "May" }]),
      ],
    ],
    [
      "loom.voices",
      "voices",
      { columns: "three" },
      { voices: { source: "catalogue.posts" } },
      [
        sourceAnswering([...REVIEWS]),
        sourceAnswering([]),
        sourceDown(),
        sourceAnswering({ reviews: 2 }),
        sourceAnswering([{ ...REVIEWS[0] }, { quote: "No name." }]),
      ],
    ],
    [
      "loom.plate",
      "image",
      { aspect: "wide" },
      { image: { source: "catalogue.posts" } },
      [
        sourceAnswering({ ...PICTURE }),
        sourceAnswering(null),
        sourceDown(),
        sourceAnswering({ src: "https://example.com/a.png" }),
      ],
    ],
  ]

  for (const [type, , props, declared, entries] of cases) {
    it(`renders every state of ${type} identically under both starter palettes, with no colour of its own`, async () => {
      for (const [index, entry] of entries.entries()) {
        const editorial = await renderWith(boundTree(type, props, declared, EDITORIAL), entry)
        const bold = await renderWith(boundTree(type, props, declared, BOLD), entry)

        const name = `${type} state ${index}`

        expect(bodyOnly(bold.markup), name).toBe(bodyOnly(editorial.markup))
        expect(bodyOnly(bold.markup), name).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
        expect(bodyOnly(bold.markup), name).not.toMatch(/\b(rgba?|hsla?)\(/)
      }
    })
  }
})

/**
 * The region a bound primitive draws when its source did not answer — the one
 * state of a bound band that no tree could reach until
 * [0246](../../decisions/0246-a-bound-primitives-failure-region-is-a-slot-over-its-declared-sentence.md).
 *
 * Asserted from both sides, and the second side is the one that matters. A slot
 * that *replaces* the declared sentence would be a breaking change to every
 * stored tree that binds anything; a slot *over* it is additive, and the only
 * way to know which one shipped is to render the same node with the region and
 * without it.
 */
describe("the region a bound primitive draws when its source did not answer", () => {
  const BOUND: readonly (readonly [string, JsonObject, unknown, string])[] = [
    ["loom.feed", {}, { entries: { source: "catalogue.posts" } }, "This list could not be loaded."],
    ["loom.trend", { max: 100 }, { series: { source: "catalogue.posts" } }, "This chart could not be loaded."],
    ["loom.voices", {}, { voices: { source: "catalogue.posts" } }, "These testimonials could not be loaded."],
    ["loom.plate", {}, { image: { source: "catalogue.posts" } }, "This picture could not be loaded."],
  ]

  for (const [type, props, declared, sentence] of BOUND) {
    describe(type, () => {
      it("places the words the tree gave it instead of the declared sentence", async () => {
        const { markup } = await renderWith(
          boundTree(type, props, declared, EDITORIAL, true),
          sourceDown()
        )

        expect(markup).toContain("We cannot reach this right now")
        expect(markup).toContain("Our status page has the latest.")
        expect(markup).toContain("Check status")

        /** The whole of why this is additive: the fallback steps aside, it does not stack. */
        expect(markup).not.toContain(sentence)

        /** And it is still not the empty state, which is 0058's distinction. */
        expect(markup).not.toContain("Nothing published yet")
      })

      it("keeps the declared sentence for a tree that placed no region", async () => {
        const { markup } = await renderWith(boundTree(type, props, declared), sourceDown())

        expect(markup).toContain(sentence)
        expect(markup).not.toContain("We cannot reach this right now")
      })

      /**
       * One slot, both failure answers (0246 decision 3). A reader cannot
       * observe the difference between a source that did not answer and one
       * that answered with a shape the primitive cannot draw, so asking a tree
       * for two regions would be asking for the same copy twice.
       */
      it("draws the same region for an answer it could not read", async () => {
        const { markup } = await renderWith(
          boundTree(type, props, declared, EDITORIAL, true),
          sourceAnswering({ unexpected: "shape" })
        )

        expect(markup).toContain("We cannot reach this right now")
        expect(markup).not.toContain("Nothing published yet")
      })

      it("renders it the same way under both palettes, with no colour of its own", async () => {
        const editorial = await renderWith(
          boundTree(type, props, declared, EDITORIAL, true),
          sourceDown()
        )
        const bold = await renderWith(boundTree(type, props, declared, BOLD, true), sourceDown())

        expect(bodyOnly(bold.markup)).toBe(bodyOnly(editorial.markup))
        expect(bodyOnly(bold.markup)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
        expect(bodyOnly(bold.markup)).not.toMatch(/\b(rgba?|hsla?)\(/)
      })
    })
  }

  /**
   * The stated exception, asserted so that it is a decision rather than an
   * omission. `loom.tally` is a leaf and 0242 settled that a leaf has no
   * inside — there is no rectangle in an inline figure to put a heading and a
   * link in, and a slot here would be an interior the primitive does not have.
   */
  it("gives loom.tally no such region, because a leaf has no inside", () => {
    const tally = primitives.primitives.find((primitive) => primitive.type === "loom.tally")

    expect(tally?.slots).toEqual([])
  })

  /**
   * Derived rather than listed, so that a sixth bound primitive cannot arrive
   * with a failure region nobody placed — or without one nobody noticed was
   * missing.
   */
  it("is declared by every bound primitive that places a region at all", () => {
    const declaring = primitives.primitives
      .filter((primitive) => (primitive.reads ?? []).length > 0 && (primitive.slots ?? []).length > 0)
      .map((primitive) => [primitive.type, [...(primitive.slots ?? [])].sort()])

    expect(declaring).toEqual([
      ["loom.trend", ["empty", "unavailable"]],
      ["loom.voices", ["empty", "unavailable"]],
      ["loom.feed", ["empty", "unavailable"]],
      ["loom.plate", ["empty", "unavailable"]],
    ])
  })
})
