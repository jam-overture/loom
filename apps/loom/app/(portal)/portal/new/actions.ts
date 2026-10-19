"use server"

import { redirect } from "next/navigation"

import {
  describeApplicationStoreError,
  describeProjectStoreError,
  newApplicationId,
  newProjectId,
  type ApplicationId,
} from "@jam-overture/loom/store"

import { portalMemberships } from "@/app/(portal)/_lib/auth/account-store"
import { actorSchema } from "@/app/(portal)/_lib/auth/accounts"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { readRegistration, type RegistrationFault } from "@/app/(portal)/_lib/registering"
import { portalApplications, portalProjects } from "@/app/(portal)/_lib/store"

/**
 * Registering, which is what this portal is for.
 *
 * **One act since 0296**: a repository, the project it names, the one
 * application inside it, and the role that makes it yours. There is no way to
 * add a second application to a project and no screen that offers one, so the
 * *join an existing project* path this action used to carry is gone — and with
 * it the check that stopped somebody attaching an application to a project they
 * had never been added to, because there is nothing left to attach.
 *
 * The rules live in `_lib/registering.ts` and are a function of what was typed;
 * this is the part that cannot be tested without a request — a session, three
 * stores and a redirect.
 */

export type RegistrationReport = {
  readonly faults: readonly RegistrationFault[]
  /** A failure that is not about a field: a store declining. */
  readonly detail?: string
}

export const registerApplication = async (
  _previous: RegistrationReport | null,
  form: FormData
): Promise<RegistrationReport> => {
  const actor = await requireActor("/portal/new")

  const read = readRegistration({
    name: form.get("name"),
    host: form.get("host"),
    repository: form.get("repository"),
  })

  if (!read.ok) return { faults: read.faults }

  /**
   * **One act** (0296): a project, the one application inside it, and the role
   * that makes the project visible to whoever made it.
   *
   * The order is the order of what cannot be undone. The project is created
   * first because it carries the repository and therefore the uniqueness that
   * can refuse — better to find that out before anything else is written. The
   * application follows, and the ownership last, because a project nobody owns
   * is invisible and a project with no application cannot take a signal.
   */
  const projectId = newProjectId()

  const project = await portalProjects.create({
    projectId,
    name: read.value.name,
    createdAt: new Date().toISOString(),
    ...(read.value.repository === undefined ? {} : { repository: read.value.repository }),
  })

  if (!project.ok) {
    /**
     * A taken repository is a fault on the field somebody typed into, not a
     * failure of the screen (0292). Every other refusal is the store's and is
     * reported as one.
     */
    return project.error.code === "repository-taken"
      ? {
          faults: [
            {
              field: "repository",
              detail: "Another project already names that repository.",
            },
          ],
        }
      : { faults: [], detail: describeProjectStoreError(project.error) }
  }

  const applicationId: ApplicationId = newApplicationId()

  const registered = await portalApplications.create({
    applicationId,
    projectId,
    name: read.value.name,
    createdAt: new Date().toISOString(),
    ...(read.value.host === undefined ? {} : { host: read.value.host }),
  })

  if (!registered.ok) {
    /**
     * The project exists and has nothing in it, which is a state 0296 says
     * must not be reachable — so it is reported rather than left. Registering
     * again makes a second project rather than repairing this one, which is
     * the honest limit of what an action without a transaction can promise,
     * and the project is closable from the workspace.
     */
    return {
      faults: [],
      detail: `${describeApplicationStoreError(registered.error)} The project was made and is empty — close it from the workspace and try again.`,
    }
  }

  /**
   * **Whoever makes a project owns it** (0285 clause 5), and this is the line
   * that makes the workspace work at all: it lists the projects you hold a
   * role in, so a project created without one is a project its own author
   * cannot see.
   */
  const owned = await portalMemberships.put({
    actor: actorSchema.parse(actor),
    projectId,
    role: "owner",
  })

  if (!owned.ok) {
    return {
      faults: [],
      detail:
        "It was registered and could not be given to you, so it will not appear in your workspace. Tell whoever runs this deployment.",
    }
  }

  /**
   * The workspace, which is where the project now is. It carries the id so the
   * screen can say which one is new, when it learns to; the id is not the path,
   * because the screen that took one was deleted in unit 0 and
   * `destinations.test.ts` asserts what this redirects to.
   */
  redirect(`/portal?registered=${projectId}`)
}
