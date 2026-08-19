"use client"

import { useActionState } from "react"

import { ProposalEffectView } from "@/app/(portal)/_components/proposal-effect"
import { ruleSentence, type ChangeRecord, type RecordOutcome } from "@/app/(portal)/_lib/demo/record"
import { toneClasses, type OutcomeTone, type WriteReport } from "@/app/(portal)/_lib/outcome"
import type { ProposalEffect } from "@/app/(portal)/_lib/proposal-effect"

import { answerHeld, undoRevision } from "../actions"

/**
 * One ask, and the whole account of what became of it.
 *
 * This card is the demo's argument. A page that changed is a party trick; a page
 * that changed *and* can tell you what was proposed, what it was weighed
 * against, which rule decided it, under which policy, and how to put it back is
 * the thing Loom is for. Every field below is read off the runtime's own
 * narration — none of it is written for display.
 *
 * It is deliberately dense. A summarised version would be easier to look at and
 * would be making the opposite point.
 */

const OUTCOME_TONES: Readonly<Record<RecordOutcome, OutcomeTone>> = {
  applied: "applied",
  "awaiting-you": "awaiting",
  refused: "rejected",
  discarded: "rejected",
  "not-interpreted": "uninterpreted",
  "did-not-apply": "inapplicable",
  "in-flight": "inapplicable",
}

const OUTCOME_LABELS: Readonly<Record<RecordOutcome, string>> = {
  applied: "applied",
  "awaiting-you": "waiting on you",
  refused: "refused",
  discarded: "you said no",
  "not-interpreted": "not interpreted",
  "did-not-apply": "did not apply",
  "in-flight": "unfinished",
}

const Row = ({ label, children }: { readonly label: string; readonly children: React.ReactNode }) => (
  <div className="flex gap-2">
    <dt className="text-ink-muted w-24 shrink-0">{label}</dt>
    <dd className="min-w-0 flex-1 font-mono break-words">{children}</dd>
  </div>
)

const Section = ({ title, children }: { readonly title: string; readonly children: React.ReactNode }) => (
  <section className="flex flex-col gap-1.5">
    <h4 className="text-ink-muted text-2xs tracking-wide uppercase">{title}</h4>
    <dl className="text-2xs flex flex-col gap-1">{children}</dl>
  </section>
)

export const RecordCard = ({
  record,
  effect,
}: {
  readonly record: ChangeRecord
  /**
   * Present only while the change is waiting on the visitor. An applied change
   * has already moved the tree, so describing it against the tree as it is now
   * would report the change as having no effect — true, and the opposite of
   * useful.
   */
  readonly effect?: ProposalEffect
}) => {
  const [answerReport, answer, answering] = useActionState<WriteReport | null, FormData>(answerHeld, null)
  const [undoReport, undo, undoing] = useActionState<WriteReport | null, FormData>(undoRevision, null)
  const report = answerReport ?? undoReport

  return (
    <li className="border-edge-subtle bg-surface-base flex flex-col gap-3 rounded-md border p-3">
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className={`rounded-sm px-1.5 py-0.5 text-2xs ${toneClasses(OUTCOME_TONES[record.outcome])}`}>
            {OUTCOME_LABELS[record.outcome]}
          </span>
          <span className="text-ink-muted font-mono text-2xs">{record.origin}</span>
        </div>
        <p className="text-sm">“{record.utterance}”</p>
        <p className="text-ink-muted text-2xs">
          asked by {record.actor ?? "nobody named"}
          {record.repaired ? " · refused once, then repaired" : ""}
        </p>
      </header>

      {record.interpretation && (
        <Section title="the proposal">
          <p className="text-ink-secondary text-2xs italic">{record.interpretation.rationale}</p>
          <Row label="interpreter">{record.interpretation.interpreter}</Row>
          <Row label="authored by">{record.interpretation.authoredBy}</Row>
          <Row label="confidence">{record.interpretation.confidence.toFixed(2)}</Row>
          <Row label="delta">
            <ul className="flex flex-col gap-0.5">
              {record.interpretation.operations.map((operation) => (
                <li key={operation}>{operation}</li>
              ))}
            </ul>
          </Row>
        </Section>
      )}

      {record.stakes && record.reversibility && (
        <Section title="what the gate weighed">
          <Row label="stakes">{record.stakes.level}</Row>
          {record.stakes.factors.length === 0 ? (
            <Row label="factors">nothing this policy watches for</Row>
          ) : (
            record.stakes.factors.map((factor) => (
              <Row key={factor.code} label={factor.code}>
                {factor.detail} · {factor.level}
              </Row>
            ))
          )}
          <Row label="reversible">
            {record.reversibility.reversible ? "yes" : "no"}
            {record.reversibility.reasons.length > 0 ? ` — ${record.reversibility.reasons.join("; ")}` : ""}
          </Row>
          <Row label="undo carries">
            {record.reversibility.retainedNodeCount} node
            {record.reversibility.retainedNodeCount === 1 ? "" : "s"}
          </Row>
          <Row label="inverse">
            <ul className="flex flex-col gap-0.5">
              {record.reversibility.inverseOperations.map((operation) => (
                <li key={operation}>{operation}</li>
              ))}
            </ul>
          </Row>
        </Section>
      )}

      {record.disposition && (
        <Section title="the verdict">
          <Row label="decision">{record.disposition.kind}</Row>
          <Row label="rule">{record.disposition.ruleCode}</Row>
          <p className="text-ink-secondary text-2xs">{ruleSentence(record.disposition.ruleCode)}</p>
          <p className="text-ink-secondary text-2xs">{record.disposition.detail}</p>
          <Row label="policy">{record.disposition.policyId}</Row>
          {record.disposition.policyFingerprint && (
            <Row label="fingerprint">{record.disposition.policyFingerprint.slice(0, 16)}…</Row>
          )}
        </Section>
      )}

      {record.revision && (
        <Section title="the revision">
          <Row label="produced">
            {record.revision.produced}, replacing {record.revision.replaced}
          </Row>
        </Section>
      )}

      {effect && <ProposalEffectView effect={effect} />}

      {record.failure && <p className="bg-inapplicable text-inapplicable-ink rounded-sm p-2 text-2xs">{record.failure}</p>}

      {record.heldProposalId && !answerReport && (
        <div className="flex gap-2">
          <form action={answer}>
            <input type="hidden" name="proposalId" value={record.heldProposalId} />
            <input type="hidden" name="answer" value="apply" />
            <button
              type="submit"
              disabled={answering}
              className="bg-affirm text-affirm-ink border-affirm-edge rounded-md border px-3 py-1.5 text-xs disabled:opacity-60"
            >
              {answering ? "applying…" : "apply it"}
            </button>
          </form>
          <form action={answer}>
            <input type="hidden" name="proposalId" value={record.heldProposalId} />
            <input type="hidden" name="answer" value="discard" />
            <button
              type="submit"
              disabled={answering}
              className="bg-refuse text-refuse-ink border-refuse-edge rounded-md border px-3 py-1.5 text-xs disabled:opacity-60"
            >
              discard
            </button>
          </form>
        </div>
      )}

      {record.revision && !undoReport && (
        <form action={undo}>
          <input type="hidden" name="revision" value={record.revision.produced} />
          <button
            type="submit"
            disabled={undoing}
            className="bg-neutral text-neutral-ink border-neutral-edge hover:bg-surface-hover w-full rounded-md border px-3 py-1.5 text-xs disabled:opacity-60"
          >
            {undoing ? "undoing…" : `undo revision ${record.revision.produced}`}
          </button>
        </form>
      )}

      {report && (
        <div className={`rounded-sm p-2 text-2xs ${toneClasses(report.tone)}`}>
          <strong className="font-medium">{report.headline}</strong> — {report.detail}
        </div>
      )}
    </li>
  )
}
