import { z } from "zod"

import type { BindingReader } from "../render/reads.js"

import type { PropsVocabulary } from "./vocabulary.js"

/**
 * Which of the write path's optional checks a runtime was actually holding when
 * it judged a change.
 *
 * `policyFingerprintOf` proves that two judgments consulted the same rules, and
 * a reader is entitled to hear that as *the same thing judged both*. It is not
 * quite that. 0179 keeps a props vocabulary off the policy on purpose — it is a
 * function, and a policy is a Zod-parsed serialisable value — so a deployment
 * that wires one on Tuesday produces dispositions on Wednesday whose fingerprint
 * is byte-identical to Monday's. The policy did not change. What decided did.
 *
 * That gap was filed on 21 September as a stated limit, and the thing that made
 * it worth closing arrived afterwards: 0208 wired a second seam the same way, so
 * there are now two inputs that can turn an `accepted` into a `rejected` and
 * leave no trace of having been consulted. A refusal rate that moved in the week
 * somebody wired a registry into the write path is either explained by that
 * wiring or is a fault, and nothing in this repository could tell those apart.
 *
 * **These are named rather than digested, and that is the design.** A policy has
 * fourteen knobs of host data, so what it contains can only be compared as a
 * hash; the seams are two, their names are Loom's own, and a list of them is
 * something a person can read against their own composition root. The
 * fingerprint's own doc comment makes the argument for the other side of this
 * trade — *a digest is not something a person can look up in their own
 * configuration* — and here there is nothing to look up, because the record says
 * `props` or it does not.
 *
 * Naming also means this needs no shape half. A fingerprint carries one because
 * adding a knob to the policy would otherwise change every digest in the corpus
 * and make every host look as though it had edited a policy it never touched.
 * Adding a *check* changes no existing list: a judgment from a version that had
 * two checks and wired both says `props, bindings`, and so does a judgment from a
 * version that has three and wired the same two. They compare equal, which is
 * correct — a check that was not wired and a check that did not yet exist were
 * applied exactly as much as each other.
 *
 * What this does not reach: whether a wired seam's *answers* changed. A props
 * vocabulary is `propsVocabularyFor(registry)`, so tightening one primitive's
 * schema changes what it refuses while this record stays identical. The runtime
 * cannot read a function, and a record that implied otherwise would be worse than
 * one with a single clear meaning — so this says which checks were in place and
 * nothing about what they concluded.
 */

export const writeCheckSchema = z.enum(["props", "bindings"])

/**
 * One check the write path performs only when a composition root hands it the
 * seam to perform it with.
 *
 * - `props` — the node's own primitive accepts the props it would carry (0179).
 * - `bindings` — something will read the answer a bound node asks for (0208).
 *
 * The type-name vocabulary is deliberately not here. *Which primitives exist at
 * all* is `registeredPrimitiveTypes`, a policy field, so it is already inside the
 * fingerprint and an empty list already reads as a host that has not spoken
 * (0173). Listing it again would record one input twice and leave a reader
 * unable to tell which of the two records to believe.
 */
export type WriteCheck = z.infer<typeof writeCheckSchema>

/**
 * Every check this version of Loom has a seam for, in the order a composition
 * root meets them — which is also the order `assessChange` takes them, and the
 * canonical order `wiredChecksOf` writes a list in, so that two runtimes holding
 * the same checks produce the same list rather than two spellings of it.
 */
export const WRITE_CHECKS: readonly WriteCheck[] = writeCheckSchema.options

/**
 * The seams, as much of them as reading the record needs.
 *
 * A structural subset of `CompositionRuntime` rather than that type's
 * declaration: the composition root is where a host writes what it is wiring,
 * with the doc comments explaining each seam, and splitting it to win a guard
 * rail here would have cost a reading surface — lesson 5 prints the runtime
 * whole, and a type assembled from two files cannot be printed whole.
 *
 * So the correspondence is held from the test side instead, where
 * `checks.test.ts` enumerates `CompositionRuntime`'s optional fields and makes a
 * seam added there a compile error until somebody decides whether it is a check.
 *
 * `| undefined` on each field rather than the runtime's stricter optionality,
 * because *absent* and *present and `undefined`* are two different things on the
 * record a host declares — rightly, since a host that writes a key means to say
 * something — and one answer here: this call was handed no seam. A caller holding
 * an `X | undefined` is the ordinary case at an optional seam, and making it
 * rebuild the object to say so would put the presence test in two places.
 */
export type WriteCheckSeams = {
  readonly propsVocabulary?: PropsVocabulary | undefined
  readonly bindingReader?: BindingReader | undefined
}

/**
 * Where each check's seam is found, so the record is read off the declaration
 * rather than kept beside it.
 *
 * The mapped type is the guard rail: a member added to `writeCheckSchema` is a
 * compile error here until somebody says which seam supplies it. The other
 * direction — a seam a composition root can hand over that no check reads — is a
 * compile error in `checks.test.ts`, which enumerates the runtime's own optional
 * fields rather than this type's.
 *
 * `unknown` rather than the seam's own type, because presence is the whole of
 * what is asked. Nothing here calls a seam, and a reader of this record that
 * believed it had been called would be believing more than it says.
 */
const SEAM_OF: { readonly [C in WriteCheck]: (seams: WriteCheckSeams) => unknown } = {
  props: (seams) => seams.propsVocabulary,
  bindings: (seams) => seams.bindingReader,
}

/**
 * Which checks a composition root wired, in canonical order.
 *
 * Presence and never behaviour: a host that hands `EVERY_TYPE_UNDECLARED` across
 * the props seam is recorded as having wired a props check, because it did. The
 * alternative was to recognise that one sentinel and quietly believe every other
 * no-op a host might write, which would make the record mean *this seam does
 * something* in some cases and *this seam was handed over* in the rest. One clear
 * meaning is worth more than a special case, and the sentinels exist as defaults
 * rather than as something a composition root reaches for.
 */
export const wiredChecksOf = (seams: WriteCheckSeams): readonly WriteCheck[] =>
  WRITE_CHECKS.filter((check) => SEAM_OF[check](seams) !== undefined)

/**
 * The same checks, in canonical order and without repetition.
 *
 * Which checks were in place is a membership test, so neither the order a caller
 * holds them in nor a repeat may change what two lists say about each other.
 * `wiredChecksOf` already answers in this form; this is for a list that arrived
 * from a record, a wire or a host's own hand.
 */
export const canonicalChecksOf = (checks: readonly WriteCheck[]): readonly WriteCheck[] =>
  WRITE_CHECKS.filter((check) => checks.includes(check))

/**
 * What a set of recorded check lists says about a run of judgments.
 *
 * - `unrecorded` — nothing carried the field. Every one of those judgments
 *   predates it, and no amount of reading will recover what was wired.
 * - `single` — one set of checks judged all of them. The apparatus held.
 * - `changed` — two judgments were made with different checks in place, so a
 *   reader comparing their outcomes is comparing two write paths.
 *
 * There is no `incomparable` here, which is the one way this differs from
 * `rulesetContinuityOf`, and the reason is the argument at the top of this
 * module: a check list is made of Loom's own names, so lists from either side of
 * an upgrade compare directly and an honest "cannot tell" is never needed.
 *
 * `single` is a statement about the lists present and nothing else. A run that
 * also holds judgments carrying no list is not thereby shown constant, which is
 * why the count of those belongs beside this rather than folded into it — the
 * bargain `rulesetContinuityOf` strikes with `unfingerprinted`, for its reason.
 */
export type ChecksContinuity = "unrecorded" | "single" | "changed"

export const checksContinuityOf = (
  wired: readonly (readonly WriteCheck[])[]
): ChecksContinuity => {
  const distinct = new Set(wired.map((checks) => canonicalChecksOf(checks).join(",")))
  if (distinct.size === 0) return "unrecorded"

  return distinct.size === 1 ? "single" : "changed"
}

/**
 * A check list for a reader, with a word for the empty one.
 *
 * An empty list is a real and common state — a deployment that has wired neither
 * seam — and a row rendering it as blank space reads as missing data rather than
 * as the answer. "none" is a word rather than a name, which is why it is written
 * here and not spelled into `WriteCheck`.
 */
export const describeWiredChecks = (checks: readonly WriteCheck[]): string => {
  const canonical = canonicalChecksOf(checks)

  return canonical.length === 0 ? "none" : canonical.join(", ")
}
