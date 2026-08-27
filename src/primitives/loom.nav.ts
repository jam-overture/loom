import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, radius, space } from "./tokens.js"

/**
 * The bar across the top of a page: a mark, the menu, and the one thing the
 * page wants you to do.
 *
 * It is the oldest gap in the library. Every band below it has existed for
 * days, and the marketing site opened by composing its header out of a
 * `loom.stack` holding a `loom.logo` and five quiet buttons — which works, and
 * loses the two facts a header is *for*. A `loom.stack` cannot say that the row
 * is the site's navigation, so nothing announces a navigation landmark; and it
 * cannot say which item is the current page, so the site left the current route
 * out of its own menu rather than mark it. Both are recorded in that file as
 * findings against this lane.
 *
 * **Three regions, and only two of them are slots.** The links are ordinary
 * children, because they are the repeated thing and 0052 sends repeated content
 * to child nodes — a menu grows and shrinks by `insert` and `remove`, which is
 * the whole reason it is not a `links: NavItem[]` prop. `brand` and `actions`
 * are slots on 0051's test: the bar places them at its two ends regardless of
 * how many links there are, and "the first child is the logo and the last is
 * the button" is a rule no schema states and every `move` breaks.
 *
 * **It collapses behind a menu button on a phone, and this is the paragraph
 * that used to say it could not.** The old one was right about its premises and
 * wrong about the conclusion, which is worth keeping rather than deleting: it
 * reasoned that a disclosure needs the links inside a `<details>` on a phone and
 * outside it on a laptop — one subtree in two places — and that the ways out
 * were rendering the menu twice or holding client state the runtime does not
 * have. The subtree never had to move.
 * [0092](../../decisions/0092-a-disclosure-control-owns-its-button-and-the-primitive-owns-the-region.md)
 * gives the runtime a `<button>` that stamps `data-loom-disclosed` on *itself*
 * and nothing else, so the links stay exactly where they are and a sibling
 * selector in this library's own stylesheet decides what the state means. One
 * subtree, one copy for a screen reader, no state in the tree, and the only
 * thing this primitive does is declare the control and say where it goes.
 *
 * Three properties of the arrangement are load-bearing:
 *
 * 1. **The menu defaults to visible and the rule takes it away.** The control
 *    renders nothing until an effect proves scripting runs, so a page served
 *    with scripting off has no button, no attribute, nothing matching the rule,
 *    and a menu that is simply open — which is what this bar did yesterday.
 *    Written the other way round, that visitor gets every link hidden behind a
 *    button that is not there.
 * 2. **`display: none`, not `visibility` or a transform**, so a closed menu
 *    leaves the accessibility tree and `aria-expanded` describes something a
 *    screen reader can independently observe.
 * 3. **The control is wrapped**, which is the one place this departs from the
 *    handover note's suggested selector. The runtime's button sets its own
 *    `display` inline, and an inline style beats a rule — so a bare button
 *    could never be hidden on a wide screen where there is nothing to disclose.
 *    Wrapping it moves the attribute one level down, which is why the rule is
 *    `.loom-nav-toggle:has([data-loom-disclosed="false"]) ~ .loom-nav-menu`
 *    rather than a plain sibling combinator. `behaviour.ts` names that variant.
 *    A browser without `:has()` gets a visible menu and a visible button, which
 *    is the harmless half of the two failures.
 *
 * The one visible cost, stated so it is not a surprise: on a phone the menu is
 * open for a paint and then collapses when hydration lands. That is the price of
 * not hiding something before knowing it can be got back.
 */

const props = z
  .object({
    /**
     * `sticky` keeps the bar at the top as the page moves under it. It is a
     * rendering of the same content rather than a different set of nodes, which
     * is what keeps it a prop.
     */
    position: z.enum(["static", "sticky"]).optional(),
    /**
     * What the bar is drawn as: nothing at all, a surface with a hairline under
     * it, or a floating pill inset from the page's edges. Three genuinely
     * different renderings, in `loom.hero`'s `backdrop` sense.
     */
    tone: z.enum(["plain", "surface", "floating"]).optional(),
    /** Where the menu sits in the space between the mark and the actions. */
    align: z.enum(["start", "center", "end"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

type NavTextKey = "disclose"

/**
 * Above the page's own content and below a modal, as a single named step. A
 * sticky bar that a hero's backdrop paints over is the failure this exists to
 * avoid, and the number is small on purpose — this library never wants to be
 * the reason a host's own chrome loses a stacking argument.
 */
const STICKY_LAYER = 20

const TONES: Readonly<Record<"plain" | "surface" | "floating", CSSProperties>> = {
  plain: { background: "transparent" },
  surface: {
    background: colour("bg-surface"),
    borderBlockEnd: `1px solid ${colour("border-subtle")}`,
  },
  floating: {
    background: colour("bg-surface"),
    border: `1px solid ${colour("border-subtle")}`,
    borderRadius: radius("full"),
    boxShadow: `0 20px 44px -34px ${colour("fg-default")}`,
  },
}

/**
 * The menu's placement is one `margin: auto` on whichever side has to absorb
 * the slack. `space-between` on the bar itself cannot express it, because the
 * three regions are not always all present and the two-region case then puts
 * the menu where the actions would have been.
 */
const MENU_MARGIN: Readonly<Record<"start" | "center" | "end", CSSProperties>> = {
  start: { marginInlineEnd: "auto" },
  center: { marginInline: "auto" },
  end: { marginInlineStart: "auto" },
}

export const loomNav = definePrimitive({
  type: "loom.nav",
  description:
    "The bar across the top of a page: a brand region, loom.link children as the menu, and an actions region.",
  props,
  slots: ["brand", "actions"],
  /**
   * One key, because the button is called the same thing open and closed and
   * `aria-expanded` carries the state — 0092's reading of the ARIA disclosure
   * pattern. The registry refuses the `disclose` declaration without it.
   */
  text: { disclose: "Menu" },
  behaviours: ["disclose"],
  /**
   * A bar that holds a control is a target, and saying so is what stops a Gate
   * policy putting one inside a linked card. Unconditional rather than
   * `{ whenProps }`: there is no prop here that turns the menu button off, for
   * the reason `loom.code` gives about its copy button — a menu you cannot open
   * on a phone is not a thing this library offers as an option.
   */
  interactive: "always",
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props, NavTextKey, "disclose">) => {
    const tone = given.tone ?? "plain"
    const floating = tone === "floating"
    const sticky = given.position === "sticky"

    const brand = loom.slots["brand"]
    const actions = loom.slots["actions"]

    const region = (
      key: string,
      style: CSSProperties,
      content: ReactNode,
      className?: string
    ): ReactNode =>
      content === undefined || content === null
        ? null
        : createElement("div", { key, className, style }, content)

    return createElement(
      "nav",
      {
        ...loom.editable,
        className: LIBRARY_CLASS.nav,
        style: {
          ...TONES[tone],
          display: "flex",
          /**
           * Still wrapping, and it is what the collapsed rendering is built on
           * rather than a leftover: on a phone the menu takes a full basis and
           * therefore a line of its own, so opening it pushes the links below
           * the bar instead of squeezing them into it. When it is closed the
           * line is not there at all.
           */
          flexWrap: "wrap",
          alignItems: "center",
          gap: space(4),
          /** No stylesheet resets these, so padding would otherwise widen the band past its parent. */
          boxSizing: "border-box",
          width: "100%",
          paddingBlock: space(3),
          paddingInline: tone === "plain" ? "0" : space(5),
          ...(sticky
            ? {
                position: "sticky",
                insetBlockStart: floating ? space(3) : "0",
                zIndex: STICKY_LAYER,
                /**
                 * Behind a translucent bar the page would scroll through
                 * legibly; behind an opaque one it does nothing. It is set
                 * either way because a host's palette may well define its
                 * surface with alpha, and a blur that turns out to be a no-op
                 * costs nothing.
                 */
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }
            : {}),
        },
      },
      libraryStylesheet(),
      region("brand", { display: "flex", alignItems: "center", flex: "0 0 auto" }, brand),
      /**
       * Before the links, because the rule that hides them is a sibling
       * selector and a sibling selector only looks forward. Where it *appears*
       * is a separate question the stylesheet answers with `order`, so the
       * button sits at the trailing end of the bar without the markup having to
       * put it there — which it cannot, since the links have to follow it.
       *
       * Absent entirely when there is no menu. A control that discloses nothing
       * is a button that does nothing, and the bar would still be showing it on
       * a phone.
       */
      children === null
        ? null
        : createElement(
            "span",
            { key: "toggle", className: LIBRARY_CLASS.navToggle },
            loom.behaviours.disclose
          ),
      children === null
        ? null
        : createElement(
            "div",
            {
              key: "menu",
              className: LIBRARY_CLASS.navMenu,
              style: {
                /**
                 * `display`, `flex-wrap` and `align-items` are **not** here and
                 * that is load-bearing: the phone rendering has to take the
                 * `display` away, and an inline value would be unreachable from
                 * the rule that does it. The gap has no breakpoint, so it stays.
                 *
                 * The margins stay too, and are self-cancelling where they must
                 * be: on a phone the menu is the only item on its line at a
                 * hundred percent basis, so there is no free space for an `auto`
                 * to take and all three alignments resolve to nothing.
                 */
                gap: space(5),
                ...MENU_MARGIN[given.align ?? "end"],
              },
            },
            children
          ),
      region(
        "actions",
        {
          display: "flex",
          alignItems: "center",
          gap: space(3),
          flex: "0 0 auto",
          /**
           * Only when there is no menu to have taken the slack already. Two
           * `margin-inline-start: auto` in one flex row put all of it on the
           * first, which would leave the actions pinned to the menu rather
           * than to the end of the bar.
           *
           * On a phone the menu is on its own line and has taken no slack, so
           * the stylesheet puts the same margin back — on the region rather
           * than on the button, because the actions come first of the two and
           * a second `auto` behind it would split the gap between them.
           */
          ...(children === null ? { marginInlineStart: "auto" } : {}),
        },
        actions,
        LIBRARY_CLASS.navActions
      )
    )
  },
})
