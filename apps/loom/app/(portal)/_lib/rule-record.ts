import type { DispositionReasonCode } from "@jam-overture/loom"
import type { EpisodeFold, IntentEpisode, ProposalEpisode } from "@jam-overture/loom/telemetry"

import type { PlainRule } from "./rules-view"

/**
 * What each rule has actually done, read from the journal.
 *
 * The policy says what is allowed; this says what that has cost. They are the
 * two halves of the only question this screen exists for, and the second half is
 * the one that exists nowhere else: a repository holds the configuration, and no
 * repository, log or build output has ever held *how many changes a threshold
 * turned away*. `git log` can show you that somebody set the minimum confidence
 * to 0.7. Nothing outside Loom can show you that the setting has since asked you
 * about fourteen changes and that you said yes to all fourteen.
 *
 * It is a reader and never a controller, for 0031's reason exactly. A rule that
 * has asked and been approved every time is very likely stricter than its host
 * needs, and this module will say so — to a person, who then goes and changes a
 * policy file. Nothing here moves a threshold, and nothing in the runtime
 * consults what is computed here.
 *
 * The fold is the same one `/portal/activity` and `/portal/trust` read
 * (`episodesOf`), over the same window, through the same public export. A count
 * here that disagreed with the tally there would be two measurements of one set
 * of facts, which is the defect this repository has already paid for once.
 */

export type RuleRecord = {
  /** Decisions this rule was recorded as the reason for. */
  readonly fired: number
  /**
   * Refusals this rule caused that the AI then replaced with something allowed,
   * which went through (0006). The interesting half of a refusal count: a rule
   * that redirects is a different thing from a rule that stops people.
   */
  readonly rescued: number
  /** Holds this rule caused that somebody has since said yes to. */
  readonly saidYes: number
  /** …said no to. */
  readonly saidNo: number
  /** …that are still sitting in the review queue. */
  readonly waiting: number
  /**
   * …that reached nobody. The Gate held them and custody did not survive, so
   * they are neither answered nor answerable. Counted rather than folded into
   * `waiting`, because a reviewer who goes looking for these will not find them.
   */
  readonly lost: number
}

/**
 * What a rule with nothing behind it looks like. Also what a screen shows a rule
 * when the journal could not be read — the counts are zero either way, and the
 * page is what says which of the two it is looking at.
 */
export const NO_RECORD: RuleRecord = {
  fired: 0,
  rescued: 0,
  saidYes: 0,
  saidNo: 0,
  waiting: 0,
  lost: 0,
}

export type RulesRecord = {
  /** Keyed by the reason code the Gate recorded. */
  readonly byCode: Readonly<Partial<Record<DispositionReasonCode, RuleRecord>>>
  /** Changes nothing objected to, applied without anybody being asked. */
  readonly wentAhead: number
  /** Proposals the window saw judged. The denominator every count above is out of. */
  readonly judged: number
}

/**
 * A repair is a second proposal naming the first (0006), and both live in the
 * episode the refusal happened in. Scoped to the episode rather than searched
 * across the fold: a `repairOf` pointing outside its own intent would be a
 * runtime defect, and a lookup that silently accepted one would hide it.
 */
const rescuedIn = (episode: IntentEpisode, refused: ProposalEpisode): boolean =>
  episode.proposals.some(
    (later) => later.repairOf === refused.proposalId && later.committedRevision !== undefined
  )

const add = (record: RuleRecord, part: Partial<RuleRecord>): RuleRecord => ({
  fired: record.fired + (part.fired ?? 0),
  rescued: record.rescued + (part.rescued ?? 0),
  saidYes: record.saidYes + (part.saidYes ?? 0),
  saidNo: record.saidNo + (part.saidNo ?? 0),
  waiting: record.waiting + (part.waiting ?? 0),
  lost: record.lost + (part.lost ?? 0),
})

/**
 * `held` is what tells a hold from a loss, and it is the field that makes this
 * honest. A proposal the Gate wanted a human for, whose custody failed, is not
 * waiting for anybody: nothing will ever arrive to answer it. Reading `answer`
 * alone would file it under "still waiting" for ever.
 */
const heldPart = (proposal: ProposalEpisode): Partial<RuleRecord> => {
  if (proposal.answer === "confirmed") return { saidYes: 1 }
  if (proposal.answer === "discarded") return { saidNo: 1 }

  return proposal.held ? { waiting: 1 } : { lost: 1 }
}

export const recordOfRules = (fold: EpisodeFold): RulesRecord => {
  const byCode = new Map<DispositionReasonCode, RuleRecord>()
  let wentAhead = 0
  let judged = 0

  for (const episode of fold.episodes) {
    for (const proposal of episode.proposals) {
      const { disposition } = proposal
      if (disposition === undefined) continue

      judged += 1

      if (disposition.reason.code === "within-policy") {
        wentAhead += 1
        continue
      }

      const code = disposition.reason.code
      const part: Partial<RuleRecord> =
        disposition.kind === "rejected"
          ? { fired: 1, rescued: rescuedIn(episode, proposal) ? 1 : 0 }
          : { fired: 1, ...heldPart(proposal) }

      byCode.set(code, add(byCode.get(code) ?? NO_RECORD, part))
    }
  }

  return { byCode: Object.fromEntries(byCode), wentAhead, judged }
}

export const recordFor = (record: RulesRecord, rule: PlainRule): RuleRecord =>
  rule.code === undefined ? NO_RECORD : (record.byCode[rule.code] ?? NO_RECORD)

const changes = (count: number): string => `${count} change${count === 1 ? "" : "s"}`

/**
 * What one rule has done, as a sentence.
 *
 * Written per outcome rather than per rule, because a refusal and a hold are
 * different stories and reading them from one template is what produced
 * "Rejected: 4" in the first place. A refusal's interesting half is whether
 * anything got through afterwards; a hold's is what you said.
 */
export const readingOfRecord = (rule: PlainRule, record: RuleRecord): string => {
  if (rule.outcome === undefined) return "This one decides nothing on its own, so it is never recorded as a reason."
  if (record.fired === 0) return "This has not come up yet."

  if (rule.outcome === "rejected") {
    if (record.rescued === 0) return `Turned down ${changes(record.fired)}. Nothing got through afterwards.`

    return `Turned down ${changes(record.fired)}. On ${record.rescued === record.fired ? "each of them" : `${record.rescued} of them`} the AI tried again with something allowed, and that went through.`
  }

  const answered: readonly string[] = [
    ...(record.saidYes > 0 ? [`you said yes to ${record.saidYes}`] : []),
    ...(record.saidNo > 0 ? [`you said no to ${record.saidNo}`] : []),
    ...(record.waiting > 0 ? [`${record.waiting} still waiting`] : []),
    ...(record.lost > 0 ? [`${record.lost} never reached anybody`] : []),
  ]

  return `Stopped to ask you about ${changes(record.fired)} — ${answered.join(", ")}.`
}

/**
 * What has happened under these rules, in one line above them.
 *
 * Here rather than in the page for the reason the readings above are here: it
 * has four cases and three of them are only reachable on a deployment somebody
 * has actually used, which is the kind of sentence that ships wrong. The first
 * draft read "and the rest ran into one of the rules below" over a record where
 * "the rest" was one change — found by looking at the screen with four real
 * judgments behind it rather than by any test.
 */
export const headlineOf = (record: RulesRecord): string => {
  if (record.judged === 0)
    return "Nothing has been judged against them yet. These are the rules that will decide when something is."

  const judged = `${record.judged} ${record.judged === 1 ? "change has" : "changes have"} been judged`

  if (record.wentAhead === record.judged)
    return `All ${changes(record.judged)} judged so far went ahead with nothing objecting.`

  if (record.wentAhead === 0)
    return `${judged}, and every one of them ran into one of the rules below.`

  const stopped = record.judged - record.wentAhead

  return `${judged}: ${record.wentAhead} went ahead with nothing objecting, and ${stopped} ran into one of the rules below.`
}

/**
 * The one thing this screen suggests, and the threshold it suggests it at.
 *
 * A rule that has been put to a person several times and approved every single
 * time is doing work nobody is getting value from: each of those was a change
 * that was going to happen, delayed by however long the reviewer took to arrive.
 * That is a real finding about a real setting, and it is the sort a host cannot
 * reach any other way.
 *
 * Four, and never on a rule with an unanswered hold in it. Three approvals is a
 * run rather than a pattern, and a rule with something still waiting has not
 * finished being judged — suggesting a loosening on a queue somebody has not
 * worked through yet would be advice built on the half of the evidence that
 * happened to be answered first.
 */
export const APPROVAL_RUN = 4

export const looksStricterThanNeeded = (rule: PlainRule, record: RuleRecord): boolean =>
  rule.outcome === "requires-confirmation" &&
  record.saidYes >= APPROVAL_RUN &&
  record.saidNo === 0 &&
  record.waiting === 0 &&
  record.lost === 0
