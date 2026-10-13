"use server"

import { redirect } from "next/navigation"

import {
  describeApplicationStoreError,
  newApplicationId,
  newProjectId,
  projectIdSchema,
  type ApplicationId,
} from "@jam-overture/loom/store"

import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { readRegistration, type RegistrationFault } from "@/app/(portal)/_lib/registering"
import { portalApplications, portalProjects } from "@/app/(portal)/_lib/store"

/**
 * Registering an application, which is what this portal is for.
 *
 * The rules live in `_lib/registering.ts` and are a function of what was typed;
 * this is the part that cannot be tested without a request — a session, two
 * stores and a redirect.
 */

export type RegistrationReport = {
  readonly faults: readonly RegistrationFault[]
  /** A failure that is not about a field: the store declining. */
  readonly detail?: string
}

/**
 * A project for an application that did not join one.
 *
 * Named after the application rather than asked for separately. A person
 * registering their first application has no opinion about projects yet, and a
 * form that demanded one before letting them past would be collecting an answer
 * to a question they have not been given a reason to care about. They can rename
 * it, and the second application is when grouping starts to mean something.
 */
const projectFor = async (name: string): Promise<string | undefined> => {
  const project = {
    projectId: newProjectId(),
    name,
    createdAt: new Date().toISOString(),
  }

  const made = await portalProjects.create(project)

  return made.ok ? made.value.projectId : undefined
}

export const registerApplication = async (
  _previous: RegistrationReport | null,
  form: FormData
): Promise<RegistrationReport> => {
  await requireActor("/portal/new")

  const read = readRegistration({
    name: form.get("name"),
    host: form.get("host"),
    project: form.get("project"),
  })

  if (!read.ok) return { faults: read.faults }

  /**
   * The chosen project is checked rather than trusted: it arrives from a select
   * whose options this screen rendered, and a select is a text field somebody
   * can post anything to.
   */
  const joining = read.value.joining
  const chosen = joining === undefined ? undefined : projectIdSchema.safeParse(joining)
  if (chosen !== undefined && !chosen.success) {
    return { faults: [{ field: "project", detail: "That is not a project." }] }
  }

  const projectId = chosen?.success === true ? chosen.data : await projectFor(read.value.name)

  if (projectId === undefined) {
    return {
      faults: [],
      detail: "We could not make a project to put it in. Nothing was registered — try again.",
    }
  }

  const applicationId: ApplicationId = newApplicationId()

  const registered = await portalApplications.create({
    applicationId,
    projectId: projectIdSchema.parse(projectId),
    name: read.value.name,
    createdAt: new Date().toISOString(),
    ...(read.value.host === undefined ? {} : { host: read.value.host }),
  })

  if (!registered.ok) {
    return { faults: [], detail: describeApplicationStoreError(registered.error) }
  }

  redirect(`/portal/${applicationId}?registered=1`)
}
