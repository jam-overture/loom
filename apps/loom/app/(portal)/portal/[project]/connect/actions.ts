"use server"

import { revalidatePath } from "next/cache"

import { projectIdSchema } from "@jam-overture/loom/store"

import { appIngestKeys } from "@/app/_lib/reader-signals/key-store"
import { issueIngestKey } from "@/app/_lib/reader-signals/keys"
import { actorSchema } from "@/app/(portal)/_lib/auth/accounts"
import { requireActor, roleOf } from "@/app/(portal)/_lib/auth/identity"
import { mayAdminister } from "@/app/(portal)/_lib/auth/roles"
import { soleApplicationOf } from "@/app/(portal)/_lib/connecting"
import { portalApplications, portalProjects } from "@/app/(portal)/_lib/store"

/**
 * Giving a project a key, from its *Connect your site* screen: a first one
 * for a project registered before registration minted keys, and a new one for
 * a project whose key turned up on a site it should not be on.
 *
 * Both are the same act — mint, and end whatever was held (0298 clause 1) —
 * so they are one action, and the screen says which of the two it is.
 *
 * **Only an owner** (0285), for `closeProjectAction`'s reason: replacing the
 * key stops every page that carries the old one from being counted, which is
 * a decision about the project rather than a change to anything in it.
 */

export type KeyReport = {
  readonly detail?: string
}

export const issueKeyAction = async (
  _previous: KeyReport | null,
  form: FormData
): Promise<KeyReport> => {
  const actor = await requireActor("/portal")
  const asked = projectIdSchema.safeParse(String(form.get("projectId") ?? ""))

  /**
   * One message for *not yours* and *no such project*, as everywhere else: a
   * distinct answer would make this a way to ask which ids exist.
   */
  const refused = { detail: "That is not a project you can give a key to." }

  if (!asked.success) return refused

  const projectId = asked.data
  const role = await roleOf(actorSchema.parse(actor), projectId)

  if (role === null || role === undefined || !mayAdminister(role)) return refused

  const [project, applications] = await Promise.all([
    portalProjects.get(projectId),
    portalApplications.list({ closed: "all" }),
  ])

  if (!project.ok || !applications.ok)
    return { detail: "The store did not answer. Nothing was changed." }

  const application = soleApplicationOf(applications.value, projectId)

  if (application === undefined) {
    return {
      detail:
        "This project has no single site a key could name. Tell whoever runs this deployment.",
    }
  }

  /**
   * A closed project takes no signals (0289), so a key for it would be a key
   * the door refuses. The application is asked as well as the project, because
   * reopening a project does not reopen what closed with it (0289 clause 4).
   */
  if (project.value.closedAt !== undefined || application.closedAt !== undefined) {
    return { detail: "This project is closed, and a closed project takes no signals." }
  }

  const issued = await issueIngestKey(appIngestKeys)(application.applicationId, Date.now())

  if (!issued.ok) return { detail: "The key could not be saved, so nothing changed." }

  revalidatePath(`/portal/${projectId}/connect`)

  return {}
}
