import { createElement, type ReactNode } from "react"
import { z } from "zod"

import { BINDING_NAME_EXPECTATION } from "../data/source.js"
import type { DataOutcome } from "../data/resolution.js"
import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { COLUMN_MINIMUMS, COLUMN_NAMES } from "./layout.js"
import { quoteInterior, quoteSurface } from "./quote-content.js"
import { colour, family, size, space } from "./tokens.js"
import { mediaUrlSchema } from "./url.js"

/**
 * A wall of testimonials read from wherever they are collected —
 * `loom.quote-grid` of `loom.quote`'s content model with the rows coming from
 * the system that has them.
 *
 * ## Why this one is worth a primitive, in the words of the thing it replaces
 *
 * `loom.quote`'s `anonymous` prop exists because of a constraint that is worth
 * reading twice:
 *
 * > A catalogue band needs it. A starting composition may not ship a fabricated
 * > endorsement attributed to a person who does not exist, so `testimonials`
 * > attributes its quotes to roles — *Head of Platform*, *Founder* — and a role
 * > has no initials.
 *
 * That is the whole case for this primitive. A testimonial is the one kind of
 * content on a marketing page that **nobody may author**: a quote in a tree is
 * a quote somebody wrote on behalf of a customer, and a model writing one is a
 * model inventing praise. Every real testimonial already lives somewhere that
 * collected it with consent — a reviews table, a G2 export, a survey, a CRM
 * field — and a page that reads from there is the only page whose social proof
 * is true by construction rather than by somebody having checked.
 *
 * So where the other bound twins are a convenience over an authored band, this
 * one is a different claim. The authored band is a *placeholder*, which is what
 * its own roles-not-names workaround has been saying since it shipped.
 *
 * ## Why it is a second primitive and not a binding on `loom.quote-grid`
 *
 * A grid lays out and nothing else, so the binding could not go on the grid in
 * any case: the grid has no content model to bind, and its children are the
 * quotes. Binding `loom.quote` instead would make `quote` and `author`
 * optional, and a `loom.quote` with neither and no binding would then be a
 * valid tree — the guarantee every authored quote in every stored tree relies
 * on. That is the test
 * [0233](../../decisions/0233-a-bound-twin-is-earned-by-a-system-of-record-and-a-row-shape-the-primitive-can-declare.md)
 * sets, and this is the case in the library where it bites hardest, because the
 * wall and the card are two primitives rather than one.
 *
 * **It is therefore a container and a leaf at once**, which nothing else in the
 * library is: it arranges n cards and holds no child nodes, because the cards
 * are rows. [0054](../../decisions/0054-a-container-is-its-childs-name-plus-the-arrangement.md)
 * names a container after its child's type plus the arrangement, and there is no
 * child type here to name it after — the rows are never nodes, so `loom.voices`
 * is named for the content instead. The record works that exception.
 *
 * ## A row with no face is a card with initials, and a row with a bad one is too
 *
 * `avatar` is the one field whose failure does **not** cost the row. A quote
 * whose portrait URL is on a scheme the allowlist refuses is still a quote
 * worth reading, so the address is dropped and `portrait.ts` draws the author's
 * initials — which is the fallback four primitives in this library already
 * share. A row with no quote or no author is a different matter and is skipped,
 * because there is nothing left to put on the page.
 *
 * ## The failure region is a slot too, over the sentence rather than instead of it
 *
 * `loom.feed` set this shape and carried the paragraph that said it could not
 * be this way — a statement about `auditRegistry`'s reach, written in the
 * grammar of a statement about design.
 * [0185](../../decisions/0185-a-probe-is-handed-answers-the-way-it-is-handed-props.md)
 * discharged the reach on 23 September and left the design call to this lane;
 * [0246](../../decisions/0246-a-bound-primitives-failure-region-is-a-slot-over-its-declared-sentence.md) makes it. The region falls back to the declared
 * sentence, so a tree that says nothing renders exactly what it rendered
 * before, and one failure slot serves both failure answers because the
 * difference between them is the author's and not the reader's.
 */

/**
 * What a row has to have for this to draw it.
 *
 * `quote` and `author` required, for `loom.quote`'s reason read from the other
 * direction: *"an attribution that outlived its quote would be a valid tree
 * saying nothing"*, and a quote with no attribution is an anonymous claim,
 * which is the one thing worse than no social proof.
 *
 * `avatar` is `.catch(undefined)` rather than optional-and-strict, which is
 * `loom.feed`'s spelling for the same judgement: it is a URL arriving from a
 * host's data that the Gate never saw, so the allowlist (0053) is the only
 * place it can be refused — and refusing it must not take the quote with it.
 *
 * Unknown keys are stripped, not refused: a reviews table carries an `id`, a
 * `rating`, a `submittedAt` and a `source` this will never draw.
 */
const voiceSchema = z.object({
  quote: z.string().min(1).max(600),
  author: z.string().min(1).max(120),
  /** Title and company, as one line — "Head of Design, Acme". */
  role: z.string().min(1).max(120).optional(),
  avatar: mediaUrlSchema.optional().catch(undefined),
})

const voicesSchema = z.array(z.unknown())

type Voice = z.infer<typeof voiceSchema>

const props = z
  .object({
    /**
     * Which of this node's own answers to draw — `loom.data[binding]`, where
     * the names come from the `loom:data` this node declared.
     */
    binding: z
      .string()
      .regex(/^[a-z][a-zA-Z0-9]*$/, BINDING_NAME_EXPECTATION)
      .max(60)
      .optional(),
    /**
     * A floor for each column, not a count: the wall fits what it can and
     * wraps. It is `loom.feature-grid`'s prop and it passes the granularity
     * test for `loom.feature-grid`'s reason — it is a minimum width fed to
     * `auto-fit`, so it changes nothing about which rows exist, and here it
     * could not: the rows are the answer's.
     */
    columns: z.enum(COLUMN_NAMES).optional(),
    /** `loose` gives cards room to read; `tight` reads as a stack. */
    density: z.enum(["tight", "loose"]).optional(),
    /**
     * How many of the answer's rows to draw, or all of them.
     *
     * **This is the prop in this run that looks most like a delta in disguise
     * and is not.** The granularity document's sharper question is *does
     * changing this prop change the set of nodes?* — and the answer is no under
     * every value, because none of these rows is a node under any
     * configuration. A `limit` on an authored band would be `remove` smuggled
     * into a prop bag and would be refused; here the alternative is a page that
     * draws nine hundred reviews, which is not a wall of testimonials but a
     * database dump with a quotation mark on it.
     *
     * It is a cap rather than a page: there is no second page and no control to
     * reach one, because a landing page showing its best six is the shape, and
     * paging through praise is `loom.feed` with `loom.link-pager` under it.
     */
    limit: z.enum(["three", "six", "nine", "all"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const DEFAULT_BINDING = "voices"

const LIMITS: Readonly<Record<NonNullable<Props["limit"]>, number>> = {
  three: 3,
  six: 6,
  nine: 9,
  all: Number.POSITIVE_INFINITY,
}

/** What the primitive made of the answer it was handed. */
type Reading =
  | { readonly kind: "voices"; readonly voices: readonly Voice[]; readonly skipped: number }
  /** Asked and told there is nothing, or never asked at all. */
  | { readonly kind: "empty" }
  | { readonly kind: "unavailable" }
  | { readonly kind: "mismatched" }

/**
 * The answer, read, and then capped.
 *
 * **The cap is applied after the skip count is taken**, which is the one
 * ordering decision in this function and it is not arbitrary. `skipped` must
 * count the rows that *could not be read*, never the rows this chose not to
 * draw: a wall showing six of forty good reviews is working exactly as asked,
 * and reporting thirty-four as unshown would send an author hunting a schema
 * problem that does not exist. So the cap narrows what is drawn and leaves the
 * reading of the answer alone.
 */
const readAnswer = (
  outcome: DataOutcome | undefined,
  limit: NonNullable<Props["limit"]>
): Reading => {
  if (outcome === undefined) return { kind: "empty" }
  if (outcome.status === "unavailable") return { kind: "unavailable" }

  const rows = voicesSchema.safeParse(outcome.value)
  if (!rows.success) return { kind: "mismatched" }
  if (rows.data.length === 0) return { kind: "empty" }

  const voices: Voice[] = []
  for (const row of rows.data) {
    const voice = voiceSchema.safeParse(row)
    if (voice.success) voices.push(voice.data)
  }

  if (voices.length === 0) return { kind: "mismatched" }

  const skipped = rows.data.length - voices.length
  const shown = LIMITS[limit]

  return {
    kind: "voices",
    voices: shown === Number.POSITIVE_INFINITY ? voices : voices.slice(0, shown),
    skipped,
  }
}

const bindingNameOf = (props_: Readonly<Record<string, unknown>>): string =>
  typeof props_["binding"] === "string" ? props_["binding"] : DEFAULT_BINDING

/**
 * One card, which is `quote-content.ts`'s card.
 *
 * `card` rather than `feature` always, and that is the arrangement rather than a
 * shortfall: `feature` is the one-per-page pull quote and a wall of pull quotes
 * is a wall with no hierarchy in it. A deployment that wants one quote at
 * feature size wants a `loom.quote`, because the one quote a page pulls out is a
 * quote somebody *chose*.
 */
const cardOf = (voice: Voice, index: number): ReactNode =>
  createElement(
    "figure",
    { key: index, style: quoteSurface("card") },
    ...quoteInterior(voice, "card")
  )

const noticeOf = (words: string): ReactNode =>
  createElement(
    "p",
    {
      role: "status",
      style: {
        margin: "0",
        fontFamily: family("body"),
        fontSize: size(3),
        color: colour("fg-muted"),
      },
    },
    words
  )

export const loomVoices = definePrimitive({
  type: "loom.voices",
  description:
    "A wall of testimonials read from a data binding — quotes a reviews table or a CRM collected, rather than praise somebody typed into the page. Use loom.quote-grid of loom.quote for testimonials the tree authors. Regions: empty, unavailable.",
  props,
  slots: ["empty", "unavailable"],
  /**
   * Every word a reader reads is in the answer's rows or in the children of the
   * `empty` and `unavailable` regions. Declared empty rather than left out, which 0122 says are
   * different answers: this has been asked and the answer is *none*.
   */
  copy: [],
  /**
   * The name this looks its rows up under: whichever name `binding` gives and
   * `voices` when it gives none. 0184's second form, for the case a tree
   * binding under a near-miss name would otherwise draw its empty region for
   * ever against a source that answered correctly.
   */
  reads: [{ fromProp: "binding", default: "voices" }],
  /**
   * Declared (0060), and three rather than two for `loom.feed`'s reason: the
   * first two are different facts and only one is worth trying again for, and
   * the third is 0175's *skipped and said*.
   */
  text: {
    unavailable: "These testimonials could not be loaded.",
    mismatched: "These testimonials could not be shown.",
    /** Without a count: the figure is the author's and reaches them as a diagnostic. */
    unreadable: "Some testimonials could not be shown.",
  },
  /**
   * What it was given and what it drew (0206), from the same `readAnswer` the
   * component calls — which is the construction that record argues for, and it
   * matters more here than anywhere else in this run. A reviews table whose
   * `author` column was renamed answers perfectly, resolves cleanly, and draws
   * a band that is simply shorter than it was. Nothing on the page can say so
   * and nothing was looking.
   *
   * `shown` is the rows that *read*, not the rows the cap drew — see
   * `readAnswer` on why those are different numbers and why only one of them is
   * anybody's problem.
   */
  unshown: (props_, data) => {
    const name = bindingNameOf(props_)
    /**
     * `all`, whatever the node's `limit` says, so the reading is of the answer
     * rather than of the arrangement. The cap cannot affect `skipped`, but
     * passing the node's own value would invite a future edit that made it.
     */
    const reading = readAnswer(data[name], "all")

    return reading.kind === "voices"
      ? [{ name, given: reading.voices.length + reading.skipped, shown: reading.voices.length }]
      : []
  },
  component: ({
    loom,
    props: given,
    children: _unused,
  }: LoomPrimitiveProps<Props, "unavailable" | "mismatched" | "unreadable">) => {
    const reading = readAnswer(loom.data[given.binding ?? DEFAULT_BINDING], given.limit ?? "six")

    const body =
      reading.kind === "unavailable"
        ? (loom.slots["unavailable"] ?? noticeOf(loom.text.unavailable))
        : reading.kind === "mismatched"
          ? (loom.slots["unavailable"] ?? noticeOf(loom.text.mismatched))
          : reading.kind === "empty"
            ? (loom.slots["empty"] ?? null)
            : createElement(
                "div",
                {
                  style: {
                    display: "grid",
                    gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${COLUMN_MINIMUMS[given.columns ?? "auto"]}), 1fr))`,
                    gap: given.density === "tight" ? space(4) : space(5),
                    width: "100%",
                    alignItems: "stretch",
                  },
                },
                ...reading.voices.map((voice, index) => cardOf(voice, index))
              )

    return createElement(
      "div",
      {
        ...loom.editable,
        style: {
          display: "flex",
          flexDirection: "column",
          gap: space(4),
          boxSizing: "border-box",
          width: "100%",
        },
      },
      body,
      /**
       * Visible rather than announced only, which is 0175's rule read the way
       * `loom.feed` reads it.
       */
      reading.kind === "voices" && reading.skipped > 0
        ? createElement(
            "p",
            {
              role: "status",
              style: {
                margin: "0",
                fontFamily: family("body"),
                fontSize: size(2),
                color: colour("fg-subtle"),
              },
            },
            loom.text.unreadable
          )
        : null
    )
  },
})
