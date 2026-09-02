import { REVERT_INTERPRETER } from "@loom/runtime/write"

import type { ChangeRecord } from "./record"

/**
 * The undo: what it is called, what it warns, and what its card quotes.
 *
 * Three strings and one predicate, in one file, because they are one claim seen
 * from three places and the surface was making a different one at each.
 *
 * **What a stranger does.** They press the green ask, the Gate holds it, they
 * press *Apply this change*, the numbers band goes and the page is ringed in
 * green. Then they press the one control the payoff card offers — **Put it
 * back** — and the page does not move. What appears instead is a second card,
 * amber, reading:
 *
 * > *“Undo revision 1.”* · **Waiting on you** · Loom will not make this change
 * > until you say yes.
 *
 * Everything about that is correct. An undo is a change of its own rather than
 * a rewind (0032), so it is interpreted, assessed and gated like any other, and
 * this one restructures the page near the root exactly as the change it
 * reverses did. Nothing should be exempted from the Gate to make the demo
 * tidier.
 *
 * Two things on the screen promised otherwise, and one of them spoke in the
 * runtime's voice:
 *
 * - **The button said *Put it back*, unqualified**, and it is the only control
 *   on the card a visitor reaches at the end of the sequence. `AskPanel` fixed
 *   this one control earlier — a sentence above the asks saying some of them
 *   wait for an answer — and an applied card is nowhere near that sentence.
 * - **The card quoted `Undo revision 1.`** The utterance behind a revert is
 *   synthesised by `revertRevision`, which says why: it "is not a sentence
 *   someone typed — it is the revision number they named". True of the log and
 *   wrong at the top of a card, in curly quotes, at the size the rail uses for
 *   the one line the visitor is supposed to recognise as their own. `revision`
 *   is on `what-happens.test.tsx`'s list of words this surface may not use
 *   before it has earned them, and the third press put it in quotation marks.
 *
 * So the words the visitor pressed are the words the card quotes, and the
 * runtime's own utterance moves one click down into the record — the rule this
 * whole rail is built to. Nothing is removed; `record.utterance` is untouched
 * and is what the disclosure prints.
 *
 * `UNDO_LABEL` is exported rather than written on the button, so the quotation
 * and the control cannot drift apart: renaming one renames both, and
 * `undo.test.ts` holds the quotation to the label rather than to a string of
 * its own.
 */

/** The words on the control. */
export const UNDO_LABEL = "Put it back"

/**
 * And what the control does not say by itself.
 *
 * The same claim `AskPanel` makes above the asks, in fewer words, said where it
 * is about to become true rather than four inches and one press away. It says
 * *may* and never *will*: the verdict is computed at assessment time against
 * the tree as it stands, and a surface that predicted it would be wrong the
 * first time the policy or the page moved — the rule `presets.ts` gives for
 * every promise on this surface.
 */
export const UNDO_CAUTION =
  "Undoing is a change of its own, so Loom weighs it like any other. It may wait for your yes."

/** What the card quotes, and the runtime's own words for it when they differ. */
export type AskedLine = {
  /** The line at the top of the card. Shown unasked. */
  readonly plain: string
  /**
   * The intent's utterance, when the line above is not it. Belongs one click
   * down, and is absent on every card where the two are the same — a row
   * repeating the sentence three inches above it is the clutter this rail has
   * spent five runs being cut back from.
   */
  readonly technical?: string
}

/**
 * Whether this record is an undo, asked of the runtime rather than inferred.
 *
 * `REVERT_INTERPRETER` is what `revertRevision` stamps on the provenance of a
 * delta its own planner computed, so it is the runtime saying so rather than
 * this surface pattern-matching an utterance it does not own. A record with no
 * interpretation was never assessed and has no delta to have come from
 * anywhere, so it falls through to its own words.
 */
const isUndo = (record: ChangeRecord): boolean =>
  record.interpretation?.interpreter === REVERT_INTERPRETER

export const askedLine = (record: ChangeRecord): AskedLine =>
  isUndo(record)
    ? { plain: `${UNDO_LABEL}.`, technical: record.utterance }
    : { plain: record.utterance }

/**
 * Stamp a record as the undo of a revision.
 *
 * The caller's own knowledge about its own request, rather than something read
 * back out of the log — see `ChangeRecord.undoes` for why the log cannot supply
 * it without this surface parsing a sentence it does not own.
 */
export const undoOf = (record: ChangeRecord, revision: number): ChangeRecord => ({
  ...record,
  undoes: revision,
})

/**
 * Whether the applied card still has an undo to offer, and if not, why not.
 *
 * **The defect this replaces.** The offer was gated on *whether an undo had been
 * pressed* — `record.revision && !undoReport` — so it was withdrawn by any
 * answer from the server rather than by the one that spends it. On this demo's
 * primary path the undo is *held*, not applied: an undo is a change of its own
 * (0032) and putting the numbers band back restructures the page as much as
 * taking it off did, so the Gate stops it and the page does not move. The
 * button vanished anyway, two seconds after a press that visibly did nothing,
 * off a card still reading *"This change is live on the page beside you. 'Put
 * it back' undoes it."* — a sentence naming a control that was no longer under
 * it. Answer that held undo with **No thanks** and the visitor had declined
 * their own undo and could never ask again.
 *
 * **Why it is computed here rather than in the card.** The card cannot see any
 * of this. `undoReport` is `useActionState` on the applied card, and every
 * event that resolves an undo happens somewhere else — the held undo is
 * answered on *its own* card, whose action state is its own. So a card watching
 * its own press can only ever learn that an undo was *asked for*, which is the
 * one thing that does not decide anything. The records can see all of it,
 * because the undo is a record like any other, and it is the server's answer
 * rather than a guess that survives a re-render.
 *
 * The three states are what a visitor can be truthfully told:
 *
 * - **`offer`** — nothing is pending and the change is still live, so the
 *   sentence is true and the button belongs under it. This is also where a
 *   *declined* undo lands, which is the point: turning down your own undo puts
 *   the offer back rather than spending it.
 * - **`waiting`** — the Gate is holding an undo of this revision and it is on a
 *   card of its own, above this one. The button is replaced rather than
 *   repeated, because a second press would propose a second undo of the same
 *   revision and the honest thing to do is point at the question already asked.
 * - **`spent`** — an undo of this revision applied. The change is not live any
 *   more, so both the button and the sentence promising it have to go.
 *
 * A *refused* or *misunderstood* undo falls back to `offer` deliberately.
 * Nothing moved, the change really is still live, and the record card for that
 * refusal is sitting above saying which rule stopped it — telling a visitor the
 * change can never be put back would be a claim no record here makes.
 */
export type UndoOffer = "offer" | "waiting" | "spent"

export const undoOffer = (record: ChangeRecord, records: readonly ChangeRecord[]): UndoOffer => {
  const revision = record.revision?.produced
  if (revision === undefined) return "offer"

  const undos = records.filter((other) => other.undoes === revision)

  if (undos.some((undo) => undo.outcome === "applied")) return "spent"
  if (undos.some((undo) => undo.outcome === "awaiting-you")) return "waiting"

  return "offer"
}

/**
 * What the card says in place of the button, in the two states where there is
 * no button to show.
 *
 * `waiting` points up rather than down: records are newest first
 * (`rememberRecord`), so the undo a visitor just asked for is the card above
 * this one.
 *
 * `spent` is a replacement for the applied state's own sentence rather than an
 * addition to it. `report.ts` overrides that sentence for this surface already
 * — the shared table sends a reader to `/portal/history`, which a demo visitor
 * cannot open — and this is the same override one step further on: once the
 * change has been put back, *"This change is live on the page beside you"* is
 * not a signpost in the wrong place, it is false.
 */
export const UNDO_WAITING = "You’ve asked to put this back. It’s waiting on your yes, on the card above."

export const UNDO_SPENT = "You put this back, so the page is as it was before this ask."
