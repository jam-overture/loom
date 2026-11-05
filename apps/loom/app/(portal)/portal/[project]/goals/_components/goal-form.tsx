"use client"

import { useActionState } from "react"

import { Field, Submit } from "@/app/(portal)/_components/form"
import type { GoalField } from "@/app/(portal)/_lib/goals/goal"
import { GOAL_KINDS, MAX_GOAL_NAME_LENGTH } from "@/app/(portal)/_lib/goals/goal"
import type { PageChoice } from "@/app/(portal)/_lib/goals/goal-view"
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

/**
 * *New goal*, in the drawer (0350): a name, what a reader does, the part they
 * do it to, on all pages or on chosen ones, and whether it becomes primary.
 *
 * The part is picked from what the site published, page by page, by the name
 * a person recognises with its id beside it. The first goal is primary whatever
 * the box says, which the box's hint says.
 */
export const GoalForm = ({
  projectId,
  pages,
  first,
}: {
  projectId: string
  pages: readonly PageChoice[]
  /** No goal is kept yet, so this one will be primary. */
  first: boolean
}) => {
  const [report, action] = useActionState<GoalReport | null, FormData>(addGoalAction, null)
  const typed = report?.typed

  /**
   * Keyed by what was typed, so a refused form is drawn afresh with it as the
   * defaults: React resets a form once its action settles, and without the
   * key it would reset to the defaults it was first drawn with.
   */
  return (
    <form key={JSON.stringify(typed ?? null)} action={action} className="flex flex-col gap-4">
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
