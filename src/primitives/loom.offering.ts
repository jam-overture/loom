import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { color, family, radius, size, space, weight } from "./tokens.js"
import { linkUrlSchema } from "./url.js"

/**
 * One thing a reader can book, join, order or give to: what it is called, what
 * it costs, the qualifiers that narrow it, what it includes, and the control
 * that does the deed.
 *
 * **Seven Hermes blocks collapse here**, and they are the largest single
 * collapse left in `docs/hermes-port-map.md` — `services`,
 * `coaching-packages`, `mentorship-tracks`, `donation-tiers`,
 * `class-schedule`, `volunteer-opportunities` and `restaurant-menu`. Seven
 * shapes, and stacked on top of each other they are one record: **a name, a
 * price-shaped amount, one or more short qualifiers, a line or two of prose,
 * and somewhere to go.** The words differ and nothing else does — `price` /
 * `amount`, `description` / `impact` / `desc`, `includes` / `outcomes`, `link`
 * to book / apply / donate / order.
 *
 * **Why it is not `loom.tier` with different words.** The port map's own limit
 * on collapsing applies here and it is real: a pricing table *compares plans in
 * one row*, so a tier is a column whose price is the headline and whose name is
 * a small label above it. An offering *stands alone*. A class at 6:30 on a
 * Tuesday, a volunteer shift, a dish on a menu — none of those is a plan being
 * weighed against three others, the **name** is the loud thing, and the price
 * is a detail set beside it. Two primitives, because the markup differs where
 * it matters rather than because the fields do.
 *
 * ## What became nodes
 *
 * - **`includes` and `outcomes`** — newline-separated strings in Hermes, which
 *   is a list that never got to be one. 0052's opening clause and the same call
 *   `loom.tier` made about `features`: a `loom.perk-list` of `loom.perk-list-item`
 *   rows in `children`, so adding one line is an `insert` rather than a
 *   `configure` that carries the whole record along with it.
 * - **`dietary`, `skills`, `duration`, `format`, `day`, `time`, `level`,
 *   `location`, `instructor`** — nine fields across the seven blocks, all of
 *   them a short qualifier beside the name, and **there is never exactly one**:
 *   a class has a day *and* a time *and* a level *and* a room. That is repeated
 *   content, so it is `loom.badge` nodes in the `meta` region — the call
 *   `loom.product` made about `format` and `itemCount`, and the one 0052 makes
 *   about `hours-of-operation`'s seven fixed weekday fields. A `class-schedule`
 *   row that kept them as props would need five props to say what four badges
 *   say, and could never carry a sixth.
 * - **`description` / `impact` / `desc`** — `loom.prose` in `children`, which is
 *   0052's third clause and **not** the call `loom.article` makes about
 *   `excerpt`. The two are reconciled by
 *   [0094](../../decisions/0094-a-cards-prose-is-a-child-when-the-card-has-a-flow.md):
 *   this card already has a children flow, because its includes list must live
 *   there, and prose held as a prop beside a flow can never be moved below it.
 * - **`btnText` + `link`** — a `loom.action` in the `action` region, which the
 *   library has had since the first ten. A primitive that reimplemented a link
 *   as two props would be a second call to action with its own copy of 0053's
 *   scheme allowlist to keep in step.
 *
 * ## What stayed props
 *
 * `name`, `price` and `emphasis`: exactly one of each, per record. `price` is
 * free text for the reason `loom.tier` and `loom.product` both give and Hermes
 * learned over a year of real pages — "Free", "Pay what you can", "From £40",
 * "$25/mo" and "Market price" are all things people write, and no numeric field
 * with a currency prop beside it can say any of them. It is more obviously right
 * here than anywhere else in the library, because a donation tier's amount is
 * *the ask* and a menu price is often not a number at all.
 *
 * ## The reader aims at the button
 *
 * 0066 settles it in advance: an offering is **acted on**, so no overlay is
 * emitted, the name is an ordinary link when there is something to read, and the
 * thing that books it is a real control in a region pinned to the card's floor.
 *
 * ## One card that reads as a menu row when it is given the width
 *
 * The seven blocks want two different bands. Services, packages and tracks are a
 * grid of cards; a class schedule, a volunteer roster and a menu are full-width
 * rows with the price at one end and the control at the other. That is not two
 * primitives and it is not a prop — **it is a question about how much room the
 * card was given**, which the card can ask and no author should have to answer
 * twice.
 *
 * So the article is a container (`container-type: inline-size`) and one
 * `@container` rule turns the frame inside it from a column into a row past
 * 40rem. The same node in a three-column grid is a card with its button on the
 * floor, and in a single column is a row with its button at the end. Nothing in
 * the tree changes and nothing in the tree says which.
 *
 * The mechanic is worth stating because it caught this primitive once: a
 * container queries its **ancestor**, never itself, so the flipping element has
 * to be a child of the element that declares the containment. That is what the
 * frame `<div>` is for, and it is markup rather than a node.
 */

const props = z
  .object({
    name: z.string().min(1).max(120),
    /**
     * Free text, never parsed, never formatted. See the note above: a donation
     * tier's "£25" and a menu's "Market price" are the same field.
     */
    price: z.string().min(1).max(32).optional(),
    /** Links the name. The control that books it belongs in the `action` region. */
    href: linkUrlSchema.optional(),
    /** `featured` is the one offering a page is steering towards. */
    emphasis: z.enum(["plain", "featured"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * A featured offering is lifted by a ring rather than by scale, for the reason
 * `loom.tier` gives: a scaled card in a grid overlaps its neighbours' hover
 * targets and stops rendering its own border at one pixel.
 */
const SURFACES = {
  plain: {
    background: color("bg-surface"),
    border: `1px solid ${color("border-subtle")}`,
  },
  featured: {
    background: color("bg-surface"),
    border: `1px solid ${color("border-accent")}`,
    boxShadow: `0 0 0 1px ${color("accent")}, 0 32px 64px -48px ${color("accent-strong")}`,
  },
} as const

export const loomOffering = definePrimitive({
  type: "loom.offering",
  description:
    "One thing that can be booked, joined, ordered or given to — name, price, qualifiers, what it includes, and the control that does it. A cell of a loom.offering-grid.",
  props,
  /**
   * **Deliberately no `interactive` declaration**, and for `loom.product`'s
   * reason rather than by omission. `href` links the *name*; 0066 puts a real
   * `loom.action` in the `action` region on purpose, and declaring this a target
   * would make the Gate refuse the library's own intended composition — which is
   * how a check ends up switched off. 0068 states the test the two answers
   * differ on: no overlay is emitted here, so the reader's aim is the control's.
   */
  slots: ["meta", "action"],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const meta = loom.slots["meta"]
    const action = loom.slots["action"]

    const name = createElement(
      "h3",
      {
        key: "name",
        style: {
          margin: "0",
          fontFamily: family("heading"),
          fontWeight: weight("heading"),
          fontSize: size(4),
          lineHeight: 1.25,
          color: color("fg-default"),
        },
      },
      given.href === undefined
        ? given.name
        : createElement(
            "a",
            {
              href: given.href,
              className: LIBRARY_CLASS.underline,
              style: { color: "inherit", textDecoration: "none" },
            },
            given.name
          )
    )

    /**
     * Baseline rather than centre, for `loom.product`'s reason: a price is set
     * larger than the name beside it, and two lines of different sizes centred
     * on their own boxes read as a misalignment to someone who could not say
     * why. `space-between` is what makes a menu row's leader work — the name at
     * one end, the price at the other, whatever the name's length.
     */
    const header = createElement(
      "div",
      {
        key: "header",
        style: {
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: space(3),
        },
      },
      name,
      given.price === undefined
        ? null
        : createElement(
            "p",
            {
              key: "price",
              style: {
                margin: "0",
                textWrap: "nowrap",
                fontFamily: family("heading"),
                fontWeight: weight("heading"),
                fontSize: size(4),
                lineHeight: 1.2,
                color: color("accent-strong"),
              },
            },
            given.price
          )
    )

    return createElement(
      "article",
      {
        ...loom.editable,
        className: `${LIBRARY_CLASS.offering} ${LIBRARY_CLASS.lift}`,
        style: {
          ...SURFACES[given.emphasis ?? "plain"],
          padding: space(5),
          borderRadius: radius("lg"),
          color: color("fg-default"),
        },
      },
      libraryStylesheet(),
      createElement(
        "div",
        /**
         * The element the `@container` rule flips, and it has to be inside the
         * element that declares the containment rather than being it. Nothing
         * about its direction or its gap is set inline, because the rule has to
         * be able to reach both.
         */
        { key: "frame", className: LIBRARY_CLASS.offeringFrame },
        createElement(
          "div",
          { key: "body", className: LIBRARY_CLASS.offeringBody },
          header,
          meta === undefined
            ? null
            : createElement(
                "div",
                {
                  key: "meta",
                  style: {
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: space(2),
                    marginBlockStart: space(3),
                  },
                },
                meta
              ),
          children === null
            ? null
            : createElement(
                "div",
                {
                  key: "children",
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    gap: space(3),
                    marginBlockStart: space(3),
                  },
                },
                children
              )
        ),
        action === undefined
          ? null
          : createElement(
              "div",
              /**
               * A grid, so a lone action fills the width it is given the way a
               * booking button is expected to, without the action itself having
               * to know it is in an offering. The `auto` start margin that pins
               * it to the card's floor is in the stylesheet, because the row
               * layout has to cancel it.
               */
              { key: "action", className: LIBRARY_CLASS.offeringAction, style: { gap: space(2) } },
              action
            )
      )
    )
  },
})
