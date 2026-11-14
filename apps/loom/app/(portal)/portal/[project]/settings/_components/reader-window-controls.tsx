"use client"

import { useActionState } from "react"

import { Submit } from "@/app/(portal)/_components/form"
import { WINDOW_LABEL } from "@/app/(portal)/_lib/reader-window"
import { READER_WINDOWS, type ReaderWindow } from "@/app/_lib/pages/reader-windows"

import { saveReaderWindowAction, type ReaderWindowReport } from "../actions"

/**
 * An owner's choice of how long a reader keeps the pages they first saw
 * (0383 clause 1): the four windows, starting on the one the project has.
 */
export const ReaderWindowControls = ({
  projectId,
  chosen,
}: {
  projectId: string
  chosen: ReaderWindow
}) => {
  const [report, save] = useActionState<ReaderWindowReport | null, FormData>(
    saveReaderWindowAction,
    null
  )

  return (
    <form action={save} className="flex max-w-md flex-col gap-3">
      <input type="hidden" name="projectId" value={projectId} />
      <fieldset className="flex flex-wrap gap-x-4 gap-y-1.5">
        <legend className="sr-only">How long a reader keeps a page</legend>
        {READER_WINDOWS.map((choice) => (
          <label key={choice} className="flex items-center gap-2 text-sm">
            <input type="radio" name="window" value={choice} defaultChecked={choice === chosen} />
            {WINDOW_LABEL[choice]}
          </label>
        ))}
      </fieldset>
      {report?.fault !== undefined && <p className="text-refuse-ink text-xs">{report.fault}</p>}
      {report?.saved === true && <p className="text-ink-muted text-xs">Saved.</p>}
      <Submit label="Save" pendingLabel="Saving…" />
    </form>
  )
}
