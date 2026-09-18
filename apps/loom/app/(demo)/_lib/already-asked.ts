import type { DemoPresetId } from "./presets"
import type { ChangeRecord } from "./record"

/**
 * An ask the visitor is already waiting on an answer for, and so is not offered
 * a second time.
 *
 * **The two presses this exists for**, driven against a real `next build` at
 * 1280×900:
 *
 * | | the rail |
 * | --- | --- |
 * | press **Take the numbers off** | `Waiting on you` · *“Take the numbers band off the page.”* |
 * | press **Take the numbers off** again | `Waiting on you` · *“Take the numbers band off the page.”*<br>`Waiting on you` · *“Take the numbers band off the page.”* |
 *
 * Two cards, word for word identical, each with its own **Apply this change**,
 * each about the same four nodes. Answering either applies the removal and moves
 * the revision, which kills the other where it stands — so the second press buys
 * the visitor a duplicate question and a guaranteed `Nothing changed` card.
 *
 * **What it cost on screen** was worse than one spare card, because the rail
 * counts: `set-aside.ts` said *“2 questions are still waiting on you”* over a
 * page carrying **one** amber ring. A visitor reading the demo's own caution
 * against the demo's own page found them disagreeing, on the one surface whose
 * whole argument is that the record and the page say the same thing.
 *
 * **Nothing in the chain was wrong**, which is why the fix is here rather than
 * anywhere it passes through. `availablePresets` asks each preset whether it has
 * anything to do, and `trim.plan` looks for a `loom.stat-grid` on the tree. While
 * the removal is only *held* the grid is still there — a held proposal is neither
 * applied nor refused, it is offered, and it lives beside the tree rather than in
 * it ([0021](../../../../../decisions/0021-a-held-proposal-stays-server-side-and-answers-are-by-id.md))
 * — so the preset can still plan, and the panel honours `available` exactly as it
 * should. The filter `availablePresets` applies is a question about the **tree**;
 * this one is a question about the **store**, and only the page has both.
 *
 * It is the same rule said about the other half of the state: *never offer a
 * press whose only outcome is nothing.*
 *
 * **It withdraws an ask and it does not disable one.** The distinction is the one
 * this lane argued for in `set-aside.ts` and it still holds: the other four asks
 * are live, pressable and unchanged, because a stranger who wants to watch the
 * page move twice should be allowed to. What goes is only the button whose
 * question is already on screen, forty pixels below, with **Apply this change**
 * under it — and the caution pinned above the list is the sentence that says so.
 */

/**
 * The presets a visitor is currently waiting on, by id.
 *
 * **Keyed on the store rather than on the record**, for the reason `setAside` is:
 * a record keeps the `heldProposalId` it was written with, and whether that
 * question is still *live* is a fact about the store and the tree's revision
 * together. The caller passes the proposal ids it has already worked out are
 * answerable — `page.tsx` builds exactly that list for the three readings it
 * resolves against the tree — so a record whose hold is spent, declined or dead
 * simply is not in it, and the ask comes back the moment its question does not.
 *
 * `presetId` is what makes the join possible at all, and it is the surface's own
 * knowledge about its own request: the runtime is handed `preset.utterance` and
 * has no idea a button produced it (`record.ts`). A record with no `presetId` —
 * free text, an undo — is a question the panel has no button for, so there is
 * nothing here to withdraw.
 */
const waitingOn = (
  records: readonly ChangeRecord[],
  answerable: ReadonlySet<string>
): ReadonlySet<string> =>
  new Set(
    records.flatMap((record) =>
      record.presetId !== undefined &&
      record.heldProposalId !== undefined &&
      answerable.has(record.heldProposalId)
        ? [record.presetId]
        : []
    )
  )

/**
 * The asks worth offering: the ones this tree can honour, less the ones already
 * waiting on an answer.
 *
 * Order is `available`'s, which is the preset table's, so the asks that survive
 * keep the positions they had. That is the property the press must not break:
 * before this, the leading preset dropped back into the list at its table
 * position on the first press and pushed the last ask down under the visitor's
 * cursor. Now the four remaining asks are exactly where they were.
 *
 * The safe direction is the same one `setAside` takes. A stale `presetId` cannot
 * withdraw an ask whose question is not there, because the join runs through
 * `answerable`; the worst a mismatch can do is leave a button offered, which is
 * the surface as it stood yesterday.
 */
export const stillToAsk = (
  available: readonly DemoPresetId[],
  records: readonly ChangeRecord[],
  answerable: ReadonlySet<string>
): readonly DemoPresetId[] => {
  const waiting = waitingOn(records, answerable)

  return available.filter((id) => !waiting.has(id))
}
