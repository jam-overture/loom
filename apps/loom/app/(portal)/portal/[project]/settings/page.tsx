import { notFound } from "next/navigation"

import { projectIdSchema } from "@jam-overture/loom/store"

import { Screen } from "@/app/(portal)/_components/screen"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { requireActor, requireRole } from "@/app/(portal)/_lib/auth/identity"
import { mayAdminister } from "@/app/(portal)/_lib/auth/roles"
import { acceptedFrom } from "@/app/(portal)/_lib/connecting"
import { plainMoment } from "@/app/(portal)/_lib/when"
import { portalApplications, portalProjects } from "@/app/(portal)/_lib/store"
import { soleApplicationOf } from "@/app/_lib/app/sole-application"
import type { ModelKeyStanding } from "@/app/_lib/models/model-keys"
import { modelKeyOf, modelKeysKeepable } from "@/app/_lib/models/store"
import { ClosingControls } from "@/app/(portal)/portal/_components/closing-controls"

import { ModelKeyControls } from "./_components/model-key-controls"
import { SettingsForm } from "./_components/settings-form"

/** What the project's model key is, said to anybody who opens Settings. */
const keySentence = (standing: ModelKeyStanding | undefined): string => {
  if (standing === undefined) return "The store did not say whether this project has a model key."

  switch (standing.kind) {
    case "set":
      return `A key ending ${standing.hint} is set, since ${plainMoment(new Date(standing.setAt).toISOString())}. Loom proposes changes with it.`
    case "unreadable":
      return `The key ending ${standing.hint} can no longer be read, because this deployment's secret changed since it was set. Set it again.`
    case "none":
      return "No key is set, so Loom proposes nothing for this project's pages."
  }
}

/**
 * *Settings*: what a project is called, where its site lives, the model key
 * its proposals are paid with (0332), and closing it — the plan's Settings
 * tab (`docs/portal.md`, *Three surfaces*) with the parts of it that exist so
 * far.
 *
 * **Everybody in the project reads it; only an owner changes it** (0285).
 * A viewer is shown the values as sentences rather than as boxes they cannot
 * save, because a disabled form reads as broken.
 *
 * A closed project shows how to reopen it and nothing to edit: a closed
 * project takes no signals (0289), so a new address for it would change
 * nothing the door does.
 */
const SettingsPage = async ({ params }: { params: Promise<{ project: string }> }) => {
  const asked = projectIdSchema.safeParse((await params).project)

  if (!asked.success) notFound()

  const projectId = asked.data

  /** Signed in first, with this address to come back to — the Connect screen's reason. */
  await requireActor(`/portal/${projectId}/settings`)

  const role = await requireRole(projectId)

  const [project, applications] = await Promise.all([
    portalProjects.get(projectId),
    portalApplications.list({ closed: "all" }),
  ])

  const application = applications.ok ? soleApplicationOf(applications.value, projectId) : undefined
  const owner = mayAdminister(role)
  const key = application === undefined ? undefined : await modelKeyOf(application.applicationId)
  const standing = key?.ok === true ? key.value : undefined

  const body = (() => {
    if (!project.ok || !applications.ok) {
      return (
        <StateNotice tone="failure" title="The store did not answer">
          Nothing here is a statement about this project&rsquo;s settings. Try again in a moment.
        </StateNotice>
      )
    }

    if (application === undefined) {
      return (
        <StateNotice tone="failure" title="There is no single site to set up">
          This project does not hold exactly one site, so there is nothing here to change. Tell
          whoever runs this deployment.
        </StateNotice>
      )
    }

    const closed = project.value.closedAt !== undefined || application.closedAt !== undefined

    return (
      <div className="flex flex-col gap-4">
        <section className="border-edge-subtle bg-surface-base flex flex-col gap-3 rounded-lg border p-4">
          <h2 className="text-sm font-medium tracking-tight">This project</h2>
          {owner && !closed ? (
            <SettingsForm projectId={projectId} name={project.value.name} host={application.host} />
          ) : (
            <div className="flex flex-col gap-1 text-sm">
              <p className="m-0">{project.value.name}</p>
              <p className="text-ink-muted m-0 text-xs">{acceptedFrom(application.host)}</p>
              {!owner && (
                <p className="text-ink-muted m-0 text-xs">Only an owner can change these.</p>
              )}
            </div>
          )}
        </section>

        <section className="border-edge-subtle bg-surface-base flex flex-col gap-3 rounded-lg border p-4">
          <h2 className="text-sm font-medium tracking-tight">Model key</h2>
          <p className="text-ink-muted m-0 text-xs">
            Loom reads what readers do on your pages and proposes changes with a model. It uses this
            project&rsquo;s own Anthropic key, so the model calls are billed to you.{" "}
            {keySentence(standing)}
          </p>
          {owner && !closed && modelKeysKeepable ? (
            <ModelKeyControls
              projectId={projectId}
              hint={standing?.kind === "none" ? undefined : standing?.hint}
            />
          ) : (
            !owner && <p className="text-ink-muted m-0 text-xs">Only an owner can set it.</p>
          )}
        </section>

        {owner && (
          <section className="border-edge-subtle bg-surface-base flex flex-col gap-3 rounded-lg border p-4">
            <h2 className="text-sm font-medium tracking-tight">
              {closed ? "Reopen this project" : "Close this project"}
            </h2>
            <ClosingControls
              projectId={projectId}
              name={project.value.name}
              closedAt={project.value.closedAt}
            />
          </section>
        )}
      </div>
    )
  })()

  return (
    <Screen>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl tracking-tight">Settings</h1>
        {project.ok && <p className="text-ink-muted text-sm">{project.value.name}</p>}
      </div>

      {body}
    </Screen>
  )
}

export default SettingsPage
