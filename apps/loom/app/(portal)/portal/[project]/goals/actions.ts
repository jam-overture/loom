"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import type { Result } from "@jam-overture/loom"

import { pageChoicesOf, partsByPageOf } from "@/app/(portal)/_lib/goals/goal-view"
import {
  goalIdSchema,
  goalTypedOf,
  MAX_GOALS,
  newGoalId,
  readGoalForm,
  type GoalFault,
  type GoalId,
  type GoalStore,
  type GoalStoreError,
  type GoalTyped,
} from "@/app/(portal)/_lib/goals/goal"
import { goalsFor } from "@/app/(portal)/_lib/goals/stores"
import { publishedPagesFor } from "@/app/_lib/pages/store"

import { ownedSite } from "../_lib/owned-site"

/** What saving a goal says back: a fault under each field, or one about the whole goal. */
export type GoalReport = {
  readonly faults: readonly GoalFault[]
  /** What was typed, so a refused form is drawn again with it still there. */
  readonly typed?: GoalTyped
  readonly detail?: string
}

/** What making a goal primary or removing it says back, when it went wrong. */
export type GoalChangeReport = {
  readonly detail?: string
}

const storeSentence = (error: GoalStoreError): string => {
  switch (error.code) {
    case "full":
      return `This project has ${MAX_GOALS} goals already. Remove one before adding another.`
    case "not_found":
      return "That goal is not there any more. The list below is current."
    case "unavailable":
      return "The goals could not be saved, so nothing changed. Try again in a moment."
  }
}

/**
 * An owner saving a new goal (0350), checked against what the site published:
 * the part has to be on a page the goal covers. Goals steer what Loom proposes
 * for every page of the project, so only an owner sets them, as only an owner
 * sets the model key that pays for the proposing (0332).
 *
 * Saved, it closes the drawer by going back to the list, where the new goal is.
 */
export const addGoalAction = async (
  _previous: GoalReport | null,
  form: FormData
): Promise<GoalReport> => {
  const site = await ownedSite(form)

  if (!site.ok) return { faults: [], ...site.report }

  const published = await publishedPagesFor(site.application.applicationId).list()

  if (!published.ok) {
    return {
      faults: [],
      detail: "The site's pages could not be read, so nothing was saved.",
    }
  }

  const typed = goalTypedOf(form)
  const read = readGoalForm(typed, partsByPageOf(pageChoicesOf(published.value)))

  if (!read.ok) return { faults: read.error, typed }

  const { primary, ...asked } = read.value
  const kept = await goalsFor(site.application.applicationId).add(
    {
      ...asked,
      goalId: newGoalId(),
      createdAt: Date.now(),
      createdBy: site.actor,
    },
    { primary }
  )

  if (!kept.ok) return { faults: [], typed, detail: storeSentence(kept.error) }

  revalidatePath(`/portal/${site.projectId}/goals`)
  redirect(`/portal/${site.projectId}/goals`)
}

/** The goal a change names, from the form, or the report that says it named none. */
const goalChange = async (
  form: FormData,
  change: (goals: GoalStore, goalId: GoalId) => Promise<Result<void, GoalStoreError>>
): Promise<GoalChangeReport> => {
  const site = await ownedSite(form)

  if (!site.ok) return site.report

  const goalId = goalIdSchema.safeParse(form.get("goalId"))

  if (!goalId.success) return { detail: storeSentence({ code: "not_found", detail: "" }) }

  const changed = await change(goalsFor(site.application.applicationId), goalId.data)

  if (!changed.ok) return { detail: storeSentence(changed.error) }

  revalidatePath(`/portal/${site.projectId}/goals`)

  return {}
}

/** An owner moving the primary mark to another goal. */
export const makePrimaryAction = async (
  _previous: GoalChangeReport | null,
  form: FormData
): Promise<GoalChangeReport> =>
  await goalChange(form, (goals, goalId) => goals.makePrimary(goalId, Date.now()))

/** An owner removing a goal; removing the primary one passes the mark to the oldest left. */
export const removeGoalAction = async (
  _previous: GoalChangeReport | null,
  form: FormData
): Promise<GoalChangeReport> =>
  await goalChange(form, (goals, goalId) => goals.remove(goalId, Date.now()))
