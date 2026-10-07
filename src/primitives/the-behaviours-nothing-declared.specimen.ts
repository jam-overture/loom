import { sequentialIdFactory, type IdFactory } from "../ids.js"
import type { JsonObject } from "../json.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { buildElement, buildSlot, buildText } from "../tree/builders.js"
import type { ElementNode } from "../tree/node.js"
import { createTree } from "../tree/tree.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"

import { defineSpecimen } from "../../tools/specimen/specimen.js"

/**
 * The first **live** specimen in this repository, and it had to be.
 *
 * Every specimen before this one is `renderToStaticMarkup` served as a file and
 * photographed, which is the right subject for almost everything and is the one
 * subject in which **no control in the behaviour vocabulary appears at all**:
 * each returns `null` until an effect has proved scripting runs. Five members
 * into the vocabulary, nothing in this repository had ever photographed one.
 * `specimen.ts` grew `live` and `states` for exactly this sheet — *"a picture of
 * a dialog is two pictures, shut and open, and they are the same page"* — and
 * this is the first use.
 *
 * ## The four states, and why each exists
 *
 * | state | what it is for |
 * | --- | --- |
 * | `shut` | the page as hydration settles: four controls on it, every region closed, the wipe where the tree put it |
 * | `the menu` | a dropdown over the page, which `loom.nav`'s `disclose` could never draw because a dropped panel is not its button's sibling |
 * | `the popover` | the general presentation, open beside the words it explains — and the wipe dragged to 80, which no camera here has ever photographed |
 * | `the lightbox` | the one region that covers the viewport, with the cross that is the only way out of it |
 *
 * **`shut` is the half that is easy to leave out and is the control.** A sheet
 * of nothing but open panels proves that three panels can be drawn; it says
 * nothing about whether they ever close, and a primitive whose hide rule was
 * written in the wrong direction would photograph identically in the other three
 * states. The first shot is the one that would catch it.
 *
 * ## Why the three are opened in three states rather than one
 *
 * Not tidiness — **a press outside a presentation closes it.** Clicking the
 * menu's trigger after the popover's is an outside press on the popover, which
 * is 0176's dismissal working exactly as specified, so a single state that
 * pressed all three would photograph one open panel and two that had just shut.
 * The wipe is the exception and is dragged in the same state as the popover:
 * `fill` focuses a range input and sets its value without a pointer press, so it
 * leaves an open panel open.
 *
 * ## Why there is not an image in it
 *
 * `mediaUrlSchema` refuses `data:` deliberately and a specimen may reach no
 * network, so the stand-in for a screenshot is `loom.frame`, which draws its own
 * chrome. That costs nothing here and buys something: the lightbox's two regions
 * hold **different** content at different sizes, which is the point of its
 * having two regions rather than one and would have been invisible if both held
 * the same picture.
 */

const text = (ids: IdFactory, value: string) => buildText(ids, value)

const heading = (ids: IdFactory, value: string, level: number, extra: JsonObject = {}): ElementNode =>
  buildElement(ids, {
    type: "loom.heading",
    props: { level, ...extra },
    children: [text(ids, value)],
  })

const prose = (ids: IdFactory, value: string, extra: JsonObject = {}): ElementNode =>
  buildElement(ids, { type: "loom.prose", props: extra, children: [text(ids, value)] })

const link = (ids: IdFactory, label: string, href: string, extra: JsonObject = {}): ElementNode =>
  buildElement(ids, { type: "loom.link", props: { href, ...extra }, children: [text(ids, label)] })

const action = (ids: IdFactory, label: string, variant: string): ElementNode =>
  buildElement(ids, {
    type: "loom.action",
    props: { href: "/", variant, scale: "small" },
    children: [text(ids, label)],
  })

/** A screenshot's stand-in: chrome this library draws, holding real words. */
const frame = (
  ids: IdFactory,
  label: string,
  title: string,
  body: string,
  size: "small" | "body" = "small"
): ElementNode =>
  buildElement(ids, {
    type: "loom.frame",
    props: { chrome: "browser", label },
    children: [
      buildSlot(ids, "surface", [
      buildElement(ids, {
        type: "loom.card",
        props: { tone: "plain", padding: "normal" },
        children: [
      buildElement(ids, {
        type: "loom.stack",
        /**
         * `stretch`, and the default is not. A `loom.stack` ranges its children
         * to the start, which sizes a paragraph to `fit-content` — so inside a
         * wide plate the prose came out one `max-content` line and the lightbox
         * scrolled sideways. The stack is the thing that was wrong, not the
         * plate; it is written down here because the picture blamed the plate.
         */
        props: { direction: "column", gap: "snug", align: "stretch" },
        children: [heading(ids, title, 3), prose(ids, body, { size, tone: "muted" })],
      }),
        ],
      }),
      ]),
    ],
  })

/**
 * The wipe's two states, as a band with content **across its whole width**.
 *
 * The first draft put a heading and a paragraph in each side, and the picture it
 * produced is the reason this helper exists: a wipe clips the before layer at a
 * percentage, and content that lives in the left-hand third of a frame is
 * entirely on one side of every edge a reader can drag to. Both halves were
 * blank. Three figures spread across the band are visible wherever the seam is,
 * which is what a comparison has to be before it compares anything.
 */
const priceFrame = (ids: IdFactory, title: string, figures: readonly (readonly [string, string])[]): ElementNode =>
  buildElement(ids, {
    type: "loom.frame",
    props: { chrome: "browser", label: "loom.dev/pricing" },
    children: [
      buildSlot(ids, "surface", [
        buildElement(ids, {
          type: "loom.card",
          props: { tone: "plain", padding: "roomy" },
          children: [
            buildElement(ids, {
              type: "loom.stack",
              props: { direction: "column", gap: "normal", align: "stretch" },
              children: [
                heading(ids, title, 3),
                buildElement(ids, {
                  type: "loom.stat-grid",
                  props: { columns: "three" },
                  children: figures.map(([value, label]) =>
                    buildElement(ids, { type: "loom.stat", props: { value, label } })
                  ),
                }),
                /**
                 * A third line, so the band is taller than the chips and the
                 * slider the primitive draws across its foot. A comparison of
                 * two short frames puts a corner label over a figure, which is
                 * a fact about this sheet rather than about the primitive —
                 * a screenshot has nothing written along its bottom edge.
                 */
                prose(ids, "Every figure here is data.", {
                  size: "small",
                  tone: "muted",
                }),
              ],
            }),
          ],
        }),
      ]),
    ],
  })

/**
 * The bar, with a `loom.menu` at the end of it.
 *
 * **In the `actions` region rather than among the links**, and the first draft
 * had it among the links. That draft photographs correctly at 1280 and cannot be
 * photographed at 390 at all: `loom.nav` collapses its own menu region behind a
 * `disclose` button below 48rem, so a `loom.menu` placed in it is inside a
 * `display: none` subtree and the harness times out waiting for a trigger that
 * resolves and is not visible. The `actions` region is not collapsed, which
 * makes the overflow menu at the end of a bar the use that works at both widths
 * — and it is the use a header most often wants anyway.
 *
 * `align: "end"` because the panel hangs from a root sitting at the right-hand
 * end of the bar, and the only alternative to declaring that is measuring the
 * window.
 *
 * **The bar carries no flat links, and that is the second thing a phone
 * taught this sheet.** `loom.nav` builds its own disclosure the moment it has
 * children, and on a phone that toggle takes the slack at the end of the top
 * line — so the actions region wraps to a second line with no auto margin and
 * sits at the *left*. A panel aligned to the end of a trigger grows away from
 * it, so the dropdown then hung off the left of a 390-pixel page. With the
 * links in the menu instead of beside it the bar is one line at both widths,
 * the actions stay at the end, and the panel has somewhere to go — which is
 * also the tidier reading of the band: the whole menu is behind the button.
 */
const bar = (ids: IdFactory): ElementNode =>
  buildElement(ids, {
    type: "loom.nav",
    props: { tone: "surface", align: "center" },
    children: [
      buildSlot(ids, "brand", [
        buildElement(ids, { type: "loom.logo", props: { name: "Loom" } }),
      ]),
      buildSlot(ids, "actions", [
        action(ids, "Start", "primary"),
        buildElement(ids, {
          type: "loom.menu",
          props: { align: "end" },
          children: [
            link(ids, "The tree and the delta", "/how/tree"),
            link(ids, "The gate", "/how/gate"),
            link(ids, "The record", "/how/record"),
            link(ids, "The seams", "/how/seams"),
          ],
        }),
      ]),
    ],
  })

/**
 * The popover, beside the words it explains, in a row rather than under them —
 * which is the arrangement the primitive is for and the reason its root is
 * `inline-flex` rather than a block.
 */
const annotated = (ids: IdFactory): ElementNode =>
  buildElement(ids, {
    type: "loom.section",
    props: { eyebrow: "WHAT A GATE IS", width: "readable" },
    children: [
      buildSlot(ids, "heading", [heading(ids, "Every proposal is weighed before it is applied", 2)]),
      buildElement(ids, {
        type: "loom.stack",
        props: { direction: "row", gap: "snug", align: "center" },
        children: [
          prose(ids, "The weighing has four stakes and a verdict.", { tone: "muted" }),
          buildElement(ids, {
            type: "loom.popover",
            props: { width: "wide", align: "start" },
            children: [
              heading(ids, "The four stakes", 3),
              prose(
                ids,
                "How much of the page a change touches, whether it is reversible, whether it reaches a destination, and whether anything on the page reads what it asks for.",
                { size: "small", tone: "muted" }
              ),
              link(ids, "Read the record", "/record"),
            ],
          }),
        ],
      }),
    ],
  })

/**
 * Three lightboxes in a grid, which is the gallery claim made rather than
 * asserted: `docs/primitive-gap-inventory.md` has said *gallery →
 * `loom.mosaic`* since 13 September, and it became true the day a tile existed
 * that opens. Three of them also photograph the independence — one is open and
 * the other two are shut, which a module-level store keyed by node id would have
 * got wrong.
 */
const gallery = (ids: IdFactory): ElementNode =>
  buildElement(ids, {
    type: "loom.section",
    props: { eyebrow: "WHAT IT LOOKS LIKE", tone: "surface", width: "wide" },
    children: [
      buildSlot(ids, "heading", [heading(ids, "Three tiles, each of which opens", 2)]),
      buildElement(ids, {
        type: "loom.grid",
        props: { columns: "three", gap: "normal" },
        children: [
          ["loom.dev/record", "The record", "Every change, and who proposed it."],
          ["loom.dev/outline", "The outline", "The page as a tree you can read."],
          ["loom.dev/gate", "The gate", "Four stakes and a verdict."],
        ].map(([label, title, body]) =>
          buildElement(ids, {
            type: "loom.lightbox",
            props: { aspect: "wide", caption: title ?? "" },
            children: [
              buildSlot(ids, "preview", [frame(ids, label ?? "", title ?? "", body ?? "")]),
              buildSlot(ids, "full", [
                frame(
                  ids,
                  label ?? "",
                  title ?? "",
                  "The same screen at the size it was drawn for — which is a second region holding a second thing, and the whole reason this primitive has two slots rather than one picture it scales up.",
                  "body"
                ),
              ]),
            ],
          })
        ),
      }),
    ],
  })

/**
 * The wipe, which has had a slider waiting for it in the vocabulary since
 * 1 September. The position is 35 rather than the default so that the still
 * version and the dragged one are two different pictures.
 */
const wipe = (ids: IdFactory): ElementNode =>
  buildElement(ids, {
    type: "loom.section",
    props: { eyebrow: "BEFORE AND AFTER", width: "wide" },
    children: [
      buildSlot(ids, "heading", [heading(ids, "A comparison a reader can drag", 2)]),
      prose(ids, "The slider is the runtime's control. Where it sits over the band is this primitive's rule.", {
        tone: "muted",
      }),
      buildElement(ids, {
        type: "loom.before-after",
        props: { position: 35, beforeLabel: "Before", afterLabel: "After" },
        children: [
          buildSlot(ids, "before", [
            priceFrame(ids, "Three plans", [
              ["£19", "Starter"],
              ["£49", "Team"],
              ["£99", "Scale"],
            ]),
          ]),
          buildSlot(ids, "after", [
            priceFrame(ids, "Three plans, adapted", [
              ["£49", "Team"],
              ["£19", "Starter"],
              ["£99", "Scale"],
            ]),
          ]),
        ],
      }),
    ],
  })

const build = (theme: ThemeSelection) => {
  const ids = sequentialIdFactory()

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [bar(ids), annotated(ids), gallery(ids), wipe(ids)],
    }),
    ids
  )
}

/**
 * Each trigger is addressed through the class the runtime stamps on it, scoped
 * by the primitive's own root — `.loom-menu > .loom-control-present`. There are
 * four `present` controls on this page and a bare `.loom-control-present` would
 * press whichever one the driver found first, which is the kind of sheet that
 * photographs something true about a page nobody wrote.
 */
const triggerIn = (primitive: string): string => `.${primitive} > .loom-control-present`

export default defineSpecimen({
  name: "2026-10-01-primitives-the-behaviours-nothing-declared",
  title:
    "The three behaviours no primitive declared, now declared: a dropped menu, a popover, a lightbox and a wipe that drags — shut and open, under both starter palettes",
  build,
  /**
   * The wide viewport is **1500 rather than the harness's 900**, and it is the
   * one deviation from `DEFAULT_VIEWPORTS` on this sheet.
   *
   * A lightbox's frame is `position: fixed`, so it covers **the viewport** — and
   * a full-page photograph of a page taller than its viewport therefore shows
   * the scrim stopping partway down with the rest of the page undimmed beside
   * it. That is the camera being right about a fixed element and the picture
   * being wrong about the primitive: a reader never sees that state, because a
   * reader has a viewport and the scroll lock stops them leaving it. Sized just past
   * the page (1583px at this width), the photograph is what the reader sees —
   * and the first sheet that was only *nearly* tall enough showed it exactly:
   * eighty-five pixels of undimmed band below the frame, with the wipe's corner
   * chips sitting brightly in it.
   *
   * The phone stays at 390×844, which is a real phone, and its lightbox shot
   * shows the frame over the first screenful with the page below it unlocked in
   * the capture. Both are worth having: one is the primitive, the other is the
   * mechanism.
   */
  viewports: [
    { label: "wide", width: 1280, height: 1600, deviceScaleFactor: 2, touch: false },
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
  live: {
    states: [
      /** The control, and the only shot that says the regions ever close. */
      { label: "shut", do: [] },
      {
        label: "the menu",
        do: [{ click: triggerIn("loom-menu") }, { wait: 400 }],
      },
      {
        /** The wipe first: `fill` takes no pointer press, so the panel stays open. */
        label: "the popover",
        do: [
          { fill: "input.loom-control-adjust", text: "80" },
          { click: triggerIn("loom-popover") },
          { wait: 400 },
        ],
      },
      {
        /**
         * The **second** tile, and the `nth=` is not incidental. Three
         * lightboxes on the page means three `present` controls, so a bare
         * class is a strict-mode violation rather than a press — and opening
         * the middle one is what shows that the other two stayed shut, which is
         * the property 0176's rejected alternative would have broken.
         */
        label: "the lightbox",
        do: [{ click: `${triggerIn("loom-lightbox")} >> nth=1` }, { wait: 400 }],
      },
    ],
  },
})
