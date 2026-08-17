"use client"

import { useActionState } from "react"

import type { HeldProposal } from "@loom/runtime/write"

import { ProposalEffectView } from "@/app/_components/proposal-effect"
import { summariseOperations } from "@/lib/delta-summary"
import { toneClasses, type WriteReport } from "@/lib/outcome"
import type { ProposalEffect } from "@/lib/proposal-effect"

import { confirmProposal, discardProposal } from "../actions"

/**
 * One change waiting on a human.
 *
 * The Gate's reason is shown before the buttons, because 0019 makes this a
 * review queue rather than a design tool: the question is not "do you like this"
 * but "the runtime is unsure for *this* reason — do you accept it". Confirming
 * re-runs the Gate server-side, so the button is permission to proceed, not an
 * override.
 *
 * The reason answers *why you are being asked*. `effect` answers *what you are
 * being asked about*, which the card could not say before: "reconfigure, add" is
 * the delta's shape, and a reviewer needs the value that would be written over.
 */
export const HeldProposalCard = ({
  held,
  effect,
}: {
  readonly held: HeldProposal
  readonly effect: ProposalEffect
}) => {
  const [confirmReport, confirm, confirming] = useActionState<WriteReport | null, FormData>(
    confirmProposal,
    null
  )
  const [discardReport, discard, discarding] = useActionState<WriteReport | null, FormData>(
    discardProposal,
    null
  )

  const report = confirmReport ?? discardReport
  const busy = confirming || discarding
  /**
   * A hold is answered exactly once (`release` is a take), so once an answer has
   * come back the buttons would only ever produce "nothing to answer". The card
   * stops being a control and becomes a receipt.
   */
  const answered = report !== null

  return (
    <li className="border-edge-subtle bg-surface-base flex flex-col gap-3 rounded-md border p-3">
      <p className="text-sm">{held.proposal.rationale}</p>

      <dl className="text-2xs flex flex-wrap gap-x-4 gap-y-1">
        <div className="flex gap-1">
          <dt className="text-ink-muted">stakes</dt>
          <dd className="font-mono">{held.disposition.stakes}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-ink-muted">reversible</dt>
          <dd className="font-mono">{held.disposition.reversible ? "yes" : "no"}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-ink-muted">confidence</dt>
          <dd className="font-mono">{held.disposition.confidence.toFixed(2)}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-ink-muted">changes</dt>
          <dd className="font-mono">{summariseOperations(held.proposal.delta.operations)}</dd>
        </div>
        {/*
          * Under which standard, not only for which reason. A reviewer answering
          * a hold is being asked to overrule a policy, and one they cannot name
          * is one they cannot go and read.
          */}
        <div className="flex gap-1">
          <dt className="text-ink-muted">policy</dt>
          <dd className="font-mono">{held.disposition.policyId}</dd>
        </div>
      </dl>

      <p className="bg-awaiting text-awaiting-ink rounded-sm p-2 text-2xs">
        {held.disposition.reason.detail}
      </p>

      <ProposalEffectView effect={effect} />

      {/*
        * The buttons stay live even when the effect says the delta would not
        * apply. This page is a snapshot too, and the confirmation re-runs the
        * Gate against the tree as it is at that moment — refusing an answer on
        * the strength of a read that may be a minute old would make the portal
        * the authority, which it is not. The reviewer is told, and decides.
        */}
      <div className={`flex gap-2 ${answered ? "hidden" : ""}`}>
        <form action={confirm}>
          <input type="hidden" name="treeId" value={held.treeId} />
          <input type="hidden" name="proposalId" value={held.proposalId} />
          <button
            type="submit"
            disabled={busy || answered}
            className="bg-affirm text-affirm-ink border-affirm-edge rounded-md border px-3 py-1.5 text-xs disabled:opacity-60"
          >
            {confirming ? "applying…" : "apply"}
          </button>
        </form>

        <form action={discard}>
          <input type="hidden" name="treeId" value={held.treeId} />
          <input type="hidden" name="proposalId" value={held.proposalId} />
          <button
            type="submit"
            disabled={busy || answered}
            className="bg-refuse text-refuse-ink border-refuse-edge rounded-md border px-3 py-1.5 text-xs disabled:opacity-60"
          >
            discard
          </button>
        </form>
      </div>

      {report && (
        <div className={`rounded-sm p-2 text-2xs ${toneClasses(report.tone)}`}>
          <strong className="font-medium">{report.headline}</strong> — {report.detail}
        </div>
      )}
    </li>
  )
}
