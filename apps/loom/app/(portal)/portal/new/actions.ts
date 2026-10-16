"use server"

import { redirect } from "next/navigation"

import {
  describeApplicationStoreError,
  newApplicationId,
  newProjectId,
  projectIdSchema,
  type ApplicationId,
} from "@jam-overture/loom/store"

import { portalMemberships } from "@/app/(portal)/_lib/auth/account-store"
import { actorSchema } from "@/app/(portal)/_lib/auth/accounts"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { mayAddApplicationTo } from "@/app/(portal)/_lib/auth/roles"
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
const projectFor = async (name: string, actor: string): Promise<string | undefined> => {
  const project = {
    projectId: newProjectId(),
    name,
    createdAt: new Date().toISOString(),
  }

  const made = await portalProjects.create(project)
  if (!made.ok) return undefined

  /**
   * **Whoever makes a project owns it** (0285 clause 5), and this is the line
   * that makes the workspace work at all: it lists the projects you hold a role
   * in, so a project created without one is a project its own author cannot
   * see. There is no screen to grant the first role from, because the screen
   * that would do it is behind the project you cannot reach.
   *
   * Creating a project is not governed by a project role — there is no project
   * to hold one in yet — so nothing is checked here beyond being signed in.
   */
  const owned = await portalMemberships.put({
    actor: actorSchema.parse(actor),
    projectId: made.value.projectId,
    role: "owner",
  })

  /**
   * A project nobody can see is worse than no project: it holds the name, so
   * the next attempt under the same name succeeds and is equally invisible.
   * Reported as the failure it is rather than carried on from.
   */
  return owned.ok ? made.value.projectId : undefined
}

export const registerApplication = async (
  _previous: RegistrationReport | null,
  form: FormData
): Promise<RegistrationReport> => {
  const actor = await requireActor("/portal/new")

  const read = readRegistration({
    name: form.get("name"),
    host: form.get("host"),
    project: form.get("project"),
    projectName: form.get("projectName"),
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

  /**
   * **Being signed in is not permission to put an application in somebody
   * else's project** (0285).
   *
   * The select above offers only the projects this actor holds, which is where
   * the leak was: posting any `prj_` id attached an application to a project
   * the poster had never been added to, and the owner would find it there with
   * no record of who did it. The options a screen renders are a convenience;
   * this is the check.
   *
   * `owner` rather than any role, because adding an application changes what
   * the project *contains*, which is the administering half of a role rather
   * than the acceptance ceiling.
   */
  if (chosen?.success === true) {
    const held = await portalMemberships.roleIn(actorSchema.parse(actor), chosen.data)

    if (!held.ok) {
      return {
        faults: [],
        detail: "We could not check whether that project is yours. Nothing was registered.",
      }
    }

    /**
     * One message for *not yours* and *no such project*, which is the same
     * rule the sign-in form follows: a distinct "no such project" would turn
     * this field into a way to ask which project ids exist.
     */
    if (!mayAddApplicationTo(held.value)) {
      return { faults: [{ field: "project", detail: "That is not a project you can add to." }] }
    }
  }

  const projectId =
    chosen?.success === true
      ? chosen.data
      : await projectFor(read.value.projectName ?? read.value.name, actor)

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

  /**
   * The front door, because the screen this used to land on no longer exists.
   *
   * It redirected to `/portal/${applicationId}` until 14 October, and unit 0
   * deleted `/portal/[application]` with nineteen other screens — so
   * registering an application worked, wrote both rows, and then showed *Not
   * found*. Nothing caught it: the action's destination is a string, no test
   * asserted it was a route this portal serves, and the deletion sweep looked
   * for imports rather than for addresses built out of template literals.
   * `destinations.test.ts` asserts it now.
   *
   * `registered` is kept so the front door can say which one is new, when it
   * learns to; the id goes with it rather than being the path.
   */
  redirect(`/portal?registered=${applicationId}`)
}
