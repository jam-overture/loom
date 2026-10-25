import { TREE_OPERATIONS } from "@jam-overture/loom"
import { catalogueOf } from "@jam-overture/loom/sdk"

import { CHAIN, rendersLinkVerbatim } from "./chain"
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
 * than a fact: the page's "kinds of change Loom allows" counted a list this file
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
 *
 * ## Raised to 250 on 19 October, and the delay is the thing worth reading
 *
 * It said `100` for seven weeks, during which the count went from 102 to 277.
 * The front door printed `100+` beside `107` ready-made pieces and `4` kinds of
 * change, under a sentence promising that every number on the band is checked
 * against the code it describes. All three claims were true and the band still
 * misled: two of the numbers are exact counts, the third is a floor, and a
 * reader has no way to tell them apart. Taking `100+` for the same kind of
 * number as `107` gives you a project with about as many decisions as
 * components. There are 2.5 times as many, and it is the most distinctive fact
 * this repository has about itself.
 *
 * **The press under the band is what made it worth fixing today rather than
 * noting again.** *Read the decisions* now opens
 * `/docs/architecture/decision-records`, which states the count exactly. A
 * front door saying `100+` one press from a page of the same site saying `277`
 * is not a conservative claim, it is two numbers.
 *
 * ## Why this is still a floor and not a count
 *
 * Counting `decisions/` means reading the disk, and `/` is server-rendered on
 * demand rather than prerendered — so the read would happen in the deployed
 * function, where the repository is not. `(docs)` reads the same index safely
 * because its pages are built once, at build time, in a checkout.
 * `(docs)/_lib/architecture/source.ts` has the whole of why the obvious
 * spelling of the path does not survive the bundler either.
 *
 * A deployment that quietly fell back to the floor would be worse than a floor:
 * the number would be right in every screenshot and wrong on the site. So the
 * floor stays, and `facts.test.ts` now holds it to being *within sight* of the
 * truth rather than merely under it.
 */
export const DECISIONS_AT_LEAST = 250

/**
 * How far behind the real count the floor above is allowed to fall.
 *
 * The old rule — *never claim more records than there are* — is satisfied
 * harder the wronger the number gets, which is how `100` survived 175 records.
 * It is the one assertion in `facts.test.ts` that goes quieter as the claim it
 * guards degrades.
 *
 * So there is a second bound, and the whole design of it is the size of the
 * number. The floor may sit at **no less than 55% of the records on disk**,
 * which at 277 records means it fires again at 455 — months away at this
 * repository's rate — and the remedy is this one constant, raised in round
 * numbers, with the failure naming the value to type.
 *
 * **It is a coupling and it is a deliberate one.** The 19 August finding is
 * that writing a decision record in any lane left the marketing site red; this
 * brings a weak version of that back, at roughly one bump per 180 records
 * instead of one per record. That is the price of the number staying worth
 * printing, and it is the smallest version of the price available: there is no
 * way to notice a stale floor that does not fail somewhere, and the only suite
 * that can see `decisions/` is this one.
 */
export const DECISIONS_FLOOR_FRACTION = 0.55

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
export const PLACEHOLDER_COPY = {} as const

/**
 * The licence, which stopped being a placeholder on 27 September.
 *
 * It was this site's last one and it had been there since the footer was
 * written: *"Licensing is not settled, and this line is where it will be
 * stated."* `docs/rollout.md` had it as the one hard gate on Phase 4 —
 * *undecided, and it gates whether the repository can be public at all.* The
 * maintainer settled it as MIT.
 *
 * **Nothing here is typed from a decision somebody reported.** The repository
 * states it in two places already — `LICENSE` at the root and `license` in the
 * package manifest, both added by #402 when the framework went to npm — and
 * `license.test.ts` holds this sentence against the manifest, so the site
 * cannot go on saying MIT if the package ever stops.
 */
export const LICENSE_NOTICE = "Loom is open source under the MIT license."

/**
 * Loom itself, and the one of the two a reader is likelier to have heard of.
 *
 * Named apart from the list as of 18 October, because **the band that asks for
 * them now says which is which.** Until today the two names appeared on the
 * front door in exactly one place — inside `INSTALL_COMMAND` — and the
 * paragraph above the panel described them positionally: *one package is Loom
 * itself, the other is the set of components this page is drawn from.* That
 * sentence is only a description of a line the reader can see, and on a phone
 * they cannot: the panel is 361 pixels wide and the command is 504, so it ends
 * mid-name at `@jam-overtu` and *the other* names nothing.
 *
 * An index into `PACKAGES` would have done it and is the wrong shape. The two
 * have different jobs, the paragraph says what each job is, and
 * `PACKAGES[1] is the set of components` is a sentence whose correctness
 * depends on the order of an array nobody reading it can see.
 */
export const RUNTIME_PACKAGE = "@jam-overture/loom"

/** The starter library, which is where every component on this page comes from. */
export const STARTER_PACKAGE = "@jam-overture/loom-primitives"

/**
 * The two packages, and the line a reader is meant to type.
 *
 * The front door asks for an install as of 11 October, and the ask is two
 * package names — which makes this the one string on this site that is **not
 * copy**. Nobody reads it. It is pasted into a terminal, so a word in it is
 * correct or it is broken, and none of the rules this file exists to enforce
 * apply to it: it cannot be said more plainly, it cannot be said in the
 * reader's words, and `@jam-overture/loom-primitives` carries one of the
 * reserved words above in the middle of it because that is the package's name.
 *
 * **That last fact is why these are a constant rather than a literal in the
 * page.** `voice.test.ts` sweeps every word the site serves for the reserved
 * vocabulary, and it found `primitives` inside the package name on the first
 * run after the band was written — correctly, because the sweep reads text
 * nodes and a command is a text node. The exemption is this list, stripped
 * before the sweep: a span that is exactly a published package name is not the
 * site using the word, and nothing else is exempt. A band that wrote
 * *primitive* in a sentence is still red.
 *
 * `facts.test.ts` holds the names against the two manifests the repository
 * publishes from, so the day a package is renamed, or a third one becomes
 * required, the page that tells a stranger what to install goes red rather than
 * quietly printing a line that installs nothing.
 */
export const PACKAGES: readonly string[] = [RUNTIME_PACKAGE, STARTER_PACKAGE]

/** The ask on the front door, as one line. */
export const INSTALL_COMMAND = `npm install ${PACKAGES.join(" ")}`

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

/**
 * The lines on this site the maintainer wrote himself, verbatim.
 *
 * **Positioning is his and not this lane's**, which is a standing rule of this
 * brief rather than anything decided here. What it had never been is a *list*:
 * his sentences sat in the page builders looking exactly like the ones a
 * routine wrote, with the provenance in a docblock above them, and every run of
 * this lane rewrites copy in sweeps.
 *
 * Writing them down does two things, and the second is the one that made it
 * worth a constant.
 *
 * **It keeps a sweep off them.** A run told to make the site read plainly has
 * no way to tell his sentence from its own, and the one it is likeliest to
 * reach for is the hero — the single most rewritten band on this site and the
 * only one whose words are not ours to change.
 *
 * **And it is what lets the em-dash rule be universal.** The rule exists
 * because this lane put a dash in roughly a third of its own sentences; the one
 * in the hero lead is his, it is doing a different job (it introduces a list
 * rather than pivoting to a second clause), and it was kept deliberately after
 * being photographed at 1280 and 390. A rule reading *every string a reader
 * reads, except this one sentence* is a rule that gets edited. A rule reading
 * *every string except the ones he wrote* is the repository's actual rule,
 * stated where a test can read it.
 *
 * `voice.test.ts` holds this list from both ends: every entry has to still be
 * rendered somewhere on the site, so a line that was rewritten or deleted
 * cannot sit here going on exempting nothing.
 */
/**
 * The headline, and it is his of 24 October.
 *
 * Three were put to him and he took this one: *"I like the second headline.
 * Simplest but gets to the point."* `docs/positioning.md` records the exchange
 * and marks it settled.
 *
 * **It replaces a line of his own**, which is the first time an entry of
 * `MAINTAINERS_OWN` has come off rather than been added to. *Make your web page
 * dynamic with AI and Loom* was his of 27 September and sat here from the day
 * the list was written. The list holds his lines verbatim, so a line he has
 * moved on from leaves with the page rather than staying here as a sentence
 * nobody renders. The old one survives in `reports/` and in the record of the
 * conversation; nothing about it was edited.
 *
 * Exported rather than written into the hero because the page and this list are
 * the two readers of it, and a literal spelled in both places is a literal that
 * gets changed in one of them. The test below only proves the entries are still
 * rendered; it cannot prove they were not both rewritten together.
 */
export const HEADLINE = "A web page that rearranges itself around the people using it"

export const MAINTAINERS_OWN: readonly string[] = [
  HEADLINE,
  /**
   * The lead under it, 27 September. *What your page becomes* and *how it feels
   * to use* are his, and so is the closing triad; `pages/home.ts` has the whole
   * of why each was added.
   *
   * **It survives the headline swap**, and that was checked rather than
   * assumed. `docs/positioning.md` settles the headline and nothing else about
   * this band, and his paragraph is the build case rather than the governance
   * one: it is about what a page becomes, which is what the new headline says.
   */
  "AI already writes the components, but would you trust AI to dynamically change your web page? What your page evolves to is yet to be built. Loom and AI are how your page evolves together.",
  /**
   * The one link of the chain published in his words, which is the outcome
   * claim. See `chain.ts` for why it is the only one, and why the other five
   * are rendered rather than quoted.
   */
  ...CHAIN.filter(rendersLinkVerbatim).map(({ title }) => title),
]

/**
 * **Two lines of his are deliberately not here**, and the reason is the whole
 * value of the list being verbatim.
 *
 * On 1 October he gave *"Loom is AI model agnostic. Choose your preferred model
 * or one of your own."* as the register to match rather than as copy to publish,
 * and the front door says it in his words with a third sentence added:
 * *"Loom is AI model agnostic. Pick the model you already use, or bring your
 * own. Loom sends it what your users are doing, and it suggests changes from
 * there."* That is this lane's sentence built on his, not his sentence — so it
 * is held to every rule the rest of the site is held to, which is the correct
 * answer and is why the entries above are matched exactly rather than loosely.
 */
