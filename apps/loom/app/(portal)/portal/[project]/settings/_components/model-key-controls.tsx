"use client"

import { useActionState } from "react"

import { Field, Submit } from "@/app/(portal)/_components/form"

import { removeModelKeyAction, saveModelKeyAction, type ModelKeyReport } from "../actions"

/**
 * An owner's controls for the project's own Anthropic key (0332): a box to set
 * or replace it, and a button to remove one that is set.
 *
 * The box is a password field and always starts empty: a key is never sent back
 * to a browser, so there is nothing to fill it with, and the current key is
 * named only by its last four characters.
 */
export const ModelKeyControls = ({
  projectId,
  hint,
}: {
  projectId: string
  /** The last four characters of the key that is set, or `undefined` where none is. */
  hint: string | undefined
}) => {
  const [saved, save] = useActionState<ModelKeyReport | null, FormData>(saveModelKeyAction, null)
  const [removed, remove] = useActionState<ModelKeyReport | null, FormData>(
    removeModelKeyAction,
    null
  )

  return (
    <div className="flex max-w-md flex-col gap-4">
      <form action={save} className="flex flex-col gap-3">
        <input type="hidden" name="projectId" value={projectId} />
        <Field
          key={saved?.saved === true ? "saved" : "draft"}
          label={hint === undefined ? "Anthropic key" : "Replace the key"}
          name="key"
          type="password"
          autoComplete="off"
          placeholder="sk-ant-…"
          hint="Made at console.anthropic.com. Loom keeps it sealed and shows only its last four characters."
          fault={saved?.fault}
        />
        {saved?.saved === true && <p className="text-ink-muted text-xs">Saved.</p>}
        <Submit label={hint === undefined ? "Set the key" : "Replace it"} pendingLabel="Saving…" />
      </form>

      {hint === undefined ? null : (
        <form action={remove} className="flex flex-col gap-2">
          <input type="hidden" name="projectId" value={projectId} />
          {removed?.fault !== undefined && (
            <p className="text-refuse-ink text-xs">{removed.fault}</p>
          )}
          <Submit label="Remove the key" pendingLabel="Removing…" />
        </form>
      )}
    </div>
  )
}
