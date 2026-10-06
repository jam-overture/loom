import { sequentialIdFactory, type IdFactory } from "../ids.js"
import type { JsonObject } from "../json.js"
import { DATA_PROP_KEY, THEME_PROP_KEY } from "../reserved-props.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"
import { buildElement, buildSlot, buildText } from "../tree/builders.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { createTree } from "../tree/tree.js"

import { defineSpecimen } from "../../tools/specimen/specimen.js"

import { compositionById } from "./compositions/index.js"

/**
 * The three bound twins 0233 admits, each in every state it can be in, and the
 * three bands that put them on a page.
 *
 * ## Why this sheet needs `answers` and could not have been taken without it
 *
 * `loom.feed`'s own specimen history is the argument, and the specimen harness
 * wrote it down first:
 *
 * > Without it a bound primitive can only ever be photographed in the one state
 * > it reaches when nobody answered it — so `loom.feed`'s rows, its designed
 * > empty region and its *we could not read this* line are three states of one
 * > primitive of which exactly one was reachable, and it is the failure.
 *
 * A bound primitive is four pages, not one, and a run that photographed only
 * the unconnected state would be a run whose pictures all showed dashed boxes.
 * So every state below is declared as an answer and resolved before the walk,
 * which is what makes two runs of this sheet produce the same picture.
 *
 * ## One thing in this sheet has no photograph, and it is not an oversight
 *
 * **`loom.plate`'s answered state is not here.** A picture needs a file at an
 * `http(s)` address, `mediaUrlSchema` refuses `data:` for reasons this run does
 * not argue with, and a photograph that depended on a network would be a
 * photograph that differs on a bad afternoon — which the harness refuses for the
 * same reason it refuses a live adapter. So the plate is shot in the three
 * states it can be shot in, and the fourth is the standing blocker this run
 * explicitly does not close: 0233's consequences section says a binding reaches
 * one of the seven image-blocked primitives rather than all seven, and this is
 * what that reads like with a camera on it.
 *
 * `loom.trend` and `loom.voices` have no such gap. A plot is geometry and a
 * portrait falls back to initials (`portrait.ts`), so both are fully answerable
 * from a table of JSON, which is most of why they were the two to build first.
 */

const text = (ids: IdFactory, value: string) => buildText(ids, value)

const heading = (ids: IdFactory, value: string, level: number, extra: JsonObject = {}): ElementNode =>
  buildElement(ids, { type: "loom.heading", props: { level, ...extra }, children: [text(ids, value)] })

const prose = (ids: IdFactory, value: string, extra: JsonObject = {}): ElementNode =>
  buildElement(ids, { type: "loom.prose", props: extra, children: [text(ids, value)] })

const caption = (ids: IdFactory, value: string): ElementNode =>
  prose(ids, value, { size: "small", tone: "muted" })

const section = (
  ids: IdFactory,
  eyebrow: string,
  title: string,
  children: readonly LoomNode[]
): ElementNode =>
  buildElement(ids, {
    type: "loom.section",
    props: { width: "wide", eyebrow },
    children: [buildSlot(ids, "heading", [heading(ids, title, 2, { balance: true })]), ...children],
  })

const stack = (ids: IdFactory, children: readonly LoomNode[], extra: JsonObject = {}): ElementNode =>
  buildElement(ids, { type: "loom.stack", props: { gap: "loose", ...extra }, children: [...children] })

const grid = (ids: IdFactory, children: readonly LoomNode[], extra: JsonObject = {}): ElementNode =>
  buildElement(ids, { type: "loom.grid", props: { columns: "two", ...extra }, children: [...children] })

/** A band of the catalogue by id, so the sheet photographs what ships. */
const band = (ids: IdFactory, id: string): ElementNode => {
  const composition = compositionById(id)

  if (composition === undefined) throw new Error(`the catalogue has no band called ${id}`)

  return composition.build(ids)
}

/**
 * The `empty` region each bound node places when nothing answered it.
 *
 * Written once here rather than per cell, because the point of the cells is the
 * difference between the states and a region that varied between them would be
 * a second variable in the frame.
 */
const emptyRegion = (ids: IdFactory, title: string, line: string): LoomNode =>
  buildSlot(ids, "empty", [
    buildElement(ids, {
      type: "loom.empty-state",
      props: { outline: "dashed", align: "center", cause: "empty", stature: "compact" },
      children: [
        buildSlot(ids, "heading", [heading(ids, title, 3)]),
        text(ids, line),
      ],
    }),
  ])

/** One labelled cell: what the source said, and the primitive under it. */
const cell = (ids: IdFactory, label: string, node: LoomNode): ElementNode =>
  stack(ids, [caption(ids, label), node], { gap: "tight" })

const bound = (
  ids: IdFactory,
  type: string,
  props: JsonObject,
  binding: string,
  source: string,
  children: readonly LoomNode[] = []
): ElementNode =>
  buildElement(ids, {
    type,
    props: {
      ...props,
      [DATA_PROP_KEY]: { [binding]: { source, params: {} } },
    } as never,
    children: [...children],
  })

const opening = (ids: IdFactory): ElementNode =>
  buildElement(ids, {
    type: "loom.hero",
    props: { backdrop: "panel", stature: "standard", align: "start", eyebrow: "0233" },
    children: [
      buildSlot(ids, "heading", [
        heading(ids, "Three things a page is given rather than told", 1, { balance: true }),
      ]),
      prose(
        ids,
        "A hundred and three primitives, and two of them could be handed data. These are the three that join them — a series, a wall of testimonials and a picture — each shot in every state a source can put it in.",
        { size: "lead", tone: "muted", measured: true }
      ),
    ],
  })

const theSeries = (ids: IdFactory): ElementNode =>
  section(ids, "loom.trend", "A series, in the four states a source can put it in", [
    prose(
      ids,
      "Every column below is drawn from an answer, and every rule that decides a bar's height is loom.stat-chart's, so the bound chart and the authored one cannot come to disagree about what a height means. One rule is this primitive's own, and it is the one way their situations differ: an author picks four columns, and an answer carried twelve.",
      { tone: "muted", measured: true }
    ),
    cell(
      ids,
      "Twelve months, answered — the ceiling is the band's, not the answer's",
      bound(ids, "loom.trend", { max: 1000, plot: "tall" }, "series", "metrics.teams", [
        emptyRegion(ids, "Nothing plotted yet", "Point this at the table your figures live in."),
      ])
    ),
    caption(
      ids,
      "Full width, so all twelve columns are in the frame. The two cells below are the same primitive in a half-width cell, which is where the floor under a column engages: twelve points cannot fit, so the plot scrolls inside its region rather than squeezing its figures into nineteen pixels each.",
    ),
    grid(ids, [
      cell(
        ids,
        "Answered, with two rows the schema declined — the note is the reader's half of 0206",
        bound(ids, "loom.trend", { max: 1000, plot: "standard" }, "series", "metrics.partial", [
          emptyRegion(ids, "Nothing plotted yet", "Point this at the table your figures live in."),
        ])
      ),
      cell(
        ids,
        "Answered with nothing — the region the tree placed",
        bound(ids, "loom.trend", { plot: "standard" }, "series", "metrics.none", [
          emptyRegion(ids, "Nothing plotted yet", "Point this at the table your figures live in."),
        ])
      ),
      cell(
        ids,
        "The source did not answer — a declared line, announced",
        bound(ids, "loom.trend", { plot: "standard" }, "series", "metrics.down", [
          emptyRegion(ids, "Nothing plotted yet", "Point this at the table your figures live in."),
        ])
      ),
    ]),
    prose(
      ids,
      "The two middle cells are the pair 0058 insists are not one. A region saying nothing is here is a page; a line saying we could not reach your table is an event. A reader who takes the second for the first concludes their data is gone.",
      { tone: "muted", measured: true }
    ),
  ])

const theVoices = (ids: IdFactory): ElementNode =>
  section(ids, "loom.voices", "The one band on a marketing page nobody may author", [
    prose(
      ids,
      "Praise in a tree is praise somebody wrote on a customer's behalf. loom.quote's anonymous prop exists because a starting composition may not ship a fabricated endorsement — so both authored designs of this band attribute their quotes to job titles. These came from a table.",
      { tone: "muted", measured: true }
    ),
    bound(ids, "loom.voices", { columns: "three", density: "loose", limit: "six" }, "voices", "reviews.best", [
      emptyRegion(ids, "Nobody may write these for you", "Connect the table your reviews land in."),
    ]),
    caption(
      ids,
      "Six of nine, capped by the band. The faces are portrait.ts drawing initials, which is the same fallback loom.avatar, loom.person and loom.quote already share — so a wall of real reviews is complete without a photograph rather than visibly missing one."
    ),
    grid(ids, [
      cell(
        ids,
        "Answered with nothing",
        bound(ids, "loom.voices", { columns: "two" }, "voices", "reviews.none", [
          emptyRegion(ids, "Nobody may write these for you", "Connect the table your reviews land in."),
        ])
      ),
      cell(
        ids,
        "A column was renamed — four read, one did not",
        bound(ids, "loom.voices", { columns: "two" }, "voices", "reviews.partial", [
          emptyRegion(ids, "Nobody may write these for you", "Connect the table your reviews land in."),
        ])
      ),
    ]),
  ])

const thePicture = (ids: IdFactory): ElementNode =>
  section(ids, "loom.plate", "A picture, and the one state of it that has no photograph", [
    prose(
      ids,
      "An image in a Loom tree is a URL a model wrote, and a model writing a URL to a file is a model guessing. This reads the address and the alt text together, from the row that has both — so it cannot put an undescribed picture on a page, and it cannot describe a picture it is not showing.",
      { tone: "muted", measured: true }
    ),
    grid(ids, [
      cell(
        ids,
        "Nothing connected yet — the frame at the aspect the picture will take",
        bound(ids, "loom.plate", { aspect: "wide", fit: "contain", corners: "lg" }, "image", "media.none", [
          buildSlot(ids, "empty", [
            buildElement(ids, {
              type: "loom.icon",
              props: { shape: "bare", tone: "neutral", size: "large" },
              children: [text(ids, "▣")],
            }),
            buildElement(ids, {
              type: "loom.badge",
              props: { tone: "neutral" },
              children: [text(ids, "Your screenshot goes here")],
            }),
          ]),
        ])
      ),
      cell(
        ids,
        "A row with a file and no alt text — refused, and reported as one row of one",
        bound(ids, "loom.plate", { aspect: "wide", corners: "lg" }, "image", "media.undescribed", [
          buildSlot(ids, "empty", [
            buildElement(ids, {
              type: "loom.icon",
              props: { shape: "bare", tone: "neutral", size: "large" },
              children: [text(ids, "▣")],
            }),
          ]),
        ])
      ),
    ]),
    prose(
      ids,
      "The frame is why this primitive has one where loom.media has none: the box holds its shape in every state, so connecting a source changes what is in the frame and never the shape of the band around it. The answered state is absent from this sheet on purpose — a picture needs a file at an http address, and the catalogue is still not allowed to name one.",
      { tone: "muted", measured: true }
    ),
  ])

const theBands = (ids: IdFactory): ElementNode =>
  section(ids, "Catalogue", "The three bands, exactly as they drop in", [
    prose(
      ids,
      "Each arrives unbound, because a composition naming a source id would make every deployment that had not registered it report a binding it never agreed to make. So what a reviewer sees is the page before anybody connected anything — and making that state read as an invitation rather than a fault is where a bound band's design work goes.",
      { tone: "muted", measured: true }
    ),
    band(ids, "hero-shot"),
    band(ids, "metrics-trend"),
    band(ids, "testimonials-collected"),
  ])

const closing = (ids: IdFactory): ElementNode =>
  section(ids, "Where the count is", "106 primitives, 57 bands, five of them bound", [
    buildElement(ids, {
      type: "loom.stat-grid",
      props: { columns: "four", align: "center" },
      children: [
        buildElement(ids, {
          type: "loom.stat",
          props: { value: "106", label: "primitives registered", caption: "103 before this run" },
        }),
        buildElement(ids, {
          type: "loom.stat",
          props: { value: "5", label: "that can be handed data", caption: "two before this run" },
        }),
        buildElement(ids, {
          type: "loom.stat",
          props: { value: "5", label: "declaring what they could not show", caption: "none before this run" },
        }),
        buildElement(ids, {
          type: "loom.stat",
          props: { value: "57", label: "bands in the phrasebook", caption: "fifty-four before this run" },
        }),
      ],
    }),
  ])

const build = (theme: ThemeSelection) => {
  const ids = sequentialIdFactory()

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [
        opening(ids),
        theSeries(ids),
        theVoices(ids),
        thePicture(ids),
        theBands(ids),
        closing(ids),
      ],
    }),
    ids
  )
}

/**
 * Twelve months of a figure that moves, which is the series worth photographing.
 *
 * The first draft of this sheet plotted uptime — 97.9 to 100 against a ceiling of
 * 100 — and the picture was a solid block twelve columns wide. That is the
 * primitive working correctly and it is a bad photograph, and the two facts
 * together are the argument for `max` being authored rather than computed: where
 * the axis stops is what decides whether a rise looks steep or gentle, and a
 * chart that picked its own ceiling would have made this series look like that
 * one. A growth figure against a round ceiling is what a metrics band plots.
 */
const TEAMS = [
  { label: "Aug", value: 210 },
  { label: "Sep", value: 265 },
  { label: "Oct", value: 240 },
  { label: "Nov", value: 330 },
  { label: "Dec", value: 395 },
  { label: "Jan", value: 460 },
  { label: "Feb", value: 505 },
  { label: "Mar", value: 590 },
  { label: "Apr", value: 640 },
  { label: "May", value: 720 },
  { label: "Jun", value: 845 },
  { label: "Jul", value: 960 },
]

/** The same series with two rows whose number column was renamed. */
const TEAMS_PARTIAL = [
  ...TEAMS.slice(0, 10),
  { label: "Jun", teams: 845 },
  { label: "Jul", teams: 960 },
]

const REVIEWS = [
  {
    quote:
      "We moved four tools onto this in a fortnight and nobody has asked for the old ones back.",
    author: "Hanna Ochoa",
    role: "Head of Platform, Northwind",
  },
  {
    quote: "The record of who asked for what is the part I did not know I needed until we had it.",
    author: "Theo Barros",
    role: "Founder, Keelhaul",
  },
  {
    quote:
      "Our designers propose the change and our engineers weigh it. Before this, that sentence was two meetings.",
    author: "Ida Melville",
    role: "Director of Design, Harbourline",
  },
  {
    quote: "It is the first tool we have bought where the audit trail was the reason rather than the tax.",
    author: "Jun Watanabe",
    role: "VP Engineering, Castlereach",
  },
  {
    quote: "Three weeks in and the marketing site has had eleven changes none of us had to deploy.",
    author: "Nadia Freeman",
    role: "Head of Growth, Sablefield",
  },
  {
    quote: "I can see what a change would do before it does it. That is the whole product, for me.",
    author: "Marcus Oyelaran",
    role: "Staff Engineer, Vantage",
  },
  {
    quote: "The one I would not give up is being able to say no with a reason attached.",
    author: "Clara Benitez",
    role: "Product Lead, Thornbury",
  },
  {
    quote: "Our content team stopped filing tickets. They just propose it now.",
    author: "Samuel Addo",
    role: "Editorial Director, Pressfold",
  },
  {
    quote: "Nothing about it feels generated, which is the thing I was most worried about.",
    author: "Elin Haugen",
    role: "Brand Lead, Nordlys",
  },
]

/** Four readable rows and one whose attribution column moved. */
const REVIEWS_PARTIAL = [...REVIEWS.slice(0, 4), { reviewer: "renamed", body: "nothing reads this" }]

export default defineSpecimen({
  /**
   * Deliberately shorter than the report's own slug, and the reason is measured
   * rather than stylistic: a raw.githubusercontent URL past roughly 150
   * characters is rewritten on its way into a pull request body, and
   * `…-given-rather-than-told-editorial-wide.png` puts it at 163. Filed, with
   * the threshold.
   */
  name: "2026-10-06-primitives-given",
  title:
    "A series, a wall of testimonials and a picture, each read from a source rather than authored — in every state a source can put them in, and the three bands that drop them on a page",
  build,
  /**
   * One source id per state, which is how a sheet gets four pages of one
   * primitive into one frame: the state is a property of the answer, and an
   * answer is keyed by the source a node asked. The alternative — one source and
   * four specimens — would put the four states in four pictures nobody compares.
   */
  answers: {
    "metrics.teams": { answer: TEAMS },
    "metrics.partial": { answer: TEAMS_PARTIAL },
    "metrics.none": { answer: [] },
    "metrics.down": { unavailable: { code: "unavailable", detail: "the status page timed out" } },
    "reviews.best": { answer: REVIEWS },
    "reviews.none": { answer: [] },
    "reviews.partial": { answer: REVIEWS_PARTIAL },
    "media.none": { answer: null },
    "media.undescribed": { answer: { src: "https://example.com/shots/board.png" } },
  },
  /**
   * Tall, because the sheet is four sections of cells and then three whole bands
   * at the end. The phone shot is where the wall of six earns its `columns`
   * floor: a three-column grid of quote cards at 390 is one column, and the
   * plate's frame has to keep its aspect without putting the page into a
   * horizontal scroll.
   */
  viewports: [
    { label: "wide", width: 1280, height: 4600, deviceScaleFactor: 2 },
    { label: "phone", width: 390, height: 844, deviceScaleFactor: 2 },
  ],
  themes: [
    {
      label: "editorial",
      selection: themeSelectionSchema.parse({
        palette: "editorial",
        fontPack: "editorial-serif",
        stylePreset: "comfortable",
      }),
    },
    {
      label: "bold",
      selection: themeSelectionSchema.parse({
        palette: "bold",
        fontPack: "bold-sans",
        stylePreset: "airy-modern",
      }),
    },
  ],
})
