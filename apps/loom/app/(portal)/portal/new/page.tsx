import Link from "next/link"

import { Screen } from "@/app/(portal)/_components/screen"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { portalMemberships } from "@/app/(portal)/_lib/auth/account-store"
import { actorSchema } from "@/app/(portal)/_lib/auth/accounts"
import { mayAdminister } from "@/app/(portal)/_lib/auth/roles"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { screenName } from "@/app/(portal)/_lib/screen-names"
import { portalProjects } from "@/app/(portal)/_lib/store"

import { RegistrationForm } from "./_components/registration-form"

/**
 * Registering an application — the thing the maintainer called this portal's
 * primary purpose, and the thing it had no screen for.
 *
 * Until now a deployment had exactly the application its seed wrote, and the
 * only route to a second was a SQL client. Everything built this week — the
 * project dimension on five tables, the application store, the hierarchy — was
 * in service of a second application that nothing could create.
 *
 * ## What it does not yet do
 *
 * It does not hand back a credential. Ingest does not authenticate yet, so there
 * is nothing to hand back that would be true; what a person needs in their own
 * configuration today is the application's id, which the screen they land on
 * shows. Saying *here is your key* before a key means anything would be the
 * worst of the options.
 */

const RegisterApplication = async () => {
  const actor = await requireActor("/portal/new")

  /**
   * **Only the projects this person may add to** (0285).
   *
   * It listed every project in the deployment until now, which was two
   * problems in one select: it named other people's projects to anybody who
   * opened the form, and it invited them to put an application in one. The
   * action checks the choice regardless — a select is a text field somebody can
   * post anything to — and this is what stops the form offering a choice that
   * will be refused.
   */
  const [held, projects] = await Promise.all([
    portalMemberships.projectsOf(actorSchema.parse(actor)),
    portalProjects.list(),
  ])

  const administers = new Set(
    (held.ok ? held.value : [])
      .filter((membership) => mayAdminister(membership.role))
      .map((membership) => membership.projectId)
  )

  /**
   * A membership store that cannot answer shows no projects rather than all of
   * them. The form still works — registering without choosing one makes a new
   * project — so the failure costs a convenience rather than the screen.
   */
  const mine = projects.ok ? projects.value.filter((p) => administers.has(p.projectId)) : []

  return (
    <Screen>
      <div className="flex flex-col gap-2 pb-7">
        <Link href="/portal" className="text-ink-muted text-sm no-underline hover:underline">
          ← {screenName("/portal")}
        </Link>
        <h1 className="text-2xl tracking-tight">Register an application</h1>
        <p className="text-ink-muted max-w-lg text-sm">
          Tell Loom about an application and it gets a place to keep its pages, its policy and what
          its readers do. Nothing is sent anywhere until you point the application at it.
        </p>
      </div>

      {projects.ok ? (
        <RegistrationForm
          projects={mine.map((project) => ({
            projectId: project.projectId,
            name: project.name,
          }))}
        />
      ) : (
        <StateNotice tone="failure" title="We couldn't list your projects.">
          <p>
            You can still register an application — it will go into a new project named after it.
          </p>
          <RegistrationForm projects={[]} />
        </StateNotice>
      )}
    </Screen>
  )
}

export default RegisterApplication
