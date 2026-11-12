"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"

import { moveSegmentAction, removeSegmentAction, type SegmentChangeReport } from "../actions"

const Button = ({
  label,
  pendingLabel,
  disabled = false,
}: {
  label: string
  pendingLabel: string
  disabled?: boolean
}) => {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="border-edge text-ink rounded-md border px-2 py-0.5 text-xs disabled:opacity-40"
    >
      {pending ? pendingLabel : label}
    </button>
  )
}

const Detail = ({ report }: { report: SegmentChangeReport | null }) =>
  report?.detail === undefined ? null : (
    <p role="alert" className="text-refuse-ink m-0 text-xs">
      {report.detail}
    </p>
  )

/** Removing a segment from every page it is on, which removes it. */
export const RemoveSegment = ({ projectId, word }: { projectId: string; word: string }) => {
  const [report, remove] = useActionState<SegmentChangeReport | null, FormData>(
    removeSegmentAction,
    null
  )

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={remove}>
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="word" value={word} />
        <input type="hidden" name="on" value="every" />
        <Button label="Remove" pendingLabel="Removing…" />
      </form>
      <Detail report={report} />
    </div>
  )
}

/**
 * One segment's place on one page: one place earlier or later, sent with the
 * revision of the order on the screen so a reorder of a list that has changed
 * since is refused (0376), and taking it off this page alone.
 */
export const PlaceControls = ({
  projectId,
  word,
  treeId,
  revision,
  first,
  last,
}: {
  projectId: string
  word: string
  treeId: string
  revision: number
  first: boolean
  last: boolean
}) => {
  const [moved, move] = useActionState<SegmentChangeReport | null, FormData>(
    moveSegmentAction,
    null
  )
  const [removed, remove] = useActionState<SegmentChangeReport | null, FormData>(
    removeSegmentAction,
    null
  )
  const hidden = (
    <>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="word" value={word} />
      <input type="hidden" name="treeId" value={treeId} />
      <input type="hidden" name="revision" value={revision} />
    </>
  )

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        <form action={move}>
          {hidden}
          <input type="hidden" name="direction" value="earlier" />
          <Button label="Earlier" pendingLabel="Moving…" disabled={first} />
        </form>
        <form action={move}>
          {hidden}
          <input type="hidden" name="direction" value="later" />
          <Button label="Later" pendingLabel="Moving…" disabled={last} />
        </form>
        <form action={remove}>
          {hidden}
          <input type="hidden" name="on" value={treeId} />
          <Button label="Remove from this page" pendingLabel="Removing…" />
        </form>
      </div>
      <Detail report={moved ?? removed} />
    </div>
  )
}
