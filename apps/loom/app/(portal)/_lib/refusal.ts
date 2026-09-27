import type {
  DispositionKind,
  DispositionReasonCode,
  StakeFactor,
  StakeFactorCode,
  StakeLevel,
} from "@jam-overture/loom"

import {
  CANNOT_BE_DRAWN,
  factorClause,
  plainState,
  ruleSentence,
  type PlainState,
} from "./vocabulary"

/**
 * Why the Gate decided what it decided, as something a screen can show.
 *
 * ## What the portal was doing instead
 *
 * A refusal reached a person as two strings. *"Not allowed"*, and *"A rule in
 * this project's settings blocked it, so nothing changed."* Both are true of
 * every refusal this deployment can produce, which is another way of saying
 * neither is about the change in front of you. Everything specific — which rule,
 * and what was wrong — was in one place: `describeWriteOutcome`, behind the
 * disclosure, reading
 *
 * > `refused: adds a node no primitive is registered for, so it draws nothing:
 * > app.gallery at n_7`
 *
 * and on `/portal/history`'s undo button it was not behind the disclosure at
 * all — it was the whole body of the notice, which is the wall the plain-language
 * rule exists to pull down.
 *
 * ## The three layers, and which of them is new
 *
 * A refusal has three answers stacked inside it and the portal was showing the
 * first and third:
 *
 * | | | where it comes from |
 * | --- | --- | --- |
 * | what happened | *Not allowed* | `CHANGE_STATES`, and it was already plain |
 * | **why** | *it asks for a kind of part this site has nothing to draw it with* | **`STAKE_FACTORS`, and it was not shown at all** |
 * | which rule decided | *This project does not allow changes this risky at all* | `RULE_SENTENCES`, shown on a hold and not on a refusal |
 *
 * The middle row is what this module is for. It is the row a person acts on: the
 * state tells them nothing changed, the rule tells them a line exists, and only
 * the reason tells them what to do differently.
 *
 * ## The one distinction worth building a state for
 *
 * Two of the thirteen factors — the floors 0173 and 0179 built, wired on this
 * deployment on 23 September — mean something categorically different from the
 * other eleven. The other eleven describe a change that *could* be made and that
 * this project has decided not to make without asking. These two describe a
 * change that **cannot be made at all**: the part does not exist here, or the
 * part refuses the setting, and either way the result would be a hole on the page.
 *
 * They arrive under the same reason code as a change that is merely too risky
 * (`stakes-at-refusal-floor`, because both reach `critical`), so a screen reading
 * the code alone cannot tell them apart and tells the reader their settings
 * blocked it. That sends somebody to `/portal/rules` to loosen a rule which,
 * loosened, would commit a broken page. `cannotBeDrawn` is the one predicate this
 * module exists to offer, and `CANNOT_BE_DRAWN` is what a screen says instead.
 *
 * ## Nothing is dropped to make room
 *
 * Every factor's own `detail` travels on the objection that carries it — the
 * runtime's sentence, with its type names, its node ids and the quoted value a
 * schema rejected, unaltered. A card puts the clause on the surface and the
 * detail one click down. The reason code travels too, because it is the only
 * thing a reader comparing this against `/portal/rules` can match on.
 */

export type Objection = {
  readonly code: StakeFactorCode
  /**
   * The clause a person reads, completing *"Loom would not do this because …"*.
   * Shown unasked.
   */
  readonly clause: string
  /**
   * The runtime's own account of this one factor, verbatim. Belongs one click
   * down.
   *
   * Per factor rather than the joined string `disposition.reason.detail` is,
   * which is the whole reason this module reads events instead of that field: a
   * semicolon-separated sentence covering three factors cannot be put beside
   * each of them, so a reader opening the disclosure under one clause got the
   * account of all three or nothing.
   */
  readonly detail: string
  readonly level: StakeLevel
}

/**
 * What the Gate weighed, and which rule turned it into an answer.
 *
 * One value rather than two arguments to every card, because the two are only
 * ever read together and a component handed one of them would show a rule with
 * no reason or a reason with no rule — which is the pair of defects this module
 * replaces.
 */
export type Reasoning = {
  /**
   * Which of the three answers this was, so a card can introduce the clauses
   * with the right verb.
   *
   * The same list of factors means three different things depending on it: on a
   * refusal it is why Loom would not, on a hold it is why Loom is asking, and on
   * an applied change it is what Loom noticed and went ahead anyway. A component
   * choosing that sentence for itself is three copies of one table, which is the
   * drift `vocabulary.ts` exists to stop — so the kind travels and `WEIGHING`
   * holds the words.
   */
  readonly kind: DispositionKind
  /** Which rule decided, in a person's words. Shown unasked. */
  readonly rule: string
  /** That rule's own code. The one string a reader can match against `/portal/rules`. */
  readonly ruleCode: DispositionReasonCode
  /** What was weighed, worst first. Shown unasked, one clause per line. */
  readonly objections: readonly Objection[]
}

/**
 * The two factors that describe a change nobody can carry out.
 *
 * A list rather than two comparisons, so the set is visible in one place and a
 * third floor — the pair 0173 and 0179 are half of a family, and 0150's chart
 * ceiling is the shape of a third — is one line here rather than a condition
 * somebody has to find.
 */
export const UNDRAWABLE: readonly StakeFactorCode[] = ["unknown-primitive", "invalid-props"]

/**
 * Worst first, and stable within a level.
 *
 * The Gate's own order is the order its rules happen to be evaluated in, which
 * is not something a consumer may read (0018, and the 28 August finding that
 * established it for `/portal/rules`). So the order here is the portal's, it is
 * by the one property a factor carries that a reader cares about, and ties keep
 * the order they arrived in rather than being sorted by code — an alphabetical
 * tiebreak would put `broad-change` above `large-removal` for no reason a reader
 * could infer.
 */
const LEVEL_RANK: Readonly<Record<StakeLevel, number>> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

export const inWorstFirstOrder = (
  objections: readonly Objection[]
): readonly Objection[] =>
  [...objections].sort((left, right) => LEVEL_RANK[left.level] - LEVEL_RANK[right.level])

/**
 * The Gate's factors, as clauses.
 *
 * `factorClause` is total over the union — the table in `vocabulary.ts` is a
 * `Record`, so a fourteenth factor is a compile error there rather than a blank
 * line here. That is the property that makes this safe to call on a factor list
 * nobody has looked at, which is every factor list on a deployment.
 */
export const objectionsIn = (factors: readonly StakeFactor[]): readonly Objection[] =>
  inWorstFirstOrder(
    factors.map((factor) => ({
      code: factor.code,
      clause: factorClause(factor.code),
      detail: factor.detail,
      level: factor.level,
    }))
  )

/** Whether any part of this change is something this site has no way to draw. */
export const cannotBeDrawn = (objections: readonly Objection[]): boolean =>
  objections.some((objection) => UNDRAWABLE.includes(objection.code))

/**
 * A refusal's plain state, which is one of two.
 *
 * Handed the objections rather than the whole outcome, because the caller already
 * has them and because this is the one decision in the portal that a write's
 * `kind` genuinely cannot make. A refusal with no objections at all — a
 * confidence floor firing on a change nothing was wrong with — is the ordinary
 * one, and falls through to the state it always had.
 */
export const refusalState = (objections: readonly Objection[]): PlainState =>
  cannotBeDrawn(objections) ? CANNOT_BE_DRAWN : plainState("refused")

export const reasoningOf = (
  kind: DispositionKind,
  code: DispositionReasonCode,
  factors: readonly StakeFactor[]
): Reasoning => ({
  kind,
  rule: ruleSentence(code),
  ruleCode: code,
  objections: objectionsIn(factors),
})
