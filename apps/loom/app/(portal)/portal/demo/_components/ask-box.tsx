"use client"

import { useActionState } from "react"

import { DEMO_PRESETS, type DemoPresetId } from "@/app/(portal)/_lib/demo/presets"
import { toneClasses, type WriteReport } from "@/app/(portal)/_lib/outcome"

import { askForChange } from "../actions"

/**
 * Where a visitor asks for something.
 *
 * Two ways in, and they are not two systems. A chip posts a preset id and the
 * change is computed from the tree; the box posts a sentence and a model
 * interprets it. Everything after that point — assessment, Gate, application,
 * log — is the same code, which is the claim the demo is making and the reason
 * the chips are not a scripted animation.
 *
 * The revision the visitor was looking at travels with the ask. That is not
 * client authority: it is the client saying what it saw, so the server can
 * refuse a change aimed at a page that has moved.
 */
export const AskBox = ({
  revision,
  available,
  modelConfigured,
}: {
  readonly revision: number
  readonly available: readonly DemoPresetId[]
  readonly modelConfigured: boolean
}) => {
  const [report, submit, pending] = useActionState<WriteReport | null, FormData>(askForChange, null)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {DEMO_PRESETS.filter((preset) => available.includes(preset.id)).map((preset) => (
          <form key={preset.id} action={submit}>
            <input type="hidden" name="baseRevision" value={revision} />
            <input type="hidden" name="presetId" value={preset.id} />
            <button
              type="submit"
              disabled={pending}
              title={preset.utterance}
              className="border-edge-subtle bg-surface-base hover:bg-surface-hover rounded-full border px-3 py-1 text-xs disabled:opacity-60"
            >
              {preset.label}
            </button>
          </form>
        ))}
      </div>

      <form action={submit} className="flex flex-col gap-2">
        <input type="hidden" name="baseRevision" value={revision} />
        <textarea
          name="utterance"
          rows={2}
          disabled={!modelConfigured}
          placeholder={
            modelConfigured
              ? "Or ask for something else — “make the questions two columns”."
              : "No model is configured on this deployment. The suggestions above still work."
          }
          className="border-edge-subtle bg-surface-base placeholder:text-ink-placeholder resize-y rounded-md border p-2.5 text-sm disabled:opacity-60"
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending || !modelConfigured}
            className="bg-neutral text-neutral-ink border-neutral-edge hover:bg-surface-hover rounded-md border px-4 py-1.5 text-sm disabled:opacity-60"
          >
            {pending ? "composing…" : "propose"}
          </button>
          <span className="text-ink-muted text-2xs">interpreted on the server, then gated</span>
        </div>
      </form>

      {report && (
        <div className={`rounded-md p-2.5 text-xs ${toneClasses(report.tone)}`}>
          <strong className="font-medium">{report.headline}</strong>
          <p className="mt-1">{report.detail}</p>
        </div>
      )}
    </div>
  )
}
