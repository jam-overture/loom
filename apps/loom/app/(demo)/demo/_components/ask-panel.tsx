"use client"

import { useActionState } from "react"

import { DEMO_LEADING_PRESET, DEMO_PRESETS, type DemoPresetId } from "@/app/(demo)/_lib/presets"
import { toneClasses, type WriteReport } from "@/app/(demo)/_lib/report"

import { askForChange } from "../actions"

/**
 * Where a visitor asks for something, and — the part that was missing — where
 * they are told what to press.
 *
 * The first version offered five identical grey pills above a text box, in a
 * rail whose heading was smaller than the specimen page's body copy. Everything
 * on it was equally weighted, so nothing was an invitation: a stranger with
 * sixty seconds had no first move, and the most prominent control was a
 * textarea that is *disabled* on a deployment with no model key.
 *
 * So this panel has exactly one primary action and says out loud what pressing
 * it will do to the page. The other four are secondary and carry the same
 * promise in smaller type. The free-text box is last, because it is the one
 * thing here that can be unavailable, and a surface that leads with the control
 * it might not have is a surface that fails on its own front door.
 *
 * **Which one is primary is `presets.ts`'s call** (`DEMO_LEADING_PRESET`), and
 * the reasoning is there because it is a claim about the table rather than
 * about this markup. What this file owes it is the sentence above the buttons:
 * the lead is now a change the Gate *holds*, so the panel has to say before the
 * first press that some asks wait for an answer, or the first press reads as a
 * button that did nothing.
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

/**
 * What is true of every button below, said once, before any of them is pressed.
 *
 * This is the line that makes the primary control legible, and it had to be
 * added the moment the lead became a change the Gate holds
 * (`DEMO_LEADING_PRESET`). Press *Take the numbers off* without it and the page
 * does not move: a stranger has pressed the one thing this surface invited them
 * to press and watched nothing happen, which reads as a broken button for the
 * two seconds before they find the amber card. Told first that some asks wait
 * for them, the same two seconds read as the product working.
 *
 * It says *some* and never *which*, for the reason `presets.ts` gives about
 * every promise on this panel: the verdict is computed at assessment time
 * against the tree as it stands, and a surface that predicted it would be wrong
 * the first time the policy or the page moved.
 *
 * It is also where "the record" now enters the demo, because the sentence it
 * replaced in the rail's header was an abstract list of what a record contains —
 * and this one lands three inches above the first card, which is the moment it
 * becomes true rather than promised.
 */
const WHAT_EVERY_ASK_MEETS =
  "Loom weighs every ask before it lands: some changes it makes on its own, some it won’t make without asking you first. Either way, it writes down what it did."

export const AskPanel = ({
  revision,
  available,
  modelConfigured,
}: {
  readonly revision: number
  readonly available: readonly DemoPresetId[]
  readonly modelConfigured: boolean
}) => {
  const [report, submit, pending] = useActionState<WriteReport | null, FormData>(askForChange, null)

  const offered = DEMO_PRESETS.filter((preset) => available.includes(preset.id))
  const leading = offered.find((preset) => preset.id === DEMO_LEADING_PRESET) ?? offered[0]
  const rest = offered.filter((preset) => preset.id !== leading?.id)

  return (
    <div id="ask" className="flex flex-col gap-4">
      <p className="text-ink-secondary text-sm">{WHAT_EVERY_ASK_MEETS}</p>

      {leading && (
        <form action={submit} className="flex flex-col gap-1.5">
          <input type="hidden" name="baseRevision" value={revision} />
          <input type="hidden" name="presetId" value={leading.id} />
          <button
            type="submit"
            disabled={pending}
            className="bg-affirm text-affirm-ink border-affirm-edge rounded-md border px-4 py-3 text-md font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Asking…" : leading.label}
          </button>
          {/*
            * Under the button rather than inside it. What the button says is the
            * ask; what this says is the consequence, and a visitor deciding
            * whether to press something wants both without the button becoming
            * a paragraph.
            */}
          <p className="text-ink-muted text-xs">{leading.promise}</p>
        </form>
      )}

      {rest.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-ink-muted text-2xs tracking-wide uppercase">or ask for one of these</p>
          <ul className="flex flex-col gap-1">
            {rest.map((preset) => (
              <li key={preset.id}>
                <form action={submit}>
                  <input type="hidden" name="baseRevision" value={revision} />
                  <input type="hidden" name="presetId" value={preset.id} />
                  <button
                    type="submit"
                    disabled={pending}
                    className="border-edge-subtle hover:border-edge hover:bg-surface-hover flex w-full flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left transition-colors disabled:opacity-60"
                  >
                    <span className="text-sm">{preset.label}</span>
                    <span className="text-ink-muted text-2xs">{preset.promise}</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/*
        * Last, quiet, and folded away until asked for.
        *
        * Two reasons, and the second is the one that decided it. It is the only
        * control on this panel a deployment can fail to provide — the demo runs
        * with no API key configured, by design, because a demo that only
        * demonstrates when a key is present is not a demo — so it must never be
        * the thing a visitor tries first. And open, it costs about a hundred and
        * forty vertical pixels, which is the difference between the first record
        * card landing on a laptop screen and landing below the fold. The card is
        * the demo's argument; the box is a way of reaching it.
        *
        * A `<details>` rather than state, for the reasons the record's own
        * disclosure gives: it works with JavaScript off, costs no bundle, and
        * the browser gives it keyboard and screen-reader semantics free.
        */}
      <details className="group">
        <summary className="text-ink-muted hover:text-ink cursor-pointer list-none text-2xs tracking-wide uppercase transition-colors select-none">
          <span className="inline-flex items-center gap-1.5">
            <svg
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
              className="h-3 w-3 shrink-0 transition-transform group-open:rotate-90"
            >
              <path d="M4 2.5L8 6l-4 3.5" />
            </svg>
            or type your own
          </span>
        </summary>

        <form action={submit} className="mt-2 flex flex-col gap-2">
        <input type="hidden" name="baseRevision" value={revision} />
        <label htmlFor="utterance" className="sr-only">
          What would you like changed?
        </label>
        <textarea
          id="utterance"
          name="utterance"
          rows={2}
          disabled={!modelConfigured}
          placeholder={
            modelConfigured
              ? "“Make the questions two columns.”"
              : "No model is configured on this deployment, so free text is off. Everything above still works."
          }
          className="border-edge-subtle bg-surface-base placeholder:text-ink-placeholder focus:border-edge resize-y rounded-md border p-2.5 text-sm transition-colors disabled:opacity-60"
        />
        {modelConfigured && (
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="bg-neutral text-neutral-ink border-neutral-edge hover:bg-surface-hover rounded-md border px-4 py-1.5 text-sm transition-colors disabled:opacity-60"
            >
              {pending ? "Composing…" : "Send it to the model"}
            </button>
            <span className="text-ink-muted text-2xs">interpreted on the server, then gated</span>
          </div>
        )}
        </form>
      </details>

      {/*
        * Only what the record does not already say. Everything the runtime
        * narrated has a card under this panel with the same words on it; what
        * lands here is the ask that never reached the runtime at all — an empty
        * form, an unknown preset, free text with no model or no allowance left.
        */}
      {report && !report.recorded && (
        <div className={`rounded-md p-2.5 text-xs ${toneClasses(report.tone)}`}>
          <strong className="font-medium">{report.headline}</strong>
          <p className="mt-1">{report.meaning}</p>
        </div>
      )}
    </div>
  )
}
