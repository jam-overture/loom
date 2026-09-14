"use client"

import { useActionState } from "react"

import { ProposalEffectView } from "@/app/(portal)/_components/proposal-effect"
import type { ProposalEffect } from "@/app/(portal)/_lib/proposal-effect"
import { ruleSentence, stateOfRecord } from "@/app/(portal)/_lib/vocabulary"

import { answerNote } from "@/app/(demo)/_lib/answer"
import { ceilingNote } from "@/app/(demo)/_lib/ceiling"
import type { MovedNote } from "@/app/(demo)/_lib/moved"
import type { PlainChange } from "@/app/(demo)/_lib/plain-change"
import type { ChangeRecord } from "@/app/(demo)/_lib/record"
import { demoState, toneClasses, type WriteReport } from "@/app/(demo)/_lib/report"
import { SPOT_COLOURS, type SpotTone } from "@/app/(demo)/_lib/spotlight"
import {
  appliedWords,
  askedLine,
  UNDO_CAUTION,
  type AskedLine,
  type UndoOffer,
} from "@/app/(demo)/_lib/undo"
import { weighedOf } from "@/app/(demo)/_lib/weighed"

import { answerHeld, undoRevision } from "../actions"
import { PageMovedOn } from "./page-moved-on"
import { PlainReading } from "./plain-reading"
import { TechnicalDetail } from "./technical-detail"
import { Weighed } from "./weighed"

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
  inQuestion,
  plain = [],
  moved,
  offer = "offer",
  asked,
  mark,
}: {
  readonly record: ChangeRecord
  /**
   * The line this card quotes, when the page has worked it out from the whole
   * record list.
   *
   * Only an undo needs it, and only because the control it was raised from is
   * named for what it undoes: an ordinary change offers **Put it back** and an
   * undo offers **Undo this change too**, so the words to quote are on a card
   * this one cannot see. Same shape as `offer` and for the same reason.
   *
   * Defaulted to the reading this card can reach on its own, which is right for
   * every card but that one.
   */
  readonly asked?: AskedLine
  /**
   * Present only while the change is waiting on the visitor. An applied change
   * has already moved the tree, so describing it against the tree as it is now
   * would report the change as having no effect — true, and the opposite of
   * useful.
   */
  readonly effect?: ProposalEffect
  /**
   * The part of the page this change is about, already rendered. Present on the
   * same terms as `effect` and absent for the same reasons, plus the ones
   * `_lib/in-question.ts` gives for a change that has no showable subject.
   */
  readonly inQuestion?: React.ReactNode
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
   * Present when the page has moved past this ask, which is the one thing about
   * a held change this card cannot see for itself: the revision it was judged
   * against lives on the hold, not on the record (`_lib/moved.ts`).
   *
   * It is not another line on the card, it is a different card. The state, the
   * sentence under it, the plain reading and the two buttons are all about a
   * question that is still open, and this one is shut.
   */
  readonly moved?: MovedNote
  /**
   * Whether this card's undo is still to be had, waiting on an answer, or
   * already spent — computed from the whole record list, which is the only
   * place the answer exists. Defaulted, because a card with no revision has no
   * undo to offer and should not have to say so.
   */
  readonly offer?: UndoOffer
  /**
   * The words the page is wearing for this change, and the colour it wears them
   * in — present only while the page carries a mark for more than one change.
   *
   * It is the chip off the band, reproduced: same words, same fill, same ink. A
   * visitor with two questions open and two amber rings on the page is doing a
   * matching problem, and every other way of answering it — naming the ask in
   * the rail's line, numbering the marks, a legend — asks them to read a
   * sentence. This asks them to see that two things are the same thing.
   *
   * `_lib/marked.ts` decides when there is one, from the marks actually drawn
   * rather than from the changes that wanted them, so a card can never claim a
   * mark the page is not carrying.
   */
  readonly mark?: { readonly label: string; readonly tone: SpotTone }
}) => {
  const [answerReport, answer, answering] = useActionState<WriteReport | null, FormData>(answerHeld, null)
  const [undoReport, undo, undoing] = useActionState<WriteReport | null, FormData>(undoRevision, null)
  const report = answerReport ?? undoReport
  /*
   * The state the record is in, unless the page has moved past it — in which
   * case the record's own `awaiting-you` is a fact about custody that stopped
   * being true of the visitor. The Gate is not waiting on them; no answer they
   * can give will land this. `no-change` is the shared table's name for exactly
   * that — *"The change no longer fits this page — something it referred to has
   * moved or gone"* — and it is the same state the record lands in by itself if
   * a second tab gets there first, so the card reads identically either way.
   */
  const outcome = demoState(moved ? "no-change" : stateOfRecord(record.outcome))
  const answered = answerNote(record)
  const quoted = asked ?? askedLine(record)
  /*
   * The three strings under the badge that are about the *direction* of this
   * change rather than about its state, and which an undo's card needs its own
   * versions of. `_lib/undo.ts` owns the table and the reasoning.
   */
  const applied = appliedWords(record)
  const weighed = weighedOf(record)
  const ceiling = ceilingNote(record)
  /*
   * What the change did, for a card whose change has landed.
   *
   * `plain` is the same sentence in the other tense, and the outcome is the
   * whole of what keeps them apart. It is enough on its own: the page keys
   * `plain` by `heldProposalId`, and a landed record does not have one — so a
   * card can be handed the live reading or be `applied`, never both. Guarding
   * on `plain.length` as well read as caution and was a branch no render could
   * reach, which is worse than either: a condition nothing can make false is a
   * claim no test can check.
   */
  const did = record.outcome === "applied" ? (record.did ?? []) : []

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
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-sm px-1.5 py-0.5 text-2xs ${toneClasses(outcome.tone)}`}>
            {outcome.label}
          </span>

          {/*
            * And, when the page is marked for more than one thing, this card's
            * own mark — the chip off the band, in the band's chip's colours.
            *
            * Styled from `SPOT_COLOURS` rather than from a class, because the
            * one property that matters is that it is *identical* to the thing on
            * the page, and the thing on the page is drawn from that table into a
            * stylesheet the stage serves (`spotlightCss`). A Tailwind token here
            * would be a second definition of one colour, free to drift the first
            * time either is retuned.
            *
            * Read aloud with a preposition, because "Waiting on you · Something
            * new would go here" is two badges to the eye and one run-on sentence
            * to a screen reader.
            *
            * **`relative` is load-bearing and invisible.** `sr-only` is
            * `position: absolute`, and an absolutely positioned element is not
            * clipped by an `overflow: hidden` ancestor that is not *positioned*
            * — which the demo's outer `lg:h-screen lg:overflow-hidden` frame is
            * not. Without a positioned parent this span's containing block is
            * the page itself, so it is laid out at its static position deep
            * inside the rail's own scroll, escapes the frame, and stretches the
            * document by the height of the rail's overflow: at two open
            * questions the whole one-viewport layout began scrolling, taking the
            * top bar off screen and leaving 340px of empty ground under both
            * panes. Two words no one can see, moving the entire demo.
            */}
          {mark && (
            <span
              className="relative rounded-sm px-1.5 py-0.5 text-2xs"
              style={{ background: SPOT_COLOURS[mark.tone].fill, color: SPOT_COLOURS[mark.tone].ink }}
            >
              <span className="sr-only">marked on the page: </span>
              {mark.label}
            </span>
          )}
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
        <p className="text-md">“{quoted.plain}”</p>

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
          *
          * And once more on a card that is *itself* an undo, where the applied
          * sentence names the control under it — *"'Put it back' undoes it"* —
          * on the one card whose own title is putting it back. Circular, and
          * pointing at a button that would take the change off again.
          *
          * Gated on `record.revision` rather than on the state's name because
          * that is the field that says this ask produced one: a held or refused
          * card has no revision, keeps the shared table's sentence, and must —
          * *"Loom will not make this change until you say yes"* is not about a
          * direction and needs no undo's version of itself.
          */}
        <p className="text-ink-secondary text-sm">
          {offer === "spent"
            ? applied.spent
            : (record.revision && applied.meaning) || outcome.meaning}
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
        * And the comparison the rule above reached its verdict by.
        *
        * That rule is the only one of the eight that weighs an ask against what
        * its *origin* is allowed to do alone, and its sentence — today, *"A
        * change this big is not something Loom may make on its own"* — states
        * the conclusion without the two numbers it was drawn from. This is the
        * comparison: the ceiling, read from the same policy through the same
        * `ceilingFor` the Gate called, and the stakes `Weighed` printed three
        * lines above, in one sentence with the direction between them.
        *
        * So the three lines are the Gate's whole arithmetic in the order it
        * happened: *this much risk*, then *the rule saying it may not land
        * alone*, then *what alone would have allowed, and by which way this one
        * went past it*. Before this line the card printed one side of an
        * inequality; before this line said both levels it printed two numbers
        * and no operator.
        *
        * Quieter than the rule and directly under it, because it is that
        * sentence's evidence rather than a claim of its own. `_lib/ceiling.ts`
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
        * The part of the page the question is about, above the two buttons that
        * answer it — so on the one layout where the band is five screens away,
        * the visitor sees what they are deciding about before they decide.
        *
        * Above rather than below, which is the whole placement: under the
        * buttons it would be an explanation offered to somebody who has already
        * pressed one. It costs the wide layout nothing, because there the band
        * is ringed on the stage and `globals.css` removes this entirely.
        *
        * A rendered element rather than a record field: the card is a client
        * component and rendering a tree needs the registry, so the page builds
        * it and hands it across (`part-in-question.tsx`).
        */}
      {record.heldProposalId && !answerReport && inQuestion}

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
      {plain.length > 0 && <PlainReading lines={plain} />}

      {/*
        * Or, on a card whose change has landed, the same sentence in the past
        * tense — and this is the half the record was missing.
        *
        * **Every other line on an applied card is about the decision.** The
        * badge, the weighing, the rule, the ceiling comparison and the answer
        * note all say why the change was allowed; not one of them says what it
        * was. That was survivable while the plain reading was on the card
        * before the press and gone after it, and it was never survivable for a
        * change Loom applies on its own, which is half the presets: those cards
        * never carried the sentence at all. Two presses of *Repaint the top
        * band* make opposite changes to the page and printed two cards
        * identical to the word.
        *
        * Same slot as the reading it replaces, so the card's order is unchanged
        * — what happened, then what can still be done about it. In the applied
        * tone, matching the ring left on the stage.
        */}
      {did.length > 0 && <PlainReading lines={did} tone="applied" />}

      {/*
        * Or, where the two buttons would have been, what happened to the page
        * under this ask and the one thing that can still be done about it.
        *
        * It takes the buttons' place rather than joining them, because the
        * press they invite cannot succeed: `confirmHeld` releases a hold whose
        * revision has moved and reports the conflict, so the only thing
        * pressing *Apply this change* here achieves is spending the offer.
        */}
      {moved && <PageMovedOn note={moved} {...(record.presetId === undefined ? {} : { presetId: record.presetId })} />}

      {/*
        * The two buttons a held change is waiting on, immediately under the
        * sentence that says it is waiting. They were below the technical record
        * before, which put the whole delta between a visitor being told a
        * decision was theirs and being given anywhere to make it.
        */}
      {record.heldProposalId && !moved && !answerReport && (
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
            {undoing ? "Undoing…" : applied.label}
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
          {applied.waiting}
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
          {/*
            * The two revisions behind the plain sentence above, and only on the
            * card that says it. It goes here rather than under "the verdict"
            * because it is not the Gate's reasoning: the Gate reached a verdict
            * and stands by it — what moved is the page it was reached about,
            * which is a fact about the ask.
            */}
          {moved && <Row label="weighed at">{moved.technical}</Row>}
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
            {quoted.technical && <Row label="asked">{quoted.technical}</Row>}
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
