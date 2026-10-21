import Link from "next/link"
import { notFound } from "next/navigation"

import { projectIdSchema } from "@jam-overture/loom/store"

import { servedOrigin } from "@/app/(marketing)/_lib/serving"
import { Screen } from "@/app/(portal)/_components/screen"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { requireActor, requireRole } from "@/app/(portal)/_lib/auth/identity"
import { mayAdminister } from "@/app/(portal)/_lib/auth/roles"
import { acceptedFrom, signalAddress, snippetFor } from "@/app/(portal)/_lib/connecting"
import { screenName } from "@/app/(portal)/_lib/screen-names"
import { portalApplications, portalProjects } from "@/app/(portal)/_lib/store"
import { PORTAL_READ_BUDGET_MS } from "@/app/_lib/app/bounded"
import { readWithin, unavailable } from "@/app/_lib/app/bounded-store"
import { soleApplicationOf } from "@/app/_lib/app/sole-application"
import { appIngestKeys } from "@/app/_lib/reader-signals/key-store"

import { CopyButton } from "./_components/copy-button"
import { HostControls } from "./_components/host-controls"
import { KeyControls } from "./_components/key-controls"

/**
 * *Connect your site*: a project's key, the snippet that carries it, and where
 * the door will take it from — the last of unit 4, and the first screen under
 * `/portal/[project]` that reads a real project.
 *
 * It is the real version of the preview's credentials screen, and it differs
 * from that screen in what the preview had to invent. The preview calls the
 * key a secret shown once, because it was drawn before 0298 decided the key is
 * public; this shows it whole, every time, because it is printed in the page
 * source of every page that sends it and hiding it here would protect nothing.
 * The preview's snippet configures a client that does not exist; this one is
 * the two calls the runtime publishes, and it works as pasted.
 *
 * **Anybody in the project sees it; only an owner changes it.** A key is
 * public, so showing it to a viewer gives them nothing a reader of the site
 * does not have. Replacing it stops every page carrying the old one, and so
 * does naming a site those pages are not on, which makes both an owner's
 * decision for the reason closing is.
 *
 * The address is the deployment's as this request reached it, not
 * `siteOrigin()`: it is where the person reading this is talking to the
 * deployment, and so where their site will be heard.
 */

const KeyField = ({ value, label }: { value: string; label: string }) => (
  <div className="flex items-center gap-2">
    <code className="border-edge-subtle bg-surface-page min-w-0 flex-1 truncate rounded-md border px-2.5 py-1.5 font-mono text-xs">
      {value}
    </code>
    <CopyButton text={value} label={label} />
  </div>
)

const ConnectPage = async ({ params }: { params: Promise<{ project: string }> }) => {
  const asked = projectIdSchema.safeParse((await params).project)

  if (!asked.success) notFound()

  const projectId = asked.data

  /**
   * Signed in first, with this address to come back to — `requireRole` would
   * send a stranger to sign in too, but to the workspace afterwards, and a
   * person who followed a link to their project's snippet wants the snippet.
   */
  await requireActor(`/portal/${projectId}/connect`)

  const role = await requireRole(projectId)

  const [project, applications] = await Promise.all([
    portalProjects.get(projectId),
    portalApplications.list({ closed: "all" }),
  ])

  const application = applications.ok ? soleApplicationOf(applications.value, projectId) : undefined

  const held =
    application === undefined
      ? undefined
      : await readWithin(
          () => appIngestKeys.keyOf(application.applicationId),
          unavailable,
          PORTAL_READ_BUDGET_MS
        )

  const owner = mayAdminister(role)

  const body = (async () => {
    /**
     * A store that cannot answer is said, never drawn as *no key yet*: a person
     * told that would make one, and replace a key that was working.
     */
    if (!project.ok || !applications.ok || (held !== undefined && !held.ok)) {
      return (
        <StateNotice tone="failure" title="The store did not answer">
          Nothing here is a statement about this project&rsquo;s key. Try again in a moment.
        </StateNotice>
      )
    }

    if (application === undefined) {
      return (
        <StateNotice tone="failure" title="There is no single site to connect">
          This project does not hold exactly one site, so there is no one thing a key could name.
          Tell whoever runs this deployment.
        </StateNotice>
      )
    }

    if (project.value.closedAt !== undefined || application.closedAt !== undefined) {
      return (
        <StateNotice tone="notice" title="This project is closed">
          A closed project takes no signals, so every page sending its key is refused. Nothing it
          held was deleted.
        </StateNotice>
      )
    }

    if (held === undefined || !held.ok || held.value === null) {
      return (
        <StateNotice
          tone="empty"
          title="No key yet"
          action={
            owner ? (
              <KeyControls projectId={projectId} held={false} />
            ) : (
              <span>Ask an owner of this project to make one.</span>
            )
          }
        >
          A key is what tells this deployment which project a page&rsquo;s readers belong to. Until
          there is one, nothing your site sends is counted.
        </StateNotice>
      )
    }

    const key = held.value
    const snippet = snippetFor(signalAddress(await servedOrigin(), key))

    return (
      <div className="flex max-w-3xl flex-col gap-4">
        <section className="border-edge-subtle bg-surface-base flex flex-col gap-3 rounded-lg border p-4">
          <h2 className="text-sm font-medium tracking-tight">Paste this into your site</h2>
          <p className="text-ink-muted text-xs">
            Put it in the script that runs on the page Loom renders. It watches what readers do and
            sends it here, from your site&rsquo;s address to this one, with nothing else to set up.
          </p>
          <pre className="border-edge-subtle bg-surface-page m-0 overflow-x-auto rounded-md border p-3 font-mono text-[11px] leading-relaxed">
            {snippet}
          </pre>
          <div className="flex flex-wrap items-center gap-4">
            <CopyButton text={snippet} label="Copy the snippet" />
            <Link
              href={`/portal/${projectId}/signals`}
              className="text-ink text-xs no-underline hover:underline"
            >
              See what has arrived →
            </Link>
          </div>
        </section>

        <section className="border-edge-subtle bg-surface-base flex flex-col gap-3 rounded-lg border p-4">
          <h2 className="text-sm font-medium tracking-tight">The key</h2>
          <KeyField value={key} label="Copy the key" />
          <p className="text-ink-muted text-xs">
            It is not a secret. It is in your page for anybody who reads the source, and what it
            does is say which project your readers belong to.
          </p>
          {owner && <KeyControls key={key} projectId={projectId} held />}
        </section>

        <section className="border-edge-subtle bg-surface-base flex flex-col gap-3 rounded-lg border p-4">
          <h2 className="text-sm font-medium tracking-tight">Where signals are taken from</h2>
          <p className="text-ink-muted text-xs">{acceptedFrom(application.host)}</p>
          {owner && (
            <HostControls
              key={application.host ?? ""}
              projectId={projectId}
              host={application.host}
            />
          )}
        </section>
      </div>
    )
  })()

  return (
    <Screen>
      <div className="flex flex-col gap-2">
        <Link href="/portal" className="text-ink-muted text-sm no-underline hover:underline">
          ← {screenName("/portal")}
        </Link>
        <h1 className="text-2xl tracking-tight">Connect your site</h1>
        {project.ok && <p className="text-ink-muted text-sm">{project.value.name}</p>}
      </div>

      {await body}
    </Screen>
  )
}

export default ConnectPage
