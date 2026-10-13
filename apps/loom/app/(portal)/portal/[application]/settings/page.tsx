import Link from "next/link"
import { notFound } from "next/navigation"

import { describeApplicationStoreError } from "@jam-overture/loom/store"

import { Screen } from "@/app/(portal)/_components/screen"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { applicationFromRoute } from "@/app/(portal)/_lib/scoped"
import { screenName } from "@/app/(portal)/_lib/screen-names"
import { portalApplications, portalProjects } from "@/app/(portal)/_lib/store"

import { SettingsForm } from "./_components/settings-form"

/**
 * What an application **is**, as opposed to what it is made of or what it has
 * been doing.
 *
 * The portal had three screens about an application and none of them was this
 * one. `/portal/app` says what it is built from, `/portal/[application]` says
 * what is waiting on you, and `/portal/pages` says what it has. None of them
 * would tell you its id, and the id is the one thing a person needs outside the
 * portal — it is what `/portal/new` sends them away with and what their own
 * configuration will carry.
 *
 * It is also the first screen in this portal that **changes** something that is
 * not a page. Registering writes an application; nothing could edit one
 * afterwards, so a name typed in a hurry was a name forever.
 *
 * ## What is deliberately not here
 *
 * **Credentials**, which the prototype at `/portal/preview` draws in full and
 * which this screen does not pretend to. Its own comment is the reason: *"it is
 * worth being plain that nothing behind this screen exists. `/api/reader-signals`
 * authenticates no one today."* An ingest key, an origin allowlist and an
 * endpoint that checks them are new work, not a screen to port, and a settings
 * page showing a key that authenticates nothing would be worse than one that
 * says the key does not exist yet.
 *
 * **Deleting**, which neither store offers and `project/store.ts` argues
 * against at length: an application's rows are its trees, its revisions, its
 * holds, its policy history and its journal, and a delete would either orphan
 * all of them or cascade through the governance record this product exists to
 * keep.
 */

const Line = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="flex flex-col gap-1 py-2">
    <span className="text-ink-muted text-[11px] tracking-wide uppercase">{label}</span>
    <code className="border-edge-subtle bg-surface-page rounded-md border px-2.5 py-1.5 font-mono text-xs">
      {value}
    </code>
    {hint === undefined ? null : <span className="text-ink-muted text-[11px]">{hint}</span>}
  </div>
)

const SettingsPage = async ({ params }: { params: Promise<{ application: string }> }) => {
  const { application } = await params
  const applicationId = applicationFromRoute(application)
  if (applicationId === undefined) notFound()

  await requireActor(`/portal/${application}/settings`)

  const found = await portalApplications.get(applicationId)

  if (!found.ok) {
    /**
     * `not-found` is a 404 and everything else is this notice, which is the
     * distinction every read in this portal makes: an application that is not
     * there and a store that will not say are opposites, and the second one is
     * not the reader's fault.
     */
    if (found.error.code === "not-found") notFound()

    return (
      <Screen>
        <h1 className="text-2xl tracking-tight">Settings</h1>
        <StateNotice tone="failure" title="We couldn't read this application.">
          <p>
            Nothing has been lost and nothing has been changed — opening settings only reads. Try
            again in a moment.
          </p>
          <TechnicalDetail>
            <p className="font-mono">{describeApplicationStoreError(found.error)}</p>
            <p>
              This is the store declining to answer, not an application that does not exist. The
              two look alike on screen and are opposites.
            </p>
          </TechnicalDetail>
        </StateNotice>
      </Screen>
    )
  }

  const { name, host, projectId, createdAt } = found.value

  /**
   * The project's name, or its id.
   *
   * A failure here costs the one word and nothing else, so it is not a notice:
   * the id is a true answer to *which project*, and a screen that refused to
   * draw itself because a grouping could not be named would be refusing over
   * the least important thing on it.
   */
  const project = await portalProjects.get(projectId)
  const projectName = project.ok ? project.value.name : projectId

  return (
    <Screen>
      <div className="flex flex-col gap-2 pb-7">
        <Link
          href={`/portal/${applicationId}`}
          className="text-ink-muted text-sm no-underline hover:underline"
        >
          ← {screenName("/portal/[application]")}
        </Link>
        <h1 className="text-2xl tracking-tight">Settings</h1>
        <p className="text-ink-muted max-w-lg text-sm">
          What this application is called, where it lives, and the id everything else refers to it
          by.
        </p>
      </div>

      <section className="border-edge-subtle bg-surface-base mb-6 max-w-lg rounded-lg border p-4">
        <Line
          label="Application id"
          value={applicationId}
          hint="What your own configuration carries. Safe to commit."
        />
        <Line label="Project" value={projectName} hint="Projects group applications." />
        <Line label="Registered" value={new Date(createdAt).toISOString().slice(0, 10)} />
      </section>

      <SettingsForm applicationId={applicationId} name={name} host={host} />
    </Screen>
  )
}

export default SettingsPage
