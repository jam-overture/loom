"use server"

import { revalidatePath } from "next/cache"

import { projectIdSchema, type Application, type ProjectId } from "@jam-overture/loom/store"

import { soleApplicationOf } from "@/app/_lib/app/sole-application"
import { appIngestKeys } from "@/app/_lib/reader-signals/key-store"
import { issueIngestKey } from "@/app/_lib/reader-signals/keys"
import { actorSchema } from "@/app/(portal)/_lib/auth/accounts"
import { requireActor, roleOf } from "@/app/(portal)/_lib/auth/identity"
import { mayAdminister } from "@/app/(portal)/_lib/auth/roles"
import { readHost } from "@/app/(portal)/_lib/registering"
import { portalApplications, portalProjects } from "@/app/(portal)/_lib/store"

/**
 * The two things an owner changes from a project's *Connect your site*
 * screen: its key, and the site the door takes deliveries from.
 *
 * **Only an owner** (0285), for `closeProjectAction`'s reason: either one
 * can stop every page the project is counting from being counted, which is a
 * decision about the project rather than a change to anything in it.
 */

export type ConnectReport = {
  readonly detail?: string
}

/**
 * The open application an owner's change applies to, or the report that says
 * why there is none.
 *
 * One message for *not yours* and *no such project*, as everywhere else: a
 * distinct answer would make this a way to ask which ids exist.
 *
 * A closed project takes no signals (0289), so neither a key nor a host for
 * it would change what the door does. The application is asked as well as the
 * project, because reopening a project does not reopen what closed with it
 * (0289 clause 4).
 */
const ownedSite = async (
  form: FormData
): Promise<
  | { readonly ok: true; readonly projectId: ProjectId; readonly application: Application }
  | { readonly ok: false; readonly report: ConnectReport }
> => {
  const actor = await requireActor("/portal")
  const asked = projectIdSchema.safeParse(String(form.get("projectId") ?? ""))
  const refused = {
    ok: false,
    report: { detail: "That is not a project you can change." },
  } as const

  if (!asked.success) return refused

  const projectId = asked.data
  const role = await roleOf(actorSchema.parse(actor), projectId)

  if (role === null || role === undefined || !mayAdminister(role)) return refused

  const [project, applications] = await Promise.all([
    portalProjects.get(projectId),
    portalApplications.list({ closed: "all" }),
  ])

  if (!project.ok || !applications.ok) {
    return { ok: false, report: { detail: "The store did not answer. Nothing was changed." } }
  }

  const application = soleApplicationOf(applications.value, projectId)

  if (application === undefined) {
    return {
      ok: false,
      report: {
        detail: "This project has no single site to change. Tell whoever runs this deployment.",
      },
    }
  }

  if (project.value.closedAt !== undefined || application.closedAt !== undefined) {
    return {
      ok: false,
      report: { detail: "This project is closed, and a closed project takes no signals." },
    }
  }

  return { ok: true, projectId, application }
}

/**
 * A first key for a project registered before registration minted keys, or a
 * new one for a project whose key turned up on a site it should not be on.
 *
 * Both are the same act — mint, and end whatever was held (0298 clause 1) —
 * so they are one action, and the screen says which of the two it is.
 */
export const issueKeyAction = async (
  _previous: ConnectReport | null,
  form: FormData
): Promise<ConnectReport> => {
  const site = await ownedSite(form)

  if (!site.ok) return site.report

  const issued = await issueIngestKey(appIngestKeys)(site.application.applicationId, Date.now())

  if (!issued.ok) return { detail: "The key could not be saved, so nothing changed." }

  revalidatePath(`/portal/${site.projectId}/connect`)

  return {}
}

/**
 * Where the door takes this project's deliveries from (0298 clause 5), by the
 * rules registration read it under.
 *
 * An empty box **clears** the host rather than leaving it alone, because on
 * this screen the box shows the host the project has: emptying it is somebody
 * saying *any site*, and a save that kept the old one would be a form that
 * ignored what was typed into it.
 */
export const setHostAction = async (
  _previous: ConnectReport | null,
  form: FormData
): Promise<ConnectReport> => {
  const site = await ownedSite(form)

  if (!site.ok) return site.report

  const host = readHost(form.get("host"))

  if (!host.ok) return { detail: host.detail }

  const saved = await portalApplications.rename(site.application.applicationId, {
    host: host.value ?? null,
  })

  if (!saved.ok) return { detail: "The address could not be saved, so nothing changed." }

  revalidatePath(`/portal/${site.projectId}/connect`)

  return {}
}
