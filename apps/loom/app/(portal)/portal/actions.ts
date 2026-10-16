"use server"

import { revalidatePath } from "next/cache"

import { closeProject, describeClosingError, projectIdSchema } from "@jam-overture/loom/store"

import { portalMemberships } from "@/app/(portal)/_lib/auth/account-store"
import { actorSchema } from "@/app/(portal)/_lib/auth/accounts"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { mayAdminister } from "@/app/(portal)/_lib/auth/roles"
import { portalApplicationsForWriting, portalProjectsForWriting } from "@/app/(portal)/_lib/store"

/**
 * Closing a project from the workspace, and opening it again.
 *
 * **This is what the portal has instead of a delete**
 * ([0289](../../../../decisions/0289-a-project-is-closed-rather-than-deleted-and-closing-is-a-column-and-a-filter.md)).
 * The button says *Close* and the store closes: a button labelled *Delete*
 * that closed would be worse than either, because it would teach that this
 * product's words are approximate on the screen where that matters most.
 *
 * The rules that can be a function of what was asked live in the runtime —
 * `closeProject` is the cascade, and it is there because both stores are — and
 * what is here is the part that cannot be tested without a request: a session,
 * a role, and a path to revalidate.
 */

export type ClosingReport = {
  readonly detail?: string
}

/**
 * Only an owner, and only of this project (0285).
 *
 * Closing is the most consequential thing the workspace offers and it is not on
 * the stake scale at all — nothing about it is a change to a tree — so it is an
 * `owner` test rather than a ceiling. An approver may release changes and may
 * not stop the project they are released into.
 */
const ownedBy = async (actor: string, projectId: string): Promise<boolean> => {
  const parsed = projectIdSchema.safeParse(projectId)
  if (!parsed.success) return false

  const held = await portalMemberships.roleIn(actorSchema.parse(actor), parsed.data)

  return held.ok && held.value !== null && mayAdminister(held.value)
}

export const closeProjectAction = async (
  _previous: ClosingReport | null,
  form: FormData
): Promise<ClosingReport> => {
  const actor = await requireActor("/portal")
  const asked = String(form.get("projectId") ?? "")

  /**
   * One message for *not yours* and *no such project*, as everywhere else: a
   * distinct answer would turn this into a way to ask which ids exist.
   */
  if (!(await ownedBy(actor, asked))) return { detail: "That is not a project you can close." }

  const projectId = projectIdSchema.parse(asked)

  /**
   * The **writing** handles, not the bounded ones the screens read through. A
   * close that gave up on its budget part-way through the cascade would leave
   * a project closed and some of its applications open, which is the one state
   * this operation reports rather than produces.
   */
  const closed = await closeProject(
    portalProjectsForWriting,
    portalApplicationsForWriting,
    projectId,
    new Date().toISOString()
  )

  if (!closed.ok) return { detail: describeClosingError(closed.error) }

  revalidatePath("/portal")

  return {}
}

/**
 * Reopening, which does **not** reopen the applications that closed with it
 * (0289 clause 4).
 *
 * Closing was a statement about the project; reopening one of its applications
 * is a decision about that application. A reopen that revived everything would
 * turn *I want that one back* into *start collecting on all nine again*.
 */
export const reopenProjectAction = async (
  _previous: ClosingReport | null,
  form: FormData
): Promise<ClosingReport> => {
  const actor = await requireActor("/portal")
  const asked = String(form.get("projectId") ?? "")

  if (!(await ownedBy(actor, asked))) return { detail: "That is not a project you can reopen." }

  const reopened = await portalProjectsForWriting.reopen(projectIdSchema.parse(asked))

  if (!reopened.ok) return { detail: "That project could not be reopened." }

  revalidatePath("/portal")

  return {}
}
