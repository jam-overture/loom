import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { ASPECT_NAMES, ASPECT_RATIOS } from "./layout.js"
import { FRAME_LAYER, panelPaint } from "./presentation.js"
import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, radius, size, space, weight } from "./tokens.js"

/**
 * A thumbnail a reader opens: the screenshot that is unreadable at tile size,
 * the product shot in a gallery, the diagram a paragraph refers to.
 *
 * It is the one primitive in the library that declares **both** halves of the
 * pair 0176 added, and the reason is the sharp edge that record names in its
 * fifth clause. *Outside* is measured against the element the trigger was placed
 * in — which is this primitive's root — and a region drawn over the whole
 * viewport puts its own scrim **inside** that element. So a press on the dark
 * ground around the picture is an inside press and closes nothing, and the way
 * out is the cross: that is what `dismiss` is for, and this is the primitive it
 * was described for.
 *
 * ## Two regions, both slots
 *
 * `preview` and `full` are `loom.before-after`'s `before` and `after` argument
 * unchanged ([0051](../../decisions/0051-a-slot-is-a-region-the-primitive-places.md)):
 * each is a region this primitive *places*, so what goes in it is the tree's
 * business. That buys the thing two URL props would have made unsayable — the
 * preview can be a `loom.media` at a crop with its own alt text while the full
 * region is a `loom.embed` of a video, or a `loom.card`, or a second
 * `loom.before-after`. None of that had to be predicted here.
 *
 * **The two regions are not required to hold the same thing**, and that is a
 * feature rather than an oversight: a 400-pixel tile and a 1400-pixel plate of
 * the same screenshot are two files, and a gallery that serves the large one
 * twice is a gallery that costs four megabytes to scroll past.
 *
 * `caption` is a prop for 0052's fixed-field clause, the same call
 * `loom.before-after` makes about its corner labels: there is exactly one, it
 * names the region rather than being its content, and changing it is exactly a
 * `configure`. It is drawn in the frame's own bar, where it can be read, rather
 * than inside the clipped preview where it would be cut in half.
 *
 * ## A gallery is a grid of these, and that is already registered
 *
 * By 0054 a container is its child's name plus the arrangement, and the
 * arrangement a gallery wants is one this library has twice over —
 * `loom.mosaic` for the unequal rhythm a photograph wall wants, `loom.grid` for
 * the even one. Neither needs to know what it is holding, so a `loom.lightbox-grid`
 * would be a third name for a layout that exists. `docs/primitive-gap-inventory.md`
 * has said *gallery → `loom.mosaic`* since 13 September; this is the piece that
 * made it true.
 *
 * ## What it still is not, and the two parts of that
 *
 * **The page behind it does not scroll**, and that is new: the one thing a modal
 * owes a reader that the behaviour seam explicitly does not provide
 * ([0210](../../decisions/0210-a-primitive-may-lock-the-pages-scroll-from-the-stylesheet-and-only-while-its-own-region-is-open.md))
 * is a scroll lock, and a `:has()` rule on the document element is a lock a
 * static stylesheet can hold.
 *
 * **Focus is not trapped and the rest of the page is not `inert`.** Both are
 * script, both are named in 0176 as the primitive's half, and neither is
 * reachable from a stylesheet at all — a reader on a keyboard can tab out of an
 * open frame into the page underneath it. That is the honest limit of this
 * primitive, it is filed, and it is stated here rather than in a report because
 * this doc comment is what the next author reads.
 *
 * **A fixed region is contained by a transformed ancestor.** `position: fixed`
 * is relative to the viewport until something above it carries a `transform`, a
 * `filter` or a `backdrop-filter`, at which point that element becomes the
 * containing block and the frame is trapped inside a band. `loom.reveal`'s
 * entrance and `.loom-lift`'s hover are both transforms. A lightbox goes in a
 * plain band; filed, with the three classes named.
 */

const props = z
  .object({
    /**
     * The tile's shape. Omitted, the preview region decides its own — which is
     * what a single screenshot in a column wants, and a grid of tiles does not.
     */
    aspect: z.enum(ASPECT_NAMES).optional(),
    /** One line naming what was opened, drawn in the frame's bar. */
    caption: z.string().min(1).max(120).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * The two names this primitive owns. `present` is the chip over the corner of
 * the tile; `dismiss` is never rendered as text at all — the runtime puts it on
 * the cross as `aria-label`, which is the one control in the vocabulary that
 * works that way and the reason a panel does not read "Close" beside its ×.
 */
const LIGHTBOX_TEXT = { present: "Expand", dismiss: "Close" } as const

type LightboxTextKey = keyof typeof LIGHTBOX_TEXT

export const loomLightbox = definePrimitive({
  type: "loom.lightbox",
  description:
    "A thumbnail a reader opens: a preview region on the page and a full region drawn over it, with a caption and a close control.",
  props,
  slots: ["preview", "full"],
  text: LIGHTBOX_TEXT,
  /** `dismiss` requires `present`, which the registry checks at registration (0176). */
  behaviours: ["present", "dismiss"],
  interactive: "always",
  component: ({
    loom,
    props: given,
  }: LoomPrimitiveProps<Props, LightboxTextKey, "present" | "dismiss">) => {
    const aspect = given.aspect

    return createElement(
      "div",
      {
        ...loom.editable,
        className: LIBRARY_CLASS.lightbox,
        /**
         * `position: relative` so the chip over the tile has something to be
         * absolute against — **and deliberately no `isolation: isolate`**,
         * which the first draft had and which cost a photograph to find.
         *
         * Isolation makes the root a stacking context, and a stacking context
         * confines every `z-index` inside it: the frame's 40 stops being a page
         * layer and becomes a layer within one tile, so the bands *after* the
         * tile in the document paint straight over the scrim. The picture was a
         * dimmed page with the third tile and a whole band sitting brightly on
         * top of it. A region drawn over the page has to be allowed to be over
         * the page.
         */
        style: { position: "relative" },
      },
      libraryStylesheet(),
      createElement(
        "div",
        {
          key: "preview",
          className: LIBRARY_CLASS.lightboxPreview,
          style: {
            overflow: "hidden",
            borderRadius: radius("md"),
            background: colour("bg-surface-muted"),
            ...(aspect === undefined ? {} : { aspectRatio: ASPECT_RATIOS[aspect] }),
          },
        },
        loom.slots["preview"]
      ),
      /**
       * A direct child of the root and not of the tile, which is the whole of
       * `presentation.ts`' first warning: the control publishes its state on the
       * element it finds itself in, and the rule that hides the frame is keyed
       * on the root. Its corner is set in the sheet, by the class the runtime
       * stamps on it — a control sets its own paint inline, so that class is the
       * only handle a primitive has on it.
       */
      loom.behaviours.present,
      createElement(
        "div",
        {
          key: "frame",
          className: LIBRARY_CLASS.lightboxFrame,
          style: {
            position: "fixed",
            inset: "0",
            zIndex: FRAME_LAYER,
            padding: space(4),
          },
        },
        /**
         * The scrim is its own element rather than a translucent background on
         * the frame, for `loom.overlay`'s reason: `opacity` on the frame would
         * take the picture down with it. `bg-overlay` used as what the palette
         * says it is — the surface a thing over the page is drawn on — so it
         * re-themes instead of being a hard-coded black wash (0049).
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
            className: LIBRARY_CLASS.lightboxPanel,
            style: {
              position: "relative",
              /**
               * `inline-size` and not `max-inline-size`. The frame centres its
               * plate with `place-items: center`, which makes the plate's width
               * shrink to fit — so a maximum is a ceiling nothing ever reaches
               * and the plate comes out as a column the width of its longest
               * word. Measured on the first sheet this primitive was
               * photographed on.
               */
              inlineSize: "min(64rem, 100%)",
              maxBlockSize: "100%",
              overflow: "auto",
              /**
               * A wheel that reaches the end of the plate stops there rather
               * than chaining out to the page behind it. It is half of what the
               * scroll lock does and it is kept beside the lock rather than
               * instead of it — this covers the plate, the lock covers the
               * scrim, and the scrim is most of the frame (0210).
               */
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
                   * `fg-default` rather than the muted ramp, and the gate is
                   * what decided it: the plate paints `bg-overlay`, so a muted
                   * caption on it would be a **painted** pairing where
                   * `contrast.ts` declares a composed one — a row the palette
                   * audit measures at a weaker bar than the thing actually
                   * drawn. It is a title in a bar beside a cross, which is what
                   * the default foreground is for.
                   */
                  color: colour("fg-default"),
                },
              },
              given.caption ?? ""
            ),
            loom.behaviours.dismiss
          ),
          loom.slots["full"]
        )
      )
    )
  },
})
