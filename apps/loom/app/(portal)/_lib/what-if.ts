import {
  ceilingFor,
  isAbove,
  isAtLeast,
  policyFingerprintOf,
  type DispositionKind,
  type DispositionReasonCode,
  type EscalationCode,
  type GatePolicy,
  type IntentOrigin,
  type ProposalId,
  type StakeFactorCode,
  type StakeLevel,
} from "@jam-overture/loom"
import type { EpisodeAnswer, EpisodeFold, ProposalEpisode } from "@jam-overture/loom/telemetry"

/**
 * What these rules would have decided, if they had been different.
 *
 * ## The question nothing else can answer
 *
 * `/portal/rules` says what the standing arrangement is and what it has cost.
 * The half it cannot do is the half the maintainer asked for on 1 October —
 * *"gameplan out changes to my gate policy to generate better outcomes"* — and
 * it is a question with no answer anywhere outside Loom. A repository holds the
 * policy. A log holds what the server did. **Nothing holds what a different
 * policy would have decided about the changes that really happened**, because
 * the changes that were turned down left no file, no commit and no deployment
 * behind them.
 *
 * ## It replays and never invents
 *
 * Every change weighed here is one somebody really asked for and the runtime
 * really judged. Nothing is fabricated to make a dial look interesting: a
 * gameplan over made-up proposals is a demo, and a demo that moves a real
 * setting is worse than no screen at all.
 *
 * ## Three properties keep it honest, and the third is the load-bearing one
 *
 * **It reads the rungs from the record, not from the page.** Each of the
 * ladder's eight rungs is a comparison between a number the judgment wrote down
 * — how sure the model was, how much was at stake, whether it could be undone,
 * which factors were weighed — and a field of the policy. All four are on the
 * record (0198 put the factor names there), so the ladder can be walked again
 * against a different policy without the page, the change or the model.
 *
 * **It cannot replay what the measurement would have been.** The stakes *level*
 * is recorded; how that level was arrived at is a function of the page as it
 * stood. So moving `removalThresholds` or `protectedPrimitiveTypes` would
 * require re-measuring every change against a tree this screen does not have,
 * and those settings are deliberately not offered. The screen says so. The
 * alternative — offering them and quietly holding the level fixed — would
 * answer every question with "nothing would change", which is a lie that looks
 * like a result.
 *
 * **It proves itself against the record before it is believed.** `replayFrom`
 * re-judges every change under the deployment's *own* policy and keeps only the
 * ones whose verdict comes back exactly as it was recorded. A change that does
 * not reproduce is set aside and counted, because the only thing it can mean is
 * that this module's reading of a rule has drifted from the runtime's — and a
 * gameplan built on a misread rule is advice that is confidently wrong about
 * the one subject a person came here to be sure of.
 *
 * `LADDER_AS_REPLAYED` is the other end of the same guard, checked at build
 * time rather than at request time: a rung added to the runtime makes a test in
 * this lane fail rather than silently dropping out of every answer this screen
 * gives.
 *
 * ## It decides nothing
 *
 * Nothing here writes a policy, and the screen it feeds ends in a block of code
 * for a person to put in their own repository. That is 0031 and 0200 clause 4
 * exactly: a measurement may argue for a lever and may never pull one. It is
 * also simply where a policy lives today — `/portal/rules` says the rules are
 * set in code on purpose, and a simulation is not a reason to move them.
 */

/** What the ladder answers: the kind of decision, and which rule made it. */
export type Verdict = {
  readonly kind: DispositionKind
  readonly code: DispositionReasonCode
}

/**
 * One judged change, reduced to the facts a rule reads.
 *
 * Deliberately not the episode. An episode carries the change itself, the
 * reasoning, the revision and the failure; a rule reads four numbers and a list
 * of names. Narrowing here is what makes the replay a pure function of things
 * the record definitely holds, so a test can state a case in six lines rather
 * than by building a journal.
 */
export type JudgedChange = {
  readonly proposalId: ProposalId
  readonly origin: IntentOrigin
  readonly confidence: number
  readonly stakes: StakeLevel
  readonly reversible: boolean
  readonly factors: readonly StakeFactorCode[]
  /** What really happened, under the rules as they are. */
  readonly recorded: Verdict
  /** What somebody said when they were asked, and absent when nobody was. */
  readonly answer: EpisodeAnswer | undefined
  /** The Gate held it and custody survived, so somebody could answer. */
  readonly held: boolean
  /** What was asked for, in the model's own words, so a row names something. */
  readonly asked: string
  readonly at: string
}

/**
 * One rung: the name it is recorded under, what it does, and when it fires.
 *
 * The same shape the runtime's own ladder has, and written that way on purpose.
 * A rung here is a predicate over the record where the runtime's is a predicate
 * over an assessment, and keeping the two the same shape is what makes
 * `LADDER_AS_REPLAYED` comparable to `ESCALATION_LADDER` at all — a list of
 * codes read off the rules rather than typed beside them.
 */
type Rung = {
  readonly code: EscalationCode
  readonly kind: Exclude<DispositionKind, "accepted">
  readonly fires: (change: JudgedChange, policy: GatePolicy) => boolean
}

/**
 * The ladder, in the runtime's order, which is the only order that reproduces
 * the record.
 *
 * One reason is kept per decision and the first rung to fire wins, so a change
 * that breaks two rules is recorded under whichever came first. Reordering
 * these would still produce the right *kind* for most changes and the wrong
 * *rule* for some, which is the quietest possible way to be wrong — the counts
 * would move between rows and the totals would not. `LADDER_AS_REPLAYED` is
 * compared against the runtime's own list for exactly that reason.
 */
const RUNGS: readonly Rung[] = [
  {
    code: "confidence-below-floor",
    kind: "rejected",
    fires: (change, policy) => change.confidence < policy.confidenceFloor,
  },
  {
    code: "stakes-at-refusal-floor",
    kind: "rejected",
    fires: (change, policy) => isAtLeast(change.stakes, policy.refusalFloor),
  },
  {
    code: "irreversible",
    kind: "requires-confirmation",
    fires: (change) => !change.reversible,
  },
  {
    code: "discards-later-work",
    kind: "requires-confirmation",
    fires: (change) => change.factors.includes("discards-later-work"),
  },
  {
    code: "redirected-submission",
    kind: "requires-confirmation",
    fires: (change) => change.factors.includes("redirected-submission"),
  },
  {
    code: "repointed-binding",
    kind: "requires-confirmation",
    fires: (change) => change.factors.includes("repointed-binding"),
  },
  {
    code: "stakes-above-ceiling",
    kind: "requires-confirmation",
    fires: (change, policy) => isAbove(change.stakes, ceilingFor(policy, change.origin)),
  },
  {
    code: "confidence-below-minimum",
    kind: "requires-confirmation",
    fires: (change, policy) => change.confidence < policy.minimumConfidence,
  },
]

/**
 * The rungs this module walks, read off the rungs themselves.
 *
 * Held against the runtime's `ESCALATION_LADDER` by a test, which is the whole
 * point of it: a ninth rung added to the Gate is a failing test in this lane on
 * the day it lands, rather than a rule this screen has quietly stopped
 * applying. 0018 says the portal reads the framework through what it publishes,
 * and the published ladder is exactly the handle that makes this checkable from
 * outside.
 */
export const LADDER_AS_REPLAYED: readonly EscalationCode[] = RUNGS.map((rung) => rung.code)

export const judge = (change: JudgedChange, policy: GatePolicy): Verdict => {
  for (const rung of RUNGS) {
    if (rung.fires(change, policy)) return { kind: rung.kind, code: rung.code }
  }

  return { kind: "accepted", code: "within-policy" }
}

/** Why a judged change is not in the replay. Counted, never dropped. */
export type SetAside = "judged-under-other-rules" | "not-enough-recorded" | "did-not-reproduce"

export type Replay = {
  /** Changes that reproduce, which are the only ones a gameplan is run over. */
  readonly changes: readonly JudgedChange[]
  /** Every change the window saw judged, including the ones set aside. */
  readonly judged: number
  readonly setAside: Readonly<Record<SetAside, number>>
}

const NONE_SET_ASIDE: Readonly<Record<SetAside, number>> = {
  "judged-under-other-rules": 0,
  "not-enough-recorded": 0,
  "did-not-reproduce": 0,
}

const sameVerdict = (left: Verdict, right: Verdict): boolean =>
  left.kind === right.kind && left.code === right.code

/**
 * The facts a rule reads, pulled off one proposal, or nothing.
 *
 * `undefined` for a proposal whose record does not carry them, rather than a
 * change with a zero or an empty list in the gap. 0045's rule, and the reason
 * it matters here is arithmetic: an absent `stakeFactorCodes` defaulted to `[]`
 * would silence three rungs, and the three it silences are the ones that hold a
 * change *whatever* the dials say. A gameplan missing those would report that
 * loosening a ceiling releases changes which would in fact still be held.
 */
const factsOf = (proposal: ProposalEpisode): JudgedChange | undefined => {
  const { disposition, assessment } = proposal
  if (disposition === undefined) return undefined

  const factors = assessment?.stakeFactorCodes
  if (factors === undefined) return undefined

  return {
    proposalId: proposal.proposalId,
    origin: proposal.provenance.origin,
    confidence: disposition.confidence,
    stakes: disposition.stakes,
    reversible: disposition.reversible,
    factors,
    recorded: { kind: disposition.kind, code: disposition.reason.code },
    answer: proposal.answer,
    held: proposal.held,
    asked: proposal.rationale,
    at: proposal.proposedAt,
  }
}

/**
 * Everything on the record that can honestly be played against, and a count of
 * what cannot.
 *
 * The three ways out are different claims and the screen makes all three:
 *
 * - **judged under other rules** — the judgment carries a different policy
 *   fingerprint, so what it decided is not evidence about the rules on this
 *   screen. A judgment recorded before the Gate fingerprinted policies has none
 *   at all and is counted here too, which is the conservative reading: an
 *   unidentified policy is not this one.
 * - **not enough recorded** — the judgment predates a field this needs (0045
 *   again: those fields are absent, never defaulted).
 * - **did not reproduce** — this module and the runtime disagree about what the
 *   rules say. The loudest of the three, and the one a reader is told about
 *   rather than merely shown a smaller denominator for.
 */
export const replayFrom = (fold: EpisodeFold, policy: GatePolicy): Replay => {
  const fingerprint = policyFingerprintOf(policy)
  const changes: JudgedChange[] = []
  const setAside = { ...NONE_SET_ASIDE }
  let judged = 0

  for (const episode of fold.episodes) {
    for (const proposal of episode.proposals) {
      if (proposal.disposition === undefined) continue
      judged += 1

      if (proposal.disposition.policyFingerprint !== fingerprint) {
        setAside["judged-under-other-rules"] += 1
        continue
      }

      const change = factsOf(proposal)
      if (change === undefined) {
        setAside["not-enough-recorded"] += 1
        continue
      }

      if (!sameVerdict(judge(change, policy), change.recorded)) {
        setAside["did-not-reproduce"] += 1
        continue
      }

      changes.push(change)
    }
  }

  return { changes, judged, setAside: { ...setAside } }
}

/**
 * Where a change ends up, said as the thing that happens to a person.
 *
 * Three destinations rather than nine transitions. A reader does not want a
 * matrix of what-was against what-would-be; they want to know which changes
 * stop needing them, which start, and which stop happening at all. Both ways of
 * arriving at "goes ahead" — from a hold and from a refusal — are the same news
 * to the person waiting, and the row says which it was.
 */
export type Movement = "goes-ahead" | "asks-you" | "turned-down" | "unchanged"

export const movementOf = (was: DispositionKind, would: DispositionKind): Movement => {
  if (was === would) return "unchanged"
  if (would === "accepted") return "goes-ahead"
  if (would === "rejected") return "turned-down"

  return "asks-you"
}

export type Moved = {
  readonly change: JudgedChange
  readonly would: Verdict
  readonly movement: Exclude<Movement, "unchanged">
}

export type Gameplan = {
  /** The denominator: changes the replay could honestly weigh. */
  readonly weighed: number
  readonly unchanged: number
  readonly moved: readonly Moved[]
  /**
   * Of the changes that would go ahead with nobody asked, the ones somebody
   * really did turn down.
   *
   * The sharpest number on the screen and the reason the gameplan is worth
   * having rather than interesting. A loosening always reads as time saved; it
   * is only this count that says whether the time saved is time a person spent
   * saying no — and those are the changes that would now be live on the page.
   */
  readonly againstYourNo: number
  /** …and the ones still sitting in the queue waiting for an answer. */
  readonly offYourQueue: number
}

export const gameplanOf = (replay: Replay, policy: GatePolicy): Gameplan => {
  const moved: Moved[] = []
  let unchanged = 0
  let againstYourNo = 0
  let offYourQueue = 0

  for (const change of replay.changes) {
    const would = judge(change, policy)
    const movement = movementOf(change.recorded.kind, would.kind)

    if (movement === "unchanged") {
      unchanged += 1
      continue
    }

    moved.push({ change, would, movement })

    if (movement !== "goes-ahead") continue
    if (change.answer === "discarded") againstYourNo += 1
    if (change.answer === undefined && change.held) offYourQueue += 1
  }

  return { weighed: replay.changes.length, unchanged, moved, againstYourNo, offYourQueue }
}
