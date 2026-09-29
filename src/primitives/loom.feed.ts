import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"

import { BINDING_NAME_EXPECTATION } from "../data/source.js"
import type { DataOutcome } from "../data/resolution.js"
import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, hairline, size, space, weight } from "./tokens.js"
import { linkUrlSchema } from "./url.js"

/**
 * A list of entries that came from somewhere else — and the first primitive in
 * this library that reads `loom.data`.
 *
 * Ninety-six primitives draw content the tree authored.
 * [0058](../../decisions/0058-a-binding-is-a-question-the-tree-asks-answered-before-the-walk.md)
 * gave the tree a way to ask a question of a registered source on 15 August and
 * ended with the thing that was still missing:
 *
 * > **No primitive in the starter library binds anything yet.** The seam exists
 * > and is proved by tests; what is not yet built is the authoring half.
 *
 * This is that half, for the shape four of Hermes' five bound blocks had —
 * `services`, `products`, `feed` and `marquee` all bind *a list* — and it is
 * the shape a marketing page wants when the band is "latest from the blog"
 * rather than four paragraphs somebody typed.
 *
 * ## Why the entries are not nodes, when 0052 says repeated content is
 *
 * [0052](../../decisions/0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)
 * is about *authored* content, and its argument is entirely about what a person
 * or a model can do to it afterwards: an FAQ item is a node so that adding one
 * is an `insert` a reviewer weighs, removing one is a `remove` whose inverse
 * restores that question, and whoever proposed it is attributed.
 *
 * **None of those operations exist for a row that came from a database.** No
 * `move` addresses the third post; no `configure` re-words it; nobody is
 * attributed for it; and its inverse is not a change to this page. The delta
 * model has nothing to say here, so nodes would buy none of what nodes are for
 * — and the tree would become a cache of somebody's database, which is exactly
 * what 0058 rejected when it refused to put answers in props.
 *
 * So the test `docs/primitive-granularity.md` sets — *does changing this prop
 * change the set of nodes?* — comes back the same way it does for
 * `loom.rating`'s five stars and `loom.waiting-state`'s bars: the repeated
 * thing here is never a node under any configuration, so it is interior rather
 * than structure.
 *
 * ## What it can draw, and why that is a schema rather than a mapping
 *
 * An answer arrives as `JsonValue` — 0058 validates it against the *source's*
 * output schema, which is a claim about a host's database and says nothing
 * about what this primitive can put on a page. So this primitive declares the
 * shape it draws, and reads an answer against it.
 *
 * The obvious alternative is a field mapping in props — `{ title: "name",
 * detail: "summary" }` — which is what every CMS block ships. It is rejected
 * here: it makes a model author the join between two schemas it cannot see
 * either of, and a mapping that names a column the source stopped returning
 * fails silently at the one point nobody is looking. Declaring the shape puts
 * the adaptation in the adapter, which is where 0058 already put the claim
 * about the database, and leaves one thing to get wrong instead of two.
 *
 * **Unknown keys are stripped rather than refused.** A real row carries an
 * `id`, a `createdAt` and half a dozen columns this will never draw, and a
 * `.strict()` here would refuse every row a real source returns. The primitive
 * names the fields it draws and ignores the rest, which is the only reading of
 * "what it can draw" that is true of a database.
 *
 * ## Three answers and three renderings
 *
 * 0058 is explicit that *nothing to report* and *could not be reached* are
 * different answers and that collapsing them is the mistake — a reader who
 * takes one for the other concludes their data is gone. So:
 *
 * | the answer | what is drawn |
 * | --- | --- |
 * | rows | the rows |
 * | `ready`, and empty | the `empty` region the tree placed |
 * | `unavailable`, or a shape this cannot draw | a declared line, announced |
 *
 * **Only `empty` is a slot, and that is a limit rather than a preference.**
 * `auditRegistry` probes a primitive across its closed prop choices and reports
 * a slot nothing ever places; it cannot supply an answer, so a region this
 * places only when a source failed is a region the audit reads as dropped
 * content. A bound primitive may therefore declare only the regions it places
 * *without* an answer, and the failure line is declared text
 * ([0060](../../decisions/0060-a-primitive-owns-a-string-and-a-deployment-may-replace-it.md))
 * instead. Filed, because the audit is the framework's and this is the first
 * primitive to hit it.
 *
 * ## A row it cannot read is skipped, not fatal
 *
 * [0175](../../decisions/0175-a-listing-skips-the-row-it-cannot-read-and-fails-the-one-it-cannot-place.md)
 * decided this for the hold store on 20 September and the reasoning transfers
 * whole: one row written by a schema this build is older than must not take the
 * whole band off the page, because every other row goes unmentioned with it.
 * Rows that read are drawn; rows that do not are skipped and *said*. An answer
 * where nothing reads is not a list with holes in it — it is an answer of a
 * different shape, and that is the failure line.
 *
 * ## Nothing here waits
 *
 * There is no waiting state, and `loom.waiting-state` is not reachable from
 * this primitive on purpose. Resolution happens before the walk (0058), so by
 * the time a component runs every binding is `ready` or `unavailable` and none
 * of them is pending. A skeleton drawn here would be a picture of a state this
 * runtime is never in. Filed rather than faked.
 */

/**
 * What a row has to have for this to draw it. `title` is the only required
 * field, because it is the only one whose absence leaves nothing to put on the
 * page — a row with no date and no summary is still a link with a name on it.
 */
const entrySchema = z.object({
  title: z.string().min(1).max(160),
  /** One line under the title. Longer than this is an article, not an entry. */
  detail: z.string().min(1).max(280).optional(),
  /** The date, the author, the category — whatever the row is filed under. */
  meta: z.string().min(1).max(80).optional(),
  /**
   * Checked against the same scheme allowlist every `href` in this library is
   * held to (0053). It is the first URL in the library that arrives from a
   * *host's data* rather than from the tree, and a row carrying a
   * `javascript:` address is exactly what the allowlist is for — the Gate never
   * saw this string, so this is the only place it can be refused.
   *
   * A row whose address fails is not dropped: it draws as an entry that is not
   * a link, because the words are still worth reading and a silent skip would
   * take a post off the page over a field nobody can see.
   */
  href: linkUrlSchema.optional().catch(undefined),
})

const entriesSchema = z.array(z.unknown())

type Entry = z.infer<typeof entrySchema>

const props = z
  .object({
    /**
     * Which of this node's own answers to draw — `loom.data[binding]`, where
     * the names come from the `loom:data` this node declared.
     *
     * A name rather than "the only one", because 0058 made the answer a *map*
     * on the evidence that the multi-binding case is the normal one, and a
     * primitive that read whichever entry happened to be first would work until
     * the day a second binding was added beside it.
     */
    binding: z
      .string()
      .regex(/^[a-z][a-zA-Z0-9]*$/, BINDING_NAME_EXPECTATION)
      .max(60)
      .optional(),
    /** `tight` is a list to scan; `loose` gives each entry room to read. */
    density: z.enum(["tight", "loose"]).optional(),
    /** A hairline between entries, or nothing but space. */
    separators: z.enum(["rule", "none"]).optional(),
    /**
     * Where the meta line sits. `above` is the editorial arrangement — a date
     * over a headline; `inline` runs it after the title for a list that is
     * scanned rather than read.
     *
     * An arrangement of however-many entries rather than a count of them, so it
     * is a prop under the granularity test for the same reason
     * `loom.feature-grid`'s `columns` is: it changes nothing about which rows
     * exist.
     */
    meta: z.enum(["above", "inline"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const DEFAULT_BINDING = "entries"

/** What the primitive made of the answer it was handed. */
type Reading =
  | { readonly kind: "entries"; readonly entries: readonly Entry[]; readonly skipped: number }
  /** Asked and told there is nothing, or never asked at all — see `readAnswer`. */
  | { readonly kind: "empty" }
  | { readonly kind: "unavailable" }
  | { readonly kind: "mismatched" }

/**
 * The answer, read.
 *
 * **A binding with no outcome reads as empty, and that is deliberate.** It
 * happens two ways: the node declared nothing, which is an author who has not
 * connected a source yet and wants to see the band; or the node declared
 * something and the caller resolved a different tree's plan — which the render
 * walk already reports as a `data-unresolved` diagnostic, to the one person who
 * can act on it. Neither is a failure a *reader* should be told about, and the
 * author is told by the instrument built for it.
 */
const readAnswer = (outcome: DataOutcome | undefined): Reading => {
  if (outcome === undefined) return { kind: "empty" }
  if (outcome.status === "unavailable") return { kind: "unavailable" }

  const rows = entriesSchema.safeParse(outcome.value)
  if (!rows.success) return { kind: "mismatched" }
  if (rows.data.length === 0) return { kind: "empty" }

  const entries: Entry[] = []
  for (const row of rows.data) {
    const entry = entrySchema.safeParse(row)
    if (entry.success) entries.push(entry.data)
  }

  /**
   * An answer where *nothing* reads is not a list with holes in it. A source
   * returning a hundred rows of some other shape has answered a question this
   * primitive did not ask, and saying "some entries could not be shown" over an
   * empty region would be the least useful true sentence available.
   */
  if (entries.length === 0) return { kind: "mismatched" }

  return { kind: "entries", entries, skipped: rows.data.length - entries.length }
}

const GAPS: Readonly<Record<NonNullable<Props["density"]>, 4 | 6>> = { tight: 4, loose: 6 }

const META: CSSProperties = {
  fontFamily: family("body"),
  fontSize: size(1),
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: colour("fg-subtle"),
}

const titleOf = (entry: Entry): ReactNode => {
  const words = createElement(
    "span",
    {
      className: entry.href === undefined ? undefined : LIBRARY_CLASS.underline,
      /**
       * A step above `loom.article`'s title, which is the same words at
       * `size(4)`. A card's title has a border and a ground doing half the work
       * of separating it from its own excerpt; an entry in a run has a hairline
       * and nothing else, so the type has to carry the whole difference.
       */
      style: {
        fontFamily: family("heading"),
        fontWeight: weight("heading"),
        fontSize: size(5),
        lineHeight: 1.25,
        color: colour("fg-default"),
      },
    },
    entry.title
  )

  return entry.href === undefined
    ? words
    : createElement(
        "a",
        { href: entry.href, style: { textDecoration: "none", color: "inherit" } },
        words
      )
}

const entryOf = (entry: Entry, index: number, given: Props): ReactNode => {
  const inline = given.meta === "inline"
  const ruled = given.separators !== "none" && index > 0
  const gap = GAPS[given.density ?? "loose"]

  const meta =
    entry.meta === undefined ? null : createElement("span", { style: META }, entry.meta)

  const heading = createElement(
    "div",
    {
      style: {
        display: "flex",
        flexWrap: "wrap",
        alignItems: inline ? "baseline" : "flex-start",
        flexDirection: inline ? "row" : "column-reverse",
        gap: inline ? space(3) : space(2),
      },
    },
    titleOf(entry),
    meta
  )

  return createElement(
    "li",
    {
      key: `${index}`,
      style: {
        display: "flex",
        flexDirection: "column",
        gap: space(2),
        paddingBlockStart: ruled ? space(gap) : "0",
        ...(ruled ? { borderBlockStart: `1px solid ${hairline()}` } : {}),
      },
    },
    heading,
    entry.detail === undefined
      ? null
      : createElement(
          "p",
          {
            style: {
              margin: "0",
              maxWidth: "58ch",
              fontFamily: family("body"),
              fontWeight: weight("body"),
              fontSize: size(3),
              lineHeight: 1.6,
              color: colour("fg-muted"),
            },
          },
          entry.detail
        )
  )
}

/**
 * The one line a reader gets when the band could not draw itself.
 *
 * `role="status"` rather than `alert`: it waits for a pause instead of cutting
 * across what is being read, which is `loom.empty-state`'s judgement for the
 * same situation and the same reason. A region that failed to load is worth
 * knowing about and is not worth interrupting a sentence for.
 */
const noticeOf = (words: string): ReactNode =>
  createElement(
    "p",
    {
      role: "status",
      style: {
        margin: "0",
        fontFamily: family("body"),
        fontWeight: weight("body"),
        fontSize: size(3),
        lineHeight: 1.6,
        color: colour("fg-muted"),
      },
    },
    words
  )

export const loomFeed = definePrimitive({
  type: "loom.feed",
  description:
    "A list of entries read from a data binding — the latest posts, releases or services, drawn from a registered source rather than authored. Region: empty.",
  props,
  slots: ["empty"],
  /**
   * The name this looks its entries up under: whichever name the `binding` prop
   * gives, and `entries` when it gives none.
   *
   * 0184's second form, and the reason that form exists — see `loom.tally`,
   * which declares the same shape for the same reason. What it buys here is the
   * sharper of the two cases: a tree that binds under `entires` gets a feed
   * drawing its empty region for ever, with no error, no diagnostic and a source
   * that answered correctly. Declared, it is a `data-unread` report naming the
   * name.
   */
  reads: [{ fromProp: "binding", default: "entries" }],
  /**
   * The two sentences a reader may meet, declared rather than taken from the
   * tree (0060): a model has nothing to say about a failure it cannot see, and
   * a deployment serving French has two strings to replace.
   *
   * They are two rather than one because they are two different facts and only
   * one of them is worth trying again for — 0175's distinction between a store
   * that did not answer and a row that did not parse, one layer up.
   */
  text: {
    unavailable: "This list could not be loaded.",
    mismatched: "This list could not be shown.",
    /**
     * Deliberately without a count. A number here would be a plural this
     * library cannot form in every language it may be served in, and the figure
     * is not actionable to the reader who sees it — the person who can act on
     * it is the author, and the instrument for them is a diagnostic rather than
     * a sentence on the page. That the walk has no way to raise one from inside
     * a primitive is filed.
     */
    unreadable: "Some entries could not be shown.",
  },
  /**
   * No `copy` declaration, and it is left out rather than declared empty —
   * which 0122 says are different answers. Declaring `[]` here would be true
   * (no prop of this primitive is words a reader reads) and would make this one
   * of two primitives in a library of ninety-eight that has said anything at
   * all about `copy`, which is worse than silence: a consumer asking the
   * registry would get a picture of a library that mostly declines to answer
   * rather than one that has not been asked. The rollout belongs to one pass
   * over the whole library, which is a run rather than a side effect.
   */
  component: ({ loom, props: given, children: _unused }: LoomPrimitiveProps<Props, "unavailable" | "mismatched" | "unreadable">) => {
    const reading = readAnswer(loom.data[given.binding ?? DEFAULT_BINDING])

    const body =
      reading.kind === "unavailable"
        ? noticeOf(loom.text.unavailable)
        : reading.kind === "mismatched"
          ? noticeOf(loom.text.mismatched)
          : reading.kind === "empty"
            ? (loom.slots["empty"] ?? null)
            : createElement(
                "ul",
                {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    gap: space(GAPS[given.density ?? "loose"]),
                    margin: "0",
                    padding: "0",
                    listStyle: "none",
                  },
                },
                ...reading.entries.map((entry, index) => entryOf(entry, index, given))
              )

    return createElement(
      "div",
      {
        ...loom.editable,
        style: {
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: space(4),
          boxSizing: "border-box",
          width: "100%",
        },
      },
      libraryStylesheet(),
      body,
      /**
       * Visible rather than announced only. 0175's rule is *skipped and
       * named*, and a note only a screen reader meets is skipped and named to
       * one reader in a hundred — which is the silent omission the record
       * refuses, wearing an accessibility feature as a disguise.
       */
      reading.kind === "entries" && reading.skipped > 0
        ? createElement(
            "p",
            {
              role: "status",
              style: {
                margin: "0",
                fontFamily: family("body"),
                fontWeight: weight("body"),
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
