"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"

import { toneClasses } from "@/app/(portal)/_lib/outcome"
import { MAX_REASON_LENGTH } from "@/app/(portal)/_lib/proposing/turned-down"

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
 *
 * A reason can go with *Turn down*, and Loom reads it before it proposes for
 * the page again (0341). *Accept* is not offered for a change that no longer
 * fits the version the site serves (0340).
 */
export const AnswerControls = ({
  projectId,
  proposalId,
  acceptable,
}: {
  projectId: string
  proposalId: string
  acceptable: boolean
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
      <label className="text-ink-muted flex flex-col gap-1 text-xs">
        Why turn it down? Optional. Loom reads this before it proposes for this page again.
        <textarea
          name="reason"
          rows={2}
          maxLength={MAX_REASON_LENGTH}
          className="border-edge text-ink bg-surface-base rounded-md border p-2 text-xs"
        />
      </label>
      <div className="flex gap-2">
        {acceptable ? <Answer value="accept" label="Accept" /> : null}
        <Answer value="refuse" label="Turn down" />
      </div>
      {answer?.refusal === undefined ? null : (
        <p className="text-refuse-ink text-xs">{answer.refusal}</p>
      )}
    </form>
  )
}
