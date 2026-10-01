"use client"

import { useActionState } from "react"

import {
  ASK_AGAIN_CAUTION,
  ASK_AGAIN_LABEL,
  type MovedNote,
} from "@/app/(demo)/_lib/moved"
import type { WriteReport } from "@/app/(demo)/_lib/report"

import { askForChange } from "../actions"

/**
 * What stands where the two buttons were, on an ask the page has moved past.
 *
 * The buttons cannot stay: pressing **Apply this change** on a hold whose tree
 * has moved spends the press, releases the hold and answers with `applied, then
 * not written: revision-conflict` in the smallest type on the card. So the
 * question is only ever what replaces them, and *nothing* was the old answer —
 * the controls vanished on the press and the card went on saying it was waiting.
 *
 * **What happened is no longer said here, and that is this block's whole
 * revision.** It used to carry `movedOn`'s sentence at `text-xs`, four blocks
 * below the card's own `text-sm` account of the same event — which was the
 * shared table's `no-change` meaning, *“something it referred to has moved or
 * gone”*, a cause that is what the state means in the review queue and is not
 * what this visitor did. A stranger read the false one first because it was
 * larger and higher, and met the true one as a second, competing explanation.
 * `moved.ts` intended *one sentence, whichever way a visitor reaches it*; the
 * card printed two. The sentence is now the card's own header line
 * (`record-card.tsx`) — moved up, not removed — and what is left here is the
 * half that was only ever this block's: **the way out**.
 *
 * **The left rule, in the third color.** The card has two of these already and
 * they are a language rather than a decoration: amber for a question still open
 * (`WhatWouldHappen`, the same amber as the ring on the stage), green for the
 * answer the visitor gave (`answerNote`). This is the grey of the `no-change`
 * badge forty pixels above it, which is the color of a question that is shut.
 * One color in two places, which is how this rail teaches everything rather
 * than with a legend.
 *
 * **And nothing to rule off when there is no way out**, which is the other half
 * of losing the sentence. An ask that named no preset — free text, or an undo
 * that has its own control on the card above — has nothing to offer here, and
 * a marked, empty block is a promise of a control that is not coming. The card
 * still says what happened; it says it in its header now, where it is said for
 * every ask, so this renders nothing rather than an outline.
 *
 * A panel in `bg-inapplicable` was the first attempt and it disappeared: that
 * ground is within a shade of the card's own, so the block read as loose prose
 * on a card whose every other block is marked.
 *
 * **The way out is a fresh ask, not a retry, and the caption says so.** Pressing
 * it posts the same preset against the revision the page is actually at, through
 * `askForChange` — the identical path the button in the panel above takes, so
 * the Gate weighs it again from nothing and may hold it again. A control that
 * quietly re-ran a dead decision would be the demo undoing its own argument.
 *
 * It is offered only where a preset can be named. A free-text ask cannot be
 * replayed without a model and the model may be absent or out of budget; an undo
 * already has its own control on the applied card above (`undoOffer`). Neither
 * gets a button here that could fail for a second, unrelated reason — the
 * sentence still says what happened, and the five asks above are two inches
 * away.
 */
export const PageMovedOn = ({
  note,
  presetId,
}: {
  readonly note: MovedNote
  /** The suggestion this ask came from, when it came from one. */
  readonly presetId?: string
}) => {
  const [, submit, pending] = useActionState<WriteReport | null, FormData>(askForChange, null)

  if (presetId === undefined) return null

  return (
    <div className="border-inapplicable-ink flex flex-col gap-2.5 border-l-2 pl-2.5">
      <form action={submit} className="flex flex-col gap-1.5">
        <input type="hidden" name="baseRevision" value={note.now} />
        <input type="hidden" name="presetId" value={presetId} />
        <button
          type="submit"
          disabled={pending}
          className="border-neutral-edge bg-neutral text-neutral-ink hover:bg-surface-hover self-start rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60"
        >
          {pending ? "Asking…" : ASK_AGAIN_LABEL}
        </button>
        <p className="text-ink-muted text-2xs">{ASK_AGAIN_CAUTION}</p>
      </form>
    </div>
  )
}
