import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { colour, family, size, space, weight } from "./tokens.js"

/**
 * A score out of five, drawn as stars.
 *
 * The one piece of proof this library could not show. `loom.quote` says a named
 * person liked it, `loom.logo-cloud` says companies use it, `loom.stat` says a
 * number is large — and none of those is the thing a reader looks for first on
 * a page about a tool, which is a rating and how many people gave it. Hermes
 * had no such field on any of its seventy blocks, because a creator's profile
 * is not reviewed; a product is.
 *
 * ## Why the stars are not nodes
 *
 * A run of five identical marks looks like the repeated content
 * [0052](../../decisions/0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)
 * turns into children, and it is not. Nobody inserts a sixth star, removes the
 * third, or moves the fourth in front of the second: there is exactly one value
 * here and the stars are how it is *drawn*, the way a bar is how a percentage
 * is drawn. Making them nodes would put four operations in the grammar that
 * cannot be applied to a rating that is still a rating afterwards.
 *
 * ## Why the scale is fixed at five
 *
 * An `outOf` prop is one line and it is a line this deliberately does not have.
 * A rating is out of five wherever a reader has met one; a nine-point-two out
 * of ten is a **number**, and `loom.stat` draws numbers well already. Ten stars
 * in a row is also simply a worse rendering than the one thing it would buy.
 * What would change this: a real page that has to show two differently scaled
 * scores beside each other, where the stat's typography would break the row.
 *
 * ## Two halves of one value
 *
 * The fill is a second run of the same glyphs clipped to a percentage, rather
 * than a per-star decision about full, half or empty. That is what makes 4.3
 * render as 4.3 instead of rounding to the nearest half in the renderer and
 * lying by a tenth — and the two runs are the same string in the same face at
 * the same size, so they cannot drift out of register.
 *
 * The stars are `aria-hidden` and the numeral is not. A reader on a screen
 * reader gets "4.9 / 5" and a caption, which is the whole content; the
 * alternative — a `role="img"` whose label restates it — reads the score twice.
 */

const props = z
  .object({
    /** Out of five, to one decimal place if you like: 4.3 draws as 4.3. */
    score: z.number().min(0).max(5),
    /** What the score is *of*: “1,284 reviews”, “on G2”. One line, beside the numeral. */
    caption: z.string().min(1).max(80).optional(),
    size: z.enum(["small", "medium", "large"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const OUT_OF = 5

/**
 * How far the unlit run recedes, as opacity on a text slot rather than as a
 * lighter slot of its own.
 *
 * `border-default` is the tone an unlit star actually wants and it is not
 * available: the pairings the palettes are audited against are *derived from
 * what the components paint* (0089), so a primitive that inks a glyph in a
 * border slot adds four rows nothing holds to a contrast bar — and the four
 * grounds a ramp is owed are owed the **ink** ramp. So the run takes a text
 * slot and recedes with opacity, which is the same call `loom.frame` makes for
 * its traffic lights and is honest about what it is: five unlit stars are the
 * shape a score is measured against, not something anybody reads.
 */
const UNLIT = 0.3

/** U+2605, five times. The same string is drawn twice, and the top run is clipped. */
const STARS = "★".repeat(OUT_OF)

const SIZES = {
  small: { star: size(2), numeral: size(2), caption: size(1) },
  medium: { star: size(4), numeral: size(4), caption: size(2) },
  large: { star: size(5), numeral: size(5), caption: size(3) },
} as const

/**
 * One decimal, and a whole score keeps its point-nothing. `4` beside `4.9` in a
 * row of ratings is a column that does not line up, and the decimal place is
 * the only thing here that is a rendering decision rather than a value the tree
 * gave.
 *
 * The guard is not defensive clutter and the conformance probe is why. A probe
 * renders every primitive under `{}` before it renders it under anything else
 * (0075), so `score` arrives `undefined` at least once in the life of every
 * registry that audits itself — and `undefined.toFixed` is a component that
 * throws rather than one the audit can report on. Rendering is total (0008);
 * calling a method on a prop is the one way a primitive stops being.
 */
const scoreOf = (given: number): number =>
  Number.isFinite(given) ? Math.min(Math.max(given, 0), OUT_OF) : 0

export const loomRating = definePrimitive({
  type: "loom.rating",
  description: "A score out of five drawn as stars, with the numeral and an optional caption beside it.",
  props,
  slots: [],
  /**
   * `score` is a number the component prints — `score.toFixed(1)` beside *out of
   * five* — so it is declared and comes back in `unspoken` rather than silently
   * leaving the reading. Same call as `loom.meter`'s `value`.
   */
  copy: ["score", "caption"],
  component: ({ loom, props: given }: LoomPrimitiveProps<Props>) => {
    const scale = SIZES[given.size ?? "medium"]
    const score = scoreOf(given.score)
    const filled = `${(score / OUT_OF) * 100}%`

    /**
     * The lit run is laid over the unlit one and clipped to the score, so the
     * two are the same glyphs in the same face at the same size and cannot fall
     * out of register.
     */
    const run = (lit: boolean) =>
      createElement(
        "span",
        {
          key: lit ? "lit" : "unlit",
          style: {
            ...(lit
              ? {
                  position: "absolute",
                  insetBlockStart: "0",
                  insetInlineStart: "0",
                  width: filled,
                  color: colour("accent-strong"),
                }
              : { color: colour("fg-subtle"), opacity: UNLIT }),
            display: "block",
            overflow: "hidden",
            whiteSpace: "nowrap",
            /** Zero tracking, so the lit run cannot land a pixel off the run under it. */
            letterSpacing: "0",
          },
        },
        STARS
      )

    return createElement(
      "span",
      {
        ...loom.editable,
        style: {
          display: "inline-flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          gap: space(2),
          fontFamily: family("body"),
        },
      },
      createElement(
        "span",
        {
          key: "stars",
          "aria-hidden": true,
          style: { position: "relative", display: "inline-block", fontSize: scale.star, lineHeight: 1.1 },
        },
        run(false),
        run(true)
      ),
      createElement(
        "span",
        {
          key: "numeral",
          style: { fontSize: scale.numeral, fontWeight: weight("heading"), color: colour("fg-default") },
        },
        score.toFixed(1),
        createElement(
          "span",
          { key: "outof", style: { fontSize: scale.caption, fontWeight: weight("body"), color: colour("fg-muted") } },
          ` / ${OUT_OF}`
        )
      ),
      given.caption === undefined
        ? null
        : createElement(
            "span",
            { key: "caption", style: { fontSize: scale.caption, color: colour("fg-muted") } },
            given.caption
          )
    )
  },
})
