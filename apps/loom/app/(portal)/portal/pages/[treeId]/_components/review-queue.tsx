import type { HeldProposal } from "@loom/runtime/write"

import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import type { ProposalEffect } from "@/app/(portal)/_lib/proposal-effect"

import { HeldProposalCard } from "./held-proposal"

/**
 * A hold and what it would do to the page in front of the reviewer.
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
 * The changes Loom would not make on its own.
 *
 * A queue that is empty says so rather than disappearing: "nothing is waiting
 * for you" is information, and a section that vanishes when it has no items
 * makes the absence of a hold indistinguishable from not having looked.
 *
 * The empty state used to read `Nothing is held.` — which is a sentence about
 * the runtime's hold store, addressed to somebody who knows there is one. What
 * a person wants to know is whether they are behind on anything. They are not,
 * and that is what it says now; the account of *why* an empty queue is the Gate
 * having decided rather than having stalled is kept, one click down, for the
 * reader who wonders.
 */
export const ReviewQueue = ({ changes }: { readonly changes: readonly HeldChange[] }) => (
  <section className="flex flex-col gap-3">
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-lg tracking-tight">Waiting on you</h2>
      {changes.length > 0 && (
        <span className="bg-awaiting text-awaiting-ink rounded-sm px-2 py-0.5 text-xs">
          {changes.length}
        </span>
      )}
    </div>

    {changes.length === 0 ? (
      <StateNotice tone="empty" title="Nothing is waiting for you.">
        <p>
          When Loom is unsure about a change, it stops and asks you here instead of guessing.
          Nothing has stopped for you on this page.
        </p>
        <TechnicalDetail summary="What an empty queue does and doesn't mean">
          <p>
            Changes the Gate accepts are written without asking, and ones it refuses outright
            never reach you — a hold is the middle case, where the stakes were high enough that
            the Gate declined to decide alone. An empty queue is the Gate having decided, not
            having stalled.
          </p>
        </TechnicalDetail>
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
