import type { ProposalEpisode } from "@jam-overture/loom/telemetry"

import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { summariseOperations } from "@/app/(portal)/_lib/delta-summary"
import { describeAnswer } from "@/app/(portal)/_lib/episode-view"
import {
  FAILURE_STAGES,
  GATE_VERDICTS,
  STAKES,
  confidenceWord,
  reversibilityWord,
  ruleSentence,
} from "@/app/(portal)/_lib/vocabulary"

/**
 * One change the AI wrote, inside an ask.
 *
 * The delta is shown for every proposal, not only the applied ones — that is the
 * whole payoff of 0023 keeping it. For a change that was refused or discarded,
 * the revision log holds nothing, so this line is the only surviving account of
 * what the model actually wanted to do.
 *
 * The order is the review queue's, and for the review queue's reason. This line
 * used to open with five monospace pairs — `changes`, `confidence`, `stakes`,
 * `reversible`, `by` — and then, if the Gate had said anything, the disposition's
 * *kind* and the policy's own `detail`, which is a sentence about thresholds
 * rather than about this change. The rule the Gate actually cited was never named
 * in words at all, on the one screen where somebody is reading back a refusal to
 * find out why it happened.
 *
 * So: what the AI wanted, how sure it was, what Loom decided and which rule
 * decided it, who answered. Then the pairs, one click down, with nothing
 * dropped — the policy id and the rule code are what a reviewer needs to go and
 * read the rule, and the interpreter's name is what tells two models apart.
 */
export const ProposalLine = ({ proposal }: { readonly proposal: ProposalEpisode }) => {
  const { assessment, disposition } = proposal
  const answer = describeAnswer(proposal)

  /**
   * How sure the AI was, and what it would have cost to be wrong — one line,
   * because a reader weighs them together or not at all. The assessment is
   * optional in the record: an ask that failed before the Gate looked at it has
   * a confidence and nothing else, and the line simply gets shorter.
   */
  const shape =
    assessment === undefined
      ? confidenceWord(proposal.provenance.confidence)
      : `${confidenceWord(proposal.provenance.confidence)} · ${
          STAKES[assessment.stakes].label
        } · ${reversibilityWord(assessment.reversible)}`

  return (
    <li className="border-edge-subtle flex flex-col gap-1.5 border-l-2 pl-3">
      <p className="text-xs">{proposal.rationale}</p>

      <p className="text-ink-muted text-2xs">{shape}</p>

      {/*
        * The stop is inside the emphasis on purpose. This is a verdict followed
        * by its reason — two sentences — and without it a screenshot showed
        * `Loom made this change on its own Nothing this project watches for was
        * involved`, which reads as a dropped word. A label in a table is not a
        * sentence; the punctuation belongs where two of them are set together.
        */}
      {disposition !== undefined && (
        <p className="text-xs">
          <strong className="font-medium">{GATE_VERDICTS[disposition.kind].label}.</strong>{" "}
          {ruleSentence(disposition.reason.code)}
        </p>
      )}

      {/*
        * Shown apart from provenance, and never folded into it. The Gate held
        * this change to put a second person in the way of it (0027), and a line
        * that read as one name would undo the reason it was held.
        */}
      {answer !== null && <p className="text-ink-muted text-2xs">{answer.sentence}</p>}

      {proposal.repairOf !== undefined && (
        <p className="text-ink-muted text-2xs">
          This was a second attempt, written after Loom refused the one before it.
        </p>
      )}

      {proposal.failure !== undefined && (
        <p className="text-ink-muted text-2xs">
          This one stopped {FAILURE_STAGES[proposal.failure.stage].label}.{" "}
          {FAILURE_STAGES[proposal.failure.stage].meaning}
        </p>
      )}

      <TechnicalDetail summary="What the AI proposed and how Loom decided">
        <dl className="flex flex-wrap gap-x-4 gap-y-1">
          <div className="flex gap-1">
            <dt className="text-ink-muted">changes</dt>
            <dd className="font-mono">{summariseOperations(proposal.delta.operations)}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-ink-muted">confidence</dt>
            <dd className="font-mono">{proposal.provenance.confidence.toFixed(2)}</dd>
          </div>
          {assessment !== undefined && (
            <>
              <div className="flex gap-1">
                <dt className="text-ink-muted">stakes</dt>
                <dd className="font-mono">{assessment.stakes}</dd>
              </div>
              <div className="flex gap-1">
                <dt className="text-ink-muted">reversible</dt>
                <dd className="font-mono">{assessment.reversible ? "yes" : "no"}</dd>
              </div>
            </>
          )}
          <div className="flex gap-1">
            <dt className="text-ink-muted">by</dt>
            <dd className="font-mono">{proposal.provenance.interpreter}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-ink-muted">proposal</dt>
            <dd className="font-mono">{proposal.proposalId}</dd>
          </div>
          {proposal.repairOf !== undefined && (
            <div className="flex gap-1">
              <dt className="text-ink-muted">repair of</dt>
              <dd className="font-mono">{proposal.repairOf}</dd>
            </div>
          )}
          {disposition !== undefined && (
            <>
              <div className="flex gap-1">
                <dt className="text-ink-muted">disposition</dt>
                <dd className="font-mono">{disposition.kind}</dd>
              </div>
              <div className="flex gap-1">
                <dt className="text-ink-muted">rule</dt>
                <dd className="font-mono">{disposition.reason.code}</dd>
              </div>
              <div className="flex gap-1">
                <dt className="text-ink-muted">policy</dt>
                <dd className="font-mono">{disposition.policyId}</dd>
              </div>
            </>
          )}
          {answer !== null && (
            <div className="flex gap-1">
              <dt className="text-ink-muted">answered</dt>
              <dd className="font-mono">{answer.technical}</dd>
            </div>
          )}
        </dl>

        {disposition !== undefined && (
          <p className="text-ink-secondary">{disposition.reason.detail}</p>
        )}

        {proposal.failure !== undefined && (
          <p className="text-ink-secondary font-mono">
            {proposal.failure.stage}: {proposal.failure.detail}
          </p>
        )}
      </TechnicalDetail>
    </li>
  )
}
