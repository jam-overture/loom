import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet } from "./stylesheet.js"
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
 * **It wraps rather than collapsing behind a menu button**, and that is a
 * deliberate limit rather than an oversight. Nothing in a render reads a
 * viewport (0008), so the responsive behaviour available to a primitive is what
 * flex can express — the same call `loom.split` makes when it wraps by
 * flex-basis instead of by media query. A disclosure menu would need the links
 * to be inside a `<details>` on a phone and outside it on a laptop, which is one
 * subtree in two places; the alternatives are rendering the menu twice, which
 * gives a screen reader two copies of it, or client state, which the runtime
 * does not have. Filed rather than faked.
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
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const tone = given.tone ?? "plain"
    const floating = tone === "floating"
    const sticky = given.position === "sticky"

    const brand = loom.slots["brand"]
    const actions = loom.slots["actions"]

    const region = (key: string, style: CSSProperties, content: ReactNode): ReactNode =>
      content === undefined || content === null
        ? null
        : createElement("div", { key, style }, content)

    return createElement(
      "nav",
      {
        ...loom.editable,
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
      region("brand", { display: "flex", alignItems: "center", flex: "0 0 auto" }, brand),
      children === null
        ? null
        : createElement(
            "div",
            {
              key: "menu",
              style: {
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
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
           */
          ...(children === null ? { marginInlineStart: "auto" } : {}),
        },
        actions
      )
    )
  },
})
