import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { apiEntries } from "./api/reference"

/**
 * Every sentence on this site that says something does not exist, paired with
 * the measurement that will say when it does.
 *
 * **The plain version.** Most of what this site claims is a claim that
 * something **is** so, and every one of those has something holding it up. An
 * example that stops rendering is a red test. A count is printed from the
 * registry rather than typed. A code block is compiled. A diagnostic sentence
 * is the runtime's own words.
 *
 * A sentence saying something **is not** so has nothing like that. *"The
 * starter library has no primitive that reads an answer"* cannot be checked
 * against anything, because you cannot ask a registry whether it lacks a thing
 * the page never named. So it goes stale in total silence — and it goes stale
 * exactly when the framework succeeds, which is the worst possible moment for a
 * page to start lying to a stranger.
 *
 * This file is the remedy the 12 October finding named: **the sentence ships
 * beside the measurement that says so.** A claim registered here is read off
 * the real thing on every `pnpm verify`, and the day it stops being true the
 * build goes red naming the page and what to write instead.
 *
 * ## What that silence had already cost
 *
 * Four sentences on this site had gone false without anything noticing, and
 * every one of them had been false for weeks. The first was found by hand on 12
 * October, which is what this file was asked for; the sweep below found the
 * other three on the day it was written. They are listed because the list is
 * the whole argument:
 *
 * | the page said | it had been false since |
 * | --- | --- |
 * | the starter library has no primitive that reads an answer | 22 September, when 0181 shipped `reads` |
 * | a model is shown the primitives and the themes, and not the sources | **19 September**, when 0172 put `dataCatalogue` in the prompt |
 * | there is no published double for a source or an endpoint that never answers | **29 September** |
 * | nothing stores or interprets reader signals | **13 September** |
 *
 * Three of the four are worth reading twice.
 *
 * **The second** ended with the word *"Filed."* — and the finding it pointed at
 * was this lane's own, filed on 12 September while that page was being written,
 * and closed by 0172 on 19 September. The lane that asked for the sources to
 * reach a prompt went on telling readers they had not, for twenty-four days
 * after getting what it asked for. A finding closes in `FINDINGS.md`; nothing
 * walks back to the sentence that filed it.
 *
 * **The third**: `hangingSource` and `hangingEndpoint` were published on 29
 * September by a framework run whose report is titled *the two doubles that
 * were not there*, and that run's own notes say this lane had hand-written
 * copies of both. So the lane that kept the private copy is the lane that went
 * on telling readers the public one did not exist. The private copy is what
 * made the claim feel true.
 *
 * The fourth was contradicted by this site's **own generated reference**, which
 * had been carrying the journal and the rollups behind
 * `@jam-overture/loom/signals` the whole time. That is §4c's argument for
 * generating a reference rather than writing one, arriving from the other
 * direction.
 *
 * ## What is registered, and what is merely allowed
 *
 * Two lists, and every dated sentence on a written page has to be in one of
 * them:
 *
 * - `SITE_ABSENCES` — a claim about what **Loom** does not have. It carries a
 *   measurement and the build enforces it.
 * - `NOT_DATED_CLAIMS` — a sentence that reads as dated and is not a claim
 *   about Loom's maturity: the page saying where a reader has got to, a thing
 *   in flight rather than a thing unbuilt, copy inside an example, `today`
 *   meaning *under the rules as they stand*. Each group says why.
 *
 * The second list is the price of the first and it is deliberate. There is no
 * regular expression that can tell *"the library has no primitive that reads an
 * answer"* from *"nothing has changed on the page yet"*, so the sweep flags
 * both and a person decides which it is. **Writing the reason is the
 * mechanism**, not a tax on it: the only way a new dated sentence reaches a
 * reader is through somebody looking at it and saying, in one line, which kind
 * it is.
 *
 * ## What this cannot see
 *
 * Only written pages, and only their prose. A sentence a component renders is
 * reached by rendering rather than by reading, which is a different instrument
 * — `_lib/signals/claims.test.ts` and `theming-claims.test.ts` are that
 * instrument pointed at one page each. Code fences are excluded because they
 * are compiled, and a comment inside an example is about the example. A doc
 * comment in this route group is not swept either, and **two** of those were
 * stale on the day this file was written — the one above `DocumentedKind` in
 * `_lib/signals/page.ts`, and the fence context beside it. Both are corrected
 * and neither is guarded, because a module's own notes are allowed to be of
 * their day (`counts.ts` states that exemption for the same reason). It is
 * filed rather than fixed by widening this.
 *
 * Neither does it see a dated claim written without a dated word. *"The starter
 * library has no primitive that reads `loom.data`"* carries no marker at all,
 * so the sweep below would have let it through. The lesson that survives is the
 * finding's own and is for whoever writes the next one: **if a sentence says
 * Loom does not have something, register it here**, and the sweep is only the
 * safety net under that habit.
 */

/** A claim this site makes about something Loom does not have. */
export type SiteAbsence = {
  readonly id: string
  /** The page the sentence is on, as a reader's address. */
  readonly page: string
  /**
   * Distinctive fragments of the sentences that make the claim, as the page
   * writes them.
   *
   * Short and centred on the dated word, so that improving the prose around a
   * claim costs nothing and changing the claim itself costs an edit here. One
   * claim is often spelled over two sentences, which is why this is a list.
   */
  readonly says: readonly string[]
  /** One plain sentence: what does not exist. */
  readonly of: string
  /** Where the measurement reads, for somebody who wants to go and look. */
  readonly from: string
  /**
   * What now exists that the sentence says does not. Empty while the claim
   * holds.
   *
   * A list rather than a boolean so that the failure can name what it found:
   * *"hangingSource, hangingEndpoint"* sends the next run straight to the
   * sentence, where *"expected true to be false"* sends it reading.
   */
  readonly found: () => readonly string[]
  /** One sentence: what the page should say instead, on the day this goes red. */
  readonly whenItLands: string
}

/** A group of sentences that read as dated and are not claims about Loom. */
export type NotADatedClaim = {
  /** Why none of these is a claim about what Loom has. */
  readonly reason: string
  /** The fragments, centred on the dated word, exactly as the pages write them. */
  readonly says: readonly string[]
}

const repoFile = (path: string): string =>
  readFileSync(fileURLToPath(new URL(`../../../../../${path}`, import.meta.url)), "utf8")

/** The version both packages publish at, read off the one manifest that sets it. */
export const publishedVersion = (): string => {
  const { version } = JSON.parse(repoFile("package.json")) as { readonly version: string }

  return version
}

/**
 * Every name a door publishes, for the doors whose specifier a caller picks out.
 *
 * Read off the generated reference, which is built from the declaration files
 * in `dist/` — so this measures what a reader can actually import rather than
 * what `src/` happens to contain.
 */
export const publishedNamesOn = (matches: (specifier: string) => boolean): readonly string[] =>
  apiEntries
    .filter((entry) => matches(entry.specifier))
    .flatMap((entry) => entry.groups.flatMap((group) => group.symbols.map((symbol) => symbol.name)))

const isSignalsDoor = (specifier: string): boolean => specifier.includes("/signals")

const isStoreDoor = (specifier: string): boolean =>
  specifier.endsWith("/store") || specifier.endsWith("/postgres")

/**
 * The claims, each with the thing that will contradict it.
 *
 * Three today. There were seven before this run corrected four of them, and
 * the shrinking is the point: a claim leaves this list by becoming false and
 * being rewritten, never by being quietly forgotten.
 */
export const SITE_ABSENCES: readonly SiteAbsence[] = [
  {
    id: "pre-1-0",
    page: "/docs/getting-started/installation",
    says: ["neither is stable yet", "the library's vocabulary is not yet"],
    of: "Neither package has reached a stable major, so a minor release may still break a prop.",
    from: "the `version` field of the framework's manifest, which is also the version the library publishes at",
    found: () => {
      const version = publishedVersion()

      return version.startsWith("0.") ? [] : [`both packages publish at ${version}`]
    },
    whenItLands:
      "Drop the pre-production callout and say what the stability promise is at 1.0, because a reader deciding whether to depend on this is reading that callout and nothing else.",
  },
  {
    id: "signal-to-intent",
    page: "/docs/the-runtime/what-your-readers-do",
    says: ["the only end of it that exists so far", "becomes a proposed change is the fourth"],
    of: "Nothing turns a reader signal into a proposed change; a deployment reads its own rollups and decides.",
    from: "the names published on the signals doors, which carry the journal, the rollups and the readings and nothing that makes an intent",
    found: () =>
      publishedNamesOn(isSignalsDoor).filter((name) => /intent|propos/i.test(name)),
    whenItLands:
      "Say what makes the intent and which origin the Gate weighs it under, because that closes the loop the whole framework is for and this page is where a reader looks for it.",
  },
  {
    id: "one-store-schema",
    page: "/docs/the-runtime/going-to-production",
    says: ["no general upgrade path"],
    of: "The store schema has one version and no migration framework; the one published migration is a named one-off.",
    from: "the names published on the store doors",
    found: () => {
      const migrations = publishedNamesOn(isStoreDoor).filter((name) => /^migrate/.test(name))

      return migrations.length > 1 ? migrations : []
    },
    whenItLands:
      "A second published migration means the one-off has become a path, so the page owes a reader the order to run them in rather than a list of statements that are safe to re-run.",
  },
]

/**
 * The sentences the sweep flags that are not claims about Loom, and why.
 *
 * Grouped by the reason rather than listed one by one, because the reasons are
 * what a writer needs and they repeat. Eleven groups cover every dated sentence
 * on the site that is not in `SITE_ABSENCES`.
 */
export const NOT_DATED_CLAIMS: readonly NotADatedClaim[] = [
  {
    reason:
      "The page saying where a reader has got to in the sequence. `so far` is about the reading, not about the runtime.",
    says: [
      "on this site so far has had",
      "Nothing so far has checked",
      "So far it has been a picture",
      "on this site so far has been",
      "on this site so far has moved",
    ],
  },
  {
    reason: "The reader's own project, which is empty because they have not built it yet.",
    says: ["What you do not have yet", "with nothing in it yet", "Nothing has changed on the page yet"],
  },
  {
    reason: "Copy inside an example, written for that example's reader rather than for this one.",
    says: ["added your opening hours yet", "in the diary just yet"],
  },
  {
    reason:
      "`today` meaning *under the rules as they stand*, which is a permanent statement wearing a temporal word.",
    says: [
      "whether today's answer is grey",
      "would refuse today stays refused, however",
      "would refuse today stays refused however",
      "how Loom works today",
    ],
  },
  {
    reason: "A thing in flight rather than a thing unbuilt: a request mid-call, a change awaiting an answer.",
    says: ["has not come back yet", "judged and not yet answered"],
  },
  { reason: "The reader's state of mind.", says: ["not yet convinced"] },
  {
    reason: "Trees the reader has not written, which is a fact about their site and not about Loom.",
    says: ["trees nobody has written yet"],
  },
  {
    reason: "Absent by design and permanently, rather than absent for now.",
    says: ["a flawless record that does not exist", "it does not exist on a touchscreen"],
  },
  { reason: "A decision record's own vocabulary, quoted.", says: ["rejected for now"] },
  {
    reason:
      "An argument about why a closed list is credible. It says the list is short, not that anything is missing from it.",
    says: ["it is just short so far"],
  },
  {
    reason: "`at the moment` meaning *at the instant*, which is the opposite of *currently*.",
    says: ["at the moment they happen", "at the moment of the answer"],
  },
]

/**
 * The words that make a sentence read as dated.
 *
 * A closed list, and wider than the sentences on the site need it to be:
 * `currently`, `at present`, `as things stand` and `for the time being` match
 * nothing today and are here so that the first one somebody writes is flagged
 * rather than missed. `today` earns its place by catching two real claims, at
 * the cost of four entries in `NOT_DATED_CLAIMS`.
 */
const DATED = new RegExp(
  [
    "not yet",
    "yet",
    "so far",
    "for now",
    "for the time being",
    "at present",
    "at the moment",
    "currently",
    "as things stand",
    "as of today",
    "today",
    "has not been (?:built|written|implemented|decided)",
    "does not exist",
    "undecided",
    "unbuilt",
  ].join("|"),
  "i"
)

/**
 * Every sentence of a page's prose that reads as dated.
 *
 * Fences come out first because they are compiled, and import lines because
 * they are not prose. Then paragraphs, then sentences: splitting straight to
 * sentences glues a heading to the paragraph under it, which made the first
 * version of this report three lines of an import block.
 */
export const datedSentencesIn = (source: string): readonly string[] =>
  source
    .replace(/^```[\s\S]*?^```/gm, "")
    .split("\n")
    .filter((line) => !/^\s*(?:import|export)\b/.test(line))
    .join("\n")
    .split(/\n\s*\n/)
    .flatMap((block) => block.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/))
    .filter((sentence) => DATED.test(sentence))
