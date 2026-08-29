import type { ChangeRecord } from "./record"
import type { WriteReport } from "./report"

/**
 * Whether the payoff card still has an undo to offer.
 *
 * **The press that takes the button away.** A visitor presses the panel's
 * primary ask, the Gate holds it, they allow it, the numbers band goes and the
 * page is ringed in green. Then they press the one control the card offers —
 * *Put it back* — and the page does not move: a second card appears instead,
 * *“Undo revision 1.” · Waiting on you*, because an undo is a change of its own
 * rather than a rewind (0032) and putting a band back restructures the page at
 * the same depth as taking it off did. That much is the runtime working, and
 * nothing here exempts it from the Gate to make the demo tidier.
 *
 * What was wrong is what the card did next. The offer was gated on
 * `!undoReport` — the button vanished the moment `undoRevision` came back with
 * *anything* — which is right for the undo that **landed** and wrong for every
 * other outcome. Two consequences, and both are on the card a stranger reaches
 * last:
 *
 * - **The change is still live and the card stops offering to take it back.**
 *   Its own sentence still reads *“This change is live on the page beside you.
 *   “Put it back” undoes it.”* — naming a button that is no longer anywhere on
 *   it. Three of the five changes this surface offers come back held when a
 *   visitor asks for them back, the primary one included, so this is the
 *   ordinary path rather than a corner of it.
 * - **Turning the undo down loses it for good.** Answer that second card with
 *   *No thanks* and the visitor has declined their own undo and has no way to
 *   ask for it again.
 *
 * So the button is withdrawn on exactly the outcome that empties it — **the
 * page went back** — and stays on offer through every outcome that leaves the
 * change standing. A held undo keeps its own card, with its own two buttons, in
 * the rail above; this one remains true and pressable underneath it.
 *
 * `moved` rather than "succeeded" is the field it asks about, and that is the
 * whole of the fix. A held undo is a complete success by the runtime's
 * reckoning — proposal written, custody taken, question asked — and the visitor
 * is looking at a page that has not moved.
 */
export const undoStillOffered = (record: ChangeRecord, lastUndo: WriteReport | null): boolean =>
  record.revision !== undefined && lastUndo?.moved !== true
