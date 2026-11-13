import { z } from "zod"

import {
  audienceIdSchema,
  DEFAULT_AUDIENCE_ID,
  type AudienceClause,
  type AudienceId,
  type AudienceRule,
  type AudienceRuleRevision,
} from "@jam-overture/loom/store"

/**
 * A project's segments (unit 9 of `docs/portal.md`, piece 1 of
 * [0371](../../../../../../decisions/0371-a-segment-is-an-audience-the-site-sorts-its-readers-into-and-loom-keeps-only-its-rules-and-its-name.md)):
 * groups of readers the site's own server sorts its readers into, by rules over
 * keys it puts in its render context.
 *
 * **A segment is an audience and is kept nowhere of its own.** Its rules live
 * in 0376's store, one ordered list per page, so a segment *is* the rules that
 * name its audience across the project's pages: there is no portal table, and
 * a segment whose last rule is removed is gone. Everything here is a pure
 * function of those lists; the reads and writes are `rules.ts`'.
 *
 * **Its name is its id.** A segment is called by one word in the site's own
 * vocabulary (`phone`, `returning`, `search`), and its audience is `aud_` and
 * that word, as the base's is `aud_everyone`. 0376's store keeps a rule's
 * audience and clauses and nothing else, so a name kept apart from the id would
 * need a table, which 0371's acceptance ruled out for this piece. The word is
 * also what the site writes on its signals, so the name on the screen and the
 * id in a batch can never disagree.
 */

/** 0371's default: every segment splits the page views a verdict waits on, so ten keeps them readable. */
export const MAX_SEGMENTS = 10

/** A context key, in the site's words: what its server sets before it draws the page. */
export const CONTEXT_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_.-]{0,39}$/u

/** At most this many conditions on one segment, and values in one condition. */
export const MAX_CONDITIONS = 8
export const MAX_VALUES = 20
export const MAX_VALUE_LENGTH = 80

/** The base audience's word, which no segment may take: the base already serves everyone. */
const EVERYONE = DEFAULT_AUDIENCE_ID.slice("aud_".length)

export const segmentWordSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z][a-z0-9]{0,31}$/u)
  .refine((word) => word !== EVERYONE)

export type SegmentWord = z.infer<typeof segmentWordSchema>

export const audienceOfSegment = (word: SegmentWord): AudienceId =>
  audienceIdSchema.parse(`aud_${word}`)

export const segmentWordOf = (audienceId: AudienceId): string => audienceId.slice("aud_".length)

/** One page's rules as `rules.ts` read them, beside what the page is called. */
export type PageRules = {
  readonly treeId: string
  readonly name: string
  /** `undefined` for a page nobody has written rules for. */
  readonly head: AudienceRuleRevision | undefined
}

/** Where one segment sits on one page. */
export type SegmentPlace = {
  readonly treeId: string
  readonly page: string
  /** 1-based, in the page's order, where a later rule wins a contested part (0359 clause 3). */
  readonly position: number
  readonly of: number
  readonly clauses: readonly AudienceClause[]
}

export type Segment = {
  readonly word: string
  readonly audienceId: AudienceId
  readonly places: readonly SegmentPlace[]
  /** Whether every page it is on sorts readers into it by the same conditions. */
  readonly sameEverywhere: boolean
}

const sameClauses = (left: readonly AudienceClause[], right: readonly AudienceClause[]): boolean =>
  JSON.stringify(left) === JSON.stringify(right)

/** Every segment named on any of the pages, by word, each with where it sits on every page it is on. */
export const segmentsOf = (pages: readonly PageRules[]): readonly Segment[] => {
  const places = pages.flatMap((page) =>
    (page.head?.rules ?? []).map((rule, index, rules) => ({
      audienceId: rule.audienceId,
      place: {
        treeId: page.treeId,
        page: page.name,
        position: index + 1,
        of: rules.length,
        clauses: rule.clauses,
      },
    }))
  )
  const ids = [...new Set(places.map(({ audienceId }) => audienceId))]

  return ids
    .map((audienceId): Segment => {
      const mine = places
        .filter((entry) => entry.audienceId === audienceId)
        .map(({ place }) => place)

      return {
        word: segmentWordOf(audienceId),
        audienceId,
        places: mine,
        sameEverywhere: mine.every((place) => sameClauses(place.clauses, mine[0]?.clauses ?? [])),
      }
    })
    .sort((left, right) => left.word.localeCompare(right.word))
}

/** The keys a site's server must set for its segments, each once, in alphabetical order. */
export const contextKeysOf = (segments: readonly Segment[]): readonly string[] =>
  [
    ...new Set(
      segments.flatMap((segment) =>
        segment.places.flatMap((place) => place.clauses.map((clause) => clause.key))
      )
    ),
  ].sort((left, right) => left.localeCompare(right))

const valuesWords = (values: readonly AudienceClause["anyOf"][number][]): string => {
  const quoted = values.map((value) => `“${String(value)}”`)

  return quoted.length === 1
    ? (quoted[0] ?? "")
    : `${quoted.slice(0, -1).join(", ")} or ${quoted.at(-1) ?? ""}`
}

/** *device is “phone”, and source is “search” or “social”*. */
export const conditionsSentence = (clauses: readonly AudienceClause[]): string =>
  clauses.map((clause) => `${clause.key} is ${valuesWords(clause.anyOf)}`).join(", and ")

/** The conditions as the form shows them to be edited: one line each, `key = a, b`. */
export const conditionsText = (clauses: readonly AudienceClause[]): string =>
  clauses.map((clause) => `${clause.key} = ${clause.anyOf.map(String).join(", ")}`).join("\n")

export type ConditionsFault = { readonly line: number; readonly says: string }

const conditionOf = (line: string, index: number): AudienceClause | ConditionsFault => {
  const at = line.indexOf("=")
  const number = index + 1

  if (at === -1) return { line: number, says: "needs a key, an “=” and the values it may hold" }

  const key = line.slice(0, at).trim()
  const values = [
    ...new Set(
      line
        .slice(at + 1)
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    ),
  ]

  if (!CONTEXT_KEY_PATTERN.test(key)) {
    return {
      line: number,
      says: "starts with a key of letters, digits, “_”, “.” or “-”, beginning with a letter",
    }
  }

  if (values.length === 0) return { line: number, says: `gives ${key} no value to match` }

  if (values.length > MAX_VALUES) {
    return { line: number, says: `gives ${key} more than ${MAX_VALUES} values` }
  }

  if (values.some((value) => value.length > MAX_VALUE_LENGTH)) {
    return { line: number, says: `has a value longer than ${MAX_VALUE_LENGTH} characters` }
  }

  return { key, anyOf: values }
}

const isFault = (read: AudienceClause | ConditionsFault): read is ConditionsFault => "says" in read

/**
 * The conditions typed into the form, one a line: `device = phone`,
 * `source = search, social`. A reader is in the segment when every line holds
 * (0359's conjunction); values on one line are alternatives. Values are kept as
 * the words typed, so the site's server sets each key to a word.
 */
export const readConditions = (
  text: string
):
  | { readonly ok: true; readonly clauses: readonly AudienceClause[] }
  | { readonly ok: false; readonly faults: readonly ConditionsFault[] } => {
  const lines = text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    return { ok: false, faults: [{ line: 0, says: "A segment needs at least one condition." }] }
  }

  if (lines.length > MAX_CONDITIONS) {
    return {
      ok: false,
      faults: [{ line: 0, says: `A segment has at most ${MAX_CONDITIONS} conditions.` }],
    }
  }

  const read = lines.map(conditionOf)
  const faults = read.filter(isFault)
  const clauses = read.filter((entry): entry is AudienceClause => !isFault(entry))
  const keys = clauses.map((clause) => clause.key)
  const repeated = keys.find((key, index) => keys.indexOf(key) !== index)

  if (faults.length > 0) return { ok: false, faults }

  if (repeated !== undefined) {
    return {
      ok: false,
      faults: [{ line: 0, says: `${repeated} is named twice; put its values on one line.` }],
    }
  }

  return { ok: true, clauses }
}

/**
 * The page's rules with this one in them: where its audience already has a
 * rule, in that rule's place, so changing a segment's conditions never changes
 * what it wins; otherwise last, where a new and usually narrower segment
 * belongs (0371 clause 3: general to specific).
 */
export const placeRule = (
  rules: readonly AudienceRule[],
  rule: AudienceRule
): readonly AudienceRule[] =>
  rules.some((held) => held.audienceId === rule.audienceId)
    ? rules.map((held) => (held.audienceId === rule.audienceId ? rule : held))
    : [...rules, rule]

/** The page's rules without this audience's. */
export const withoutRule = (
  rules: readonly AudienceRule[],
  audienceId: AudienceId
): readonly AudienceRule[] => rules.filter((rule) => rule.audienceId !== audienceId)

export type Direction = "earlier" | "later"

export const directionSchema = z.enum(["earlier", "later"])

/** The page's rules with this audience's swapped with its neighbour; unchanged at either end. */
export const movedRule = (
  rules: readonly AudienceRule[],
  audienceId: AudienceId,
  direction: Direction
): readonly AudienceRule[] => {
  const from = rules.findIndex((rule) => rule.audienceId === audienceId)
  const to = direction === "earlier" ? from - 1 : from + 1
  const moving = rules[from]
  const other = rules[to]

  if (from === -1 || moving === undefined || other === undefined) return rules

  return rules.map((rule, index) => (index === from ? other : index === to ? moving : rule))
}

/** How many segments the project would have once these pages hold these rules. */
export const segmentCountAfter = (
  pages: readonly PageRules[],
  changed: ReadonlyMap<string, readonly AudienceRule[]>
): number =>
  new Set(
    pages.flatMap((page) =>
      (changed.get(page.treeId) ?? page.head?.rules ?? []).map((rule) => rule.audienceId)
    )
  ).size
