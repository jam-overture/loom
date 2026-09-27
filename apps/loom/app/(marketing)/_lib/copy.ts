import { TREE_OPERATIONS } from "@jam-overture/loom"
import { catalogueOf } from "@jam-overture/loom/sdk"

import { siteRegistry } from "./registry"

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

/**
 * The whole vocabulary of structural change — the runtime's list, not a copy.
 *
 * This was `["insert", "remove", "move", "configure"] as const`, spelled out
 * here. That was already better than a digit and it was still a promise rather
 * than a fact: the page's "kinds of change there are" counted a list this file
 * kept, so the number could only be right for as long as somebody remembered to
 * edit two repositories' worth of meaning in step.
 *
 * `Loom daily build` filed that on 30 August, when `TREE_OPERATIONS` became an
 * export of `@jam-overture/loom`, and named the reason it is worth doing even though
 * this number genuinely does not move: **a number nobody expects to move is the
 * one nobody re-checks.** A fifth operation would be a change to what Loom is,
 * and the front door should find that out by being rebuilt rather than by being
 * remembered.
 */
export const DELTA_OPERATIONS: readonly string[] = TREE_OPERATIONS

/**
 * A floor under the decision count, never the count itself.
 *
 * The literal was bumped by hand ten times in eleven days, by runs that had not
 * caused it: writing a decision record in any lane left the marketing site red,
 * so `pnpm verify` failed for all five surfaces until someone came and changed a
 * digit. That is the 19 August finding, and it was still happening on the 27th.
 *
 * A floor removes the coupling. `facts.test.ts` asserts only that the records on
 * disk are **at least** this many, so writing a record can never make this file
 * wrong — it can only make the claim more conservative. Raise it deliberately,
 * in round numbers, when the true count has moved well past it.
 */
export const DECISIONS_AT_LEAST = 100

/**
 * The last of the three that was still a digit somebody typed.
 *
 * `decisions` stopped being one on 27 August and `operations` on 30 August; this
 * one outlived both because its test *looked* like a derivation. It read
 * `expect(FACTS.primitives).toBe(String(catalogueOf(siteRegistry).length))`,
 * which is a real comparison against the registry and therefore not a tautology
 * — and that is exactly what kept it: the number was genuinely checked, so
 * nothing ever read as broken. What it actually did was make **every run that
 * registers a primitive edit a file in this lane**, because the check fails the
 * moment the library grows and the only way back to green is to come here and
 * change a digit.
 *
 * `Loom primitives` filed that on 25 August, having done it twice in two
 * consecutive runs, and said plainly that it is this lane's call. It is, and
 * this is the call: the site counts the registry it renders with.
 *
 * **The build hazard that forced the other two into workarounds does not apply
 * here.** `decisions` could not be derived because counting `decisions/` means
 * reading the disk, and `new URL(…, import.meta.url)` does not survive
 * Turbopack — so it settled for a floor. The registry is an ordinary module this
 * file's own bundle already contains, so the count is just a property of an
 * object, resolved wherever `copy.ts` is.
 */
const REGISTERED_PRIMITIVES = catalogueOf(siteRegistry).length

/** Checked against the repository by `facts.test.ts`. */
export const FACTS = {
  /** Registered primitive types, counted off the registry this site renders with. */
  primitives: String(REGISTERED_PRIMITIVES),
  /** A floor, not a count. See `DECISIONS_AT_LEAST`. */
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
  license: "Licensing is not settled, and this line is where it will be stated.",
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
