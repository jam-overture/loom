import { createElement, type CSSProperties } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { colour, family, hairline, radius, size, space } from "./tokens.js"

/**
 * The strip a site runs above everything else: one short thing to say, and one
 * thing to do about it.
 *
 * It has no Hermes ancestor, and the reason is the reason `loom.nav` and
 * `loom.footer` have none. Hermes was a creator-profile toolkit whose app shell
 * owned the top of the window, so an announcement was chrome the product
 * painted rather than content a page held. A site built in Loom cannot borrow
 * that shell, because the claim is that the whole page is data — and the first
 * time a page wants to say *the record of every change is public now* it finds
 * that the library can draw eight kinds of band and not the one line above them.
 *
 * ## Why this is a primitive and not a composition
 *
 * The port map's first verdict is *composition — no new primitive*, and the
 * example it gives is almost this one: a `loom.cta` with `title`, `desc`,
 * `btnText` and `btnUrl` is four props impersonating four nodes. So the test is
 * worth running out loud rather than assuming the answer.
 *
 * Nothing here is a prop that a delta could have expressed. The message is
 * **children** — ordinary text and inline nodes, re-authorable without
 * replacing the strip. The call to action is a **region** rather than the last
 * child, on 0051's rule: the banner places it somewhere the flow of children
 * does not go, pinned to the far end on a laptop and dropped under the message
 * on a phone, and *"the last child is the button"* is a rule no schema states
 * and every `move` breaks. What is left is three fixed fields.
 *
 * What it buys over `loom.stack` + `loom.prose` + `loom.action` is the half a
 * composition cannot say: a strip that is full-bleed inside a page that is not,
 * a hairline that belongs to the strip rather than to the band under it, and a
 * landmark whose accessible name is a string a model does not write.
 */

const props = z
  .object({
    /**
     * Three genuinely different paintings, in `loom.hero`'s `backdrop` sense:
     * the tinted strip that claims attention, the quiet shelf that separates
     * itself from the page without shouting, and no ground at all for a banner
     * that sits on a surface which is already doing the separating.
     */
    tone: z.enum(["accent", "surface", "plain"]).optional(),
    /**
     * Where the message sits when there is more room than it needs. `start`
     * pushes the action to the far edge; `center` keeps the pair together in
     * the middle. No operation reorders glyphs, so this is a real prop.
     */
    align: z.enum(["start", "center"]).optional(),
    /**
     * The strip's name, for a reader who navigates by landmark. `loom.link-list`
     * set the precedent and the reason is the same: a named strip is an `aside`
     * a reader can jump to, and an unnamed one is a `div`, because a page of
     * anonymous landmarks is worse for a screen reader's landmark menu than no
     * landmarks at all.
     */
    label: z.string().min(1).max(60).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * `accent-subtle` under `fg-default` is the one tinted ground the palette audit
 * measures as painted (0089), which is what makes the loud rendering safe to
 * reach for. The rule under the strip is the accent border on that tone and a
 * hairline on the others: a tinted band with a grey line under it reads as two
 * decisions rather than one.
 */
const TONES: Readonly<Record<NonNullable<Props["tone"]>, CSSProperties>> = {
  accent: {
    background: colour("accent-subtle"),
    borderBlockEnd: `1px solid ${colour("border-accent")}`,
  },
  surface: {
    background: colour("bg-surface-muted"),
    borderBlockEnd: `1px solid ${hairline()}`,
  },
  plain: {
    background: "transparent",
    borderBlockEnd: `1px solid ${hairline()}`,
  },
}

export const loomBanner = definePrimitive({
  type: "loom.banner",
  description:
    "The announcement strip above a page: a short message as children, and a region for the one thing to do about it.",
  props,
  slots: ["action"],
  /**
   * Its message is children; `label` is the strip's accessible name, which is
   * words somebody wrote for a reader even though no sighted one sees them.
   */
  copy: ["label"],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const centred = given.align === "center"
    const action = loom.slots["action"]
    const labelled = given.label !== undefined

    const message = createElement(
      "div",
      {
        key: "message",
        style: {
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: space(2),
          /**
           * A flex item refuses to be narrower than its content unless told it
           * may, and a banner is the one band whose content is a sentence
           * beside a button. Without this the sentence pushes the action off
           * the page rather than wrapping under it.
           */
          minWidth: "0",
          rowGap: space(1),
        },
      },
      children
    )

    return createElement(
      labelled ? "aside" : "div",
      {
        ...loom.editable,
        ...(labelled ? { "aria-label": given.label } : {}),
        style: {
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: centred ? "center" : "space-between",
          /**
           * The third instance of the trap 0207 is about, found by auditing the
           * library rather than by a camera. This strip arranges its two boxes on
           * the inline axis, so it has to state the text alignment they agree
           * with: `space-between` puts the message hard against the start edge,
           * where centred words inside it would read as a mistake, and `center`
           * keeps the pair together in the middle, where ranged-left words do.
           *
           * Both branches are stated, unlike the leaves above, and that is the
           * rule rather than an inconsistency: whoever arranges the boxes owns
           * the alignment of the words in them, because `justify-content` does
           * not inherit and half an inherited agreement is worse than none.
           */
          textAlign: centred ? "center" : "start",
          gap: space(3),
          paddingBlock: space(2),
          paddingInline: space(4),
          /** No stylesheet resets these, so padding would otherwise widen the strip past its parent. */
          boxSizing: "border-box",
          width: "100%",
          fontFamily: family("body"),
          fontSize: size(2),
          lineHeight: 1.5,
          color: colour("fg-default"),
          /**
           * Square by default and rounded by nothing: a strip that spans the
           * page has no corners to soften, and one that does not span it is
           * sitting inside something whose radius already applies. The one
           * exception is the floating case a host builds by putting a banner
           * inside a padded page, which is why the radius is named rather than
           * zero — `sm` is invisible at full bleed and correct when inset.
           */
          borderRadius: radius("sm"),
          ...TONES[given.tone ?? "accent"],
        },
      },
      message,
      action === undefined
        ? null
        : createElement(
            "div",
            {
              key: "action",
              style: {
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: space(2),
                /**
                 * Never the thing that shrinks. A wrapped banner puts the whole
                 * action on its own line under the message, which is the
                 * rendering a phone gets; a shrunk one puts three words of a
                 * button label on four lines.
                 */
                flex: "0 0 auto",
              },
            },
            action
          )
    )
  },
})
