import { createElement, type CSSProperties } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { color, hairline, monospace, radius, size, space, weight } from "./tokens.js"

/**
 * A snippet, set in monospace on a tinted surface — or a terminal, which is the
 * same panel wearing a window bar.
 *
 * Ported from Hermes' `code-block` (`language`, `code`, `caption`), and one of
 * the four blocks the port map calls **atomic**: whitespace is the content
 * here, and the reason nothing else in the library can stand in for it. A
 * `loom.prose` collapses runs of spaces, folds every newline into a space, and
 * renders in the body face — so a tree that says "here is the command" through
 * prose says it wrong in three ways at once, and none of them are recoverable
 * by a delta.
 *
 * **The code is children, not the `code` prop Hermes had.** It is exactly
 * 0052's third clause and the same call `loom.badge` and `loom.action` make: one
 * string that is the whole of what the node says is prose, so it is a text node
 * with an author, a history and an inverse of its own. A snippet that could not
 * be re-authored without replacing the node would be the odd one out in a
 * library where a headline can.
 *
 * `language` and `caption` stay props for the fixed-field half of the same
 * rule: there is exactly one of each, they label the snippet rather than being
 * it, and changing one is exactly a `configure`.
 *
 * **`tone` is a display mode, not a second primitive.** A terminal and a source
 * listing are two renderings of one content model — text whose spacing is
 * meaningful — and 0052 keeps a closed set of renderings on one enum for the
 * reason `loom.divider`'s ornaments are one enum: a model turning a snippet into
 * a command emits one `configure` the Gate weighs as the small reversible thing
 * it is, rather than a `remove` and an `insert` that loses the snippet's
 * identity and its text node's history along with it.
 *
 * There is no syntax highlighting. It needs a parser per language, which is a
 * registry of its own.
 *
 * **There is now a copy button, and this is the paragraph that used to say
 * there could not be.** The finding this lane filed on 21 August was that a
 * click is not something a tree can express, and faking one would be worse than
 * the gap;
 * [0086](../../decisions/0086-a-behaviour-is-a-control-the-runtime-builds-and-a-primitive-places.md)
 * answered it by making a behavior something the runtime builds and a
 * primitive places. So this primitive declares `copy`, declares the two strings
 * its control needs a name from, declares itself `interactive` because a
 * control is a target, and places what it is handed. It implements nothing:
 * the whole of its part is deciding *where the button goes*, which is in the
 * panel's bar, at the trailing edge, beside the language label.
 *
 * That decision has one consequence worth stating. A panel with neither a
 * `language` nor a terminal `tone` has no bar to put a button in — and rather
 * than float one over the code, where it would sit on top of the first line of
 * a snippet whose whitespace is its content, the bar appears when the button
 * does. So a copyable panel always has somewhere to say what it is, which is
 * what a reader wants beside a command anyway.
 *
 * What the button copies comes from the *tree*, not from this markup: 0086's
 * ruling, and the reason a panel that renders a language chip does not put the
 * word `bash` on somebody's clipboard.
 */

const props = z
  .object({
    /**
     * A free-text label — `typescript`, `bash`, `loom.tree.json`. Free text
     * because a closed enum here would be a list of every language anybody
     * might ever paste, and because a filename is just as good a label as a
     * language and neither is more correct.
     */
    language: z.string().min(1).max(32).optional(),
    /** A sentence under the panel, the way `loom.media` captions a picture. */
    caption: z.string().min(1).max(200).optional(),
    /**
     * Two renderings: a source listing on a tinted surface, or a terminal with
     * the window bar that says *this is a thing you run* before a reader has
     * read a character of it.
     */
    tone: z.enum(["source", "terminal"]).optional(),
    /**
     * `compact` is the one-line install command a landing page puts under its
     * hero — the panel sized to the line rather than to a listing.
     */
    density: z.enum(["comfortable", "compact"]).optional(),
    /**
     * Whether a line too long for the panel wraps, or goes behind a horizontal
     * scroll. **Off by default, because a command is not data.**
     *
     * The default is `overflow-x: auto` and the note on the `pre` below says
     * why: a shell line broken across two visual rows reads as two commands,
     * and the content's own breaks are the only breaks that mean anything.
     * That is right for the thing this primitive was ported for.
     *
     * It is wrong for the thing it has since been asked to hold. `Loom
     * marketing` filed on 3 September that the front door prints a piece of its
     * own page beside the rendering of it, and that **a pretty-printed JSON
     * string value is one line however long the string is** — there is no line
     * structure below the printer's to preserve, so nothing is lost by wrapping
     * it and 162px of every long line is lost by not. Measured on that band at
     * 390: the panel is 348 wide, the content 510, and the end of each line is
     * behind a gesture inside a band whose whole argument is that you can see
     * the whole of it. That lane worked around it by choosing a shorter
     * specimen, which is a cost it should not have had to pay.
     *
     * So this is a rendering of one content model rather than a second
     * primitive — 0052's display-mode clause, the same call `tone` and
     * `density` already make — and a tree that wants wrapping emits one
     * `configure`. **It changes no node**, which is the granularity doc's
     * sharper question answered: turning it on adds, drops and reorders
     * nothing.
     */
    wrap: z.boolean().optional(),
  })
  .strict()

type Props = z.infer<typeof props>

type CodeTextKey = "copy" | "copied"

/**
 * The bar is `border-subtle` against a `bg-surface-muted` panel in both tones,
 * so a terminal is not a *darker* panel — no palette slot means "dark", and one
 * that did would be black text on black under `minimal`. What separates the two
 * is the window dots and the label's alignment, which read the same way under
 * every palette because neither is a color.
 */
const DOT: CSSProperties = {
  width: "0.6rem",
  height: "0.6rem",
  borderRadius: radius("full"),
  background: color("border-strong"),
}

export const loomCode = definePrimitive({
  type: "loom.code",
  description:
    "A code snippet or a terminal command, in monospace on a tinted surface, with an optional language label and caption. Its code is a child.",
  props,
  slots: [],
  /**
   * The two strings the `copy` control needs a name from. They are the
   * primitive's own rather than the tree's — a model writes no part of a
   * button's label — and they travel with it into every deployment, where a
   * dictionary may translate them and nothing has to remember to (0063).
   */
  text: { copy: "Copy", copied: "Copied" },
  behaviors: ["copy"],
  /**
   * Unconditionally, because the control is unconditional. `{ whenProps }` is
   * for the primitive that is a target only under some configuration — a card
   * with an `href` — and there is no `copy` prop here to name: a snippet you
   * cannot take with you is not a thing this library offers as an option.
   */
  interactive: "always",
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props, CodeTextKey, "copy">) => {
    const terminal = given.tone === "terminal"
    const compact = given.density === "compact"
    const wrapping = given.wrap === true

    const bar = createElement(
      "div",
      {
        key: "bar",
        style: {
          display: "flex",
          alignItems: "center",
          gap: space(2),
          paddingBlock: space(2),
          paddingInline: space(3),
          borderBlockEnd: `1px solid ${hairline()}`,
          background: color("bg-surface"),
        },
      },
      !terminal
        ? null
        : createElement(
            "span",
            {
              key: "dots",
              "aria-hidden": true,
              style: { display: "flex", gap: space(1), flex: "0 0 auto" },
            },
            createElement("span", { key: "a", style: DOT }),
            createElement("span", { key: "b", style: DOT }),
            createElement("span", { key: "c", style: DOT })
          ),
      given.language === undefined
        ? null
        : createElement(
            "span",
            {
              key: "language",
              style: {
                /** Centred in a terminal bar, leading in a source bar — where a filename goes. */
                marginInline: terminal ? "auto" : undefined,
                fontFamily: monospace(),
                fontSize: size(1),
                fontWeight: weight("body"),
                letterSpacing: "0.06em",
                color: color("fg-muted"),
              },
            },
            given.language
          ),
      /**
       * Last, and pushed to the trailing edge whatever else is in the bar. The
       * `auto` margin does the pushing rather than a `justify-content` on the
       * bar, because a terminal's label is centred by its own `auto` margins
       * and one distribution cannot do both.
       */
      createElement(
        "span",
        { key: "copy", style: { display: "flex", marginInlineStart: "auto", flex: "0 0 auto" } },
        loom.behaviors.copy
      )
    )

    const listing = createElement(
      "pre",
      {
        key: "code",
        /**
         * The scroll is the `pre`'s and never the page's. A long line inside a
         * flex or grid cell expands its track unless the cell is allowed to be
         * narrower than its content, which is what `minWidth: 0` on the root
         * below buys — the phone-scrollbar failure filed on 20 August, in the
         * one primitive whose content is deliberately unwrappable.
         *
         * `overflowX` stays `auto` in both modes rather than being switched
         * off with the wrap. It is what contains the overflow to this panel,
         * and a wrapped listing simply has nothing to scroll — where dropping
         * it would let a single unbreakable token out onto the page, which is
         * the failure the line above exists to prevent.
         */
        style: {
          margin: "0",
          overflowX: "auto",
          paddingBlock: compact ? space(3) : space(4),
          paddingInline: compact ? space(3) : space(4),
          fontFamily: monospace(),
          fontSize: size(2),
          lineHeight: compact ? 1.5 : 1.7,
          color: color("fg-default"),
          /**
           * `pre-wrap` rather than `pre` when wrapping, and it is worth being
           * precise about what changes: **the content's own breaks survive
           * either way.** `pre-wrap` preserves every newline and every run of
           * spaces exactly as `pre` does; the only difference is that a line
           * with nowhere left to go also breaks. So the default is not
           * protecting the snippet's newlines — nothing threatens them — it is
           * protecting a *shell command* from reading as two commands, which
           * is a claim about the content rather than about the whitespace.
           *
           * `overflow-wrap: anywhere` is the half that makes it work on a
           * phone. `pre-wrap` alone breaks at spaces, and the lines this is
           * for — a URL, a base64 value, a 90-character JSON string — have
           * none, so they would still run past the panel. `anywhere` rather
           * than `break-word` because only `anywhere` is taken into account
           * when the browser computes the element's min-content width, which
           * is what stops the panel itself from being stretched by the line.
           */
          whiteSpace: wrapping ? "pre-wrap" : "pre",
          ...(wrapping ? { overflowWrap: "anywhere" as const } : {}),
          tabSize: 2,
        },
      },
      createElement("code", { style: { fontFamily: "inherit" } }, children)
    )

    const panel = createElement(
      "div",
      {
        key: "panel",
        style: {
          /**
           * Takes the height its cell gives it rather than the height its
           * content asks for. A four-line snippet beside a card in a
           * `loom.mosaic` would otherwise leave the cell half empty, and a band
           * whose panels stop at different heights is the ragged look the
           * mosaic exists to avoid. Where nothing imposes a height — a panel
           * under a hero, a panel in a column — this does nothing at all.
           */
          flex: "1 1 auto",
          background: color("bg-surface-muted"),
          border: `1px solid ${color("border-subtle")}`,
          borderRadius: radius("md"),
          overflow: "hidden",
        },
      },
      bar,
      listing
    )

    return createElement(
      "figure",
      {
        ...loom.editable,
        style: {
          display: "flex",
          flexDirection: "column",
          gap: space(2),
          margin: "0",
          width: "100%",
          minWidth: "0",
          boxSizing: "border-box",
        },
      },
      panel,
      given.caption === undefined
        ? null
        : createElement(
            "figcaption",
            { style: { fontSize: size(1), color: color("fg-muted") } },
            given.caption
          )
    )
  },
})
