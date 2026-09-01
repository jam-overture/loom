import { treeOperationSchema } from "@loom/runtime"
import { catalogueOf } from "@loom/runtime/sdk"

import { siteRegistry } from "./registry"

/**
 * The three kinds of words on this site, kept apart on purpose.
 *
 * **Facts** are claims about the repository that the page works out from the
 * repository. A marketing page that says "37 primitives" is worth nothing if
 * the number is a guess someone typed, and worth a great deal if it cannot be
 * wrong — so the numbers here are counted from the thing they are about wherever
 * the page can reach it, and stated as a floor the page cannot overstate where
 * it cannot. None of them is typed from a memory of it.
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

/**
 * The delta vocabulary, read off the schema the runtime validates against.
 *
 * Not a list typed here, because a list typed here is a list that is wrong the
 * first time a fifth operation exists. The stat band's caption makes a
 * completeness claim — *"that is the whole list"* — and `facts.test.ts` holds
 * these four names so that a vocabulary which grew would take this lane red
 * rather than leaving the claim standing.
 */
export const DELTA_OPERATIONS: readonly string[] = [
  ...treeOperationSchema.optionsMap.keys(),
].map((op) => String(op))

/**
 * The floor under the record count, because this is the one number the page
 * cannot count for itself.
 *
 * `decisions/` sits five directory levels above the application, and `/` is a
 * **dynamic** route — so counting the records where the other two are counted
 * would mean a filesystem read inside a serverless function against a directory
 * the build never traced. The fix that would make it exact reaches
 * `next.config.ts` or the application's `package.json`, and both belong to other
 * lanes.
 *
 * So the page states a floor instead, and the test holds it in the one direction
 * that can damage the site: **the floor may never be higher than the truth.**
 * The cost is that the number understates itself as records accumulate, and
 * raising it is this lane's own work rather than something another lane's run is
 * forced into. That asymmetry is the entire point — see the 19 August finding.
 */
export const DECISIONS_AT_LEAST = 90

/**
 * The numbers on the page, counted rather than typed.
 *
 * Two of the three are worked out here from the thing they describe, so no run
 * that adds a primitive or a delta operation has to remember to come and edit a
 * marketing file. The rule the three follow:
 *
 * - **A number the page can count, it counts.** Adding a primitive changes the
 *   number and not the claim, so nothing needs a person.
 * - **A number that would change the claim goes red.** A fifth delta operation
 *   makes the caption beside it untrue, and this lane should have to answer for
 *   that rather than watch a digit tick over.
 * - **A number the page cannot count, it states as a floor it cannot overstate.**
 */
export const FACTS = {
  /** Registered types in the registry this site actually renders with. */
  primitives: String(catalogueOf(siteRegistry).length),
  /** Numbered records in `decisions/`, README excluded — as a floor. */
  decisions: `${DECISIONS_AT_LEAST}+`,
  /** Delta operations. The whole vocabulary of structural change. */
  operations: String(DELTA_OPERATIONS.length),
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
