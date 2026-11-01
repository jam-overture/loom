"use client"

import { useActionState } from "react"

import { Submit } from "@/app/(portal)/_components/form"
import { toneClasses } from "@/app/(portal)/_lib/outcome"

import { lookAction, type LookReport } from "../actions"

/** The button that sets the AI looking at this page now, and what it found. */
export const LookForm = ({ projectId, treeId }: { projectId: string; treeId: string }) => {
  const [answer, action] = useActionState<LookReport | null, FormData>(lookAction, null)

  return (
    <div className="flex flex-col gap-3">
      <form action={action} className="flex flex-col gap-2">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="treeId" value={treeId} />
        <div className="self-start">
          <Submit label="Look now" pendingLabel="Reading what readers did…" />
        </div>
        {answer?.refusal === undefined ? null : (
          <p className="text-refuse-ink text-xs">{answer.refusal}</p>
        )}
      </form>

      {answer?.report === undefined ? null : (
        <div className={`flex flex-col gap-1 rounded-md p-3 ${toneClasses(answer.report.tone)}`}>
          <span className="text-sm font-medium">{answer.report.headline}</span>
          {answer.report.request === undefined ? null : (
            <span className="text-sm">&ldquo;{answer.report.request}&rdquo;</span>
          )}
          <span className="text-xs">{answer.report.meaning}</span>
        </div>
      )}
    </div>
  )
}
