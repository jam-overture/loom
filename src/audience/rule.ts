/**
 * Which audiences a reader is in, decided in the customer's own process.
 *
 * [0263](../../decisions/0263-a-page-is-a-base-tree-and-the-deltas-an-audience-earns.md)
 * clause 1 says an audience is a **predicate over the opaque render context**,
 * and clause 4 says the match happens in the data plane, per request, with
 * nothing about the reader leaving it. This module is that predicate and that
 * match, and it is the half of an audience `audience.ts` deliberately does not
 * hold.
 *
 * **It does not contradict 0284, and the distinction is the whole design.**
 * That record says the predicate *lives in the control plane's rules* and that
 * *no column holds a rule, an expression, a context key or a matched value* —
 * both of which are about where a rule is **authored and stored**. A rule is
 * written in the portal and kept there; it is **shipped** to the customer's app
 * and **evaluated** there, beside the base tree, which is the only place it can
 * be evaluated without a request to Loom in front of every page view (0262).
 * Nothing here stores a rule and nothing here learns what one means: a rule
 * arrives as data, is read once, and answers a list of ids.
 *
 * So the control plane says *what `aud_eu` is*; this says *whether this reader
 * is in it*; and `audience.ts` says *what the id looks like once both are done*.
 */

import { z } from "zod"

import type { JsonObject, JsonValue } from "../json.js"

import { audienceIdSchema, type AudienceId } from "./audience.js"

/**
 * The values a clause may compare against.
 *
 * JSON's scalars and no more. A context key holding an object or an array never
 * matches — stated here rather than left to `===`, which would answer `false`
 * for two structurally equal objects and look like a rule that does not work
 * rather than one that was never offered. A host with structure in its context
 * flattens it into keys, which is what a rule can read.
 */
export type AudienceValue = string | number | boolean | null

const audienceValueSchema: z.ZodType<AudienceValue> = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null(),
])

/**
 * One context key, and the values of it this clause accepts.
 *
 * `anyOf` rather than a single value because *locale is one of en-GB, en-IE* is
 * the ordinary case and the alternative is one audience per locale, each with
 * its own copy of the same delta — the maintenance failure 0263 rejected a tree
 * per variant over, arriving one level down.
 */
export type AudienceClause = {
  readonly key: string
  /** Non-empty: a clause accepting nothing is a rule that can never match. */
  readonly anyOf: readonly AudienceValue[]
}

export const audienceClauseSchema = z.object({
  key: z.string().min(1),
  anyOf: z.array(audienceValueSchema).min(1),
})

/**
 * An audience, and what puts a reader in it.
 *
 * The clauses are a **conjunction** and there is no `or` at this level, because
 * two rules both matching is already the answer to *or* — `audiencesFor`
 * returns every audience that matched, and a reader in two audiences earns both
 * deltas. A rule language with its own `or` would be a second way to say what
 * the list of rules already says, and a third to maintain.
 *
 * **At least one clause.** A rule matching every reader is `aud_everyone`,
 * which the base tree already serves by being the base; a second way to say
 * *everyone* is a delta that silently applies to a deployment that thought it
 * had none.
 */
export type AudienceRule = {
  readonly audienceId: AudienceId
  readonly clauses: readonly AudienceClause[]
}

export const audienceRuleSchema = z.object({
  audienceId: audienceIdSchema,
  clauses: z.array(audienceClauseSchema).min(1),
})

const scalar = (value: JsonValue | undefined): AudienceValue | undefined =>
  value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? value
    : undefined

/**
 * Whether one clause is satisfied by the context.
 *
 * An absent key does not match, and neither does a key holding structure. Both
 * are *this reader is not in this audience* rather than an error: a context is
 * the host's to shape and a rule is written against the shape the host says it
 * has, so a mismatch is a rule that does not apply rather than a request that
 * cannot be served.
 */
const clauseMatches = (clause: AudienceClause, context: JsonObject): boolean => {
  const value = scalar(context[clause.key])

  return value === undefined ? false : clause.anyOf.includes(value)
}

export const ruleMatches = (rule: AudienceRule, context: JsonObject): boolean =>
  rule.clauses.every((clause) => clauseMatches(clause, context))

/**
 * Every audience this reader is in, in the order the rules were given.
 *
 * **The order is the deployment's and it is load-bearing**, because two deltas
 * reaching the same node resolve by the order they are applied in — so it must
 * be something a deployment sets and reads back, rather than something a map's
 * iteration or an id's spelling decides.
 *
 * An audience named by two matching rules appears **once, at its first
 * position**. Its delta is one delta; applying it twice would double whatever
 * it inserted, and the only reason two rules name one audience is that the
 * deployment wrote two ways into the same group.
 *
 * A reader with no context is in no audience, which is the same answer as a
 * context nothing matches: the base tree, unchanged.
 */
export const audiencesFor = (
  rules: readonly AudienceRule[],
  context: JsonObject | undefined
): readonly AudienceId[] => {
  if (context === undefined) return []

  return [...new Set(rules.filter((rule) => ruleMatches(rule, context)).map((rule) => rule.audienceId))]
}
