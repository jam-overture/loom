"use client"

import { useActionState } from "react"

import { ProposalEffectView } from "@/app/(portal)/_components/proposal-effect"
import type { ProposalEffect } from "@/app/(portal)/_lib/proposal-effect"
import { ruleSentence, stateOfRecord } from "@/app/(portal)/_lib/vocabulary"

import { answerNote } from "@/app/(demo)/_lib/answer"
import { ceilingNote } from "@/app/(demo)/_lib/ceiling"
import type { PlainChange } from "@/app/(demo)/_lib/plain-change"
import type { ChangeRecord } from "@/app/(demo)/_lib/record"
import { demoState, toneClasses, type WriteReport } from "@/app/(demo)/_lib/report"
import {
  askedLine,
  UNDO_CAUTION,
  UNDO_LABEL,
  UNDO_SPENT,
  UNDO_WAITING,
  type UndoOffer,
} from "@/app/(demo)/_lib/undo"
import { weighedOf } from "@/app/(demo)/_lib/weighed"

import { answerHeld, undoRevision } from "../actions"
import { TechnicalDetail } from "./technical-detail"
import { Weighed } from "./weighed"
import { WhatWouldHappen } from "./what-would-happen"

/**
 * One ask, and the whole account of what became of it.
 *
 * This card is the demo's argument. A page that changed is a party trick; a page
 * that changed *and* can tell you what was proposed, what it was weighed
 * against, which rule decided it, under which policy, and how to put it back is
 * the thing Loom is for. Every field below is read off the runtime's own
 * narration — none of it is written for display.
 *
 * **Nothing has been removed to make it land.** The whole record is still here,
 * to the fingerprint and the inverse operations, and it is one click away on
 * every card. What changed is the order a stranger meets it in: the sentence
 * that says what happened to the page is the largest thing on the card, the
 * rule's own words are under it, and the four technical sections are behind the
 * disclosure rather than being the first thing the eye lands on.
 *
 * The five state names come from `(portal)/_lib/vocabulary`, which is the only
 * way the demo and the review queue can be guaranteed to call the same state the
 * same thing — a visitor told "waiting on you" here and a reviewer told `held`
 * three files away would be two products.
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
  plain = [],
  offer = "offer",
}: {
  readonly record: ChangeRecord
  /**
   * Present only while the change is waiting on the visitor. An applied change
   * has already moved the tree, so describing it against the tree as it is now
   * would report the change as having no effect — true, and the opposite of
   * useful.
   */
  readonly effect?: ProposalEffect
  /**
   * The same proposal in the words on the page, for the same reason and under
   * the same condition: only a change nobody has answered yet is a change a
   * visitor is being asked to picture.
   *
   * Defaulted rather than required, because a card whose proposal has been
   * answered has nothing to say here and should not have to pass an empty list
   * to say so.
   */
  readonly plain?: readonly PlainChange[]
  /**
   * Whether this card's undo is still to be had, waiting on an answer, or
   * already spent — computed from the whole record list, which is the only
   * place the answer exists. Defaulted, because a card with no revision has no
   * undo to offer and should not have to say so.
   */
  readonly offer?: UndoOffer
}) => {
  const [answerReport, answer, answering] = useActionState<WriteReport | null, FormData>(answerHeld, null)
  const [undoReport, undo, undoing] = useActionState<WriteReport | null, FormData>(undoRevision, null)
  const report = answerReport ?? undoReport
  const outcome = demoState(stateOfRecord(record.outcome))
  const answered = answerNote(record)
  const asked = askedLine(record)
  const weighed = weighedOf(record)
  const ceiling = ceilingNote(record)

  return (
    /*
     * The record's own id, as the element's, so a card can be addressed from
     * outside itself — `AnswerInView` needs to find the one that is waiting on
     * an answer, and the alternative is a ref threaded through a list the page
     * builds by mapping. Stable across the answer, because answering a hold
     * replaces the record rather than adding one (`session.ts`).
     */
    <li
      id={record.recordId}
      className="border-edge-subtle bg-surface-raised flex flex-col gap-3 rounded-md border p-3.5"
    >
      <header className="flex flex-col gap-2">
        {/*
          * The state, and nothing beside it.
          *
          * `record.origin` used to sit opposite, in monospace: `user-instruction`
          * in the top right of the first card a stranger ever reads. It is the
          * runtime's code for *what kind of act this was*, and it is a real
          * input to the verdict below — `autoApplyCeiling` is keyed by it — but
          * as a hyphenated token in the corner it was a label nobody could read
          * standing in for a claim nobody was told. It is now in the disclosure,
          * where the portal's own screens keep it, and the claim it stood for is
          * a sentence under the rule that used it (`_lib/ceiling.ts`).
          */}
        <div className="flex items-center gap-2">
          <span className={`rounded-sm px-1.5 py-0.5 text-2xs ${toneClasses(outcome.tone)}`}>
            {outcome.label}
          </span>
        </div>

        {/*
          * What was asked, in the words it was asked in. It leads because it is
          * the one line on the card a visitor wrote themselves, or pressed — the
          * anchor everything below is an answer to.
          *
          * Which is why an undo is quoted as *“Put it back.”* and not as
          * `Undo revision 1.`: the second is a true sentence about the log and
          * a sentence no visitor said, in the one position on the card reserved
          * for the words they recognise. `_lib/undo.ts` owns the substitution
          * and the runtime's utterance is under the disclosure, unaltered.
          */}
        <p className="text-md">“{asked.plain}”</p>

        {/*
          * The state in a sentence, under the badge that names it. "Refused" is
          * a word; "a rule in this project's settings blocked it, so nothing
          * changed" is the thing a visitor came to the demo to find out.
          *
          * Except once the undo has landed, where the applied sentence — *"This
          * change is live on the page beside you"* — is no longer a signpost in
          * the wrong place but a false statement about the page three inches
          * away. The badge still reads "Applied", correctly: that is what became
          * of *this ask*, and the sentence under it is where the page stands
          * now. `_lib/undo.ts` owns both strings.
          */}
        <p className="text-ink-secondary text-sm">
          {offer === "spent" ? UNDO_SPENT : outcome.meaning}
        </p>

        <p className="text-ink-muted text-2xs">
          asked by {record.actor ?? "nobody named"}
          {record.repaired ? " · refused once, then repaired" : ""}
        </p>
      </header>

      {/*
        * What the Gate weighed, before the rule that read it.
        *
        * The rail promises two questions and then a named rule; this is the
        * card keeping that promise, in that order. Both answers were already on
        * the record and both were behind the disclosure in the runtime's
        * shorthand — `stakes: medium`, `undo carries: 4 nodes` — so a visitor
        * met the verdict and never met the weighing.
        *
        * It stays on an answered card as well as a held one. The weighing is
        * what the Gate did with this ask, which is a fact about the record and
        * not a control: a card that dropped it once the change had landed would
        * be a record that forgets its own reasoning the moment the reasoning
        * stops being urgent.
        *
        * `_lib/weighed.ts` decides the words, and returns nothing for an ask
        * that never reached assessment.
        */}
      {weighed && <Weighed answers={weighed} />}

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

      {/*
        * And what "from here" is, on the one verdict that turns on it.
        *
        * The rule above is the only one of the eight that compares an ask
        * against what its *origin* is allowed to do alone, and its sentence —
        * "Riskier than a request from here is allowed to be without asking" —
        * names that allowance without ever saying what it is. This is the
        * allowance, read from the same policy through the same `ceilingFor` the
        * Gate called.
        *
        * With `Weighed` directly above it, the three lines are now the Gate's
        * whole arithmetic in the order it happened: *some risk*, then *this much
        * is allowed unasked*, then the rule saying the first exceeded the
        * second. Before this line the card printed both sides of an inequality
        * and never the threshold between them.
        *
        * Quieter than the rule and directly under it, because it is that
        * sentence's second half rather than a claim of its own. `_lib/ceiling.ts`
        * decides when there is one; on seven of the eight rules there is not.
        */}
      {ceiling && <p className="text-ink-muted text-xs">{ceiling.sentence}</p>}

      {/*
        * And what the visitor did about it, which is the sentence above's
        * other half.
        *
        * The rule sentence on a held change says why Loom stopped and then
        * stops itself — so on a card that has since been answered *yes* it sat
        * under an "Applied" badge explaining why the change should not have
        * been applied, with nothing between the two. The reader was the
        * missing term: they pressed the button, and the record of the change
        * they allowed did not mention them.
        *
        * It is placed directly under the rule rather than beside the undo,
        * because it is the end of the account and not a control. Marked in the
        * applied tone and set off by a rule of its own, because everything
        * else on the card is Loom talking about the change and this is the one
        * line about the person reading it. `_lib/answer.ts` decides when there
        * is anything to say — on four of the five outcomes there is not.
        */}
      {answered && (
        <p className="border-applied-ink text-ink-secondary border-l-2 pl-2.5 text-xs">
          <strong className="text-applied-ink font-medium">{answered.label}.</strong>{" "}
          {answered.meaning}
        </p>
      )}

      {/*
        * What allowing it would do to the page, in the words on the page, the
        * line before the buttons that allow it.
        *
        * This is where `(portal)/_components/proposal-effect` used to sit — the
        * review tool's answer to the same question, above the disclosure and
        * unasked, reading `delete loom.stat-grid · loom.page · and 3 nodes under
        * it`. It has not been removed: it is in the disclosure below, in the
        * section of technical account it always belonged to. What stands here
        * instead is the plain half, which is the order the rest of this card is
        * built in and the rule this whole surface follows.
        */}
      {plain.length > 0 && <WhatWouldHappen lines={plain} />}

      {/*
        * The two buttons a held change is waiting on, immediately under the
        * sentence that says it is waiting. They were below the technical record
        * before, which put the whole delta between a visitor being told a
        * decision was theirs and being given anywhere to make it.
        */}
      {record.heldProposalId && !answerReport && (
        <div className="flex gap-2">
          <form action={answer}>
            <input type="hidden" name="proposalId" value={record.heldProposalId} />
            <input type="hidden" name="answer" value="apply" />
            <button
              type="submit"
              disabled={answering}
              className="bg-affirm text-affirm-ink border-affirm-edge rounded-md border px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
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
              className="bg-refuse text-refuse-ink border-refuse-edge hover:bg-surface-hover rounded-md border px-3 py-1.5 text-xs transition-colors disabled:opacity-60"
            >
              No thanks
            </button>
          </form>
        </div>
      )}

      {/*
        * The undo, and — the part that was missing — what pressing it will
        * actually do.
        *
        * An undo is a change of its own (0032), so this one is gated like any
        * other and this one is held: the page does not move, and a second card
        * appears asking the visitor to allow it. Correct, and for the two
        * seconds before they find that card it reads as a button that did
        * nothing. It is the same defect `AskPanel` fixed one control earlier,
        * with the same fix — say it before the press, in one line, under the
        * control it is about.
        *
        * What the offer is gated on is `_lib/undo.ts`'s to decide, from the
        * records rather than from this card's own press. The press is the one
        * thing that does not settle it: the undo it starts is answered on a
        * different card, so a gate on `undoReport` withdrew the offer the
        * moment the Gate held it and never gave it back — including to a
        * visitor who had turned their own undo down.
        */}
      {record.revision && offer === "offer" && (
        <form action={undo} className="flex flex-col gap-1.5">
          <input type="hidden" name="revision" value={record.revision.produced} />
          <button
            type="submit"
            disabled={undoing}
            className="bg-neutral text-neutral-ink border-neutral-edge hover:bg-surface-hover w-full rounded-md border px-3 py-1.5 text-xs transition-colors disabled:opacity-60"
          >
            {undoing ? "Undoing…" : UNDO_LABEL}
          </button>
          <p className="text-ink-muted text-2xs">{UNDO_CAUTION}</p>
        </form>
      )}

      {/*
        * The undo this card offered, now a question of its own above it. Said
        * in the awaiting tone and marked with a rule, so it reads as the same
        * kind of thing as the answered note above rather than as a control.
        */}
      {record.revision && offer === "waiting" && (
        <p className="border-awaiting-ink text-ink-secondary border-l-2 pl-2.5 text-xs">
          {UNDO_WAITING}
        </p>
      )}

      <TechnicalDetail summary="Show the full record">
        {/*
          * The ask itself, in the runtime's words, and the only section here
          * that renders on every card.
          *
          * It exists because the origin had to leave the light and nothing is
          * ever removed from this surface — a card that never reached a verdict
          * would otherwise have dropped the field entirely rather than moved it.
          * `askedAt` joins it: the record has carried it since the surface was
          * built and no half of this card has ever printed it.
          */}
        <Section title="the ask">
          <Row label="origin">{record.origin}</Row>
          <Row label="asked at">{record.askedAt}</Row>
        </Section>

        {record.interpretation && (
          <Section title="the proposal">
            {/*
              * The intent's own utterance, and only when the card is not
              * already quoting it. On an undo that is `Undo revision 1.` — the
              * runtime's sentence, whole, where the technical half of this
              * surface goes. On every other card it would be the line three
              * inches above, said twice.
              */}
            {asked.technical && <Row label="asked">{asked.technical}</Row>}
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

        {/*
          * The review tool's reading of the same proposal, unaltered and
          * complete, next to the rest of the technical account.
          *
          * It is the portal's component and it stays the portal's — the two
          * surfaces must not end up with two answers to "what would this
          * replace", and the portal's is the one with the before-and-after of
          * every prop on it. What was wrong was never the view; it was that a
          * stranger met it before they had asked for anything technical. Here it
          * is one click down, which is where this surface has always said the
          * evidence goes.
          */}
        {effect && <ProposalEffectView effect={effect} />}

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
            {/*
              * The number the rule above compared against, beside the origin it
              * belongs to. The plain sentence is in the light; this is the
              * evidence for it, which is the rule the whole disclosure follows.
              */}
            {ceiling && <Row label="ceiling">{ceiling.technical}</Row>}
            {record.disposition.policyFingerprint && (
              <Row label="fingerprint">{record.disposition.policyFingerprint.slice(0, 16)}…</Row>
            )}
            {/*
              * The runtime's own word for the answer, and the actor it wrote
              * down — the same shape the portal's activity screen prints
              * (`describeAnswer`), so the two surfaces cannot end up naming
              * the same event differently. The plain sentence is above; this
              * is the evidence for it, which is the rule the whole disclosure
              * follows.
              */}
            {answered && <Row label="answered">{answered.technical}</Row>}
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

      {record.failure && (
        <p className="bg-inapplicable text-inapplicable-ink rounded-sm p-2 text-2xs">{record.failure}</p>
      )}

      {/*
        * Only what this card does not already say.
        *
        * Answering a hold rewrites the card it was on — the badge, the sentence
        * and the buttons all become what became of it — so printing the answer
        * underneath produced the same green "Applied" twice inside one card,
        * the second time with the state's own sentence repeated verbatim. What
        * reaches here is the answer that changed nothing to look at: a hold
        * somebody had already answered, which has no card of its own and would
        * otherwise be silent.
        */}
      {report && !report.recorded && (
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
