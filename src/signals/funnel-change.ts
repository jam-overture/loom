import { everyMemberOf } from "../closed-set.js"
import type { TreeId } from "../ids.js"

import {
  audienceScopeRead,
  comparedAudiencesOf,
  crossesAudiences,
  type ComparedAudiences,
} from "./audiences.js"
import { funnelPairKey, type FunnelReach, type PairReach } from "./funnel.js"
import type { FunnelPair } from "./rollup.js"

/**
 * What a change did to the funnel.
 *
 * Every reading in this subsystem that measures attention has had its
 * comparison for a fortnight — where reading stops (§10), how much of a page
 * gets read (§15), whether readers had time for it (§19), who the readers were
 * (§20), what readers did inside a part (§22), and four of them at the scale of
 * a library (§26, §27, §30, §31). **The funnel had none**, and it is the one
 * counter here a deployment opens the portal for: *we shipped a change, did
 * more readers buy?* is the whole commercial half of the premise, and until now
 * the answer was two screens and a subtraction done by eye.
 *
 * `funnelChangeOf(was, now)` is that comparison, and it is one more figure
 * taken out of what this subsystem already knows rather than collected:
 * nothing is added to a payload, a browser, a column, a store or the vocabulary
 * of kinds, the broadcaster is not touched, and both sides are readings a
 * deployment already builds (0231).
 *
 * ## A conversion share factors, which is why this one gets a counterfactual
 *
 * [0251](../../decisions/0251-a-change-to-what-readers-did-is-a-ratio-of-two-shares-and-an-inside-a-change-gave-a-part-is-not-a-reader.md)
 * refused a counterfactual for what readers *do*, and the reason was structural:
 * `engaged ÷ reached` has readers on both sides of the division, so there is no
 * reader-free term to hold still while the other moves.
 *
 * **A funnel does not have that problem, and the identity is exact.** Of the
 * readers who arrived, the share that finished is the share that got to the
 * first end multiplied by the share of *those* who finished:
 *
 * ```
 * conversion.share  =  entry.share  ×  rate
 * converted         =   reached     ×  converted
 * ──────────          ────────────     ─────────
 * appearances         appearances       reached
 * ```
 *
 * So the two things a change can move are separable, and they are the two
 * things with **opposite remedies** that 0231 built three shares to tell apart:
 * carrying readers to the ask, and closing them once they are there. The
 * counterfactual is the same sufficiency rule 0244 and 0279 publish — the later
 * window's reach at the earlier window's closing rate, and the other diagonal —
 * so {@link ConversionCause} answers *your change did not sell more; it got more
 * readers to the pricing band and the same share of them bought* without any
 * number deciding what *enough* is.
 *
 * Both factors are shares whose numerator and denominator come from **one
 * window**, so each window's straddle (0147) has very nearly divided out of
 * each term before the two sides meet. That is the test 0251 set for a ratio
 * across two windows, and no ratio of two windows' raw counts is published
 * here, exactly as there.
 *
 * ## The one figure in this subsystem that leans down, subtracted from itself
 *
 * 0231 found that `rate` is the only figure here biased **downward**: a reader
 * who met the first end in one window and converted in the next contributes
 * `reached 1, converted 0` to the first and nothing to the second, so the
 * conversion is lost rather than duplicated. It published `rateAtMost` as the
 * ceiling that bound costs, and the gap between the two is the rollup window's
 * length in the figure it damages.
 *
 * **Nobody had ever subtracted two of them.** A difference of two floors is not
 * a floor, and this is the shape
 * [0282](../../decisions/0282-a-word-nothing-can-be-said-about-is-in-no-mass-and-a-page-that-reports-no-reach-has-no-mean.md)
 * had just been bitten by one reading across: a figure safe to publish as *at
 * least* on one page is a movement nobody made when two of them are held
 * against each other. Here it is worse than a loose bound, because the size of
 * the bias is **set by the deployment's own rollup window** — a deployment that
 * shortened `windowMs` between the two windows (0158) loses more conversions to
 * the straddle in the later one and reads its funnel as having got worse, with
 * no reader anywhere behaving differently.
 *
 * So the rate movement is published as a **bracket** and not only as a ratio:
 * each side's true rate is somewhere in `[rate, rateAtMost]`, so the true ratio
 * is somewhere in `[now.rate ÷ was.rateAtMost, now.rateAtMost ÷ was.rate]`, and
 * {@link ComparedFunnel.rateMoved} says whether that bracket clears 1. A funnel
 * whose rate appears to have halved and whose bracket contains 1 has told a
 * deployment about its rollup window and nothing about its readers.
 *
 * It is the second time 0219's drift has turned an argument into a number, and
 * the first time it has been spent on a *movement* rather than on a level.
 *
 * ## What survives a door that cannot say how many readers arrived
 *
 * A funnel reading is silent for the three states of the door (0229), and a
 * comparison is silent for every reason either side is. **That withholds half
 * of this reading and not all of it**, which is the division worth having:
 *
 * - **The shares of arrivals need the door on both sides.**
 *   {@link ComparedFunnel.conversionRatio}, {@link ComparedFunnel.entryRatio},
 *   the counterfactual and {@link ComparedFunnel.readersMoved} are withheld.
 * - **The rate does not.** It is two counts off one row, so
 *   {@link ComparedFunnel.rateRatio} and the movement stand on a deployment
 *   whose page-view rows have expired, predate the column, or were not fetched
 *   — which is what a reading of an older deployment looks like. The
 *   **bracket** goes with the door, because the drift that builds it is a door
 *   figure.
 *
 * A silence here is therefore a reason some figures are absent and never a
 * reason to refuse the row, and {@link FunnelChange.compared} is populated
 * under every one of them.
 *
 * ## The question a change can break
 *
 * A funnel pair is the one thing read here that a **deployment wrote** rather
 * than a tree or a vocabulary: *from this node to that one*. 0238 made an end
 * the revision no longer has a standing rather than a silence, because a nought
 * against a part the page does not have is indistinguishable from a funnel
 * readers abandon.
 *
 * A comparison is where that standing becomes a sentence about a change.
 * {@link QuestionMovement} says whether the change **broke** the question —
 * both ends present in the earlier revision and one of them gone in the later —
 * which is a thing to fix in the deployment's configuration rather than in the
 * page, and the most useful row this reading has on the morning after a rename.
 * It is a fact about the two trees and needs no reader at all, so it is
 * answered under every silence here, exactly as a census of what a change added
 * and removed is (0251).
 *
 * Pure, linear in the pairs of the two readings, and reaches no store, no clock
 * and no DOM, so it adds nothing to the broadcaster's import graph.
 */

/** Why a comparison of two windows' funnels left a figure out. */
export type FunnelChangeSilence =
  /**
   * The two readings are of different trees.
   *
   * Spelled as every other comparison here spells it, because a surface drawing
   * five comparisons of one change should not meet five names for one state
   * (0240).
   */
  | "different-trees"
  /**
   * The two readings are of two audiences, and so of two populations.
   *
   * Spelled and refused as the other comparisons spell and refuse it (0240). A
   * funnel question is asked of a page and a page served in two forms answers
   * it twice, one row per audience (0284) — the same two ends and two different
   * populations. So a pair of them is two answers to one question held against
   * each other as though one of them had moved, and the arithmetic is right all
   * the way through it.
   *
   * Refused only where both sides name an audience and the two differ; a pair
   * spanning the migration that added the column is in
   * {@link FunnelChange.audiences} instead.
   */
  | "different-audiences"
  /**
   * One of the two windows holds two forms of the page and named neither.
   *
   * Not the state above, and the pair is why this is its own member.
   * `different-audiences` is two sides of two **known** populations, which is a
   * comparison whose arithmetic is right and whose sentence is wrong. This is
   * one side that is of no population at all: the reading it came from read
   * neither form's pairs (0290), so there is nothing on that side to hold
   * against anything.
   *
   * It is refused rather than reported as every question having been removed,
   * which is what an empty side pairs as. The remedy is the caller's and it is
   * `byAudience`: split the window and compare each form with itself.
   */
  | "audiences-mixed"
  /**
   * One of the two windows has no page-view row at the door.
   *
   * The door's first state (0229), said of the pair. The rates and the
   * movements stand; every share of the arrivals is withheld, because the
   * number to divide by is missing on one side.
   */
  | "unscaled"
  /**
   * One of the two windows has a row and nothing in it says a page view began.
   *
   * The state worth catching: senders that are not marking their openings leave
   * every share here without a denominator while the counters look healthy.
   */
  | "unopened"
  /**
   * One of the two windows holds arrivals no rollup has folded yet.
   *
   * The first minutes of a deployment, and what a stalled collection looks like
   * for ever; the fold's own timestamp is what tells the two apart (0274).
   */
  | "uncounted"
  /**
   * No pair is asked of both windows.
   *
   * The state `CopyChangeSilence.dissolved` reports of words and
   * `KindReachChangeSilence.unpaired` of places, said of a question: the two
   * windows have funnels and share none, so there is nothing to hold against
   * anything. {@link FunnelChange.added} and {@link FunnelChange.removed}
   * answer in full and are the whole of what can be said.
   */
  | "unasked"

/** The closed set, for a surface that has to account for every absent figure. */
export const FUNNEL_CHANGE_SILENCES: readonly FunnelChangeSilence[] =
  everyMemberOf<FunnelChangeSilence>()([
    "different-trees",
    "different-audiences",
    "audiences-mixed",
    "unscaled",
    "unopened",
    "uncounted",
    "unasked",
  ])

/** One line per silence, for a surface saying why a figure is not there. */
export const describeFunnelChangeSilence = (silence: FunnelChangeSilence): string => {
  switch (silence) {
    case "different-trees":
      return "the two readings are of different pages"
    case "different-audiences":
      return "the two readings are of different audiences, and so of different readers"
    case "audiences-mixed":
      return "one of the two windows holds two forms of the page and says which readers neither"
    case "unscaled":
      return "one of the two windows has no count of the readers who arrived"
    case "unopened":
      return "one of the two windows has nothing saying a page view began"
    case "uncounted":
      return "one of the two windows has arrivals no rollup has counted yet"
    case "unasked":
      return "the two windows have no funnel question in common"
  }
}

/**
 * What happened to whether readers finish a funnel.
 *
 * Four verdicts out of *somebody converted* on either side, and a fifth for the
 * pair one side cannot speak for — the shape a comparison of what readers did
 * settled on (0251), for the same reason: a side that cannot say is not a third
 * verdict, and collapsing every combination it appears in into one member is
 * what keeps the other four claims.
 *
 * **No threshold anywhere.** The verdict turns on a conversion existing and not
 * on how large the rate is or how far it moved, which is 0266's rule — a
 * movement that needs a number to decide what counts is a number somebody has
 * to defend.
 */
export type FunnelMovement =
  /**
   * Readers reached the first end and none of them finished, and now some do —
   * the sentence a change to an ask nobody answers is made for.
   */
  | "taken-up"
  /** Readers finished it and now they reach the first end and do not. */
  | "abandoned"
  /**
   * Reached and unfinished before, reached and unfinished now — the asks a
   * change did not fix.
   *
   * Kept apart from `held` because both are *the verdict did not move* and they
   * are opposite findings about a page, which is how a pace comparison keeps
   * `still-skimmed` from `held` (0244).
   */
  | "still-unconverted"
  /** Readers finished it before and after. */
  | "held"
  /**
   * One of the two windows cannot say whether readers finished it.
   *
   * Nothing reached the first end on that side, so there is no rate rather than
   * a rate of nought, or an end of the pair is one that revision does not have
   * (0238), so there is no question rather than an unanswered one.
   * {@link ComparedFunnel.question} tells the two apart outright.
   */
  | "unknown"

/** The closed set, for a surface accounting for every pair it was handed. */
export const FUNNEL_MOVEMENTS: readonly FunnelMovement[] = everyMemberOf<FunnelMovement>()([
  "taken-up",
  "abandoned",
  "still-unconverted",
  "held",
  "unknown",
])

/** One line per movement, for a surface putting a funnel in front of a person. */
export const describeFunnelMovement = (movement: FunnelMovement): string => {
  switch (movement) {
    case "taken-up":
      return "readers got to the start of this funnel and none finished it, and now some do"
    case "abandoned":
      return "readers finished this funnel, and now they get to its start and do not"
    case "still-unconverted":
      return "readers get to the start of this funnel and do not finish it, before and after"
    case "held":
      return "readers finished this funnel, before and after"
    case "unknown":
      return "one of the two windows cannot say whether readers finished it"
  }
}

/**
 * What the change did to the question itself.
 *
 * A fact about the two **trees** and not about any window, which is what makes
 * it the one answer here that survives every silence. A funnel pair is written
 * by a deployment and points at node ids (0146); a change that renames, removes
 * or re-roots a part it names leaves the pair asking about a page that no longer
 * has it, and 0238 made that a standing rather than a nought.
 */
export type QuestionMovement =
  /** Both ends are in both revisions, so the two sides answer the same question. */
  | "asked"
  /**
   * The earlier revision had both ends and the later one is missing one.
   *
   * **The row to lead with when it is not nought.** The counters cannot move
   * again and every figure on the later side is withheld, so a funnel that
   * looks abandoned is a question to re-point rather than readers who stopped
   * buying. The change broke it, and nothing about readers is wrong.
   */
  | "broken"
  /** The earlier revision was missing an end and the later one has both: the change put it back. */
  | "restored"
  /** An end is missing from both revisions, so neither side was ever answering. */
  | "stale"

/** The closed set, for a surface accounting for every compared pair. */
export const QUESTION_MOVEMENTS: readonly QuestionMovement[] = everyMemberOf<QuestionMovement>()([
  "asked",
  "broken",
  "restored",
  "stale",
])

/** One line per movement, for a surface saying what a change did to a question. */
export const describeQuestionMovement = (movement: QuestionMovement): string => {
  switch (movement) {
    case "asked":
      return "both revisions have the parts this question names"
    case "broken":
      return "the change removed a part this question names, so it can no longer be answered"
    case "restored":
      return "the change put back a part this question names, so it can be answered again"
    case "stale":
      return "neither revision has a part this question names"
  }
}

/**
 * Which of the two things a funnel is made of moved the share of arrivals that
 * finished.
 *
 * Answered by sufficiency rather than by magnitude — *would this movement have
 * arrived anyway if only one of the two had moved* — which is the rule 0244 and
 * 0279 publish. `null` on a pair whose conversion share did not move, because
 * there is nothing to attribute.
 */
export type ConversionCause =
  /**
   * Getting there alone was enough: the later window's reach at the earlier
   * window's closing rate would have moved it the same way.
   *
   * The attribution worth leading with, and the one a conversion rate hides.
   * *More readers finish because more readers arrive at the ask, and not
   * because the ask got better.*
   */
  | "entry"
  /**
   * Finishing alone was enough: the earlier window's reach at the later
   * window's closing rate would have moved it the same way.
   */
  | "closing"
  /**
   * Either alone would have been enough, so the movement is over-determined.
   *
   * The two moved the same way, which is the ordinary shape of a change that
   * worked.
   */
  | "either"

/**
 * The closed set, and it is **one member shorter than every other
 * counterfactual here**, which is a property of the arithmetic rather than a
 * decision.
 *
 * 0244 and 0279 both publish a fourth answer — *neither alone was enough and
 * the two together were* — and both need it, because the figure they split is a
 * sum: traffic can move toward the places whose reading moved, and the
 * interaction is then the whole of the movement.
 *
 * **A product has no such case.** The two counterfactuals of a product multiply
 * to the product of the two levels: `(entryNow × rateWas) × (entryWas ×
 * rateNow) = conversionWas × conversionNow`. So if the conversion share rose,
 * the two counterfactuals multiply to more than `conversionWas` squared and at
 * least one of them is above it; if it fell, at least one is below. Neither
 * being enough is arithmetically unreachable, and publishing a member for it
 * would be a state a surface had to handle and nothing could ever produce.
 */
export const CONVERSION_CAUSES: readonly ConversionCause[] = everyMemberOf<ConversionCause>()([
  "entry",
  "closing",
  "either",
])

/** One line per cause, for a surface saying what moved a conversion share. */
export const describeConversionCause = (cause: ConversionCause): string => {
  switch (cause) {
    case "entry":
      return "the readers who got to the start of the funnel would have moved it on their own"
    case "closing":
      return "the share of them who finished would have moved it on its own"
    case "either":
      return "either would have moved it on its own"
  }
}

/**
 * One funnel question both windows were asked, as two windows answer it.
 *
 * Matched by the pair's two ends and their kinds, which is what a deployment
 * wrote and therefore what identity means here: a pair is the same question in
 * both windows when it names the same two nodes in the same two kinds, however
 * either node moved in the tree.
 */
export type ComparedFunnel = {
  /** The pair as the later window holds it, which is the same question either way. */
  readonly pair: FunnelPair
  /** The whole of what the earlier window said about it. */
  readonly was: PairReach
  /** The whole of what the later window said about it. */
  readonly now: PairReach
  readonly movement: FunnelMovement
  /** What the change did to whether the question names anything (0238). */
  readonly question: QuestionMovement
  /**
   * `now.rate ÷ was.rate` — of the readers who got to the first end, how much
   * likelier they are to finish.
   *
   * Each side is two counts off one row, so each window's straddle has very
   * nearly divided out before the two meet (0221, 0251). **It is still a ratio
   * of two figures that lean down** by an amount the deployment's rollup window
   * sets, which is what the bracket is for.
   *
   * `null` where either side has no rate, and where the earlier one is nought:
   * *nobody finished and now somebody does* is {@link movement}'s answer, and a
   * ratio is a figure a surface divides and ranks by.
   */
  readonly rateRatio: number | null
  /**
   * The least the true ratio could be: `now.rate ÷ was.rateAtMost`.
   *
   * `null` wherever {@link rateRatio} is, and wherever either side's ceiling is
   * withheld — the ceiling is built from the door's drift, so it goes when the
   * door does.
   */
  readonly rateRatioAtLeast: number | null
  /** The most the true ratio could be: `now.rateAtMost ÷ was.rate`. `null` on the same terms. */
  readonly rateRatioAtMost: number | null
  /**
   * The bracket clears 1, so the rate moved by more than the straddle alone
   * could account for.
   *
   * `false` is the figure to draw rather than suppress: *the rate fell by a
   * third and the rollup window can explain all of it* is a sentence about the
   * deployment's configuration, and it is the one a card showing a bare ratio
   * prints as a collapse. `null` where there is no bracket.
   */
  readonly rateMoved: boolean | null
  /**
   * `now.entry.share ÷ was.entry.share` — how much likelier an arrival is to
   * get to the first end.
   *
   * `null` under any silence, where either side withheld the share, and where
   * the earlier one is nought.
   */
  readonly entryRatio: number | null
  /**
   * `now.conversion.share ÷ was.conversion.share` — how much likelier an
   * arrival is to finish, which is the figure a deployment means by *did the
   * change work*.
   *
   * `null` on the same terms as {@link entryRatio}.
   */
  readonly conversionRatio: number | null
  /**
   * The later window's reach at the earlier window's closing rate, as a share
   * of arrivals: the conversion share if only getting there had moved.
   */
  readonly ifOnlyEntryMoved: number | null
  /** The other diagonal: the conversion share if only the closing had moved. */
  readonly ifOnlyClosingMoved: number | null
  /** Which side was enough on its own. `null` where the conversion share did not move. */
  readonly cause: ConversionCause | null
  /**
   * The movement in the conversion share, put on the later window's scale:
   * `(now.conversion.share − was.conversion.share) × now.opened`.
   *
   * **A mass for ranking and not a count of people**, as every `…Moved` figure
   * in this subsystem is (0280). A difference of two windows' conversion counts
   * is refused here and nowhere published: both are generous by their own
   * window's straddle, and the inflation does not divide out of a difference
   * whose two terms are in different windows (0251).
   *
   * `null` under any silence and wherever either share is withheld.
   */
  readonly readersMoved: number | null
}

/**
 * What a change did to a page's funnels.
 *
 * The two {@link FunnelReach}es it is made of are returned, so nothing
 * downstream derives them twice and every whole-page figure either side — the
 * arrivals, the drift, the stale pairs — is one field away without a second
 * join.
 */
export type FunnelChange = {
  /** The earlier reading's tree. The two agree unless `silence` is `different-trees`. */
  readonly treeId: TreeId
  readonly revisions: { readonly was: number; readonly now: number }
  /**
   * The audience each side was of, where its reading named one.
   *
   * As `ReadingChange.audiences` carries it, and for the same reason: a `null`
   * on either side is why an unprovable pair of populations is compared rather
   * than refused.
   */
  readonly audiences: ComparedAudiences
  /** The two funnel readings this comparison is made of. */
  readonly readings: { readonly was: FunnelReach; readonly now: FunnelReach }
  /**
   * Every question both windows were asked, ordered by the pair's two ends so a
   * screen does not reorder on a refresh.
   *
   * Deliberately not ranked, as the readings it is made of are not: two pairs
   * are two questions about different nodes, and the pair that moved the most
   * readers is reliably whichever first end is shallowest in the page.
   * {@link mostGained} and {@link mostLost} are the two a surface leads with.
   */
  readonly compared: readonly ComparedFunnel[]
  /**
   * Questions only the later window was asked, as it answered them.
   *
   * A deployment that added a pair, and the window before it was added has
   * nothing to say — which is a fact about the configuration rather than about
   * the change, and the reason this is a list and not a movement.
   */
  readonly added: readonly PairReach[]
  /** Questions only the earlier window was asked, as it answered them. */
  readonly removed: readonly PairReach[]
  /** Compared pairs by what happened to the verdict. The five add to {@link compared}'s length. */
  readonly movements: Readonly<Record<FunnelMovement, number>>
  /** Compared pairs by what the change did to the question. The four add to {@link compared}'s length. */
  readonly questions: Readonly<Record<QuestionMovement, number>>
  /**
   * The compared pair whose conversion share gained the most readers at the
   * later window's scale, or `null` where none gained.
   *
   * Ranked by {@link ComparedFunnel.readersMoved} — by headcount rather than by
   * share, which is the rule a fall between two siblings is ranked by (0221): a
   * funnel two readers in three now finish is a better rate and a smaller win
   * than one four hundred in a thousand do.
   */
  readonly mostGained: ComparedFunnel | null
  /** The compared pair that lost the most, by the same rule. `null` where none lost. */
  readonly mostLost: ComparedFunnel | null
  /**
   * Compared pairs whose rate ratio is given and whose bracket contains 1, so
   * the straddle alone could account for the whole movement.
   *
   * The figure that says how much of this screen to believe: a reading where
   * most of the pairs are in here is a reading of the deployment's rollup
   * window.
   */
  readonly undecided: number
  /**
   * Neither window had a page view that spanned a rollup boundary, so every
   * rate on both sides is exact and every bracket is a point.
   *
   * False wherever either window's drift is unknown, which is every state of
   * the door: there is nothing to measure the straddle with.
   */
  readonly exact: boolean
  /**
   * Pairs naming a question already seen on that side, where every one after
   * the first was ignored.
   *
   * A reading built by `funnelReachOf` holds one row per question, so this is a
   * caller that concatenated two readings. Counting the second occurrence would
   * put one window's funnel in a comparison twice, which is the error that is
   * permanent once the counters hold it (0158) and the one this subsystem
   * checks for by habit.
   */
  readonly duplicated: number
  /** Set where a figure is missing and why. `null` where nothing is. */
  readonly silence: FunnelChangeSilence | null
}

const NO_MOVEMENTS: Readonly<Record<FunnelMovement, number>> = Object.freeze({
  "taken-up": 0,
  abandoned: 0,
  "still-unconverted": 0,
  held: 0,
  unknown: 0,
})

const NO_QUESTIONS: Readonly<Record<QuestionMovement, number>> = Object.freeze({
  asked: 0,
  broken: 0,
  restored: 0,
  stale: 0,
})

/**
 * The door's state, said of the pair rather than of either window.
 *
 * Taken in the set's own order so that two windows in two different states
 * report the worse of them, which is the rule a deployment reading reports one
 * state for a pair of pages by (0240): the condition is what the two sides have
 * in common and no more, and each side's own reading carries which it was.
 */
const doorSilenceOf = (was: FunnelReach, now: FunnelReach): FunnelChangeSilence | null => {
  const sides = [was.silence, now.silence]

  if (sides.includes("unmeasured")) return "unscaled"
  if (sides.includes("unopened")) return "unopened"
  if (sides.includes("uncounted")) return "uncounted"

  return null
}

const questionMovementOf = (was: PairReach, now: PairReach): QuestionMovement => {
  if (!was.stale && !now.stale) return "asked"
  if (!was.stale) return "broken"

  return now.stale ? "stale" : "restored"
}

const movementOf = (was: PairReach, now: PairReach): FunnelMovement => {
  if (was.rate === null || now.rate === null) return "unknown"

  const before = was.converted > 0
  const after = now.converted > 0

  if (before && after) return "held"
  if (after) return "taken-up"

  return before ? "abandoned" : "still-unconverted"
}

/** `null` rather than a division by nought, which is `movement`'s answer and not a ratio. */
const ratioOf = (was: number | null, now: number | null): number | null =>
  was === null || now === null || was === 0 ? null : now / was

/**
 * Which side was enough on its own, by the direction each counterfactual
 * carries — the sufficiency rule the two earlier counterfactuals here publish
 * (0244, 0279), asked of a product.
 *
 * Published rather than private so that the one answer a funnel cannot produce
 * can be shown to be handled rather than argued away: handed four numbers that
 * are not a funnel's two factors, where neither counterfactual carries the
 * movement, it returns `null` rather than attributing the movement to a side
 * that did not cause it.
 *
 * `null` where nothing moved, which is the rule both earlier counterfactuals
 * state: a figure that did not move has nothing to attribute.
 */
export const conversionCauseOf = (
  was: number,
  now: number,
  ifOnlyEntryMoved: number,
  ifOnlyClosingMoved: number
): ConversionCause | null => {
  const direction = Math.sign(now - was)

  if (direction === 0) return null

  const entry = Math.sign(ifOnlyEntryMoved - was) === direction
  const closing = Math.sign(ifOnlyClosingMoved - was) === direction

  if (entry && closing) return "either"
  if (entry) return "entry"

  return closing ? "closing" : null
}

const comparedOf = (
  pair: FunnelPair,
  was: PairReach,
  now: PairReach,
  opened: number
): ComparedFunnel => {
  const rateRatio = ratioOf(was.rate, now.rate)

  /**
   * Both ends of the bracket or neither, because half of an interval is a
   * figure a surface would draw as a bound. `was.rateAtMost` is at least
   * `was.rate` and `was.rate` is above nought wherever there is a ratio at all,
   * so neither division here can be by nought.
   */
  const bracket =
    rateRatio !== null && was.rate !== null && now.rate !== null
      ? was.rateAtMost !== null && now.rateAtMost !== null
        ? {
            atLeast: now.rate / was.rateAtMost,
            atMost: now.rateAtMost / was.rate,
          }
        : null
      : null

  /**
   * The counterfactuals use each side's own `rate`, which is the figure the
   * reading publishes as its estimate: a sufficiency verdict needs the two
   * diagonals of one table, and mixing an estimate on one diagonal with a
   * ceiling on the other would answer a question neither window was asked.
   */
  const entryWas = was.entry.share
  const entryNow = now.entry.share
  const conversionWas = was.conversion.share
  const conversionNow = now.conversion.share
  const measured =
    entryWas !== null &&
    entryNow !== null &&
    conversionWas !== null &&
    conversionNow !== null &&
    was.rate !== null &&
    now.rate !== null

  const ifOnlyEntryMoved = measured ? entryNow * was.rate : null
  const ifOnlyClosingMoved = measured ? entryWas * now.rate : null

  return {
    pair,
    was,
    now,
    movement: movementOf(was, now),
    question: questionMovementOf(was, now),
    rateRatio,
    rateRatioAtLeast: bracket?.atLeast ?? null,
    rateRatioAtMost: bracket?.atMost ?? null,
    rateMoved: bracket === null ? null : bracket.atLeast > 1 || bracket.atMost < 1,
    entryRatio: ratioOf(entryWas, entryNow),
    conversionRatio: ratioOf(conversionWas, conversionNow),
    ifOnlyEntryMoved,
    ifOnlyClosingMoved,
    cause:
      conversionWas === null ||
      conversionNow === null ||
      ifOnlyEntryMoved === null ||
      ifOnlyClosingMoved === null
        ? null
        : conversionCauseOf(conversionWas, conversionNow, ifOnlyEntryMoved, ifOnlyClosingMoved),
    readersMoved:
      conversionWas === null || conversionNow === null
        ? null
        : (conversionNow - conversionWas) * opened,
  }
}

/** One question per key, later occurrences dropped and counted (0158). */
const byQuestion = (
  pairs: readonly PairReach[]
): {
  readonly pairs: ReadonlyMap<string, PairReach>
  readonly duplicated: number
} => {
  const byKey = new Map<string, PairReach>()
  let duplicated = 0

  for (const pair of pairs) {
    const key = funnelPairKey(pair.pair)

    if (byKey.has(key)) {
      duplicated += 1
      continue
    }

    byKey.set(key, pair)
  }

  return { pairs: byKey, duplicated }
}

/** The one that moved more, `>` keeping the first in the compared order on a tie. */
const furtherOf = (
  standing: ComparedFunnel | null,
  next: ComparedFunnel,
  sign: 1 | -1
): ComparedFunnel | null => {
  const moved = next.readersMoved

  if (moved === null || moved * sign <= 0) return standing
  if (standing === null) return next

  return moved * sign > (standing.readersMoved ?? 0) * sign ? next : standing
}

/**
 * Hold two windows of one page's funnels against each other.
 *
 * Both sides are readings `funnelReachOf` built, so the revision each belongs
 * to, the rows it dropped and the arrivals it was read against travel with it
 * and nothing is inferred here (0231).
 *
 * Linear in the pairs of the two readings, with one pass over each.
 */
export const funnelChangeOf = (was: FunnelReach, now: FunnelReach): FunnelChange => {
  const earlier = byQuestion(was.pairs)
  const later = byQuestion(now.pairs)
  const duplicated = earlier.duplicated + later.duplicated

  const empty = {
    treeId: was.treeId,
    revisions: { was: was.revision, now: now.revision },
    audiences: comparedAudiencesOf(was, now),
    readings: { was, now },
    movements: NO_MOVEMENTS,
    questions: NO_QUESTIONS,
    mostGained: null,
    mostLost: null,
    undecided: 0,
    exact: false,
    duplicated,
  }

  /** The two states in which no question is held against any other. */
  const refusing = (silence: FunnelChangeSilence): FunnelChange => ({
    ...empty,
    compared: [],
    added: [],
    removed: [],
    silence,
  })

  if (was.treeId !== now.treeId) return refusing("different-trees")
  if (crossesAudiences(was, now)) return refusing("different-audiences")
  /**
   * Before the pairing rather than after it, because an empty side pairs
   * cleanly: every question of the other side comes back as added or removed,
   * which reads as *the change added every funnel question you ask* about a
   * window that was simply never read.
   */
  if (audienceScopeRead(was).reading === "mixed" || audienceScopeRead(now).reading === "mixed")
    return refusing("audiences-mixed")

  const keys = [...earlier.pairs.keys(), ...later.pairs.keys()].sort((one, other) =>
    one.localeCompare(other)
  )
  const added = [...later.pairs].filter(([key]) => !earlier.pairs.has(key)).map(([, pair]) => pair)
  const removed = [...earlier.pairs]
    .filter(([key]) => !later.pairs.has(key))
    .map(([, pair]) => pair)

  const door = doorSilenceOf(was, now)

  const movements = { ...NO_MOVEMENTS }
  const questions = { ...NO_QUESTIONS }
  const compared: ComparedFunnel[] = []
  let mostGained: ComparedFunnel | null = null
  let mostLost: ComparedFunnel | null = null
  let undecided = 0

  const seen = new Set<string>()

  for (const key of keys) {
    if (seen.has(key)) continue
    seen.add(key)

    const before = earlier.pairs.get(key)
    const after = later.pairs.get(key)

    if (before === undefined || after === undefined) continue

    const row = comparedOf(after.pair, before, after, now.opened)

    compared.push(row)
    movements[row.movement] += 1
    questions[row.question] += 1
    if (row.rateMoved === false) undecided += 1
    mostGained = furtherOf(mostGained, row, 1)
    mostLost = furtherOf(mostLost, row, -1)
  }

  return {
    ...empty,
    compared,
    added,
    removed,
    movements,
    questions,
    mostGained,
    mostLost,
    undecided,
    exact: door === null && was.exact && now.exact,
    silence: door ?? (compared.length === 0 ? "unasked" : null),
  }
}
