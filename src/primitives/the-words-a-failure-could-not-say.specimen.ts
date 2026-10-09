import { sequentialIdFactory, type IdFactory } from "../ids.js"
import type { JsonObject } from "../json.js"
import { DATA_PROP_KEY, THEME_PROP_KEY } from "../reserved-props.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"
import { buildElement, buildSlot, buildText } from "../tree/builders.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { createTree } from "../tree/tree.js"

import { defineSpecimen } from "../../tools/specimen/specimen.js"

/**
 * The four region-shaped bound primitives in the state a page meets on its
 * worst day, photographed twice each: the sentence the primitive owns, and the
 * region a tree may now place over it
 * ([0246](../../decisions/0246-a-bound-primitives-failure-region-is-a-slot-over-its-declared-sentence.md)).
 *
 * ## Why the pairs are the sheet
 *
 * A single column of authored failure regions would photograph well and prove
 * nothing. The claim 0246 makes is **additive** — the slot sits *over* the
 * declared sentence rather than instead of it — and the only way a picture can
 * carry that claim is to put the two renderings of one node side by side: left
 * is a tree that placed nothing, which is every tree stored before today, and
 * right is a tree that had something to say.
 *
 * So each row is one primitive, one answer (`unavailable`), and two trees. If a
 * later change ever made the slot replace the sentence rather than cover it,
 * the left column of this sheet goes blank and the shot says so.
 *
 * ## What the right column could not have been before
 *
 * The region is `loom.empty-state` with a heading, a line of prose and a link
 * in its `actions` slot — three primitives this library already had and no
 * bound band could reach. The thing to look at is not that it is prettier. It
 * is that a page whose data is down can now send a reader somewhere, and
 * before today the whole of what it could say was one line of muted body text
 * that a deployment could translate and nobody could add to.
 *
 * ## One state, not four
 *
 * The other three states of these primitives are already photographed, by
 * `given-rather-than-told` and `another-kind-of-business`. This sheet is
 * deliberately the one state those could not show a tree's own words in, and
 * `loom.plate`'s answered state is still absent for the standing reason — a
 * picture needs a file at an `http(s)` address, and a photograph that depended
 * on a network is one that differs on a bad afternoon.
 */

const text = (ids: IdFactory, value: string) => buildText(ids, value)

const heading = (ids: IdFactory, value: string, level: number, extra: JsonObject = {}): ElementNode =>
  buildElement(ids, { type: "loom.heading", props: { level, ...extra }, children: [text(ids, value)] })

const prose = (ids: IdFactory, value: string, extra: JsonObject = {}): ElementNode =>
  buildElement(ids, { type: "loom.prose", props: extra, children: [text(ids, value)] })

const caption = (ids: IdFactory, value: string): ElementNode =>
  prose(ids, value, { size: "small", tone: "muted" })

const stack = (ids: IdFactory, children: readonly LoomNode[], extra: JsonObject = {}): ElementNode =>
  buildElement(ids, { type: "loom.stack", props: { gap: "loose", ...extra }, children: [...children] })

const grid = (ids: IdFactory, children: readonly LoomNode[], extra: JsonObject = {}): ElementNode =>
  buildElement(ids, { type: "loom.grid", props: { columns: "two", ...extra }, children: [...children] })

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

/**
 * The `empty` region every one of these places, kept identical across the sheet
 * so that the variable in the frame is the failure region and nothing else.
 *
 * It is here at all because a bound node that places no `empty` region is a
 * node the audit reports — and because leaving it out would make the left and
 * right trees differ in two ways instead of one.
 */
const emptyRegion = (ids: IdFactory): LoomNode =>
  buildSlot(ids, "empty", [
    buildElement(ids, {
      type: "loom.empty-state",
      props: { outline: "dashed", align: "center", cause: "empty", stature: "compact" },
      children: [buildSlot(ids, "heading", [heading(ids, "Nothing yet", 3)]), text(ids, "It appears here.")],
    }),
  ])

/** The region 0246 added: a heading, a sentence, and a way out. */
const failureRegion = (ids: IdFactory, line: string): LoomNode =>
  buildSlot(ids, "unavailable", [
    buildElement(ids, {
      type: "loom.empty-state",
      props: { outline: "solid", align: "center", cause: "unavailable", stature: "compact" },
      children: [
        buildSlot(ids, "heading", [heading(ids, "We cannot reach this right now", 3)]),
        text(ids, line),
        buildSlot(ids, "actions", [
          buildElement(ids, {
            type: "loom.action",
            props: { href: "https://example.com/status", variant: "secondary", scale: "small" },
            children: [text(ids, "Check our status page")],
          }),
        ]),
      ],
    }),
  ])

const bound = (
  ids: IdFactory,
  type: string,
  props: JsonObject,
  binding: string,
  children: readonly LoomNode[]
): ElementNode =>
  buildElement(ids, {
    type,
    props: {
      ...props,
      [DATA_PROP_KEY]: { [binding]: { source: "everything.down", params: {} } },
    } as never,
    children: [...children],
  })

/** One primitive, two trees: the sentence it owns, then the words a tree gave it. */
const pair = (
  ids: IdFactory,
  type: string,
  props: JsonObject,
  binding: string,
  line: string
): ElementNode =>
  grid(ids, [
    stack(ids, [caption(ids, "the tree placed nothing"), bound(ids, type, props, binding, [emptyRegion(ids)])], {
      gap: "tight",
    }),
    stack(
      ids,
      [
        caption(ids, "the tree placed a region"),
        bound(ids, type, props, binding, [emptyRegion(ids), failureRegion(ids, line)]),
      ],
      { gap: "tight" }
    ),
  ])

const opening = (ids: IdFactory): ElementNode =>
  buildElement(ids, {
    type: "loom.hero",
    props: { backdrop: "panel", stature: "standard", align: "start", eyebrow: "0246" },
    children: [
      buildSlot(ids, "heading", [
        heading(ids, "The words a failure could not say", 1, { balance: true }),
      ]),
      prose(
        ids,
        "Every band below asked a source that did not answer. On the left is what shipped before today — one sentence the primitive owns, which a deployment may translate and nobody could add to. On the right is the same node with a region the tree placed: a heading, a line, and somewhere to go.",
        { size: "lead" }
      ),
    ],
  })

const build = (theme: ThemeSelection) => {
  const ids = sequentialIdFactory()

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [
        opening(ids),
        section(ids, "loom.feed", "A list that could not be loaded", [
          pair(ids, "loom.feed", {}, "entries", "Our status page has the latest on the outage."),
        ]),
        section(ids, "loom.trend", "A chart that could not be loaded", [
          pair(ids, "loom.trend", { max: 100, suffix: "%" }, "series", "Figures are usually back within the hour."),
        ]),
        section(ids, "loom.voices", "Testimonials that could not be loaded", [
          pair(ids, "loom.voices", { columns: "auto" }, "voices", "Reviews are served from a system we do not host."),
        ]),
        section(ids, "loom.plate", "A picture that could not be loaded", [
          pair(ids, "loom.plate", { aspect: "wide" }, "image", "The media library is not answering."),
        ]),
      ],
    }),
    ids
  )
}

export default defineSpecimen({
  /**
   * Short for the measured reason the sibling sheet records: a
   * raw.githubusercontent URL past roughly 150 characters is rewritten on its
   * way into a pull request body, and the report's own slug would put it over.
   */
  name: "2026-10-09-primitives-failure",
  title:
    "The one state of a bound band no tree could put words in — four primitives, each shown with the sentence it owns and with the region a tree may now place over it",
  build,
  /**
   * One source, and one answer: everything on this sheet asked the same thing
   * and it is down. A sheet about a single state does not need a source per
   * state, and four ids answering identically would suggest the state varied.
   */
  answers: {
    "everything.down": { unavailable: { code: "unavailable", detail: "the service timed out" } },
  },
  viewports: [
    { label: "wide", width: 1280, height: 2600, deviceScaleFactor: 2, touch: false },
    { label: "phone", width: 390, height: 844, deviceScaleFactor: 2, touch: true },
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
