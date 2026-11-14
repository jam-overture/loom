import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import type {
  SilenceCondition,
  SilenceMeaning,
  SilenceSubject,
  SilenceVocabulary,
} from "./index.js"
import * as published from "./index.js"

/**
 * Is every silence set in this directory actually in the census?
 *
 * `silences.ts` maps every reading's reasons for saying nothing onto a condition
 * and a subject, and the mapping is a **hand-written table**. So a set that
 * lands beside it and is never added to it is invisible: no test fails, because
 * nothing in the repository looks for a set the table has never heard of. Two
 * had accumulated by 14 November — `DayShapeSilence`, published on 10 November,
 * and `SenderSilence`, published on 13 November — and the second was added by
 * this lane three days after the first was filed here as a gap.
 *
 * This is the sweep that makes *every set is mapped* a fact rather than a
 * claim. It reads the source of this directory, finds each published silence
 * set in it, and then resolves that set's own published members and its entry in
 * the census through `index.js` — so a set is checked against what the subsystem
 * exports rather than against a list this file keeps.
 *
 * ## The three conventions it holds, and all three were already true
 *
 * Every set in this directory, before this test was written, satisfied all of
 * them. That is what makes them conventions worth enforcing rather than rules
 * invented here:
 *
 * 1. **A set publishes its own members**, as `NAME_SILENCES`. A set that does
 *    not cannot be enumerated by anything — including the census and including
 *    this sweep — without someone re-typing its members somewhere else.
 * 2. **A set is mapped**, by a `meaningOf…` in `silences.ts`.
 * 3. **A set declared in `foo.ts` is the vocabulary `foo`.** Twenty-two of the
 *    twenty-four held this by accident of good naming; it is a rule now, and it
 *    is the one that makes the first two checkable from a file name.
 *
 * It deliberately does **not** require a `describe…Silence`: three sets here
 * publish none, which is a thinness filed in `FINDINGS.md` rather than a rule
 * broken, and a sweep that fails on the state of the tree it was written against
 * is a sweep nobody can land.
 *
 * ## It is also where the module's two arithmetic claims live
 *
 * `silences.ts` used to open by saying how many sets and how many members there
 * were. Both figures had gone false — the prose said twenty-one sets and a
 * hundred and eighteen members against twenty-four and a hundred and fifteen —
 * which is the lane's standing complaint about a remembered figure, in its own
 * module. The sentence no longer carries a number and the claim it was making,
 * that there are fewer conditions than members, is asserted here instead.
 *
 * Pure except for reading this directory, and nothing here reaches a browser.
 */
const LANE = "src/signals"

const { SILENCE_CONDITIONS, SILENCE_SUBJECTS, SILENCE_VOCABULARIES, SUBJECT_OF_VOCABULARY } =
  published

/** The declarations a sweep over source has to ignore to be about silence sets. */
const SKIP = (file: string): boolean =>
  !file.endsWith(".ts") || file.endsWith(".test.ts") || file.endsWith(".contract.ts")

const DECLARATION = /export type (\w+Silence) =([\s\S]*?)(?=\n(?:export|const|type|\/\*\*)|$)/g

/**
 * A set is a **union**; a row type that carries one is an object.
 *
 * The discriminator is deliberately the shape of the alias and not its members:
 * six of the sets here open on another set rather than on a name of their own —
 * `KindActionSilence` begins `| KindReachSilence`, which is the reuse 0256 and
 * 0265 argued for — and a sweep that looked for a string literal first would
 * have silently dropped exactly the sets that share their states with another.
 */
const isUnion = (body: string): boolean =>
  /^(?:\||")/.test(body.replace(/\/\*\*[\s\S]*?\*\//g, "").trim())

/** What a set's own module calls the array of its members. */
const membersNameOf = (type: string): string =>
  `${type.replace(/(?<!^)(?=[A-Z])/g, "_").toUpperCase()}S`

type DiscoveredSet = {
  readonly type: string
  readonly file: string
  /** The file's basename, which convention 3 says is the vocabulary. */
  readonly vocabulary: string
}

const discover = (): readonly DiscoveredSet[] =>
  readdirSync(LANE)
    .filter((file) => !SKIP(file))
    .flatMap((file) => {
      const source = readFileSync(join(LANE, file), "utf8")

      return [...source.matchAll(DECLARATION)].flatMap((match) => {
        const type = match[1] ?? ""
        const body = match[2] ?? ""

        return isUnion(body)
          ? [{ type, file, vocabulary: file.replace(/\.ts$/, "") }]
          : []
      })
    })

/**
 * The exports, by name, because that is what the conventions are about.
 *
 * A sweep that imported each set by hand would be the hand-written table over
 * again, one directory along.
 */
const exports_: Readonly<Record<string, unknown>> = published as unknown as Readonly<
  Record<string, unknown>
>

const membersOf = (set: DiscoveredSet): readonly string[] => {
  const members = exports_[membersNameOf(set.type)]

  return Array.isArray(members) ? members.filter((of): of is string => typeof of === "string") : []
}

const meaningsOf = (set: DiscoveredSet): readonly SilenceMeaning[] => {
  const mapping = exports_[`meaningOf${set.type}`]

  if (typeof mapping !== "function") return []

  return membersOf(set).map((member) => (mapping as (of: string) => SilenceMeaning)(member))
}

describe("every silence set in the subsystem", () => {
  const sets = discover()

  it("is found by the sweep, so a passing run is not an empty one", () => {
    expect(sets.length).toBeGreaterThanOrEqual(24)
    expect(sets.map((set) => set.type)).toContain("SenderSilence")
    expect(sets.map((set) => set.type)).toContain("DayShapeSilence")
  })

  /**
   * The row type the census itself publishes is not a set, and a sweep that
   * counted it would be asking `silences.ts` to map a table of its own output.
   */
  it("is a union, so a row type carrying a silence is not mistaken for one", () => {
    expect(sets.map((set) => set.type)).not.toContain("ReadingSilence")
  })

  it("publishes its own members, so nothing has to re-type them to enumerate it", () => {
    const silent = sets.filter((set) => membersOf(set).length === 0)

    expect(silent.map((set) => `${set.file}: ${membersNameOf(set.type)}`)).toEqual([])
  })

  it("is named after the file that declares it, which is what makes the rest checkable", () => {
    const unnamed = sets.filter(
      (set) => !SILENCE_VOCABULARIES.includes(set.vocabulary as SilenceVocabulary)
    )

    expect(unnamed.map((set) => `${set.file}: ${set.vocabulary}`)).toEqual([])
  })

  it("is mapped by the census, which is the gap this sweep exists for", () => {
    const unmapped = sets.filter((set) => typeof exports_[`meaningOf${set.type}`] !== "function")

    expect(unmapped.map((set) => `${set.file}: meaningOf${set.type}`)).toEqual([])
  })

  it("maps every one of its members onto a published condition and subject", () => {
    for (const set of sets) {
      const meanings = meaningsOf(set)

      expect(meanings).toHaveLength(membersOf(set).length)

      for (const meaning of meanings) {
        expect(SILENCE_CONDITIONS).toContain(meaning.condition)
        expect(SILENCE_SUBJECTS).toContain(meaning.subject)
        expect(SILENCE_VOCABULARIES).toContain(meaning.vocabulary)
        expect(meaning.vocabulary).toBe(set.vocabulary)
        expect(meaning.subject).toBe(SUBJECT_OF_VOCABULARY[meaning.vocabulary])
      }
    }
  })

  /**
   * The other direction: a vocabulary whose set has been renamed or removed
   * would otherwise stay published with nothing able to report it.
   */
  it("accounts for every published vocabulary, so none is left mapping nothing", () => {
    const declared = new Set(sets.map((set) => set.vocabulary))
    const orphans = SILENCE_VOCABULARIES.filter((vocabulary) => !declared.has(vocabulary))

    expect(orphans).toEqual([])
  })

  it("leaves no published condition that no set reports", () => {
    const reported = new Set<SilenceCondition>(
      sets.flatMap((set) => meaningsOf(set).map((meaning) => meaning.condition))
    )

    expect(SILENCE_CONDITIONS.filter((condition) => !reported.has(condition))).toEqual([])
  })

  it("leaves no published subject that no set reports", () => {
    const reported = new Set<SilenceSubject>(
      sets.flatMap((set) => meaningsOf(set).map((meaning) => meaning.subject))
    )

    expect(SILENCE_SUBJECTS.filter((subject) => !reported.has(subject))).toEqual([])
  })

  /**
   * The claim `silences.ts` opens with, asserted rather than counted in prose.
   *
   * It is what the module is for: if the conditions were as many as the members,
   * the table would be a renaming and no two readings would ever be relatable.
   */
  it("adds up to more members than there are conditions, which is the overlap the census states", () => {
    const members = sets.reduce((total, set) => total + membersOf(set).length, 0)

    expect(members).toBeGreaterThan(SILENCE_CONDITIONS.length)
    expect(members).toBeGreaterThanOrEqual(115)
  })
})
