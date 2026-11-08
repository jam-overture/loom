"use client"

import { useActionState, useMemo, useState, type FormEvent } from "react"

import { Field, Submit } from "@/app/(portal)/_components/form"
import {
  GOAL_KINDS,
  goalTypedOf,
  MAX_GOAL_NAME_LENGTH,
  readGoalTarget,
  type GoalField,
  type GoalTyped,
  type PartsByPage,
} from "@/app/(portal)/_lib/goals/goal"
import { previewWordsOf, type RangeTotals } from "@/app/(portal)/_lib/goals/goal-preview"
import { partsByPageOf, type PageChoice } from "@/app/(portal)/_lib/goals/goal-view"
import { GOAL_KIND_WORDS } from "@/app/(portal)/_lib/vocabulary"

import { addGoalAction, type GoalReport } from "../actions"

const Fault = ({ report, field }: { report: GoalReport | null; field: GoalField }) => {
  const fault = report?.faults.find((each) => each.field === field)

  return fault === undefined ? null : (
    <span id={`${field}-fault`} className="text-refuse-ink text-xs">
      {fault.detail}
    </span>
  )
}

const pageLabel = (page: PageChoice): string => page.name ?? page.treeId

/** The target typed so far, or `undefined` while it lacks a part or its pages. */
const targetOf = (typed: GoalTyped | undefined, parts: PartsByPage) => {
  const read = typed === undefined ? undefined : readGoalTarget(typed, parts)

  return read?.ok === true ? read.value : undefined
}

/**
 * The wireframe's green band: what the goal would have counted over the last 7
 * days, worked out here as the kind, part and pages change, from the totals
 * the screen read once.
 */
const PreviewBand = ({
  typed,
  parts,
  totals,
}: {
  typed: GoalTyped | undefined
  parts: PartsByPage
  totals: RangeTotals
}) => {
  const preview = previewWordsOf(targetOf(typed, parts), totals, parts)

  return (
    <p
      role="status"
      aria-label="Last 7 days"
      className={
        preview.tone === "counted"
          ? "bg-applied text-applied-ink border-applied-ink m-0 rounded-md border px-3 py-2 text-xs"
          : "border-edge-subtle text-ink-muted m-0 rounded-md border px-3 py-2 text-xs"
      }
    >
      {preview.sentence}
    </p>
  )
}

const GoalFields = ({
  projectId,
  pages,
  first,
  totals,
  report,
  action,
}: {
  projectId: string
  pages: readonly PageChoice[]
  first: boolean
  totals: RangeTotals
  report: GoalReport | null
  action: (form: FormData) => void
}) => {
  const typed = report?.typed
  const parts = useMemo(() => partsByPageOf(pages), [pages])
  /** What is typed now, for the band; the fields themselves stay the form's own. */
  const [current, setCurrent] = useState<GoalTyped | undefined>(typed)
  const changed = (event: FormEvent<HTMLFormElement>) =>
    setCurrent(goalTypedOf(new FormData(event.currentTarget)))

  return (
    <form action={action} onChange={changed} className="flex flex-col gap-4">
      <input type="hidden" name="projectId" value={projectId} />

      <Field
        label="Name"
        name="name"
        required
        maxLength={MAX_GOAL_NAME_LENGTH}
        placeholder="Starts a trial"
        defaultValue={typed?.name}
        fault={report?.faults.find((fault) => fault.field === "name")?.detail}
      />

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm">Counts when a reader</legend>
        {GOAL_KINDS.map((kind, index) => (
          <label key={kind} className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="kind"
              value={kind}
              defaultChecked={typed === undefined ? index === 0 : typed.kind === kind}
            />
            <span>
              {GOAL_KIND_WORDS[kind].label}
              <span className="text-ink-muted block text-xs">{GOAL_KIND_WORDS[kind].meaning}</span>
            </span>
          </label>
        ))}
        <Fault report={report} field="kind" />
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="goal-part" className="text-sm">
          The part
        </label>
        <select
          id="goal-part"
          name="part"
          required
          defaultValue={typed?.part ?? ""}
          className="border-edge bg-surface-base rounded-md border px-2.5 py-1.5 text-sm"
        >
          <option value="" disabled>
            Choose a part of a page
          </option>
          {pages.map((page) => (
            <optgroup key={page.treeId} label={pageLabel(page)}>
              {page.parts.map((part) => (
                <option key={`${page.treeId}-${part.nodeId}`} value={part.nodeId}>
                  {part.name} ({part.nodeId})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <Fault report={report} field="part" />
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm">Where</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="where" value="all" defaultChecked={typed?.where !== "some"} />
          Every page that has the part
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="where" value="some" defaultChecked={typed?.where === "some"} />
          Only these pages
        </label>
        <div className="flex flex-col gap-1 pl-6">
          {pages.map((page) => (
            <label key={page.treeId} className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                name="pages"
                value={page.treeId}
                defaultChecked={typed?.pages.includes(page.treeId) === true}
              />
              {pageLabel(page)}
            </label>
          ))}
        </div>
        <Fault report={report} field="pages" />
      </fieldset>

      <PreviewBand typed={current} parts={parts} totals={totals} />

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="primary"
          defaultChecked={first || typed?.primary === true}
          disabled={first}
        />
        <span>
          Make this the primary goal
          {first && (
            <span className="text-ink-muted block text-xs">
              It is the project&rsquo;s first goal, so it is the primary one.
            </span>
          )}
        </span>
      </label>

      {report?.detail !== undefined && <p className="text-refuse-ink text-xs">{report.detail}</p>}

      <Submit label="Save goal" pendingLabel="Saving…" />
    </form>
  )
}

/**
 * *New goal*, in the drawer (0350): a name, what a reader does, the part they
 * do it to, on all pages or on chosen ones, a band saying what it would have
 * counted over the last 7 days, and whether it becomes primary.
 *
 * The part is picked from what the site published, page by page, by the name
 * a person recognises with its id beside it. The first goal is primary whatever
 * the box says, which the box's hint says.
 */
export const GoalForm = ({
  projectId,
  pages,
  first,
  totals,
}: {
  projectId: string
  pages: readonly PageChoice[]
  /** No goal is kept yet, so this one will be primary. */
  first: boolean
  /** The project's counters over the last 7 days, which the band previews the goal from. */
  totals: RangeTotals
}) => {
  const [report, action] = useActionState<GoalReport | null, FormData>(addGoalAction, null)
  const typed = report?.typed

  /**
   * Keyed by what was typed, so a refused form is drawn afresh with it as the
   * defaults: React resets a form once its action settles, and without the
   * key it would reset to the defaults it was first drawn with.
   */
  return (
    <GoalFields
      key={JSON.stringify(typed ?? null)}
      projectId={projectId}
      pages={pages}
      first={first}
      totals={totals}
      report={report}
      action={action}
    />
  )
}
