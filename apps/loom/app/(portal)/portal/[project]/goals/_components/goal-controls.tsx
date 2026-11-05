"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"

import { makePrimaryAction, removeGoalAction, type GoalChangeReport } from "../actions"

const Button = ({ label, pendingLabel }: { label: string; pendingLabel: string }) => {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="border-edge text-ink rounded-md border px-2 py-0.5 text-xs disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  )
}

/**
 * An owner's two changes to one goal: move the primary mark to it, and remove
 * it. Removing the primary goal passes the mark to the oldest one left (0350).
 */
export const GoalControls = ({
  projectId,
  goalId,
  primary,
}: {
  projectId: string
  goalId: string
  primary: boolean
}) => {
  const [marked, mark] = useActionState<GoalChangeReport | null, FormData>(makePrimaryAction, null)
  const [removed, remove] = useActionState<GoalChangeReport | null, FormData>(
    removeGoalAction,
    null
  )
  const detail = marked?.detail ?? removed?.detail

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        {!primary && (
          <form action={mark}>
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="goalId" value={goalId} />
            <Button label="Make primary" pendingLabel="Saving…" />
          </form>
        )}
        <form action={remove}>
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="goalId" value={goalId} />
          <Button label="Remove" pendingLabel="Removing…" />
        </form>
      </div>
      {detail !== undefined && <p className="text-refuse-ink m-0 text-xs">{detail}</p>}
    </div>
  )
}
