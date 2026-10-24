import { publishedNames } from "./api/mentions"

/**
 * Which spellings this site refuses in a sentence, and which ones it has to
 * keep in a name.
 *
 * **The plain version.** This site is written in US English: *color*,
 * *behavior*, *analyze*. Some of the names in the package are spelled the
 * British way — `colour`, `behaviour`, `catalogue` — and those stay exactly as
 * the package spells them, because a reader has to type them. So the rule is
 * about which voice a word is in rather than about the word:
 *
 * - **A word in a sentence is ours**, and it is spelled the American way.
 * - **A name in code voice is the package's**, and it is spelled whichever way
 *   the package spells it.
 *
 * `voice.ts` sweeps the first half over every page. This module is the words
 * themselves, and the arithmetic over the published surface that the reference's
 * own front page prints. It is separate from the sweep because the sweep reads
 * every page of the site, the reference's front page is one of those pages, and
 * a component on it importing the sweep is a cycle.
 */

/**
 * The British spellings, as the pattern source rather than as a regular
 * expression.
 *
 * **A source string and not a `RegExp`, deliberately.** A `/g` regular
 * expression carries a `lastIndex`, so `test` or `exec` called twice over a
 * list answers about two different offsets: it reports one name as British
 * because the previous name was, and skips the next one for the same reason.
 * The first draft of this filtered seventeen hundred published names through a
 * shared matcher with `test`, and what came back was neither the right list nor
 * a repeatable one.
 *
 * **Every reader below uses `matchAll`, which is not exposed to that** — it
 * clones the matcher and leaves the original's `lastIndex` alone. So building
 * one per call is a guard against the next caller rather than something a test
 * can catch today, and a mutation that shares one survives the suite. It is
 * still the right shape: what is cheap here is not exporting a matcher at all,
 * so a future `test` cannot be written against a shared one.
 *
 * **Only words that are British.** The marketing list this was taken from is a
 * *detector* over copy that never names an export, so `colou?rs?` is free
 * there — it may catch *colors* as well, since that page is not allowed either
 * word. Here *color* is the spelling the site is supposed to use, and a pattern
 * that matched it would fail every page for being right.
 */
const BRITISH_SPELLINGS: readonly string[] = [
  "colour(s|ed|ing|ful|less)?",
  "behaviour(s|al|ally)?",
  "honour(s|ed|ing|able)?",
  "favourite(s)?",
  "neighbour(s|ing|hood)?",
  "centr(e|es|ed|ing)",
  "theatre(s)?",
  "metre(s)?",
  "organis(e|es|ed|ing|ation|ations)",
  "recognis(e|es|ed|ing|able)",
  "realis(e|es|ed|ing)",
  "apologis(e|es|ed|ing)",
  "emphasis(e|es|ed|ing)",
  "analys(e|es|ed|ing)",
  "catalogu(e|es|ed|ing)",
  "dialogue(s)?",
  "defence(s)?",
  "licence(s|d)?",
  "practis(e|es|ed|ing)",
  "travell(ed|ing|er|ers)",
  "cancell(ed|ing)",
  "labell(ed|ing)",
  "modell(ed|ing)",
  "signall(ed|ing)",
  "whilst",
  "amongst",
  "learnt",
  "spelt",
  "grey(s|ed|er|ish|ing)?",
  "programme(s)?",
  "judgement(s)?",
  "ageing",
  "sizeable",
  "offence(s)?",
  "storey(s)?",
  "cheque(s)?",
  "tyre(s)?",
  "plough(s|ed|ing)?",
  "draught(s)?",
  "kerb(s)?",
  "pyjamas",
  "aluminium",
  "maths",
]

/** A fresh matcher. Never a shared one — see {@link BRITISH_SPELLINGS}. */
const matcher = (): RegExp => new RegExp(`\\b(?:${BRITISH_SPELLINGS.join("|")})\\b`, "gi")

const spellingsIn = (text: string): readonly string[] => [
  ...new Set([...text.matchAll(matcher())].map((match) => match[0].toLowerCase())),
]

/**
 * The British spellings in a sentence, lowercased, each one once.
 *
 * **Whole words**, because prose has words in it: a sentence about a *greyhound*
 * is not a sentence about a *grey* anything, and the word this rule is after is
 * the one a reader could have spelled either way.
 *
 * Lowercased because *Behaviour* in a heading and *behaviour* in the paragraph
 * under it are one thing to fix, and a failure message listing both twice is a
 * failure message somebody skims.
 *
 * **A prefixed form is missed**, and it is worth knowing rather than fixing:
 * *recentre* and *discoloured* carry a British spelling and the boundary is in
 * the wrong place to see it. Widening the list to match a prefix would also
 * match the middle of words that are not these, which is the trade the whole
 * module is written around. Nothing on this site says one today.
 */
export const britishSpellingsIn = (text: string): readonly string[] => spellingsIn(text)

/**
 * An identifier, as the words it is made of.
 *
 * `PrimitiveBehaviours` is two words, `BEHAVIOUR_NAMES` is two words, and
 * `catalogueOf` is two words. A reader of sentences cannot see any of them,
 * because `\b` is a boundary between a word character and a non-word character
 * and the inside of an identifier has none.
 *
 * **The obvious shortcut is wrong**, and it is the second thing this module got
 * wrong before it got it right: dropping the boundaries and matching anywhere
 * in the string reads `IrreversibilityReason` as British, because *…ty* and
 * *Re…* meet and spell `tyre`. A matcher with no boundaries has no idea which
 * joins are real. Splitting first gives it the boundaries back, so one rule
 * reads a sentence and an identifier.
 */
const wordsInName = (name: string): readonly string[] =>
  name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[^A-Za-z]+/)
    .filter((word) => word.length > 0)

/**
 * The British spellings inside an identifier.
 *
 * Pointed only at names the package publishes. Everything about *which*
 * spellings count is shared with the sentence reader above; the whole
 * difference is {@link wordsInName}, which is where an identifier's words come
 * from.
 */
export const britishSpellingsInName = (name: string): readonly string[] => [
  ...new Set(wordsInName(name).flatMap((word) => spellingsIn(word))),
]

/**
 * Every published name with a British spelling in it, alphabetically.
 *
 * This is the half of the rule that is not about the prose. These are names a
 * reader has to type, so they are spelled the package's way wherever this site
 * shows one — and the reference pages show them by the hundred, generated from
 * the package.
 *
 * **Derived, and nothing in this repository lists one.** That matters for the
 * day somebody renames `PrimitiveBehaviours`: the exemption goes with the name,
 * in the same commit, rather than quietly becoming the site's only spelling of
 * a word the package no longer uses.
 */
export const packageBritishNames: readonly string[] = [...publishedNames]
  .filter((name) => britishSpellingsInName(name).length > 0)
  .sort()

/**
 * Which word family a British spelling belongs to.
 *
 * The key is the pattern that matched, which is opaque and is never printed —
 * what it is for is grouping. `catalogue` and `catalogued` are one word to a
 * reader and would otherwise be two examples making the same point, which is
 * why every entry in {@link BRITISH_SPELLINGS} is one word with its inflections
 * in it rather than one spelling.
 */
const familyOf = (spelling: string): string | undefined =>
  BRITISH_SPELLINGS.find((pattern) => new RegExp(`^(?:${pattern})$`, "i").test(spelling))

/**
 * One real published name per British word the package uses, most used first.
 *
 * The reference's front page tells a reader about this in a sentence, and a
 * sentence with three names typed into it is a sentence that is false the day
 * one of them is renamed. So the examples are drawn from the package: one name
 * per word, the shortest carrying it, ordered by how many names carry that
 * word.
 *
 * **Shortest** because an example is read rather than imported: `colour` makes
 * the point `probeColourPairings` makes while asking less of the reader.
 */
export const britishNameExamples = (): readonly string[] => {
  const byFamily = new Map<string, readonly string[]>()

  for (const name of packageBritishNames) {
    for (const spelling of britishSpellingsInName(name)) {
      const family = familyOf(spelling)

      if (family === undefined) continue

      byFamily.set(family, [...(byFamily.get(family) ?? []), name])
    }
  }

  return [...byFamily.values()]
    .sort((left, right) => right.length - left.length)
    .flatMap((names) => {
      const [shortest] = [...names].sort((left, right) => left.length - right.length)

      return shortest === undefined ? [] : [shortest]
    })
    .filter((name, index, all) => all.indexOf(name) === index)
}

/** What the reference's front page says about the spelling of these names. */
export type PackageSpelling = {
  /** Every published name with a British spelling in it. */
  readonly british: readonly string[]
  /** One of them per British word, as {@link britishNameExamples} picks them. */
  readonly examples: readonly string[]
}

/**
 * The two readings the page needs, taken once.
 *
 * Resolved here and handed to the component rather than imported by it, which
 * is the arrangement `api/body.tsx` already keeps for everything else on that
 * page: a component that takes data can have its tests state a package, and a
 * component that reads the package can only ever be tested against this one.
 * The band that draws nothing when there is nothing to say is the case that
 * needs it — there is no way to make this repository's own package have no
 * British name in it.
 */
export const packageSpelling = (): PackageSpelling => ({
  british: packageBritishNames,
  examples: britishNameExamples(),
})
