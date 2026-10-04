import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { colour, family, size, space, weight } from "./tokens.js"
import { linkUrlSchema } from "./url.js"

/**
 * The deployment naming itself: its mark and its word, as one node.
 *
 * ## Why this is not `loom.logo`
 *
 * `loom.logo` is **one mark in a wall of them** — its own comment is about
 * twelve brand palettes fighting each other, its image is greyed to 72% until
 * hover, and it renders the image *instead of* the name because on a wall one
 * company is one mark. All three of those are right there and wrong here.
 * A site's own name in its own bar appears once, is never dimmed, and is a mark
 * **beside** a word rather than instead of one.
 *
 * That was filed from `apps/loom/app/(marketing)/` on 28 September after the
 * bar was built as a spike and thrown away, with the three limits measured.
 * This is the answer to the first and third of them.
 *
 * ## Why the mark is a path and not a URL, which is the whole point
 *
 * The obvious shape is `image: <url>`, and it is what `loom.logo` has. It
 * cannot work for a site's own mark, for a reason that is not obvious until you
 * photograph it: **an image is opaque to the cascade.** No custom property
 * reaches inside one, so a mark delivered as a file cannot take the palette's
 * ink. A file can carry `prefers-color-scheme`, which is the *operating
 * system's* axis — and a Loom palette is a different axis entirely. `bold` is a
 * dark palette on a machine in light mode, and the spike rendered a `#0a0a0a`
 * mark on a `#1a1a1a` bar.
 *
 * A path is drawn inline, so it takes `currentColor` and themes like every
 * other primitive in this library.
 *
 * **And it is inert, which is the security half.** Every other address in this
 * library reaches something: a `src` fetches
 * ([0053](../../decisions/0053-a-url-in-the-tree-is-checked-against-a-scheme-allowlist.md)),
 * an `iframe src` is a whole document with a script host in it
 * ([0095](../../decisions/0095-a-frame-carries-its-url-and-the-deployment-carries-the-origins.md)).
 * **Geometry reaches nothing.** There is no origin to allowlist, no request to
 * make, no document to sandbox — so a mark authored by a model is a shape that
 * may be ugly and can never be a fetch. `markPath` narrows it to the characters
 * SVG path data is made of, so that is provable rather than argued.
 *
 * ## Why the library ships no mark of its own
 *
 * This is the starter library, and a `loom.brand` that drew a pinwheel would
 * put **Loom's** logo in every site built with it. The geometry is the host's,
 * passed in like any other content, which is the same bargain `loom.logo` makes
 * with `name`.
 */

/**
 * SVG path data and nothing else: the commands, the numbers, and the separators
 * between them.
 *
 * A `d` attribute is `M`, `L`, `H`, `V`, `C`, `S`, `Q`, `T`, `A`, `Z` in either
 * case, digits, sign, decimal point, exponent, comma and whitespace. Anything
 * outside that set is refused rather than escaped — there is nothing in a path
 * that needs a letter this set does not have, so a refusal costs an author
 * nothing and a permissive schema would be the one place in this file where the
 * inertness argument above is taken on trust.
 */
const markPath = z
  .string()
  .min(1)
  .max(4000)
  .regex(/^[MmLlHhVvCcSsQqTtAaZz0-9,.\-+eE\s]+$/, {
    message: "a mark is SVG path data: commands, numbers and separators only",
  })

/**
 * `viewBox`, as four numbers rather than a free string, for the same reason.
 * The default is the square a mark drawn for a browser tab is already drawn in.
 */
const viewBox = z
  .string()
  .regex(/^-?\d+(\.\d+)? -?\d+(\.\d+)? \d+(\.\d+)? \d+(\.\d+)?$/, {
    message: "a viewBox is four numbers: min-x min-y width height",
  })

const props = z
  .object({
    /** The word, and the accessible name of the whole thing. */
    name: z.string().min(1).max(80),
    mark: markPath.optional(),
    viewBox: viewBox.optional(),
    /** Checked against the scheme allowlist like every other link in the library (0053). */
    href: linkUrlSchema.optional(),
    /**
     * Whether the word is drawn beside the mark, or only announced.
     *
     * `true` by default and that is deliberate: a mark alone is recognisable
     * only to somebody who already knows the product, which on a marketing
     * site's front door is nobody. A site confident enough to drop the word is
     * making a choice, and a prop is where a choice like that belongs.
     */
    showName: z.boolean().optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/** Matches the wordmark's own cap height closely enough to sit on its baseline. */
const MARK_SIZE = "1.5rem"

const DEFAULT_VIEW_BOX = "0 0 32 32"

export const loomBrand = definePrimitive({
  type: "loom.brand",
  description:
    "This site's own mark and name, as one node. The mark is SVG path data drawn inline, so it takes the page's ink on every palette; it is not an image and there is no URL to fetch.",
  props,
  slots: [],
  /**
   * `mark` and `viewBox` are an SVG path and a coordinate system. The name is the
   * only thing here anybody reads.
   */
  copy: ["name"],
  component: ({ loom, props: given }: LoomPrimitiveProps<Props>) => {
    /**
     * `aria-hidden`, and the word beside it carries the name. A mark and a word
     * saying the same thing is one label to a reader and two to a screen
     * reader, and the second is the version nobody wants.
     */
    const mark =
      given.mark === undefined
        ? null
        : createElement(
            "svg",
            {
              viewBox: given.viewBox ?? DEFAULT_VIEW_BOX,
              width: MARK_SIZE,
              height: MARK_SIZE,
              "aria-hidden": true,
              focusable: false,
              style: { display: "block", flex: "0 0 auto" },
            },
            createElement("path", { d: given.mark, fill: "currentColor" })
          )

    const word =
      given.showName === false
        ? null
        : createElement(
            "span",
            {
              style: {
                fontFamily: family("heading"),
                fontWeight: weight("heading"),
                fontSize: size(4),
                letterSpacing: "-0.01em",
              },
            },
            given.name
          )

    /**
     * `colour("fg-default")` rather than the muted ink `loom.logo` uses for a
     * wall mark. A wall is other people's names and wants to recede; this is
     * the reader's answer to *whose site is this*, and it is the one piece of
     * text in the bar that should not be quiet.
     *
     * The colour is on the container so the word and the mark cannot disagree:
     * the path takes `currentColor` and inherits exactly what the word is set
     * in, on every palette, with no second value to keep in step.
     */
    const inner = [mark, word]

    const style = {
      display: "inline-flex",
      alignItems: "center",
      gap: space(2),
      color: colour("fg-default"),
      textDecoration: "none",
    } as const

    return given.href === undefined
      ? createElement("div", { ...loom.editable, style }, ...inner)
      : createElement(
          "a",
          {
            ...loom.editable,
            href: given.href,
            style,
            /** The whole thing is one target, and the word inside it is the name. */
            "aria-label": given.showName === false ? given.name : undefined,
          },
          ...inner
        )
  },
})
