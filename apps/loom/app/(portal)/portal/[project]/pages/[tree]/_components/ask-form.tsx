"use client"

import { useActionState } from "react"

import { Submit } from "@/app/(portal)/_components/form"
import { MAX_REQUEST_LENGTH } from "@/app/(portal)/_lib/asking"
import { toneClasses } from "@/app/(portal)/_lib/outcome"

import { askAction, type AskReport } from "../actions"

/**
 * The request box, and what became of the last request typed into it.
 *
 * A request that was made empties the box; one that was refused before it was
 * made keeps what was typed, so correcting it is an edit rather than a retype.
 */
export const AskForm = ({ projectId, treeId }: { projectId: string; treeId: string }) => {
  const [answer, action] = useActionState<AskReport | null, FormData>(askAction, null)

  return (
    <div className="flex flex-col gap-3">
      <form action={action} className="flex flex-col gap-2">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="treeId" value={treeId} />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm">What would you like changed?</span>
          <textarea
            key={answer?.report === undefined ? "draft" : answer.report.detail}
            name="request"
            rows={3}
            maxLength={MAX_REQUEST_LENGTH}
            defaultValue={answer?.request ?? ""}
            placeholder="Make the heading shorter and friendlier."
            className="border-edge bg-surface-base rounded-md border px-2.5 py-1.5 text-sm"
          />
        </label>
        {answer?.refusal === undefined ? null : (
          <p className="text-refuse-ink text-xs">{answer.refusal}</p>
        )}
        <div className="self-start">
          <Submit label="Ask for it" pendingLabel="Working it out…" />
        </div>
      </form>

      {answer?.report === undefined ? null : (
        <div className={`flex flex-col gap-1 rounded-md p-3 ${toneClasses(answer.report.tone)}`}>
          <span className="text-sm font-medium">{answer.report.headline}</span>
          <span className="text-xs">{answer.report.meaning}</span>
        </div>
      )}
    </div>
  )
}
