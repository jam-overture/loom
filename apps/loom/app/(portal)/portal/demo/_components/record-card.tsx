"use client"

import { useActionState } from "react"

import { ProposalEffectView } from "@/app/(portal)/_components/proposal-effect"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import type { ChangeRecord } from "@/app/(portal)/_lib/demo/record"
import { type WriteReport } from "@/app/(portal)/_lib/outcome"
import type { ProposalEffect } from "@/app/(portal)/_lib/proposal-effect"
import { plainState, ruleSentence, stateOfRecord, toneClasses } from "@/app/(portal)/_lib/vocabulary"

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
 * It is deliberately dense, and the density stays: the whole account is the
 * argument, and a summarised version would be making the opposite point. What
 * has changed is where the reader meets it — the badge, the verdict and the
 * rule lead in plain words, and the four technical sections sit behind one
 * disclosure rather than being the first thing on the card.
 *
 * This card is also where the portal's plain vocabulary was invented: it had a
 * private `OUTCOME_LABELS` that said "waiting on you" while the rest of the
 * portal said `held`. That table is now `_lib/vocabulary` and this reads it,
 * which is the only way the demo and the review queue can be guaranteed to
 * call the same state the same thing.
 */

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
  const outcome = plainState(stateOfRecord(record.outcome))

  return (
    <li className="border-edge-subtle bg-surface-base flex flex-col gap-3 rounded-md border p-3">
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className={`rounded-sm px-1.5 py-0.5 text-2xs ${toneClasses(outcome.tone)}`}>
            {outcome.label}
          </span>
          <span className="text-ink-muted font-mono text-2xs">{record.origin}</span>
        </div>
        <p className="text-sm">“{record.utterance}”</p>
        {/*
          * The state in a sentence, under the badge that names it. "Refused" is
          * a word; "a rule in this project's settings blocked it, so nothing
          * changed" is the thing a visitor came to the demo to find out.
          */}
        <p className="text-ink-secondary text-xs">{outcome.meaning}</p>
        <p className="text-ink-muted text-2xs">
          asked by {record.actor ?? "nobody named"}
          {record.repaired ? " · refused once, then repaired" : ""}
        </p>
      </header>

      {/*
        * The verdict, in the words of the rule that produced it, above the
        * disclosure rather than inside it — a demo whose whole argument is that
        * the runtime can account for itself must not put the account behind a
        * click. What is behind the click is the *evidence*: the codes, the
        * fingerprint, the operations and the inverse.
        */}
      {record.disposition && (
        <p className="text-ink-secondary text-xs">{ruleSentence(record.disposition.ruleCode)}</p>
      )}

      {effect && <ProposalEffectView effect={effect} />}

      <TechnicalDetail summary="The whole record">
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
          {/* The rule's sentence is above the disclosure; only its own words are here. */}
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
      </TechnicalDetail>

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
              {answering ? "Applying…" : "Apply this change"}
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
              No thanks
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
            {undoing ? "Undoing…" : "Undo this change"}
          </button>
        </form>
      )}

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
