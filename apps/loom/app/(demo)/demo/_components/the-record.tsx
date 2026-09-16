import type { ProposalEffect } from "@/app/(portal)/_lib/proposal-effect"

import type { MarkedPage } from "@/app/(demo)/_lib/marked"
import type { MovedNote } from "@/app/(demo)/_lib/moved"
import type { PlainChange } from "@/app/(demo)/_lib/plain-change"
import type { ChangeRecord } from "@/app/(demo)/_lib/record"
import { reasoningFor } from "@/app/(demo)/_lib/reasoning"
import { askedLine, undoOffer } from "@/app/(demo)/_lib/undo"

import { AnswerInView } from "./answer-in-view"
import { RecordCard } from "./record-card"

/**
 * The record: every ask this visitor has made, once each.
 *
 * **Why this is a component and not eleven lines of `page.tsx`.** It was those
 * eleven lines until today, and on 11 September a merge left two `records.map`
 * calls inside the one `<ul>` — the second decorated with the offer, the quoted
 * ask and the mark, the first with none of them. Every card rendered twice. On a
 * 1440×900 laptop the demo's leading question arrived as two identical cards,
 * 503px each, with two **Apply this change** buttons 511px apart and no way to
 * tell which one the page meant. It reached `main` and it was live on the
 * deployed demo for a day.
 *
 * Nothing caught it and nothing could have. `page.tsx` is an async Server
 * Component that reads a cookie, opens a session and renders a `LoomTree`, so
 * this repository has never had a test that mounts it; every file the duplicate
 * loop touched was correct on its own; and both copies of the card were valid
 * React. The only witness was the screen.
 *
 * So the list has a module, and the module has a test that counts. The three
 * facts a stranger's eye would catch and no unit test previously could —
 * **one card per ask**, **one element carrying each record's id**, **one control
 * per decision** — are now three assertions in `the-record.test.tsx`.
 *
 * Two of those are not tidiness. The card's element id is how the page addresses
 * it from outside: `AnswerInView` finds the waiting question with
 * `getElementById`, and `BackToTheRecord` sends a visitor on a phone back up to
 * it. Two elements with one id means both resolve to whichever came first, which
 * on 11 September was the copy with no offer and no mark on it.
 */

/**
 * What a card cannot work out alone, when its change is still waiting on an
 * answer.
 *
 * The same four readings `page.tsx` computes per held proposal, keyed by the
 * record they belong to rather than by the proposal, because that is the key
 * this list has in hand. Absent entries are the common case: an applied change
 * describes a tree that is gone, so nothing here is computed for one.
 */
export type HeldReading = {
  readonly effect?: ProposalEffect
  readonly inQuestion?: React.ReactNode
  readonly plain?: readonly PlainChange[]
  readonly moved?: MovedNote
}

/**
 * The one record, if any, that has asked the visitor something and is still
 * waiting for the answer.
 *
 * Newest first, so this is the question in front of them rather than one they
 * have already dealt with — and never one the page has moved past, because
 * scrolling a visitor to a question nobody can answer is worse than leaving them
 * where they are. A hold whose base revision is stale carries a `moved` note,
 * which is the same test `page.tsx` applied before this moved here.
 */
export const awaitingAnswer = (
  records: readonly ChangeRecord[],
  held: ReadonlyMap<string, HeldReading>
): ChangeRecord | undefined =>
  records.find(
    (record) =>
      record.heldProposalId !== undefined && held.get(record.recordId)?.moved === undefined
  )

export const TheRecord = ({
  records,
  marked,
  held,
  revision,
}: {
  readonly records: readonly ChangeRecord[]
  /**
   * What the page's marks are, and which card wears which words. Computed from
   * the marks that were actually drawn, so a card here can never claim a mark
   * the page is not carrying.
   */
  readonly marked: MarkedPage
  readonly held: ReadonlyMap<string, HeldReading>
  /**
   * The page's revision, which is the other half of what makes a moment
   * different for `AnswerInView`: a visitor can leave one question open and ask
   * for something that lands on its own, and the still-unanswered card is worth
   * putting back in front of them when the page under it has moved.
   */
  readonly revision: number
}) => {
  if (records.length === 0) return null

  const awaiting = awaitingAnswer(records, held)

  return (
    <section aria-labelledby="the-record" className="flex flex-col gap-2">
      <h2 id="the-record" className="text-ink-muted text-2xs tracking-wide uppercase">
        the record
      </h2>

      {/*
        * The sentence that joins the two halves of the screen.
        *
        * The dot is the same colour as the ring on the page and as the badge on
        * the card underneath, and that is the whole teaching: a visitor is never
        * told "the marks mean X", they are shown one colour in three places at
        * once and read it in a glance. It appears only when there is a mark to
        * explain, so it is never a legend for something that is not on screen.
        */}
      {marked.line && (
        <p className="text-ink-secondary flex items-start gap-2 text-xs">
          <span
            aria-hidden="true"
            className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
              marked.tone === "applied" ? "bg-applied-ink" : "bg-awaiting-ink"
            }`}
          />
          {marked.line}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {records.map((record) => {
          /*
           * The words the page is wearing for this card, when there is more than
           * one mark on it to be told apart.
           *
           * `marked.tone` rather than the record's own state, because this pill
           * exists to be recognised as *the same object* as the chip on the band
           * — same words, same fill, same ink — and the chip's colour is a fact
           * about the marks the page drew.
           */
          const words = marked.words.get(record.recordId)
          const reading = held.get(record.recordId)

          return (
            <RecordCard
              key={record.recordId}
              record={record}
              offer={undoOffer(record, records)}
              /*
               * Whether this card still argues its case or folds it under one
               * line — read here because it is a fact about the *list*: which
               * card is newest, and whether this one's hold is still live.
               * Same shape as `offer` and `asked`, and for the same reason.
               *
               * `moved` comes off the held reading rather than the record,
               * which is the same source `awaitingAnswer` above uses to decide
               * the rail must not scroll to a question nobody can answer — and
               * the two must agree: a card the rail has given up on is not a
               * card whose reasoning is urgent.
               */
              reasoning={reasoningFor(record, records, reading?.moved !== undefined)}
              /*
               * An undo is quoted by the control that raised it, and which
               * control that was is a fact about the card above this one: an
               * ordinary change offers *Put it back*, an undo offers *Undo this
               * change too*. Read from the records here for the same reason
               * `offer` is — a card cannot see the ask it undoes.
               */
              asked={askedLine(record, records)}
              {...(words === undefined || marked.tone === undefined
                ? {}
                : { mark: { label: words, tone: marked.tone } })}
              {...(reading ?? {})}
            />
          )
        })}
      </ul>

      {/*
        * The rail's own scroll, and only when the demo has asked the visitor a
        * question it cannot proceed without.
        *
        * The stage scrolls itself (`ChangeSpotlight`); on a wide screen that is a
        * different scroller, so a marked band arriving in view says nothing about
        * whether the two buttons deciding its fate are on screen. Measured at
        * 1440×800 they were not — sixty-nine pixels under the fold, on the first
        * press of the primary ask. Stacked, it is further still: the whole panel
        * of secondary asks sits between the button and the question it raised.
        */}
      {awaiting && <AnswerInView recordId={awaiting.recordId} token={`${revision}`} />}
    </section>
  )
}
