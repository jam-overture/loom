import Link from "next/link"

import { Screen } from "@/app/(portal)/_components/screen"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
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
  await requireActor("/portal/new")

  const projects = await portalProjects.list()

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
          projects={projects.value.map((project) => ({
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
