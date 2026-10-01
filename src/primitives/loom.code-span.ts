import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { color, monospace, radius, weight } from "./tokens.js"

/**
 * A name from the code, set in monospace inside a sentence — `ChangeInterpreter`,
 * `--loom-accent`, `pnpm verify`.
 *
 * The other half of the 19 August finding from `Loom lessons`, and the half
 * that gap was actually named for: a course about a codebase names a symbol in
 * almost every sentence, and review set N alone turns on `ChangeInterpreter`,
 * `ProposedChange`, `TreeDelta`, `IdFactory`, `ModelClient` and `PolicyContext`.
 * Set in the body face among the words around them, those six are six ordinary
 * nouns and the question stops being answerable.
 *
 * **Why this is not `loom.code` with an `inline` prop.** 0052 keeps a closed
 * set of renderings on one enum, and that is a rule about renderings of *one
 * content model* — which these are not. A `loom.code` panel has a language
 * label, a caption, a terminal bar and a scroll region of its own, and every
 * one of them is meaningless on a word inside a sentence. An `inline` flag
 * would therefore be a flag that switches four other props off, which is a
 * schema saying two things and hoping the author reads the right half. The
 * precedent is already set and it is exactly this shape: `loom.perk` and
 * `loom.perk-list-item` are the same content in different markup and are two
 * primitives, because 0061 found that the element a primitive *is* can be the
 * thing that separates it from its twin. `loom.code` is the `<pre>`; this is
 * the `<code>`.
 *
 * **Why this is not `loom.kbd`, which it will be confused with.** A key cap is
 * an input device and a code span is a name, and the catalogue keeps them apart
 * by color rather than by shape: a cap is neutral, bordered and raised off a
 * `bg-surface-muted` ground, because a key is a physical object; a code span is
 * tinted with the accent and flat, because a symbol is a reference. A reader
 * who never learns the rule still never mistakes one for the other.
 *
 * **Why this is not a `loom.badge`, which is what the finding says surfaces
 * were driven to.** A badge is a pill — full radius, letter-spaced, in the
 * heading face at a fixed step off the ramp — and it means *a label attached to
 * something else*. This is set at `0.9em` of whatever it is sitting in, so it
 * belongs to the line rather than interrupting it, and its corners are the
 * small radius a run of text can carry.
 *
 * Its colors are `accent-strong` on `accent-subtle`, which is a pairing
 * `PALETTE_TEXT_PAIRINGS` measures and 0074's bar clears in every registered
 * palette. That is not a coincidence — it is the pairing chosen *because* it is
 * measured, after the 22 August finding found two obvious ones that are not.
 */

const props = z.object({}).strict()

type Props = z.infer<typeof props>

export const loomCodeSpan = definePrimitive({
  type: "loom.code-span",
  description:
    "A symbol name set in monospace inside a sentence — the inline counterpart of loom.code. Its text is a child.",
  props,
  slots: [],
  component: ({ loom, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "code",
      {
        ...loom.editable,
        style: {
          /**
           * Sized against the line it sits in rather than off the ramp, for the
           * reason `loom.kbd` gives at more length: a span inside a lede and a
           * span inside a footnote are the same span, and any step off the type
           * scale is the wrong size for one of them. `0.9em` rather than `1em`
           * because a monospace face at the same nominal size reads a shade
           * larger than the body face beside it.
           */
          fontFamily: monospace(),
          fontSize: "0.9em",
          fontWeight: weight("body"),
          background: color("accent-subtle"),
          color: color("accent-strong"),
          paddingBlock: "0.1em",
          /**
           * Tighter on the inline axis than a panel would be, because the
           * padding lands *between the name and the punctuation after it* —
           * "`ChangeInterpreter` ," with a visible space before the comma is
           * what 0.3em looked like at lead size.
           */
          paddingInline: "0.22em",
          borderRadius: radius("sm"),
          /** A span that wraps keeps its tint and its corners on both lines. */
          boxDecorationBreak: "clone",
          WebkitBoxDecorationBreak: "clone",
          /**
           * It wraps, and `nowrap` was the tempting mistake. A symbol name has
           * no break opportunity inside it and needs no help; a two-word
           * command has one, and holding it together is how a phone gets the
           * horizontal scrollbar the 20 August finding chased out of every
           * page in this library.
           */
        },
      },
      children
    ),
})
