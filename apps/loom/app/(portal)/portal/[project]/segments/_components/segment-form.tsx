"use client"

import { useActionState } from "react"

import { Field, Submit } from "@/app/(portal)/_components/form"
import type { RulesPage } from "@/app/(portal)/_lib/segments/rules"

import { saveSegmentAction, type SegmentReport } from "../actions"

/** What the form opens with: empty for a new segment, the segment's own for a change. */
export type SegmentDraft = {
  readonly word: string
  readonly conditions: string
  /** `every`, or the one page's id. */
  readonly on: string
}

const conditionsHint =
  "One condition a line: a key your site's server sets, “=”, and the values that put a reader in. A reader is in the segment when every line holds; values on one line are alternatives."

const SegmentFields = ({
  projectId,
  pages,
  draft,
  changing,
  report,
  action,
}: {
  projectId: string
  pages: readonly RulesPage[]
  draft: SegmentDraft
  changing: boolean
  report: SegmentReport | null
  action: (form: FormData) => void
}) => {
  const typed = report?.typed ?? draft
  const faults = report?.conditions ?? []

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="projectId" value={projectId} />

      <Field
        label="Name"
        name="word"
        defaultValue={typed.word}
        readOnly={changing}
        required
        maxLength={32}
        autoComplete="off"
        hint="One word in your site's own terms, such as phone or returning. Your site puts it on its signals as aud_ and the word."
        fault={report?.word}
      />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm">Who is in it</span>
        <textarea
          name="conditions"
          rows={4}
          defaultValue={typed.conditions}
          placeholder={"device = phone\nsource = search, social"}
          aria-invalid={faults.length === 0 ? undefined : true}
          aria-describedby="conditions-hint"
          className={`border-edge bg-surface-base rounded-md border px-2.5 py-1.5 font-mono text-sm ${faults.length === 0 ? "" : "border-refuse-edge"}`}
        />
        <span id="conditions-hint" className="text-ink-muted text-xs">
          {conditionsHint}
        </span>
        {faults.map((fault) => (
          <span key={`${fault.line}-${fault.says}`} className="text-refuse-ink text-xs">
            {fault.line === 0 ? fault.says : `Line ${fault.line} ${fault.says}.`}
          </span>
        ))}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm">On</span>
        <select
          name="on"
          defaultValue={typed.on}
          className="border-edge bg-surface-base rounded-md border px-2.5 py-1.5 text-sm"
        >
          <option value="every">Every page</option>
          {pages.map((page) => (
            <option key={page.treeId} value={page.treeId}>
              {page.name}
            </option>
          ))}
        </select>
        <span className="text-ink-muted text-xs">
          Each page keeps its own list. A new segment goes last on each, where it wins over the
          segments before it; a changed one keeps its place.
        </span>
      </label>

      <p className="text-ink-muted m-0 text-xs">
        A segment is a group of readers, never one person. Do not sort readers by anything that
        names someone, such as an account or an email address.
      </p>

      {report?.detail !== undefined && (
        <p role="alert" className="text-refuse-ink m-0 text-xs">
          {report.detail}
        </p>
      )}

      <Submit label="Save segment" pendingLabel="Saving…" />
    </form>
  )
}

/**
 * *New segment* and *Change segment*, in the drawer (0371 clause 3): its word,
 * the conditions that put a reader in it, and the page it is on or every page.
 */
export const SegmentForm = ({
  projectId,
  pages,
  draft,
  changing,
}: {
  projectId: string
  pages: readonly RulesPage[]
  draft: SegmentDraft
  changing: boolean
}) => {
  const [report, action] = useActionState<SegmentReport | null, FormData>(saveSegmentAction, null)

  /**
   * Keyed by what was typed, so a refused form is drawn afresh with it as the
   * defaults: React resets a form once its action settles, and without the
   * key it would reset to the defaults it was first drawn with.
   */
  return (
    <SegmentFields
      key={JSON.stringify(report?.typed ?? null)}
      projectId={projectId}
      pages={pages}
      draft={draft}
      changing={changing}
      report={report}
      action={action}
    />
  )
}
