/**
 * The three kinds of words on this site, kept apart on purpose.
 *
 * **Facts** are claims about the repository that a test checks against the
 * repository. A marketing page that says "37 primitives" is worth nothing if
 * the number is a guess someone typed, and worth a great deal if it cannot be
 * wrong — so the numbers here are held against the registry and the decisions
 * directory rather than against a memory of them.
 *
 * **Placeholders** are the sentences that are not engineering's to write.
 * Positioning, audience, pricing and licensing are the maintainer's; where the
 * page needed a shape before it could have an answer, the shape is built and
 * the words are marked — visibly on the page, and here, so that a review can
 * see the whole list at once instead of hunting for it.
 *
 * **Reserved vocabulary** is the words this project uses about itself that a
 * visitor has never heard. See `RESERVED_VOCABULARY`.
 */

/** Checked against the repository by `facts.test.ts`. */
export const FACTS = {
  /** `loom.*.ts` modules in `src/primitives` — one file per registered type. */
  primitives: "61",
  /** Numbered records in `decisions/`, README excluded. */
  decisions: "87",
  /** Delta operations. The whole vocabulary of structural change. */
  operations: "4",
} as const

/**
 * Copy that is waiting on an answer, keyed by where it sits.
 *
 * Every one of these appears verbatim in a page tree, and a test holds the two
 * against each other in both directions: a placeholder that stopped being used
 * is a question that has quietly been answered by deletion, and a placeholder
 * used but unlisted is one nobody will remember to ask about.
 *
 * **There is one left, and that is the news.** Seven of the eight were the
 * pricing band — a notice and three tiers with their prices held open, built as
 * structure so the shape could be reviewed before the numbers existed. On
 * 21 August the maintainer said the front door does not need pricing yet: the
 * marketplace is a long way off and how to position it is undecided. So the band
 * is gone rather than waiting, and the seven placeholders went with it.
 *
 * Deleting the shape rather than keeping it empty is the right call for a reason
 * worth writing down: a band marked *placeholder* still occupies the most
 * expensive space a page has, and a visitor reading three empty tiers learns
 * that this product has not decided what it is. An absent band says nothing at
 * all, which is a great deal better than that.
 */
export const PLACEHOLDER_COPY = {
  licence: "Licensing is not settled, and this line is where it will be stated.",
} as const

export type PlaceholderKey = keyof typeof PLACEHOLDER_COPY

/** The list, for the test and for the report. */
export const PLACEHOLDER_STRINGS: readonly string[] = Object.values(PLACEHOLDER_COPY)

/**
 * The words this project uses about itself that a visitor has never heard.
 *
 * The maintainer's instruction for the portal binds this surface hardest, and it
 * is one sentence: *"It should be very intuitive, such that a high schooler can
 * easily follow what is going on."* On 20 August he read the front door against
 * `nextjs.org` and said the same thing about this site — the copy is heavy on
 * technical jargon. He is right, and the words below are why.
 *
 * Every one of them is a perfectly good word **in the repository**. A delta is a
 * delta, the Gate is the Gate, and the documentation should say so. The failure
 * is that they had all arrived on the landing page — one of them inside the
 * first two hundred pixels, as a row of four nouns a stranger cannot read.
 *
 * So the rule is not "never use these", it is **where**:
 *
 * - **The front door may not use them at all.** Someone arriving at `/` has no
 *   context, and a word they have to look up is a word that sends them away.
 * - **A mechanism page may use them once it has earned them** — plainly said
 *   first, named second, in that order and in the same breath.
 *
 * `voice.test.ts` holds the site to both halves. It is a blunt instrument by
 * design: a substring check that cannot be argued with is worth more here than a
 * subtle rule that erodes one convenient exception at a time.
 *
 * The register itself came off the reference the maintainer sent, and it is four
 * habits rather than a style guide: the reader is in the sentence ("your page",
 * not "a page"); one idea per sentence, and a short second sentence is a gift;
 * what it does for you before what it is made of; and something concrete — "the
 * button that puts it back" — in place of the abstraction it implements.
 */
export const RESERVED_VOCABULARY: readonly string[] = [
  "TreeDelta",
  "disposition",
  "the Gate",
  "delta",
  "primitive",
  "inverse",
  "provenance",
  "schema",
  "registry",
  "runtime",
  "node",
  "tree",
]
