import Link from "next/link"

import {
  describeApplicationStoreError,
  describeProjectStoreError,
} from "@jam-overture/loom/store"

import { Screen } from "@/app/(portal)/_components/screen"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { screenName } from "@/app/(portal)/_lib/screen-names"
import { portalApplications, portalProjects, portalStore } from "@/app/(portal)/_lib/store"
import { portalHolds } from "@/app/(portal)/_lib/write"
import {
  workspaceOf,
  workspaceTotals,
  type ApplicationSummary,
  type ProjectGroup,
} from "@/app/(portal)/_lib/workspace"

/**
 * Every application this deployment governs, under the project it is in.
 *
 * `_lib/workspace.ts` has the argument for why the project is a heading here
 * rather than a screen of its own. What this file does is read, and the reading
 * is deliberately shallow: a name, how many pages, and what is waiting. The
 * numbers a reader opens a portal for are on the row, so the row is worth
 * scanning and the screen below it is worth opening.
 */

const Figure = ({
  value,
  label,
  loud,
}: {
  value: number
  label: string
  loud?: boolean | undefined
}) => (
  <div className="flex flex-col gap-0.5">
    <span className={`font-mono text-sm ${loud === true ? "text-awaiting-ink" : ""}`}>
      {value.toLocaleString("en-GB")}
    </span>
    <span className="text-ink-muted text-[11px]">{label}</span>
  </div>
)

const ApplicationRow = ({ summary }: { summary: ApplicationSummary }) => (
  <li>
    <Link
      href={`/portal/${summary.application.applicationId}`}
      className="border-edge-subtle bg-surface-base hover:border-edge flex flex-col gap-3 rounded-lg border p-4 no-underline"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium tracking-tight">{summary.application.name}</span>
          <span className="text-ink-muted font-mono text-[11px]">
            {summary.application.host ?? summary.application.applicationId}
          </span>
        </div>
      </div>

      <div className="border-edge-subtle flex gap-6 border-t pt-3">
        <Figure value={summary.pages} label="pages" />
        <Figure value={summary.waiting} label="waiting on you" loud={summary.waiting > 0} />
        {summary.unreadable > 0 ? (
          <Figure value={summary.unreadable} label="this build cannot read" />
        ) : null}
      </div>
    </Link>
  </li>
)

const Group = ({ name, applications }: { name: string; applications: readonly ApplicationSummary[] }) => (
  <section className="flex flex-col gap-3">
    <h2 className="text-ink-muted text-xs tracking-wide uppercase">{name}</h2>
    {applications.length === 0 ? (
      <p className="text-ink-muted text-sm">Nothing in here yet.</p>
    ) : (
      <ul className="grid list-none grid-cols-1 gap-3 p-0 lg:grid-cols-2">
        {applications.map((summary) => (
          <ApplicationRow key={summary.application.applicationId} summary={summary} />
        ))}
      </ul>
    )}
  </section>
)

/**
 * One application's numbers.
 *
 * The tree store is unscoped here, which is correct and will not stay correct:
 * a deployment has one application today, so one listing is every page there
 * is. The day there are two, this reads a handle scoped to the row's
 * application — the seam is `StoreScope`, and it already exists.
 */
const summaryFor = async (
  application: ApplicationSummary["application"]
): Promise<ApplicationSummary> => {
  const listed = await portalStore.list({})
  if (!listed.ok) return { application, pages: 0, waiting: 0, unreadable: 0 }

  const perPage = await Promise.all(
    listed.value.trees.map(async (listing) => await portalHolds.forTree(listing.treeId))
  )

  return {
    application,
    pages: listed.value.trees.length,
    waiting: perPage.reduce((sum, holds) => sum + (holds.ok ? holds.value.held.length : 0), 0),
    unreadable: perPage.filter((holds) => !holds.ok).length,
  }
}

const Workspace = async () => {
  await requireActor("/portal")

  /**
   * Both reads answer within a budget, for the reason
   * `_lib/app/bounded-store.ts` gives: a store that refuses is a state this
   * screen already draws, and a store that does not answer was a screen that
   * never arrived. The budget is on the handle rather than written here, so the
   * ten screens that never had one have one too — and a timeout arrives as
   * `unavailable`, which the branch below was already able to say.
   */
  const [projects, applications] = await Promise.all([
    portalProjects.list(),
    portalApplications.list(),
  ])

  if (!projects.ok || !applications.ok) {
    /**
     * Written out rather than compressed into a ternary: the two stores have
     * different error types, and a reader of this file should be able to see
     * which sentence comes from which without resolving a conditional.
     */
    const detail = ((): string => {
      if (!projects.ok) return describeProjectStoreError(projects.error)
      if (!applications.ok) return describeApplicationStoreError(applications.error)

      return "the store could not be read"
    })()

    return (
      <Screen>
        <h1 className="text-2xl tracking-tight">{screenName("/portal")}</h1>
        <StateNotice tone="failure" title="We couldn't list what you have.">
          <p>
            Nothing has been lost and nothing has been changed — listing only reads. Try again in a
            moment.
          </p>
          <TechnicalDetail>
            <p className="font-mono">{detail}</p>
            <p>
              This is the store declining to answer, not a deployment with nothing in it. The two
              look alike on screen and are opposites.
            </p>
          </TechnicalDetail>
        </StateNotice>
      </Screen>
    )
  }

  const summaries = await Promise.all(applications.value.map(summaryFor))
  const workspace = workspaceOf(projects.value, summaries)
  const totals = workspaceTotals(workspace)

  return (
    <Screen>
      <div className="flex items-baseline justify-between gap-4 pb-6">
        <h1 className="text-2xl tracking-tight">{screenName("/portal")}</h1>
        <Link
          href="/portal/new"
          className="bg-affirm text-affirm-ink border-affirm-edge rounded-md border px-3 py-1.5 text-sm no-underline"
        >
          Register an application
        </Link>
      </div>

      <p className="text-ink-muted pb-6 text-sm">
        {totals.applications === 0
            ? "Nothing registered yet."
          : `${totals.applications} application${totals.applications === 1 ? "" : "s"}, ${totals.pages} page${totals.pages === 1 ? "" : "s"}${totals.waiting > 0 ? `, ${totals.waiting} waiting on you` : ""}.`}
      </p>

      <div className="flex flex-col gap-8">
        {workspace.groups.map((group: ProjectGroup) => (
          <Group
            key={group.project.projectId}
            name={group.project.name}
            applications={group.applications}
          />
        ))}
        {workspace.ungrouped.length > 0 ? (
          <Group name="Not in a project" applications={workspace.ungrouped} />
        ) : null}
      </div>
    </Screen>
  )
}

export default Workspace
