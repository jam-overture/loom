import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, hairline, radius, space } from "./tokens.js"

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
 * **It collapses behind a menu button on a phone**, which for the library's
 * first six days it did not. The old paragraph here said a disclosure would
 * need the links inside a `<details>` on a phone and outside it on a laptop —
 * one subtree in two places — and that the alternatives were rendering the menu
 * twice or client state the runtime did not have. That was true and it stopped
 * being true on 25 August:
 * [0092](../../decisions/0092-a-disclosure-control-owns-its-button-and-the-primitive-owns-the-region.md)
 * split the problem so that neither half needs the other's. The runtime builds
 * a button that publishes its own state; this file owns the region and a CSS
 * rule that reads that state. The links are rendered once, in one place, and a
 * media query decides what closed *means* — which is the one thing a static
 * stylesheet can say about a viewport that a render never can (0008).
 *
 * Three details of the placement are load-bearing rather than incidental:
 *
 * 1. **The control is wrapped in a box this primitive owns.** 0092's plain
 *    contract is `[data-loom-disclosed="false"] ~ .region`, and it cannot be
 *    used here: the button carries `display: inline-flex` as an inline style,
 *    so no rule can hide it on a laptop. Wrapping it moves the hiding to an
 *    element this file controls, which is the `:has()` form 0092 permits.
 * 2. **The menu's `display` had to leave this file.** It was inline, and an
 *    inline value beats the rule that hides it — the collapse would have been a
 *    rule that silently did nothing. Its alignment stays inline, because that
 *    varies by prop and nothing overrides it.
 * 3. **Nothing renders means nothing is hidden.** The control returns `null`
 *    until an effect proves scripting runs, so a page served without it has no
 *    button, no `data-loom-disclosed` anywhere, no rule that matches, and the
 *    menu it had before any of this existed. The empty wrapper is removed by
 *    `:empty` so it does not leave a gap behind.
 *
 * The one honest cost: on a phone the menu is ordered below the actions while
 * sitting above them in the markup, so a reader tabbing through reaches the
 * links before the button they are drawn under. Reading order and source order
 * genuinely differ between the two layouts — the menu is the middle region on a
 * laptop and a drawer underneath on a phone — and no single source order is
 * natural for both. The source order is the laptop's, because that is the
 * layout the regions were named for.
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
    borderBlockEnd: `1px solid ${hairline()}`,
  },
  floating: {
    background: colour("bg-surface"),
    border: `1px solid ${colour("border-subtle")}`,
    borderRadius: radius("full"),
    boxShadow: `0 20px 44px -34px ${colour("fg-default")}`,
  },
}

/**
 * The disclosure control's name, which is the primitive's own rather than the
 * tree's — a model writes no part of a button's label — and travels with it
 * into every deployment, where a dictionary may translate it and nothing has to
 * remember to (0063).
 */
const NAV_TEXT = { disclose: "Menu" } as const

type NavTextKey = keyof typeof NAV_TEXT

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
  copy: [],
  /**
   * One key, and the same word open and closed — `aria-expanded` carries the
   * state, which is the disclosure pattern as the ARIA practices state it. The
   * registry refuses the behaviour without it (0086).
   */
  text: NAV_TEXT,
  behaviours: ["disclose"],
  /**
   * A bar of links that now also holds a button. It was always a target the
   * reader aims at and never said so; taking a control is what makes the
   * omission fail loudly, because the registry refuses a primitive that places
   * one without declaring it — which is the check that keeps a menu button out
   * of a linked card.
   */
  interactive: "always",
  component: ({
    loom,
    props: given,
    children,
  }: LoomPrimitiveProps<Props, NavTextKey, "disclose">) => {
    const tone = given.tone ?? "plain"
    const floating = tone === "floating"
    const sticky = given.position === "sticky"

    const brand = loom.slots["brand"]
    const actions = loom.slots["actions"]

    const region = (
      key: string,
      className: string | undefined,
      style: CSSProperties,
      content: ReactNode
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
           * The bar wraps to a second line before it overflows a phone. The
           * regions below take their flex-basis from their content, so the
           * menu is what breaks first — the mark and the actions stay on the
           * top line, which is the order a reader needs them in.
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
      region(
        "brand",
        undefined,
        { display: "flex", alignItems: "center", flex: "0 0 auto" },
        brand
      ),
      /**
       * Before the menu in the markup, because the rule that hides the menu
       * reads the control's state — and only where there is a menu to open.
       * The box is empty until the control decides it can run, and `:empty`
       * takes it out of the flow until then.
       */
      children === null
        ? null
        : createElement(
            "div",
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
              /**
               * Alignment only. Everything about the menu's own box is in the
               * stylesheet, because the collapse is a rule and an inline
               * `display` would beat it.
               */
              style: MENU_MARGIN[given.align ?? "end"],
            },
            children
          ),
      region(
        "actions",
        LIBRARY_CLASS.navActions,
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
           */
          ...(children === null ? { marginInlineStart: "auto" } : {}),
        },
        actions
      )
    )
  },
})
