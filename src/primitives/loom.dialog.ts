import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { FRAME_LAYER, panelPaint } from "./presentation.js"
import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, size, space, weight } from "./tokens.js"

/**
 * A region a band opens from its own call to action: the demo video behind
 * *Watch the demo*, the form behind *Book a call*, the whole revision log behind
 * *See what changed*.
 *
 * It is the fourth of the four presentations 0176 unblocked on 20 September, and
 * it is the one that did not ship with the other three on 1 October.
 * `docs/primitive-gap-inventory.md` has carried the reason since: *"a dialog's
 * trigger is the page's call to action, which is content, and the seam has
 * nowhere to put it… until it moves, a dialog here would be a modal opened by a
 * chip reading Open."*
 *
 * The seam moved.
 * [0234](../../decisions/0234-a-primitive-may-name-a-control-from-the-tree-and-its-declared-string-is-the-floor.md)
 * lets a primitive name one of its own props as where a control takes its name
 * from, and this is the primitive that record was written for — its
 * `Consequences` say so by name. **It is the first consumer of `names` in the
 * library**, which is worth stating because it means the seam's two registry
 * refusals had never been exercised by a real declaration until this file.
 *
 * ## Why the word had to come from the tree, restated from the taking end
 *
 * The three that shipped are affordances and the generic word is the right one:
 * *Expand* over a thumbnail, *Details* beside a term, *Menu* on a bar. A reader
 * meeting any of them wants to be told what the control does.
 *
 * A dialog's trigger is not that. It is the sentence the band is built around,
 * and there are two tests that it is content rather than an affordance. **It
 * differs per node** — a page with *Watch the demo* in its hero and *Book a
 * call* in its closing band is one primitive twice, not two primitives. And **a
 * translator should not hold it**: *Book a call* belongs in the page's words
 * with the headline above it, not in the dictionary beside *Copy* and *Close*.
 *
 * So `label` is a prop, `names: { present: "label" }` points the seam at it, and
 * `DIALOG_TEXT` stays underneath as the floor. The floor is not decoration:
 * 0234's fourth and fifth clauses make it the name a reader is announced in
 * every language the deployment serves, for every node that wrote nothing, and
 * the registry still refuses a primitive that takes a behaviour and declares no
 * string. A tree cannot talk a nameless control onto a page.
 *
 * ## Children, not a slot
 *
 * `loom.lightbox` has two slots because it places two regions — a tile on the
 * page and a plate over it — and 0051 is the record that says a region the
 * primitive places earns one.
 *
 * This places **one**. Its trigger is a control rather than a node, so there is
 * no second region for the tree to fill, and a single-region primitive takes
 * children: that is 0051's own line, and it is what lets the body be a
 * `loom.form`, a `loom.embed` of a video, a `loom.prose` with a `loom.action`
 * under it, or all three, none of which had to be predicted here. A menu's rows
 * are children for 0052's plainest reason and a dialog's body is children for
 * 0051's.
 *
 * `title` is a prop, and it is the same call `loom.lightbox` makes about
 * `caption`: there is exactly one, it names the region rather than being its
 * content, changing it is exactly a `configure`, and it is drawn in the plate's
 * own bar beside the cross — which is a place the primitive decides, not a place
 * a child could put itself.
 *
 * ## What it still is not, and it is the same two things
 *
 * **Focus is not trapped and the page behind is not `inert`.** Both are script,
 * both are named in 0176 as the primitive's half rather than the behaviour's,
 * and neither is reachable from a stylesheet — so a reader on a keyboard can tab
 * out of an open dialog into the band underneath it. That is `loom.lightbox`'
 * honest limit and it is this one's unchanged, which is the point: it is a
 * property of every modal this library can build, not of either primitive. It is
 * filed.
 *
 * What *is* here is the scroll lock, because 0210 is a rule a static stylesheet
 * can hold, and this is that record's second instance.
 *
 * **A press on the ground around the plate closes nothing.** 0176's fifth clause
 * measures *outside* against the element the trigger sits in, and a region drawn
 * over the viewport puts its own scrim inside that element. The way out is the
 * cross, which is what `dismiss` is for. Unchanged from the lightbox, and stated
 * here because this doc comment is what the next author reads.
 */

const props = z
  .object({
    /**
     * The words on the trigger — the band's own call to action, and the one
     * string in this library a tree writes onto a control (0234).
     *
     * Omitted, blank, or anything that is not a string means *this node said
     * nothing*, and the reader gets the declared floor in the deployment's
     * language. None of those is a diagnostic: a name that was not written is a
     * tree declining an option, not a thing it asked for and did not get.
     */
    label: z.string().min(1).max(48).optional(),
    /**
     * What the opened region is called, drawn in the plate's bar beside the
     * cross. A fixed field by 0052, the same call `loom.lightbox` makes about
     * its `caption`.
     */
    title: z.string().min(1).max(80).optional(),
    /**
     * How wide the plate is allowed to get. A ceiling rather than a count, so it
     * changes nothing about which children exist — `loom.feature-grid`'s
     * `columns` is the same shape and `docs/primitive-granularity.md` works that
     * distinction.
     *
     * `prose` is the measure a paragraph wants to be read at; `panel` is for a
     * form or a short column; `media` is wide enough for an embedded video to
     * sit at its own aspect without being letterboxed by the plate.
     */
    measure: z.enum(["panel", "prose", "media"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const MEASURES: Readonly<Record<NonNullable<Props["measure"]>, string>> = {
  panel: "32rem",
  prose: "44rem",
  media: "64rem",
}

/**
 * The two declared strings, and they are doing different jobs.
 *
 * `dismiss` is an affordance and will never be anything else: a cross that
 * closes a region is called *Close* on every dialog on every page, and a tree
 * renaming it is a tree making one modal shut differently from the next. It is
 * not in `names`, which is 0234's seventh clause — each member decides which of
 * its strings is reachable, and this primitive reaches exactly one.
 *
 * `present` is the floor under a word the tree writes. *More* rather than
 * *Open*, because it is the one that still reads as a sentence on a page when
 * nothing filled the prop: a band closing with a button marked *Open* is a
 * question, and one marked *More* is a weak answer, which is the better failure.
 */
const DIALOG_TEXT = { present: "More", dismiss: "Close" } as const

type DialogTextKey = keyof typeof DIALOG_TEXT

export const loomDialog = definePrimitive({
  type: "loom.dialog",
  description:
    "A region a band opens from its own call to action, holding whatever it is given — the demo behind 'Watch the demo', the form behind 'Book a call'.",
  props,
  slots: [],
  copy: ["title"],
  text: DIALOG_TEXT,
  behaviours: ["present", "dismiss"],
  /** It renders a button, so the Gate must not let one sit inside an anchor. */
  interactive: "always",
  /**
   * The declaration this whole file exists to make. The behaviour is one this
   * primitive declares and the prop is one its schema declares, which are the
   * two halves the registry checks — and a rename on either side is a compile
   * error at the declaration rather than a control that quietly goes back to
   * reading *More* for ever.
   */
  names: { present: "label" },
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props, DialogTextKey, "present" | "dismiss">) =>
    createElement(
      "div",
      {
        ...loom.editable,
        className: LIBRARY_CLASS.dialog,
        /**
         * Not `PRESENTATION_ROOT`, and this is the one place this primitive
         * departs from the shape the other three share.
         *
         * That constant is `position: relative` with `inline-flex`, which is
         * what a primitive needs when its region is positioned **against** the
         * trigger: a panel hanging off a menu button is laid out from the root's
         * own box. This region is `position: fixed` over the viewport and is
         * positioned against nothing, so the containing block buys nothing — and
         * `relative` would actively cost something the day a band wraps a dialog
         * in a transformed or filtered ancestor, where a fixed descendant
         * resolves against the nearest such box rather than the window.
         *
         * `inline-flex` is kept and is load-bearing for a different reason: the
         * trigger is the band's call to action and sits in a row of them, so the
         * root has to be as wide as its button and no wider. A `block` root
         * would put a full-width invisible box beside every other action in the
         * row.
         */
        style: { display: "inline-flex", alignItems: "center" },
      },
      libraryStylesheet(),
      /**
       * A direct child of the root, which is `presentation.ts`' first warning
       * and the thing it says is invisible once got wrong: the control publishes
       * `data-loom-presented` on whatever element it finds itself in, and the
       * rule that hides the region is keyed on the root. Unlike the lightbox's
       * chip this one is left exactly where the runtime paints it — a dialog's
       * trigger *is* the thing on the page, so there is nothing to position it
       * against and no class on it to do so from.
       */
      loom.behaviours.present,
      createElement(
        "div",
        {
          key: "frame",
          className: LIBRARY_CLASS.dialogFrame,
          style: {
            position: "fixed",
            inset: "0",
            zIndex: FRAME_LAYER,
            padding: space(4),
          },
        },
        /**
         * The scrim is its own element rather than a translucent background on
         * the frame, which is `loom.overlay`'s reason and the lightbox's: an
         * `opacity` on the frame would take the plate down with it. `bg-overlay`
         * used as what the palette says it is, so it re-themes under every
         * starter rather than being a hard-coded black wash (0049).
         */
        createElement("div", {
          key: "scrim",
          "aria-hidden": true,
          style: {
            position: "absolute",
            inset: "0",
            background: colour("bg-overlay"),
            opacity: 0.94,
          },
        }),
        createElement(
          "div",
          {
            key: "panel",
            className: LIBRARY_CLASS.dialogPanel,
            style: {
              position: "relative",
              /**
               * `inline-size` with a cap inside the `min()` rather than a
               * `max-inline-size`, which is the lightbox's measured finding
               * reused: the frame's `justify-items: center` makes a plate's
               * width shrink to fit, so a maximum is a ceiling nothing reaches
               * and the plate comes out as a column the width of its longest
               * word.
               */
              inlineSize: `min(${MEASURES[given.measure ?? "panel"]}, 100%)`,
              /**
               * The other half of the frame's `align-items: start` — this is
               * what re-centres a plate that fits, and does nothing at all to
               * one that does not. The sheet carries why that pairing is the
               * arrangement rather than `place-items: center`.
               */
              marginBlock: "auto",
              overscrollBehavior: "contain",
              padding: space(3),
              ...panelPaint(),
            },
          },
          createElement(
            "div",
            {
              key: "bar",
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: space(3),
                paddingInlineStart: space(2),
                paddingBlockEnd: space(2),
              },
            },
            createElement(
              "span",
              {
                style: {
                  fontFamily: family("heading"),
                  fontWeight: weight("heading"),
                  fontSize: size(2),
                  /**
                   * `fg-default` and not the muted ramp, for the reason the
                   * lightbox's bar states: the plate paints `bg-overlay`, so a
                   * muted title on it would be a **painted** pairing where
                   * `contrast.ts` declares a composed one — a row the palette
                   * audit measures at a weaker bar than the thing actually
                   * drawn.
                   */
                  color: colour("fg-default"),
                },
              },
              given.title ?? ""
            ),
            loom.behaviours.dismiss
          ),
          children
        )
      )
    ),
})
