import { createElement, type ReactNode } from "react"
import { z } from "zod"

import { BINDING_NAME_EXPECTATION } from "../data/source.js"
import type { DataOutcome } from "../data/resolution.js"
import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, size, space, type RampStep } from "./tokens.js"

/**
 * A series plotted from a source — `loom.stat-chart`'s content model with the
 * points coming from the row that knows.
 *
 * `loom.stat-chart` plots the figures a tree authored, which is the right shape
 * for *"here is what we promise"* and the wrong one for *"here is what we did
 * last month"*. A chart of six authored numbers is a chart that was true when
 * somebody typed it, and a metrics band is the one part of a marketing page
 * whose whole claim is that it is current. This is the same plot, read.
 *
 * ## Why this is a second primitive and not a binding on `loom.stat-chart`
 *
 * `loom.tally` already argued this against `loom.stat` and the argument
 * transfers whole, which is the point of
 * [0233](../../decisions/0233-a-bound-twin-is-earned-by-a-system-of-record-and-a-row-shape-the-primitive-can-declare.md)
 * — it is a rule rather than three coincidences.
 *
 * A chart whose points were *either* its children *or* an answer would need its
 * children to become optional, and a `loom.stat-chart` with no children and no
 * binding would then be a valid tree: every authored chart in every stored tree
 * loses the guarantee that there is something to plot. And the two have
 * different failure surfaces — an authored chart cannot fail, this one can —
 * so one primitive would be infallible on Tuesday and not on Wednesday,
 * depending on a prop.
 *
 * ## The points are not nodes, and `loom.feed` settled why
 *
 * [0052](../../decisions/0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)
 * is about authored content and its whole argument is what a person or a model
 * can do to it afterwards. None of those operations exist for a row that came
 * from a database: no `move` addresses March, no `configure` re-words it,
 * nobody is attributed for it, and its inverse is not a change to this page. So
 * the repeated thing here is never a node under any configuration, which is
 * what makes it interior rather than structure.
 *
 * ## It emits `loom.stat-chart`'s own markup, and that is load-bearing
 *
 * Every class and every custom property that decides a bar's geometry below is
 * the authored chart's, and nothing in `stylesheet.ts` was changed — so a bound
 * chart and an authored one cannot come to disagree about what a bar's height
 * means, which is the thing worth protecting.
 *
 * **One rule was added, and it is the one way the two primitives' situations
 * differ.** An authored chart's column count is a thing its author chose; a
 * bound chart's is whatever the answer carried, so it has to be right for three
 * points and for forty without being told which it is getting. Under the shared
 * `grid-auto-columns: minmax(0, 1fr)` a twelve-month series on a 390-pixel page
 * came out nineteen pixels a column, with the printed figures overlapping each
 * other and the last one hanging off the side of the document — photographed,
 * which is how it was found. `loom-trend-plot` gives a column a floor and the
 * primitive puts the plot in the library's own `loom-scroll-x` region, which is
 * what `loom.table` and `loom.comparison-table` already do with a band too wide
 * for the screen. A year of months is a chart you swipe.
 *
 * It also means this primitive inherits the ceiling trick whole: a render is a
 * total pure projection of one node
 * ([0008](../../decisions/0008-the-renderer-is-a-total-pure-projection.md)), so
 * the columns' heights are computed by the browser against a custom property
 * this element declares, in the `calc` that
 * [0079](../../decisions/0079-a-layout-css-alone-can-express-belongs-in-the-stylesheet.md)
 * already put in the stylesheet. The difference here is that this primitive
 * *may* read all its points at once — they arrive in one answer, not as n
 * nodes — and it still does not, because using a second mechanism would mean
 * the bound chart and the authored one could disagree about what a bar's height
 * means.
 *
 * ## `max` stays authored, for the reason it is authored on the twin
 *
 * The temptation a bound chart creates is real: the points are all in hand, so
 * the ceiling *could* be computed. It is not, and the reason is the twin's —
 * *"where the axis stops is what decides whether a rise looks steep or gentle,
 * and a chart that picked its own ceiling would be making that argument on the
 * author's behalf."* A chart that rescaled itself every time a source answered
 * would also be a chart whose shape changed without anything on the page
 * changing, which is the one thing a reader returning to a metrics band is
 * entitled to be able to compare.
 *
 * ## The unit belongs to the series and not to the row
 *
 * `prefix` and `suffix` are props, and they are `loom.tally`'s props for
 * `loom.tally`'s reason: the `%` and the `$` are how this band puts it, not a
 * column in somebody's table, and a source that had to bake them into every row
 * would be unusable in two places. What is *not* available here is `loom.tally`'s
 * escape for grouping — a point's figure is printed from the number, so a series
 * of values in the millions prints `1200000` under a column. A chart's column
 * labels are short by nature and the band that needs `1,200,000` wants a
 * `loom.tally` beside the plot rather than inside it. Stated rather than
 * worked around.
 */

/**
 * What a point has to have for this to plot it.
 *
 * Both fields required, which is the one place this row shape is stricter than
 * `loom.feed`'s. A feed row with no date is still a link with a name on it; a
 * point with no number is not a point, and a point with no label is a bar a
 * reader cannot read. There is nothing to degrade to.
 *
 * `value` is one number doing both jobs — plotted and printed — where the
 * authored twin's child splits them into `magnitude` and `value`. That split
 * exists on `loom.stat` because a stat is a figure that *may* be plotted and
 * usually is not; a point in a series is always both, and asking an adapter to
 * return the same number twice under two names would be a join nobody can see
 * going wrong.
 *
 * Unknown keys are stripped rather than refused, which is `loom.feed`'s rule
 * and the only reading of "what it can draw" that is true of a database: a real
 * row carries an `id`, a `createdAt` and half a dozen columns this will never
 * plot.
 */
const pointSchema = z.object({
  /** What the column is of — a month, a release, a region. Short: it sits under a bar. */
  label: z.string().min(1).max(40),
  /**
   * Where the column reaches, against `max`. Non-negative because a bar below a
   * baseline is a different chart, and finite because `Infinity` is a bar with
   * no height a browser can compute.
   */
  value: z.number().finite().nonnegative(),
})

const pointsSchema = z.array(z.unknown())

type Point = z.infer<typeof pointSchema>

const props = z
  .object({
    /**
     * Which of this node's own answers to plot — `loom.data[binding]`, where the
     * names come from the `loom:data` this node declared.
     *
     * A name rather than "the only one", for `loom.feed`'s reason: 0058 made the
     * answer a map on the evidence that the multi-binding case is the normal
     * one, and a primitive reading whichever entry came first would work until
     * the day a second binding was added beside it.
     */
    binding: z
      .string()
      .regex(/^[a-z][a-zA-Z0-9]*$/, BINDING_NAME_EXPECTATION)
      .max(60)
      .optional(),
    /**
     * The top of the scale. Not a count of anything, not derived from the
     * answer — see the note above — so it changes no node and is a real prop by
     * the granularity document's sharper question.
     */
    max: z.number().finite().positive().optional(),
    /** How tall the plot is, off the spacing scale, so it breathes with its preset. */
    plot: z.enum(["short", "standard", "tall"]).optional(),
    /** Set tight against each figure — a currency mark, not a word. */
    prefix: z.string().min(1).max(8).optional(),
    /** The same, after it: `%`, `+`, `×`. */
    suffix: z.string().min(1).max(8).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const DEFAULT_BINDING = "series"

/**
 * The plot height, in the twin's own arithmetic. Step 7 is a gap and a chart
 * wants a panel, so the multiplier is the same three.
 */
const PLOT_HEIGHTS = { short: 5, standard: 6, tall: 7 } as const

const plotHeight = (name: keyof typeof PLOT_HEIGHTS): string =>
  `calc(${space(PLOT_HEIGHTS[name] as RampStep)} * 3)`

/** What the primitive made of the answer it was handed. */
type Reading =
  | { readonly kind: "points"; readonly points: readonly Point[]; readonly skipped: number }
  /** Asked and told there is nothing, or never asked at all — see `readAnswer`. */
  | { readonly kind: "empty" }
  | { readonly kind: "unavailable" }
  | { readonly kind: "mismatched" }

/**
 * The answer, read.
 *
 * **A binding with no outcome reads as empty**, which is `loom.feed`'s call and
 * is made here for its reasons: it happens either because the node declared
 * nothing, which is an author who has not connected a source yet and wants to
 * see the band, or because a caller resolved a different tree's plan — which
 * the walk already reports as `data-unresolved`, to the one person who can act
 * on it. Neither is a failure a reader should be told about.
 *
 * A point that does not read is skipped and said
 * ([0175](../../decisions/0175-a-listing-skips-the-row-it-cannot-read-and-fails-the-one-it-cannot-place.md)),
 * and an answer where *nothing* reads is not a series with holes in it — it is
 * an answer of another shape, which is the failure line rather than an empty
 * plot.
 */
const readAnswer = (outcome: DataOutcome | undefined): Reading => {
  if (outcome === undefined) return { kind: "empty" }
  if (outcome.status === "unavailable") return { kind: "unavailable" }

  const rows = pointsSchema.safeParse(outcome.value)
  if (!rows.success) return { kind: "mismatched" }
  if (rows.data.length === 0) return { kind: "empty" }

  const points: Point[] = []
  for (const row of rows.data) {
    const point = pointSchema.safeParse(row)
    if (point.success) points.push(point.data)
  }

  if (points.length === 0) return { kind: "mismatched" }

  return { kind: "points", points, skipped: rows.data.length - points.length }
}

const bindingNameOf = (props_: Readonly<Record<string, unknown>>): string =>
  typeof props_["binding"] === "string" ? props_["binding"] : DEFAULT_BINDING

/**
 * One column: the authored twin's markup for one plotted `loom.stat`, built
 * here rather than registered as a node.
 *
 * `.loom-stat-plotted` and `--loom-stat-magnitude` are what the stylesheet's
 * `::before` reads to grow the bar, and the value and label spans are the two
 * the chart's own descendant rules re-size. Nothing here is this primitive's
 * own CSS and nothing here may become any.
 */
const columnOf = (point: Point, index: number, given: Props): ReactNode =>
  createElement(
    "div",
    {
      key: index,
      className: `${LIBRARY_CLASS.stat} ${LIBRARY_CLASS.statPlotted}`,
      style: { "--loom-stat-magnitude": point.value } as Record<string, unknown>,
    },
    createElement(
      "span",
      { className: LIBRARY_CLASS.statValue },
      given.prefix === undefined ? null : given.prefix,
      String(point.value),
      given.suffix === undefined ? null : given.suffix
    ),
    createElement("span", { className: LIBRARY_CLASS.statLabel }, point.label)
  )

const noticeOf = (words: string): ReactNode =>
  createElement(
    "p",
    {
      role: "status",
      style: {
        margin: "0",
        fontFamily: family("body"),
        fontSize: size(3),
        color: colour("fg-muted"),
      },
    },
    words
  )

export const loomTrend = definePrimitive({
  type: "loom.trend",
  description:
    "A series of figures read from a data binding and plotted as columns — a trend a registered source keeps current, rather than numbers somebody typed. Use loom.stat-chart for a plot the tree authors. Region: empty.",
  props,
  slots: ["empty"],
  /**
   * Every word a reader reads is in the answer's rows or in the children of the
   * `empty` region. `binding` is a name an answer arrives under, `prefix` and
   * `suffix` are marks set against a figure rather than words — the same call
   * `loom.tally` makes, which keeps them as copy there because a currency mark
   * is a thing a translation changes. The same holds here.
   */
  copy: ["prefix", "suffix"],
  /**
   * The name this looks its series up under: whichever name `binding` gives and
   * `series` when it gives none. 0184's second form, declared for the sharp
   * case — a tree binding under `sereis` would otherwise plot its empty region
   * for ever, with no error, no diagnostic, and a source that answered
   * correctly.
   */
  reads: [{ fromProp: "binding", default: "series" }],
  /**
   * Two sentences and a third, declared rather than taken from the tree (0060).
   * The first two are two facts and only one of them is worth trying again for,
   * which is 0175's distinction one layer up.
   */
  text: {
    unavailable: "This chart could not be loaded.",
    mismatched: "This chart could not be shown.",
    /** Without a count, for `loom.feed`'s reason: the figure goes to the author, in a diagnostic. */
    unreadable: "Some points could not be plotted.",
    /**
     * The name on the scrollable region, declared (0060) for `loom.table`'s
     * reason: a focus stop with no name is a focus stop a screen-reader user
     * arrives at and is told nothing about. There is nothing a model could put
     * here that the heading above the band does not already say, and a
     * deployment in French has one string to replace.
     */
    band: "Chart",
  },
  /**
   * What it was given and what it plotted, per answer it read
   * ([0206](../../decisions/0206-a-primitive-declares-what-it-could-not-show-and-the-runtime-decides-whether-to-say-so.md)).
   *
   * It is `readAnswer` — the same function the component calls, handed the same
   * two objects — which is the whole construction the record argues for: written
   * this way the count in the log and the sentence on the page cannot disagree,
   * and a source that starts returning a column under a new name says so in both
   * places at once.
   *
   * `mismatched` returns no reading rather than a reading of zero: an answer
   * where nothing read is not a series with holes in it, and the author is
   * already told through `data-misdeclared`.
   */
  unshown: (props_, data) => {
    const name = bindingNameOf(props_)
    const reading = readAnswer(data[name])

    return reading.kind === "points"
      ? [{ name, given: reading.points.length + reading.skipped, shown: reading.points.length }]
      : []
  },
  component: ({
    loom,
    props: given,
    children: _unused,
  }: LoomPrimitiveProps<Props, "unavailable" | "mismatched" | "unreadable" | "band">) => {
    const reading = readAnswer(loom.data[given.binding ?? DEFAULT_BINDING])

    const body =
      reading.kind === "unavailable"
        ? noticeOf(loom.text.unavailable)
        : reading.kind === "mismatched"
          ? noticeOf(loom.text.mismatched)
          : reading.kind === "empty"
            ? (loom.slots["empty"] ?? null)
            : createElement(
                "div",
                {
                  /**
                   * The region a plot too wide for the screen scrolls inside,
                   * which is `loom.table`'s and `loom.comparison-table`'s — the
                   * focus stop, the snap, the contained overscroll and the thin
                   * scrollbar are all theirs and none of it is new here. What is
                   * new is *why* a chart needs one: see `trendPlot` in
                   * `stylesheet.ts`.
                   */
                  className: LIBRARY_CLASS.scrollX,
                  tabIndex: 0,
                  role: "group",
                  "aria-label": loom.text.band,
                },
                createElement(
                "div",
                {
                  className: `${LIBRARY_CLASS.statChart} ${LIBRARY_CLASS.trendPlot}`,
                  /**
                   * Both inherited rather than passed, which is the twin's
                   * bargain: every column below reads them from here, and that
                   * is the only route a bar's height may depend on a fact the
                   * container knows.
                   *
                   * A `div` of `div`s rather than a list, which is the twin's
                   * markup and is deliberate twice over. The chart's rules are
                   * written with child combinators against `.loom-stat`, so the
                   * two must agree about what a column's element is; and
                   * `.loom-stat-chart` is `display: grid`, which drops list
                   * semantics in at least one shipping browser — so a `ul` here
                   * would be a list that announces as prose, which is worse than
                   * the group it actually is.
                   */
                  style: {
                    "--loom-chart-max": given.max ?? 100,
                    "--loom-chart-plot": plotHeight(given.plot ?? "standard"),
                  } as Record<string, unknown>,
                },
                  ...reading.points.map((point, index) => columnOf(point, index, given))
                )
              )

    return createElement(
      "div",
      {
        ...loom.editable,
        style: {
          display: "flex",
          flexDirection: "column",
          gap: space(3),
          boxSizing: "border-box",
          width: "100%",
        },
      },
      libraryStylesheet(),
      body,
      /**
       * Visible rather than announced only, which is 0175's rule read the way
       * `loom.feed` reads it: a note only a screen reader meets is skipped and
       * named to one reader in a hundred.
       */
      reading.kind === "points" && reading.skipped > 0
        ? createElement(
            "p",
            {
              role: "status",
              style: {
                margin: "0",
                fontFamily: family("body"),
                fontSize: size(2),
                color: colour("fg-subtle"),
              },
            },
            loom.text.unreadable
          )
        : null
    )
  },
})
