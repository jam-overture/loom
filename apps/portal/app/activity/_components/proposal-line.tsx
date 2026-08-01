import type { ProposalEpisode } from "@loom/runtime/telemetry"

import { summariseOperations } from "@/lib/delta-summary"
import { describeAnswer } from "@/lib/episode-view"

/**
 * One proposal inside an episode.
 *
 * The delta is shown for every proposal, not only the applied ones — that is the
 * whole payoff of 0023 keeping it. For a change that was refused or discarded,
 * the revision log holds nothing, so this line is the only surviving account of
 * what the model actually wanted to do.
 */
export const ProposalLine = ({ proposal }: { readonly proposal: ProposalEpisode }) => {
  const answer = describeAnswer(proposal)

  return (
  <li className="border-edge-subtle flex flex-col gap-1.5 border-l-2 pl-3">
    <p className="text-xs">{proposal.rationale}</p>

    <dl className="text-2xs flex flex-wrap gap-x-4 gap-y-1">
      <div className="flex gap-1">
        <dt className="text-ink-muted">changes</dt>
        <dd className="font-mono">{summariseOperations(proposal.delta.operations)}</dd>
      </div>
      <div className="flex gap-1">
        <dt className="text-ink-muted">confidence</dt>
        <dd className="font-mono">{proposal.provenance.confidence.toFixed(2)}</dd>
      </div>
      {proposal.assessment && (
        <>
          <div className="flex gap-1">
            <dt className="text-ink-muted">stakes</dt>
            <dd className="font-mono">{proposal.assessment.stakes}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-ink-muted">reversible</dt>
            <dd className="font-mono">{proposal.assessment.reversible ? "yes" : "no"}</dd>
          </div>
        </>
      )}
      <div className="flex gap-1">
        <dt className="text-ink-muted">by</dt>
        <dd className="font-mono">{proposal.provenance.interpreter}</dd>
      </div>
    </dl>

    {proposal.disposition && (
      <p className="text-ink-muted text-2xs">
        <span className="font-mono">{proposal.disposition.kind}</span> —{" "}
        {proposal.disposition.reason.detail}
      </p>
    )}

    {/*
      * Shown apart from provenance, and never folded into it. The Gate held this
      * change to put a second person in the way of it (0027), and a line that
      * read as one name would undo the reason it was held.
      */}
    {answer !== null && (
      <p className="text-ink-muted text-2xs">
        answered — <span className="font-mono">{answer}</span>
      </p>
    )}

    {proposal.repairOf && (
      <p className="text-ink-muted text-2xs">
        a repair of <span className="font-mono">{proposal.repairOf}</span>
      </p>
    )}

    {proposal.failure && (
      <p className="text-ink-muted text-2xs">
        <span className="font-mono">{proposal.failure.stage}</span> — {proposal.failure.detail}
      </p>
    )}
  </li>
  )
}
