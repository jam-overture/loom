import { projectIdSchema, type Application, type ProjectId } from "@jam-overture/loom/store"

import { soleApplicationOf } from "@/app/_lib/app/sole-application"
import { actorSchema, type Actor } from "@/app/(portal)/_lib/auth/accounts"
import { requireActor, roleOf } from "@/app/(portal)/_lib/auth/identity"
import { mayAdminister, type Role } from "@/app/(portal)/_lib/auth/roles"
import { portalApplications, portalProjects } from "@/app/(portal)/_lib/store"

/** What an owner's change on one of a project's screens says back. */
export type ProjectReport = {
  readonly detail?: string
}

export type SiteFor =
  | {
      readonly ok: true
      readonly projectId: ProjectId
      readonly application: Application
      /** Who is making the change, for the record of it. */
      readonly actor: Actor
    }
  | { readonly ok: false; readonly report: ProjectReport }

/**
 * The open project, and the one application in it, that an owner's change
 * applies to — or the report that says why there is none.
 *
 * **Only an owner** (0285), for `closeProjectAction`'s reason: a new key, a
 * new site and a new name each change what the project is rather than
 * anything in it.
 *
 * One message for *not yours* and *no such project*, as everywhere else: a
 * distinct answer would make this a way to ask which ids exist.
 *
 * A closed project takes no signals (0289), so a change to how it takes them
 * would change nothing the door does, and is refused rather than saved to a
 * project somebody has stopped. The application is asked as well as the
 * project, because reopening a project does not reopen what closed with it
 * (0289 clause 4).
 */
export const ownedSite = (form: FormData): Promise<SiteFor> => siteFor(form, mayAdminister)

/**
 * The same, for a change that a role other than owner may make: asking for a
 * change to a page is open to anybody who could accept one (0329 clause 1).
 */
export const siteFor = async (
  form: FormData,
  permitted: (role: Role) => boolean
): Promise<SiteFor> => {
  const actor = await requireActor("/portal")
  const asked = projectIdSchema.safeParse(String(form.get("projectId") ?? ""))
  const refused = {
    ok: false,
    report: { detail: "That is not a project you can change." },
  } as const

  if (!asked.success) return refused

  const projectId = asked.data
  const member = actorSchema.parse(actor)
  const role = await roleOf(member, projectId)

  if (role === null || role === undefined || !permitted(role)) return refused

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
      report: { detail: "This project is closed. Reopen it to change it." },
    }
  }

  return { ok: true, projectId, application, actor: member }
}
