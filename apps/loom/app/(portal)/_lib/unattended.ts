import type { ProposalId, TreeId } from "@loom/runtime"
import type { IntentEpisode, ProposalEpisode } from "@loom/runtime/telemetry"

import { describeOperation, plainOperation, type OperationDescription } from "./delta-summary"
import { plainMoment } from "./when"
import {
  ASK_ORIGINS,
  asSentence,
  confidenceWord,
  NO_CONFIDENCE_TO_JUDGE,
  reversibilityWord,
  ruleSentence,
  STAKES,
  type PlainLine,
  type PlainState,
} from "./vocabulary"

/**
 * The changes Loom made without stopping to ask.
 *
 * The portal has always had one half of the Gate's story. `/portal` lists what
 * the Gate declined to decide alone; `/portal/activity` lists everything anyone
 * asked for; `/portal/history` lists what a tree accepted. **None of them says
 * which accepted changes nobody was asked about** — and that is the set a
 * person actually worries about, because it is the only set that reached their
 * site without a human in the loop.
 *
 * The front door's own caught-up state has been naming the question since it
 * was written — *"the standing question is whether the changes Loom made
 * without asking were sound"* — and sending the reader to `/portal/trust`,
 * which answers whether the model's confidence has held up across a deployment
 * and not what it did. This module is the answer to the question that was
 * actually asked.
 *
 * ## Why the journal and not the log
 *
 * A revision knows `answeredBy`, and `undefined` there means *either* nobody
 * had to approve it *or* a host approved it without naming the approver — the
 * log cannot tell those apart, which is why `/portal/history` says nothing
 * about it (0029). The journal can: `held` on a proposal is the Gate having
 * stopped and custody having succeeded, so a human was asked. `held === false`
 * on a committed proposal is unambiguous, and it is the whole reason this reads
 * the record rather than the log.
 */

/** Whether the Gate applied this proposal with nobody asked. */
const wasUnattended = (proposal: ProposalEpisode): boolean =>
  !proposal.held && proposal.answeredBy === undefined

export type UnattendedChange = {
  readonly proposalId: ProposalId
  readonly treeId: TreeId
  /**
   * The revision it became — which is where its inverse can be read, and the
   * one thing a reader who does not like it can act on.
   */
  readonly revision: number
  readonly whenIso: string
  readonly when: string
  /** Who set it off, worded exactly as Activity and History word it. */
  readonly who: string
  /** What it did, one sentence per operation, in the delta's order. */
  readonly did: readonly PlainLine[]
  /**
   * The same operations as the delta model states them, for the disclosure.
   *
   * The sentences above name a part rather than spelling its type — *the card*
   * where they used to read `n_x1, a loom.card,`. The exact type is what a
   * reviewer checking the portal's wording against the record needs, so it
   * moves here rather than off the card: this disclosure held the Gate's
   * reasoning and never the delta, which is the one thing on this card a reader
   * cannot get anywhere else.
   */
  readonly record: readonly OperationDescription[]
  /**
   * Why Loom did not stop to ask, in the Gate's own reason rather than in a
   * reassurance. Absent when the record does not carry the judgment.
   */
  readonly why: string | undefined
  /** How sure the thing that wrote it said it was. */
  readonly sure: string
  /** What the Gate judged was at stake. Absent with the judgment. */
  readonly stakes: PlainState | undefined
  /**
   * Whether it can be taken back, as a sentence rather than a clause: it stands
   * beside the link and nothing precedes it. Absent with the judgment.
   */
  readonly undo: string | undefined
  /** Where the inverse is: this revision, held open on the page's history. */
  readonly href: string
  readonly technical: {
    readonly confidence: number
    readonly policyId: string | undefined
    readonly reason: string | undefined
  }
}

const changeOf = (
  episode: IntentEpisode,
  proposal: ProposalEpisode,
  revision: number
): UnattendedChange => {
  const whenIso = proposal.settledAt ?? proposal.proposedAt
  const origin = episode.intent?.origin ?? proposal.provenance.origin
  const actor = episode.intent?.actor

  return {
    proposalId: proposal.proposalId,
    treeId: episode.treeId,
    revision,
    whenIso,
    when: plainMoment(whenIso),
    who: actor === undefined ? `${ASK_ORIGINS[origin].label}.` : `${actor} asked for this.`,
    /*
     * A lambda rather than `.map(plainOperation)`, and the difference is not
     * style: `plainOperation` takes a second argument now, and `map` hands its
     * callback the index. Passing the index where a map of names belongs is a
     * type error today and would have been a silent one had the parameter been
     * anything looser. The same trap is one line down in `record`.
     */
    did: proposal.delta.operations.map((operation) => plainOperation(operation)),
    record: proposal.delta.operations.map((operation) => describeOperation(operation)),
    why:
      proposal.disposition === undefined
        ? undefined
        : ruleSentence(proposal.disposition.reason.code),
    sure:
      proposal.provenance.authoredBy === "runtime"
        ? NO_CONFIDENCE_TO_JUDGE
        : `${confidenceWord(proposal.provenance.confidence)}.`,
    stakes: proposal.disposition === undefined ? undefined : STAKES[proposal.disposition.stakes],
    undo:
      proposal.disposition === undefined
        ? undefined
        : asSentence(reversibilityWord(proposal.disposition.reversible)),
    href: `/portal/history?tree=${encodeURIComponent(episode.treeId)}&at=${revision}`,
    technical: {
      confidence: proposal.provenance.confidence,
      policyId: proposal.disposition?.policyId,
      reason: proposal.disposition?.reason.code,
    },
  }
}

export type UnattendedSweep = {
  /** Newest first, which is the order the fold arrives in, reversed. */
  readonly changes: readonly UnattendedChange[]
  /**
   * Committed changes this window could not judge either way, because the
   * proposal that produced them was proposed before the window opened.
   *
   * Counted rather than dropped, and counted rather than assumed unattended.
   * A screen whose whole claim is "these reached your site with nobody asked"
   * must not put a change in that list on the strength of a record it did not
   * read — and must not quietly leave one out either.
   */
  readonly unclear: number
}

/**
 * Every committed change in a fold that nobody was asked about.
 *
 * Takes the fold's episodes rather than a journal, so the assembly is testable
 * without a database and so the front door cannot drift into describing the
 * same record differently from anything else that reads one.
 */
export const unattendedIn = (episodes: readonly IntentEpisode[]): UnattendedSweep => {
  const committed = episodes.flatMap((episode) =>
    episode.resolution.kind === "committed"
      ? [{ episode, resolution: episode.resolution } as const]
      : []
  )

  const changes = committed.flatMap(({ episode, resolution }) => {
    const proposal = episode.proposals.find(
      (candidate) => candidate.proposalId === resolution.proposalId
    )

    if (proposal === undefined || !wasUnattended(proposal)) return []

    return [changeOf(episode, proposal, resolution.revision)]
  })

  const unclear = committed.filter(
    ({ episode, resolution }) =>
      !episode.proposals.some((candidate) => candidate.proposalId === resolution.proposalId)
  ).length

  return { changes: [...changes].reverse(), unclear }
}

/**
 * What this section adds up to, said before a reader meets a single card.
 *
 * The count leads, because a reader who reads nothing else must not be left to
 * work out from a list length whether anything reached their site unattended.
 * The window is stated in the same breath: this is one page of a record that
 * only grows, and a count over part of it that reads as a count over all of it
 * is the defect the scoped screens shipped in August.
 */
export const unattendedSummary = (sweep: UnattendedSweep): string => {
  const one = sweep.unclear === 1
  const gap = one ? "1 more change" : `${sweep.unclear} more changes`
  const unclear =
    sweep.unclear === 0
      ? ""
      : ` ${gap} started before this stretch of the record, so this screen` +
        ` cannot say either way about ${one ? "it" : "them"}.`

  if (sweep.changes.length === 0) {
    return `Loom asked you about every change it made recently.${unclear}`
  }

  const alone = sweep.changes.length === 1
  const count = alone
    ? "1 recent change was made"
    : `${sweep.changes.length} recent changes were made`

  return (
    `${count} without anyone being asked. Loom was sure enough about` +
    ` ${alone ? "it" : "them"} to go ahead on its own.${unclear}`
  )
}
