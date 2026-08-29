import type { ChangeRecord } from "./record"
import type { WriteReport } from "./report"

/**
 * What *Put it back* is, and when it is still on offer.
 *
 * The button is the last thing a visitor presses in the demo's best sixty
 * seconds, and until this module existed it was the one control on this surface
 * that lied. Press the panel's primary ask, allow it, then press *Put it back*:
 * **the page does not move.** A second card appears instead — *"Undo revision
 * 1." · Waiting on you · Loom will not make this change until you say yes.*
 *
 * That is 0028 working exactly as designed. An undo is a change of its own
 * rather than a rewind, so it is interpreted, assessed and gated like any other
 * — and putting a band back restructures the page near the root just as taking
 * it off did, which is above this policy's ceiling for a request from a
 * visitor. Nothing here should be exempted from the Gate to make the demo
 * tidier: the Gate weighing the undo *too* is a better claim than the one the
 * button was making.
 *
 * Measured, over the real write path, on the five presets this surface offers
 * (`pipeline.test.ts` holds the first of these as an assertion):
 *
 * | preset | undo |
 * | --- | --- |
 * | `trim` — **the panel's primary ask** | held, `stakes-above-ceiling` |
 * | `band` | held, `stakes-above-ceiling` |
 * | `promote` | held, `stakes-above-ceiling` |
 * | `palette` | applies on its own, `within-policy` |
 * | `backdrop` | applies on its own, `within-policy` |
 *
 * So it is not an edge: three of five, and the one the big green button starts.
 * What was wrong is that two things promised otherwise — an unqualified button,
 * and `WhatHappens` step three's *"a button that **really** puts the page
 * back"*, where *really* means *a real change rather than a rewind* and reads as
 * *immediately*. A visitor pressed the one control on the payoff card and
 * watched nothing happen, which is the same defect the 24 August run fixed one
 * control earlier, at the panel's primary ask, with the same remedy: **say it
 * where it is about to become true.**
 */

/**
 * The line under the button, and it is deliberately about what Loom does rather
 * than about what will happen.
 *
 * `presets.ts` states the rule this follows and states it for the chips: a
 * promise on a control may describe *the movement* it asks for and may never
 * predict *the verdict*, because the verdict is computed against the tree at
 * assessment time and a surface that guessed it would be wrong the first time
 * the policy or the page moved. Two of the five undos here do land on their
 * own. So this says **may**, and never which.
 *
 * It is one sentence rather than two because it sits on the card that has the
 * most on it — the payoff card, which carries a badge, the ask, what became of
 * it, who asked, the rule, and (since 25 August) the visitor's own answer. The
 * claim that had to survive the cut is the one a stranger cannot infer: that
 * undoing is *itself a change Loom weighs*, which is the reason the page may
 * not move, and is a more interesting thing to learn than the button working.
 */
export const UNDO_IS_A_CHANGE =
  "Undoing is a change of its own, so Loom weighs it too — it may ask you first."

/**
 * Whether this card still has an undo to offer.
 *
 * Two conditions, and the second is the fix. A change that never applied has no
 * revision and nothing to put back — that half has always been right. The other
 * half was `!undoReport`: the button disappeared the moment *any* answer came
 * back from `undoRevision`, which is correct for the undo that **landed** and
 * wrong for every other outcome. On the primary path it produced a payoff card
 * that read *"Applied · This change is live on the page beside you. “Put it
 * back” undoes it."* with no such button anywhere on it, because the undo the
 * visitor asked for was being held rather than applied. Answer that hold with
 * *No thanks* and the button never came back at all: a visitor who turned down
 * their own undo had no second way to ask for it.
 *
 * So the button is withdrawn on exactly the outcome that makes it meaningless —
 * **the page went back** — and stays on offer through the ones that leave the
 * change standing. A held undo keeps its own card, with its own two buttons, in
 * the rail above; this one remains true and pressable underneath it.
 *
 * `moved` rather than "succeeded" is the field it asks about, for the reason
 * this whole module exists: a held undo is a complete success by the runtime's
 * reckoning — proposal written, custody taken, question asked — and the visitor
 * is looking at a page that has not moved.
 */
export const undoStillOffered = (record: ChangeRecord, lastUndo: WriteReport | null): boolean =>
  record.revision !== undefined && lastUndo?.moved !== true
