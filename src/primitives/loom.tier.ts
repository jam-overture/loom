import { createElement, type CSSProperties } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, radius, size, space, weight } from "./tokens.js"

/**
 * One plan: what it is called, what it costs, what it gets you, and the one
 * thing it asks you to do.
 *
 * Hermes' `PricingTier` shape had eight fields and this primitive has five,
 * because three of the eight were structure. The port is the clearest worked
 * example of 0052 in the library, so it is worth naming each one:
 *
 * - `features: string[]` → **child nodes.** A `loom.perk-list` of `loom.perk`
 *   rows. Adding a perk was a `configure` replacing a whole tier record and is
 *   now one `insert`, and a perk gained a `state` on the way, which a bare
 *   string could never have carried.
 * - `description` → **a child node.** One paragraph of a page's own prose is
 *   `loom.prose`, per 0052's third clause and for the reason
 *   [0001](../decisions/0001-tree-and-delta-as-the-unit-of-change.md) makes text
 *   a node at all — a sentence should be re-authorable without replacing the
 *   card it sits in.
 * - `ctaText` + `ctaUrl` → **a region.** They are a `loom.action`, which the
 *   library already has, and a tier that reimplemented a link as two props
 *   would be a second call-to-action with its own scheme allowlist to keep in
 *   step with [0053](../decisions/0053-a-url-in-the-tree-is-checked-against-a-scheme-allowlist.md).
 * - `highlighted: boolean` → **split in two.** The part that changes what is
 *   painted is `emphasis`, a prop, because no delta reorders a border. The part
 *   that was *content* — the "Most popular" ribbon every implementation of this
 *   flag secretly also draws — is a `loom.badge` in a region, because a boolean
 *   that decides whether a piece of copy exists is `insert` in disguise.
 *
 * What is left is five props, and every one of them is a fixed field of one
 * record: exactly one name, one price, one billing period.
 *
 * The two regions are regions rather than positions in `children` for 0051's
 * reason: the tier places them somewhere the flow of children does not go — the
 * badge beside the plan name, the action pinned to the foot of the card so that
 * four tiers with different numbers of perks still line their buttons up. "The
 * last child is the button" is a rule no schema states and every `move` breaks.
 */

const props = z
  .object({
    name: z.string().min(1).max(60),
    /**
     * Free text, and deliberately not a number. Hermes learned this over a
     * year of real pages: a third of the prices people write are "Free",
     * "Custom", or "from $5k", and a numeric field with a currency prop beside
     * it cannot say any of them. Formatting a price is the author's decision,
     * not a rendering the library should be making on their behalf.
     */
    price: z.string().min(1).max(32),
    /** What the price is per — "per month", "per seat". Set beside it, muted. */
    period: z.string().min(1).max(32).optional(),
    /** The small print under the price — "billed annually", "plus VAT". */
    note: z.string().min(1).max(120).optional(),
    /** `featured` is the one tier a page is steering towards. */
    emphasis: z.enum(["plain", "featured"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * A featured tier is lifted by a ring and a shadow rather than by scale. The
 * obvious way to draw attention here is `transform: scale(1.05)`, and it is
 * wrong in a grid: the scaled card overlaps its neighbours' hover targets, its
 * text renders off the pixel grid, and its `1px` border stops being `1px`. A
 * ring costs nothing and survives being the second of four.
 */
const SURFACES: Readonly<Record<"plain" | "featured", CSSProperties>> = {
  plain: {
    background: colour("bg-surface"),
    border: `1px solid ${colour("border-subtle")}`,
  },
  featured: {
    background: colour("bg-surface"),
    border: `1px solid ${colour("border-accent")}`,
    boxShadow: `0 0 0 1px ${colour("accent")}, 0 32px 64px -48px ${colour("accent-strong")}`,
  },
}

export const loomTier = definePrimitive({
  type: "loom.tier",
  description:
    "One pricing plan — name, price, and a region for its badge and its call to action. A cell of a loom.tier-table.",
  props,
  slots: ["badge", "action"],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const badge = loom.slots["badge"]
    const action = loom.slots["action"]

    const header = createElement(
      "header",
      { style: { display: "flex", flexDirection: "column", gap: space(2) } },
      createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: space(3),
            minHeight: space(6),
          },
        },
        createElement(
          "h3",
          {
            style: {
              margin: "0",
              fontFamily: family("heading"),
              fontWeight: weight("heading"),
              fontSize: size(3),
              lineHeight: 1.2,
              letterSpacing: "0.02em",
              color: colour("fg-muted"),
            },
          },
          given.name
        ),
        badge ?? null
      ),
      createElement(
        "p",
        {
          style: {
            display: "flex",
            alignItems: "baseline",
            flexWrap: "wrap",
            gap: space(2),
            margin: "0",
          },
        },
        createElement(
          "span",
          {
            style: {
              fontFamily: family("heading"),
              fontWeight: weight("heading"),
              fontSize: size(7),
              lineHeight: 1,
              /** A price wraps mid-string otherwise — "$1,200 / mo" over two lines. */
              textWrap: "nowrap",
              color: colour("fg-default"),
            },
          },
          given.price
        ),
        given.period === undefined
          ? null
          : createElement(
              "span",
              { style: { fontFamily: family("body"), fontSize: size(3), color: colour("fg-muted") } },
              given.period
            )
      ),
      given.note === undefined
        ? null
        : createElement(
            "p",
            {
              style: {
                margin: "0",
                fontFamily: family("body"),
                fontSize: size(2),
                color: colour("fg-subtle"),
              },
            },
            given.note
          )
    )

    return createElement(
      "article",
      {
        ...loom.editable,
        className: LIBRARY_CLASS.lift,
        style: {
          ...SURFACES[given.emphasis ?? "plain"],
          display: "flex",
          flexDirection: "column",
          gap: space(5),
          height: "100%",
          padding: space(5),
          borderRadius: radius("lg"),
          color: colour("fg-default"),
        },
      },
      libraryStylesheet(),
      header,
      children === null
        ? null
        : createElement(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: space(4),
                /**
                 * The body takes the slack, which is what lines four tiers'
                 * buttons up when one of them has three more perks than the
                 * others. The action carries an `auto` start margin as well,
                 * because a tier with a price and a button and nothing between
                 * them has no body to do the growing.
                 */
                flex: "1 1 auto",
              },
            },
            children
          ),
      action === undefined
        ? null
        : createElement(
            "div",
            {
              style: {
                /**
                 * A grid, so a single action fills the card's width the way a
                 * plan's button is expected to, without the action itself
                 * having to know it is in a tier. `loom.action` sets
                 * `align-self: flex-start`, which keeps it its own height here
                 * while `justify-self` stretches it; two actions become two
                 * stacked full-width rows rather than a squeeze.
                 */
                display: "grid",
                gap: space(2),
                marginBlockStart: "auto",
              },
            },
            action
          )
    )
  },
})
