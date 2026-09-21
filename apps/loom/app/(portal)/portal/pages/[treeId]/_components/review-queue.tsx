import type { HeldProposal } from "@loom/runtime/write"

import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { UnreadableChangeCard } from "@/app/(portal)/_components/unreadable-change-card"
import type { ProposalEffect } from "@/app/(portal)/_lib/proposal-effect"
import {
  inQueueOrder,
  unreadableClause,
  unreadableMark,
  type UnreadableChange,
} from "@/app/(portal)/_lib/unreadable-change"

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
export const ReviewQueue = ({
  changes,
  unreadable,
}: {
  readonly changes: readonly HeldChange[]
  /**
   * The rows on this page that this build could place and could not read.
   *
   * A separate argument rather than a fourth kind of `HeldChange`, because
   * there is no held proposal to carry: the shape that would not parse is the
   * one every other field on a `HeldChange` lives inside. What survives is a
   * position and a reason, and `inQueueOrder` puts it back where it belongs.
   */
  readonly unreadable: readonly UnreadableChange[]
}) => {
  const rows = inQueueOrder(changes, unreadable, (change) => change.held.heldAt)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg tracking-tight">Waiting on you</h2>
        {/*
         * The count is of what a person can answer, and the mark beside it is
         * of what they cannot.
         *
         * One number over a queue with both kinds in it would be a claim the
         * screen does not keep: the badge sits beside a heading reading
         * "Waiting on you", and a row nobody can read is not waiting on this
         * reader. Two marks is one more thing on the screen and it is the
         * honest shape — and the second one is the only mark a page whose
         * every row is unreadable would otherwise have.
         */}
        <span className="flex shrink-0 items-baseline gap-1.5">
          {changes.length > 0 && (
            <span className="bg-awaiting text-awaiting-ink rounded-sm px-2 py-0.5 text-xs">
              {changes.length}
            </span>
          )}
          {unreadable.length > 0 && (
            <span className="border-edge-subtle text-ink-muted rounded-sm border border-dashed px-2 py-0.5 text-xs">
              {unreadableMark(unreadable.length)}
            </span>
          )}
        </span>
      </div>

      {rows.length === 0 ? (
        <StateNotice tone="settled" title="Nothing is waiting for you.">
          <p>
            When Loom is unsure about a change, it stops and asks you here instead of guessing.
            Nothing has stopped for you on this page.
          </p>
          <TechnicalDetail summary="What this does and doesn't mean">
            <p>
              Changes the Gate accepts are written without asking, and ones it refuses outright
              never reach you — a hold is the middle case, where the stakes were high enough that
              the Gate declined to decide alone. Nothing waiting is the Gate having decided, not
              having stalled.
            </p>
          </TechnicalDetail>
        </StateNotice>
      ) : (
        <>
          {/*
           * Said above the list and only when it is true, for the reason the
           * front door's summary carries the same clause: a reader who counts
           * the cards and compares them to the badge must not be left to work
           * out the difference for themselves.
           */}
          {unreadable.length > 0 && (
            <p className="text-ink-muted text-sm">
              {changes.length === 0
                ? "Nothing is waiting that you can answer."
                : `${changes.length} ${changes.length === 1 ? "change is" : "changes are"} waiting for your answer.`}
              {unreadableClause(unreadable, changes.length)}
            </p>
          )}

          <ul className="flex flex-col gap-3">
            {rows.map((row) =>
              row.kind === "answerable" ? (
                <HeldProposalCard
                  key={row.change.held.proposalId}
                  held={row.change.held}
                  effect={row.change.effect}
                />
              ) : (
                <UnreadableChangeCard key={row.row.proposalId} change={row.row} />
              )
            )}
          </ul>
        </>
      )}
    </section>
  )
}
