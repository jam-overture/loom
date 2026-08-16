import type { HeldProposal } from "@loom/runtime/write"

import { StateNotice } from "@/app/_components/state-notice"
import type { ProposalEffect } from "@/lib/proposal-effect"

import { HeldProposalCard } from "./held-proposal"

/**
 * A hold and what it would do to the tree in front of the reviewer.
 *
 * Paired on the server rather than resolved in the card, because the effect
 * needs the tree and a Client Component may not read the store. It is also the
 * honest coupling: the effect is only true of the revision this page rendered,
 * so it travels with the page rather than being fetched beside it.
 */
export type HeldChange = {
  readonly held: HeldProposal
  readonly effect: ProposalEffect
}

/**
 * The changes the Gate would not apply on its own.
 *
 * A queue that is empty says so rather than disappearing: "nothing is waiting on
 * you" is information, and a section that vanishes when it has no items makes
 * the absence of a hold indistinguishable from not having looked.
 */
export const ReviewQueue = ({ changes }: { readonly changes: readonly HeldChange[] }) => (
  <section className="flex flex-col gap-3">
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-lg tracking-tight">waiting on you</h2>
      <span className="text-ink-muted font-mono text-2xs">{changes.length}</span>
    </div>

    {changes.length === 0 ? (
      <StateNotice tone="empty" title="Nothing is held.">
        <p>
          Changes the Gate accepts are written without asking, and ones it refuses outright never
          reach you — a hold is the middle case, where the stakes were high enough that the Gate
          declined to decide alone. An empty queue is the Gate having decided, not having stalled.
        </p>
      </StateNotice>
    ) : (
      <ul className="flex flex-col gap-3">
        {changes.map((change) => (
          <HeldProposalCard
            key={change.held.proposalId}
            held={change.held}
            effect={change.effect}
          />
        ))}
      </ul>
    )}
  </section>
)
