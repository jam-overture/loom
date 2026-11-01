"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"

import { toneClasses } from "@/app/(portal)/_lib/outcome"

import { answerAction, type AnswerReport } from "../actions"

const Answer = ({ value, label }: { value: "accept" | "refuse"; label: string }) => {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      name="answer"
      value={value}
      disabled={pending}
      className={
        value === "accept"
          ? "bg-ink text-surface-base rounded-md px-2.5 py-1 text-xs disabled:opacity-60"
          : "border-edge text-ink rounded-md border px-2.5 py-1 text-xs disabled:opacity-60"
      }
    >
      {label}
    </button>
  )
}

/**
 * *Accept* and *Turn down* for one waiting change, and what became of it.
 *
 * Once answered the buttons give way to the answer, because the change is no
 * longer waiting and a second press could only be told so.
 */
export const AnswerControls = ({
  projectId,
  proposalId,
}: {
  projectId: string
  proposalId: string
}) => {
  const [answer, action] = useActionState<AnswerReport | null, FormData>(answerAction, null)

  if (answer?.report !== undefined) {
    return (
      <div className={`flex flex-col gap-1 rounded-md p-3 ${toneClasses(answer.report.tone)}`}>
        <span className="text-sm font-medium">{answer.report.headline}</span>
        <span className="text-xs">{answer.report.meaning}</span>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="proposalId" value={proposalId} />
      <div className="flex gap-2">
        <Answer value="accept" label="Accept" />
        <Answer value="refuse" label="Turn down" />
      </div>
      {answer?.refusal === undefined ? null : (
        <p className="text-refuse-ink text-xs">{answer.refusal}</p>
      )}
    </form>
  )
}
