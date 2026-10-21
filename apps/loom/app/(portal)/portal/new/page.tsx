import Link from "next/link"

import { Screen } from "@/app/(portal)/_components/screen"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { screenName } from "@/app/(portal)/_lib/screen-names"

import { RegistrationForm } from "./_components/registration-form"

/**
 * Registering, which the maintainer called this portal's primary purpose.
 *
 * **Three fields since 0296**, and only one of them required. A project is a
 * repository is a Loom app, so there is one name rather than two, and the
 * select that offered to put an application in an existing project is gone —
 * there is no second application to put anywhere.
 *
 * It no longer reads the project store at all. The screen that listed
 * somebody's projects here was both a leak and an invitation: it named other
 * people's projects to anybody who opened the form, and offered to add to one.
 *
 * Registering mints the project's key (0298) and lands on the project's
 * *Connect your site* screen, which shows it in the snippet a person pastes.
 */

const RegisterApplication = async () => {
  await requireActor("/portal/new")

  return (
    <Screen>
      <div className="flex flex-col gap-2 pb-7">
        <Link href="/portal" className="text-ink-muted text-sm no-underline hover:underline">
          ← {screenName("/portal")}
        </Link>
        <h1 className="text-2xl tracking-tight">New project</h1>
        <p className="text-ink-muted max-w-lg text-sm">
          A project is a repository is a Loom app. It gets a place to keep its pages, its policy and
          what its readers do. Nothing is sent anywhere until you point it at this deployment.
        </p>
      </div>

      <RegistrationForm />
    </Screen>
  )
}

export default RegisterApplication
