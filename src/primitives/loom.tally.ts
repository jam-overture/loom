import { createElement, type ReactNode } from "react"
import { z } from "zod"

import { BINDING_NAME_EXPECTATION } from "../data/source.js"
import type { DataOutcome } from "../data/resolution.js"
import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { color, size } from "./tokens.js"

/**
 * One figure that is read rather than written — `loom.stat`'s content model
 * with the number coming from a registered source.
 *
 * *Trusted by 12,000 teams* is a sentence a landing page is only allowed to
 * print if somebody goes back and edits it, which is why so many pages carry a
 * figure that was true a year ago. This is the same band saying the same thing
 * from the row that knows.
 *
 * ## Why this is a second primitive and not a binding on `loom.stat`
 *
 * The tempting shape is one primitive whose `value` is a prop *or* an answer,
 * since the content model — a figure, a label, an optional qualifier — is
 * identical. It is rejected on the ground 0052 rejected decomposing fixed
 * fields, which is the same ground from the other direction: **`value` would
 * have to become optional**, and a `loom.stat` with no value and no binding
 * would then be a valid tree. Every authored stat in every stored tree loses
 * the one guarantee its schema is there to make.
 *
 * The second reason is that the two have different failure surfaces. An
 * authored stat cannot fail; this can, and a primitive that is sometimes
 * infallible and sometimes not is two primitives sharing a name.
 *
 * ## The figure is a string, and the grouping is the adapter's
 *
 * A source answering `1284` gets `1284` on the page, not `1,284`. The obvious
 * fix is `Intl.NumberFormat`, and it cannot be used here: with no locale
 * argument it reads the *server's* default, which would make two renders of one
 * revision on two machines disagree — the property that makes
 * `renderLoomTree` what it is (0008). With a locale argument it would be this
 * library choosing a host's, which is worse.
 *
 * So a figure that should read `1,284` or `1.284` is an adapter returning the
 * string it wants printed, which is where 0058 already put every other claim
 * about a host's data. `prefix` and `suffix` are here for the part that is
 * genuinely the page's rather than the database's: the `$` and the `+` belong
 * to how this band puts it, and asking an adapter to bake them in would make
 * one row unusable in two places.
 */

const props = z
  .object({
    /**
     * Which of this node's own answers to read — `loom.data[binding]`. The
     * default is `value`, which is what a node binding exactly one figure will
     * call it.
     */
    binding: z
      .string()
      .regex(/^[a-z][a-zA-Z0-9]*$/, BINDING_NAME_EXPECTATION)
      .max(60)
      .optional(),
    /**
     * What the figure counts. A prop rather than a binding: the label is the
     * page's words about somebody's number, it does not change when the number
     * does, and a source that had to return its own caption would be writing
     * the page.
     */
    label: z.string().min(1).max(80),
    caption: z.string().min(1).max(160).optional(),
    /** Set tight against the figure — a currency mark, not a word. */
    prefix: z.string().min(1).max(8).optional(),
    /** The same, after it: `+`, `%`, `×`. */
    suffix: z.string().min(1).max(8).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const DEFAULT_BINDING = "value"

/**
 * What can stand where the figure goes.
 *
 * A boolean or a null is not a figure and neither is an object, so the answer
 * is read rather than stringified — `[object Object]` on a landing page is the
 * failure this schema exists to turn into the declared line below.
 */
const figureSchema = z.union([z.string().min(1).max(24), z.number().finite()])

/**
 * The figure, or nothing.
 *
 * An absent outcome reads the same as a failed one here, and unlike
 * `loom.feed` that is not a judgement call: a list has a legitimate empty
 * answer and a figure does not. A node that asked and was not answered, and a
 * node that never asked, both have no number to print — and the author of the
 * second is the one the render walk's `data-unresolved` diagnostic is for.
 */
const readFigure = (outcome: DataOutcome | undefined): string | undefined => {
  if (outcome === undefined || outcome.status === "unavailable") return undefined

  const figure = figureSchema.safeParse(outcome.value)

  return figure.success ? String(figure.data) : undefined
}

export const loomTally = definePrimitive({
  type: "loom.tally",
  description:
    "One figure read from a data binding, with a short label — a live count on a page, rather than a number somebody typed. Use loom.stat for a figure the tree authors.",
  props,
  slots: [],
  /**
   * The name this looks its figure up under, which is whichever name the
   * `binding` prop gives and `value` when it gives none.
   *
   * The second form of the declaration (0184), and this primitive is one of the
   * two it was added for: a fixed list would have had to write `value` and then
   * be wrong about every node that set the prop. Declaring it turns the one way
   * a binding can be wrong that nothing refuses — *a name nothing reads*, which
   * resolves cleanly, costs the round trip and is then dropped on the floor —
   * into a `data-unread` diagnostic, and tells a model reading the catalogue
   * that `binding` has to match a key in this node's own `loom:data` rather than
   * leaving it to infer that from a camelCase string rule.
   *
   * Leaving it out and declaring it empty are different answers (0181), which is
   * why this was worth two lines rather than nothing: absence says *nobody has
   * said*, and this says what is true.
   */
  reads: [{ fromProp: "binding", default: "value" }],
  /**
   * The word that stands where the figure would have been. Declared (0060)
   * because a model has nothing to say about a failure it cannot see, and
   * because a page that dropped the figure silently would leave a label with
   * nothing above it — which reads as a rendering fault rather than as an
   * absence.
   */
  text: { unavailable: "Unavailable" },
  component: ({ loom, props: given, children: _unused }: LoomPrimitiveProps<Props, "unavailable">) => {
    const figure = readFigure(loom.data[given.binding ?? DEFAULT_BINDING])

    const value: ReactNode =
      figure === undefined
        ? loom.text.unavailable
        : [
            given.prefix === undefined ? null : given.prefix,
            figure,
            given.suffix === undefined ? null : given.suffix,
          ]

    return createElement(
      "div",
      {
        ...loom.editable,
        className: LIBRARY_CLASS.stat,
        /**
         * Announced only when it could not be read. A figure that arrived is
         * ordinary content and a region that failed to load is an event, which
         * is `loom.empty-state`'s distinction between its two causes and is
         * made here for the same reason.
         */
        ...(figure === undefined ? { role: "status" } : {}),
      },
      libraryStylesheet(),
      createElement(
        "span",
        {
          className: LIBRARY_CLASS.statValue,
          /**
           * A figure that did not arrive must not be the loudest thing on the
           * page. `.loom-stat-value` is the accent at the type ramp's seventh
           * step — right for `12,480` and wrong for the word standing in for
           * it, which under a palette whose accent is a bright yellow is a
           * failure shouting across the band. An inline style beats the rule,
           * which is the one mechanic this library relies on for exactly this.
           */
          ...(figure === undefined
            ? { style: { fontSize: size(5), color: color("fg-subtle") } }
            : {}),
        },
        value
      ),
      createElement("span", { className: LIBRARY_CLASS.statLabel }, given.label),
      given.caption === undefined
        ? null
        : createElement("span", { className: LIBRARY_CLASS.statCaption }, given.caption)
    )
  },
})
