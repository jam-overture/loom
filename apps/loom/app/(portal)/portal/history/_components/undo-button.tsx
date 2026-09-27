"use client"

import { useActionState } from "react"

import type { TreeId } from "@jam-overture/loom"

import { ChangeReasoning } from "@/app/(portal)/_components/change-reasoning"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { toneClasses } from "@/app/(portal)/_lib/outcome"

import { undoRevision } from "../actions"

/**
 * Undo, on a revision the log still allows undoing.
 *
 * The button is not the decision, and the report under it is the point. An undo
 * is an ordinary proposal (0032), so it can come back held for a second person,
 * refused by the Gate, or declined because something later built on the change —
 * and a control that always looked like it worked would be lying about the one
 * property this page exists to evidence.
 *
 * ## It was printing the runtime at a person, and it was the last place doing it
 *
 * The report under the button read `{headline} — {detail}`, and `detail` is
 * `describeRevertOutcome` verbatim. So the one control in this portal that can
 * refuse in the most surprising way said
 *
 * > **Not allowed** — refused: adds a node no primitive is registered for, so it
 * > draws nothing: app.gallery at n_7
 *
 * as its entire body, at body weight, with no disclosure anywhere near it. Every
 * other outcome panel in the portal had been rewritten by 16 September and this
 * one was missed because it is three lines long and looks like a button rather
 * than like a screen.
 *
 * It is the same three layers as the prompt box now, in the same order, from the
 * same two modules. The plain sentence is `plainState`'s; the reasons are
 * `ChangeReasoning`'s; `detail` is where it always belonged, one click down.
 *
 * ## And it is the control most likely to meet the new refusal
 *
 * An undo restores what a change took away. If that change removed the last part
 * of a kind this deployment has since stopped registering, putting it back adds a
 * part nothing here can draw — which is the one case 0173 says it refuses on
 * purpose, and the honest answer: the primitive has to come back before the page
 * can. Nothing else in the portal reaches that state without a model inventing a
 * name.
 */
export const UndoButton = ({
  treeId,
  revision,
}: {
  readonly treeId: TreeId
  readonly revision: number
}) => {
  const [report, submit, pending] = useActionState(undoRevision, null)

  return (
    <form action={submit} className="flex flex-col gap-2">
      <input type="hidden" name="treeId" value={treeId} />
      <input type="hidden" name="revision" value={revision} />

      <button
        type="submit"
        disabled={pending}
        className="border-edge bg-neutral text-neutral-ink w-fit rounded-sm border px-2 py-1 text-2xs disabled:opacity-60"
      >
        {pending ? "Undoing…" : "Undo this change"}
      </button>

      {report === null ? null : (
        <div className={"flex flex-col gap-2 rounded-sm px-2 py-1.5 text-2xs " + toneClasses(report.tone)}>
          <p>
            <span className="font-medium">{report.headline}</span> — {report.meaning}
          </p>

          {report.reasoning && <ChangeReasoning reasoning={report.reasoning} />}

          <TechnicalDetail summary="What the runtime said">
            <p className="font-mono">{report.detail}</p>
          </TechnicalDetail>
        </div>
      )}
    </form>
  )
}
