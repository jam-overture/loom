import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { linkUrlSchema } from "./url.js"

/**
 * A phrase inside a sentence that goes somewhere — the one link in a paragraph
 * that is the point of the paragraph.
 *
 * This closes the 4 October finding from `Loom marketing`, and the finding is
 * the thing to read before this primitive is judged, because it was not filed
 * as a missing convenience. `/what-you-run` has the only sentence on the
 * marketing site that names another page of it; the inline link was built,
 * photographed on all three palettes, and **taken out again**. Three things
 * stopped it, every one of them correct for the job `loom.link` was written
 * for, which is a menu item and a footer column:
 *
 * - **No underline at rest.** `loom.link`'s underline is a wipe-in on hover,
 *   pinned open only for `aria-current="page"`. In a nav bar, position says the
 *   word is a link. Inside a sentence nothing does, so the phrase reads as
 *   emphasis and a reader never learns it can be pressed.
 * - **`color: accent`, and on `minimal` the accent is `#0a0a0a`** — the same
 *   hex as `fg-default`, deliberately, under the palette every visitor and
 *   every screenshot gets. Photographed: in a `tone: "muted"` paragraph the
 *   phrase came out *darker* than its sentence and read as bold; in a default
 *   paragraph it would have been the colour of the words either side of it.
 * - **`display: "inline-block"`, with its own `fontSize` and `lineHeight`.**
 *   The inline-block is load-bearing for that underline animation and
 *   `loom.link`'s own comment says so — a wrapped inline box paints two
 *   underlines at two widths. The cost is a phrase that cannot break
 *   mid-phrase, set on a line 0.2 taller than the lines above it.
 *
 * ## Why this is a primitive and not a `tone` on `loom.link`
 *
 * [0052](../../decisions/0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)
 * keeps a closed set of renderings on one enum, so the first answer to reach
 * for is a fourth `tone` — and the reason it is the wrong one is already
 * written down one file over. `loom.code-span` makes the argument: 0052's
 * closed-set clause is a rule about renderings of **one content model**, and an
 * `inline` flag that switched four other props off would be a schema saying two
 * things and hoping the author reads the right half.
 *
 * Count them here, because the count is the argument and not a feeling.
 * `loom.link` carries five props and an inline rendering contradicts three:
 *
 * | | inside a sentence |
 * | --- | --- |
 * | `scale: "small" \| "medium"` | **off** — the phrase is the size of the sentence, whatever that is |
 * | `tone: "default" \| "muted" \| "accent"` | **off** — see below; the colour is the paragraph's |
 * | `current` | **off** — it pins the underline open, and this underline is already open |
 * | `href` | shared |
 * | `external` | shared |
 *
 * [0061](../../decisions/0061-a-suffix-that-names-the-markup-earns-its-place.md)
 * is the precedent and it is this shape exactly: `loom.perk` and
 * `loom.perk-list-item` are the same content in different markup and are two
 * primitives, because the element a primitive *is* can be the thing that
 * separates it from its twin. `loom.link` is the `inline-block`; this is the
 * `inline`.
 *
 * ## Why `loom.inline-link` and not `loom.link-span`
 *
 * `loom.code-span` set a suffix for an inline counterpart and this breaks it,
 * on purpose. `loom.link-list`, `loom.link-trail` and `loom.link-pager` are a
 * three-member family in which `loom.link-*` means **a container of links**,
 * and a fourth member that was a single span would be the only one that is not
 * — read by a model choosing from a hundred and three descriptions with nothing
 * but the name and one sentence. A mild inconsistency with one primitive beats
 * a collision with three.
 *
 * ## The colour is the paragraph's, and that is the whole design
 *
 * There is no `tone`. `color: inherit`, always, and **the underline is the
 * affordance**. That is not a simplification of `loom.link`'s three tones — it
 * is the only spelling that is correct everywhere this is allowed to go:
 *
 * - On `minimal`, where `accent` is `fg-default`, an accent phrase is
 *   invisible as a link. An inherited one is the sentence's own ink with a rule
 *   under it, which is legible on every palette in the registry and on one
 *   nobody has registered yet.
 * - Inside a `tone: "muted"` paragraph it is muted; inside a hero painted on an
 *   accent ground it is whatever that ground's ink is. A token could not have
 *   done this, because the right colour is not a slot — it is *the colour of
 *   the words either side of it*, and `inherit` is the only thing that knows.
 * - In greyscale and under forced colours it still reads, because a 1px rule
 *   is not a hue.
 *
 * This is the lesson `loom.emphasis` records against `weight("heading")` and
 * `loom.kbd` against a ramp step, met on the colour axis: a token promises the
 * value comes from the theme and promises nothing about it *differing from the
 * one beside it*.
 *
 * **The motion is two lengths and it is in the stylesheet** (0055): the
 * underline thickens from 1px to 2px and drops a hair further from the
 * baseline on hover and on `:focus-visible`. Thickness rather than colour for
 * the same reason the rest state is inherited — an accent hover is no hover at
 * all on `minimal` — and `text-decoration`, rather than the background-gradient
 * `.loom-underline` paints, because a gradient needs a block box and this is
 * the primitive whose entire point is that it has none. The decoration wraps
 * across lines, skips descenders, and costs nothing to the line box it sits in.
 *
 * ## `external`, and the arrow that is not a word
 *
 * An outbound phrase in prose has nothing a reader can see to tell them the
 * page is about to change, where a nav item at least sits in a bar. So
 * `external` draws `↗` after the words, `aria-hidden` beside the `rel` that
 * announces the same fact to a screen reader —
 * [0223](../../decisions/0223-a-prop-is-copy-when-a-reader-could-quote-it.md)'s
 * glyph rule, which is why nothing here declares `copy`.
 *
 * It is an `inline-block`, and that one declaration is load-bearing rather than
 * a layout habit: `text-decoration` propagates from an ancestor and **cannot be
 * cancelled on a descendant inline box**, so an inline arrow is an arrow with a
 * line under it. A block box starts a new decoration context, which is the only
 * way to keep the underline on the words and off the mark.
 */

const props = z
  .object({
    href: linkUrlSchema,
    /** Opens in a new tab, with the `rel` that has to accompany it and a mark a reader can see. */
    external: z.boolean().optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomInlineLink = definePrimitive({
  type: "loom.inline-link",
  description:
    "A link inside a sentence — underlined at rest, in the colour of the paragraph around it. Its words are child text. loom.link is the nav item and loom.action is the button.",
  props,
  /** `href` is required, so it is a target however it is configured (0064). */
  interactive: "always",
  slots: [],
  copy: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "a",
      {
        ...loom.editable,
        href: given.href,
        ...(given.external === true ? { target: "_blank", rel: "noreferrer noopener" } : {}),
        /**
         * **Everything visual is in the rule and nothing is here**, which is
         * the stylesheet's first mechanic doing real work rather than being
         * obeyed. An inline style beats a rule, so a `color` set on the element
         * would be a colour no paragraph could ever lend it — and *being lent
         * the paragraph's colour* is the whole primitive. `loom.emphasis`'
         * `washed` tone makes the same call about the same mechanic.
         */
        className: LIBRARY_CLASS.inlineLink,
      },
      libraryStylesheet(),
      children,
      given.external === true
        ? createElement(
            "span",
            {
              key: "outward",
              "aria-hidden": "true",
              className: LIBRARY_CLASS.inlineLinkOutward,
            },
            "↗"
          )
        : null
    ),
})
