"use client"

import { useActionState } from "react"

import type { HeldProposal } from "@loom/runtime/write"

import { ProposalEffectView } from "@/app/(portal)/_components/proposal-effect"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { summariseOperations } from "@/app/(portal)/_lib/delta-summary"
import { type WriteReport } from "@/app/(portal)/_lib/outcome"
import type { ProposalEffect } from "@/app/(portal)/_lib/proposal-effect"
import { answerOutcomes } from "@/app/(portal)/_lib/waiting"
import {
  STAKES,
  confidenceWord,
  reversibilityWord,
  ruleSentence,
  toneClasses,
} from "@/app/(portal)/_lib/vocabulary"

import { confirmProposal, discardProposal } from "../actions"

/**
 * One change waiting on a human, and the one screen where the plain-language
 * rule pays for itself.
 *
 * The card already had everything a reviewer needs. What it did not have was an
 * order. Stakes, reversibility, confidence, the operation verbs and a policy id
 * arrived first, as five monospace pairs, and the sentence explaining why the
 * person was being asked at all arrived sixth — as `reason.detail`, which is
 * the policy's own words about its own thresholds. Somebody who has not read
 * 0019 could not have told you what the card wanted from them.
 *
 * So the order is now the reader's. What the AI wants to do, why Loom will not
 * do it alone, what it would change, and then the two buttons. The five pairs
 * are all still here — none was dropped and none was reworded away — one click
 * down, under "How Loom decided this", which is the honest name for them.
 *
 * The Gate's reason is still shown *before* the buttons, for 0019's reason: the
 * question is not "do you like this" but "the runtime is unsure for *this*
 * reason — do you accept it". Confirming re-runs the Gate server-side, so the
 * button is permission to proceed, not an override.
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
   * come back the buttons would only ever produce "already answered". The card
   * stops being a control and becomes a receipt.
   */
  const answered = report !== null
  const stakes = STAKES[held.disposition.stakes]
  const answers = answerOutcomes(held.disposition)

  return (
    <li className="border-edge-subtle bg-surface-base flex flex-col gap-3 rounded-md border p-3">
      <header className="flex flex-col gap-1">
        <p className="text-sm">{held.proposal.rationale}</p>
        <p className="text-ink-muted text-xs">
          {confidenceWord(held.disposition.confidence)} · {stakes.label} ·{" "}
          {reversibilityWord(held.disposition.reversible)}
        </p>
      </header>

      {/*
        * Why you are being asked, in one sentence, before anything else on the
        * card asks you to weigh a number. `ruleSentence` is the rule the Gate
        * actually cited, said in a person's words; the policy's own `detail` is
        * kept verbatim in the disclosure below rather than shown here, because
        * it is written about thresholds rather than about this change.
        */}
      <div className="bg-awaiting text-awaiting-ink flex flex-col gap-1 rounded-sm p-2 text-xs">
        <strong className="font-medium">Why you&rsquo;re being asked</strong>
        <p>{ruleSentence(held.disposition.reason.code)}</p>
      </div>

      <ProposalEffectView effect={effect} />

      {/*
        * What each button would set in motion, said before either is pressed.
        *
        * The card has always described the change and never the *answer*. Those
        * are different questions: `ProposalEffectView` above says what would
        * happen to the page, and a person hovering over two buttons wants to
        * know what they are about to commit themselves to and whether they can
        * walk it back. The undoability of a yes is the sharpest half — it was a
        * `reversible no` pair one click down, which is the wrong altitude for
        * the most consequential fact on the card.
        *
        * The sentences come from `answerOutcomes` rather than from here, so
        * this card and the queue on `/portal` cannot describe the same two
        * buttons differently.
        */}
      {!answered && (
        <dl className="flex flex-col gap-2 text-xs">
          <div className="flex flex-col gap-0.5">
            <dt className="font-medium">If you say yes</dt>
            <dd className="text-ink-muted">{answers.yes}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="font-medium">If you say no</dt>
            <dd className="text-ink-muted">{answers.no}</dd>
          </div>
        </dl>
      )}

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
            {confirming ? "Applying…" : "Apply this change"}
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
            {discarding ? "Turning it down…" : "No thanks"}
          </button>
        </form>
      </div>

      {/*
        * Everything the card used to lead with. Nothing here is new and nothing
        * that was here is gone — the policy id is still nameable, because a
        * reviewer being asked to overrule a policy needs to be able to go and
        * read it, and the rule code is still printed for anyone matching this
        * against the log.
        */}
      <TechnicalDetail summary="How Loom decided this">
        <dl className="flex flex-wrap gap-x-4 gap-y-1">
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
          <div className="flex gap-1">
            <dt className="text-ink-muted">rule</dt>
            <dd className="font-mono">{held.disposition.reason.code}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-ink-muted">policy</dt>
            <dd className="font-mono">{held.disposition.policyId}</dd>
          </div>
        </dl>

        <p className="text-ink-secondary">{held.disposition.reason.detail}</p>
      </TechnicalDetail>

      {report && (
        <div className={`flex flex-col gap-1 rounded-sm p-2 text-xs ${toneClasses(report.tone)}`}>
          <strong className="font-medium">{report.headline}</strong>
          <p>{report.meaning}</p>
          <TechnicalDetail summary="What the runtime said">
            <p className="font-mono">{report.detail}</p>
          </TechnicalDetail>
        </div>
      )}
    </li>
  )
}
