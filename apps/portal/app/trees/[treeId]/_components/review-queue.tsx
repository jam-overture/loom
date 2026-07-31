import type { HeldProposal } from "@loom/runtime/write"

import { HeldProposalCard } from "./held-proposal"

/**
 * The changes the Gate would not apply on its own.
 *
 * A queue that is empty says so rather than disappearing: "nothing is waiting on
 * you" is information, and a section that vanishes when it has no items makes
 * the absence of a hold indistinguishable from not having looked.
 */
export const ReviewQueue = ({ held }: { readonly held: readonly HeldProposal[] }) => (
  <section className="flex flex-col gap-3">
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-lg tracking-tight">waiting on you</h2>
      <span className="text-ink-muted font-mono text-2xs">{held.length}</span>
    </div>

    {held.length === 0 ? (
      <p className="text-ink-muted text-xs">
        Nothing is held. Changes the Gate accepts are written without asking.
      </p>
    ) : (
      <ul className="flex flex-col gap-3">
        {held.map((proposal) => (
          <HeldProposalCard key={proposal.proposalId} held={proposal} />
        ))}
      </ul>
    )}
  </section>
)
