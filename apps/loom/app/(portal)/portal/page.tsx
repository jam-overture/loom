import Link from "next/link"

import { Screen } from "@/app/(portal)/_components/screen"
import { portalMemberships } from "@/app/(portal)/_lib/auth/account-store"
import { actorSchema } from "@/app/(portal)/_lib/auth/accounts"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { portalApplications, portalProjects } from "@/app/(portal)/_lib/store"
import { mayAdminister } from "@/app/(portal)/_lib/auth/roles"
import { workspaceFor, type ProjectGroup } from "@/app/(portal)/_lib/workspace"

import { ClosingControls } from "./_components/closing-controls"

/**
 * The workspace: the projects you hold a role in, and what is in them.
 *
 * ## What changed, and why it is the whole of unit 3
 *
 * This screen showed **every project and every application in the deployment**
 * until now, to anybody who could sign in, because there was no other answer to
 * give: the roster was a list of reviewers and a reviewer was not a thing a
 * project could belong to. [0285](../../../../decisions/0285-an-account-is-a-row-with-a-minted-key-and-a-role-is-a-ceiling-on-the-gates-own-scale.md)
 * made an account a row and a role something held in a project, so *your*
 * projects is now a question with an answer, and this is it.
 *
 * The layout is the prototype's — cards in a grid, the name, the id, what is
 * inside — because that is the shape the maintainer asked to see. What it is
 * not is the prototype's *data*: every number the prototype shows is invented,
 * and the rule the whole demolition turned on was that no screen ships numbers
 * nobody produced.
 *
 * ## The figures the prototype has and this does not
 *
 * The prototype's cards carry four: pages, signals in 24h, errors in 24h, and
 * what is waiting. None of them is here, and each is absent for its own reason
 * rather than from one blanket caution.
 *
 * **Pages and waiting** are countable — `workspace.ts` shapes them — and
 * counting them means a tree store handle per application, because a handle
 * speaks for exactly one application (0220's scoping, which 0260 keeps). That
 * is a read per card on the screen a person lands on first, and it belongs
 * behind the same measurement unit 5 does for arrival rather than being
 * assembled here one request at a time.
 *
 * **Signals and errors in 24h** are not countable at all today, and saying so
 * is more useful than a plausible zero. The durable counters hold totals per
 * revision, not per window — `loom_reader_tallies` has no time dimension — and
 * the one table that does, the raw buffer, is short-lived by design (0146) and
 * is emptied by every rollup. A *last 24 hours* figure needs something that
 * keeps a window, and nothing does.
 *
 * So the card says what is true: the project, who you are in it, and the
 * applications under it with the ids and hosts they really carry — and the way
 * to its two screens: *Signals*, what has arrived, which a closed project keeps;
 * and, while it is open, *Connect your site*.
 *
 * ## Closed projects are below, not hidden
 *
 * Closing is what this portal has instead of deleting
 * ([0289](../../../../decisions/0289-a-project-is-closed-rather-than-deleted-and-closing-is-a-column-and-a-filter.md)),
 * and a closed project is still yours — so it sits in its own section after the
 * open ones rather than behind a toggle somebody has to know about. Hiding it
 * entirely would make *closed* indistinguishable from *gone* on the one screen
 * where the difference is the whole point.
 */

const RoleBadge = ({ role }: { role: ProjectGroup["role"] }) => (
  <span className="border-edge text-ink-muted rounded border px-1.5 py-0.5 text-[10px] tracking-wide uppercase">
    {role}
  </span>
)

const ProjectCard = ({ group, closed }: { group: ProjectGroup; closed?: boolean }) => (
  <li>
    <div
      className={`border-edge-subtle bg-surface-base flex flex-col gap-3 rounded-lg border p-4 ${closed === true ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium tracking-tight">{group.project.name}</span>
          <span className="text-ink-muted font-mono text-[11px]">{group.project.projectId}</span>
        </div>
        <RoleBadge role={group.role} />
      </div>

      {group.applications.length === 0 ? (
        <p className="text-ink-muted border-edge-subtle border-t pt-3 text-sm">
          No applications in it yet.{" "}
          <Link href="/portal/new" className="text-ink underline">
            Register one
          </Link>
          .
        </p>
      ) : (
        <ul className="border-edge-subtle flex list-none flex-col gap-2 border-t p-0 pt-3">
          {group.applications.map(({ application }) => (
            <li key={application.applicationId} className="flex flex-col gap-0.5">
              <span className="text-sm">{application.name}</span>
              <span className="text-ink-muted font-mono text-[11px]">
                {application.applicationId}
              </span>
              {application.host !== undefined && (
                <span className="text-ink-muted text-[11px]">{application.host}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {group.applications.length > 0 && (
        <div className="border-edge-subtle flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-sm">
          <Link
            href={`/portal/${group.project.projectId}/signals`}
            className="text-ink no-underline hover:underline"
          >
            Signals →
          </Link>
          {closed !== true && (
            <Link
              href={`/portal/${group.project.projectId}/connect`}
              className="text-ink no-underline hover:underline"
            >
              Connect your site →
            </Link>
          )}
        </div>
      )}

      {mayAdminister(group.role) && (
        <div className="border-edge-subtle border-t pt-3">
          <ClosingControls
            projectId={group.project.projectId}
            name={group.project.name}
            closedAt={group.project.closedAt}
          />
        </div>
      )}
    </div>
  </li>
)

const PortalWorkspace = async () => {
  const actor = await requireActor("/portal")

  const [held, projects, applications] = await Promise.all([
    portalMemberships.projectsOf(actorSchema.parse(actor)),
    /**
     * Everything, because this screen draws the closed ones too — in their own
     * section below (0289). The default is open-only, which is what every
     * other caller means.
     */
    portalProjects.list({ closed: "all" }),
    portalApplications.list({ closed: "all" }),
  ])

  /**
   * A store that cannot answer is said out loud rather than drawn as an empty
   * workspace. *You are in no projects* and *the database is unreachable* are
   * different facts and a reader acts differently on each — and the second one
   * drawn as the first is a person concluding their work is gone.
   */
  const unreadable = !held.ok || !projects.ok || !applications.ok

  /**
   * Everything, open and closed, and separated here rather than by two reads.
   * Two listings would be two round trips and a window between them in which a
   * project could close and appear in neither.
   */
  const summaries = (applications.ok ? applications.value : []).map((application) => ({
    application,
    pages: 0,
    waiting: 0,
    unreadable: 0,
  }))

  const workspace = workspaceFor(
    held.ok ? held.value : [],
    projects.ok ? projects.value : [],
    summaries
  )

  const open = workspace.groups.filter((group) => group.project.closedAt === undefined)
  const closed = workspace.groups.filter((group) => group.project.closedAt !== undefined)

  return (
    <Screen>
      <div className="flex items-center justify-between pb-5">
        <h1 className="text-xl tracking-tight">Projects</h1>
        <Link
          href="/portal/new"
          className="bg-affirm text-affirm-ink border-affirm-edge rounded-md border px-3 py-1.5 text-sm no-underline"
        >
          New project
        </Link>
      </div>

      {unreadable ? (
        <p className="border-edge text-ink-muted rounded-md border border-dashed p-6 text-sm">
          The store did not answer. Nothing here is a statement about what you have.
        </p>
      ) : workspace.groups.length === 0 ? (
        <p className="border-edge text-ink-muted rounded-md border border-dashed p-6 text-sm">
          You are not in any projects yet.{" "}
          <Link href="/portal/new" className="text-ink underline">
            Register an application
          </Link>{" "}
          and the project it makes is yours.
        </p>
      ) : (
        <ul className="grid list-none grid-cols-1 gap-3 p-0 lg:grid-cols-2">
          {open.map((group) => (
            <ProjectCard key={group.project.projectId} group={group} />
          ))}
        </ul>
      )}

      {closed.length > 0 && (
        <section className="flex flex-col gap-3 pt-8">
          <div className="flex flex-col gap-1">
            <h2 className="text-ink-muted text-sm tracking-tight">Closed</h2>
            <p className="text-ink-muted max-w-lg text-xs">
              Closed projects keep everything they held — their pages, their history and what their
              readers did. Nothing was deleted, and reopening one brings it back.
            </p>
          </div>
          <ul className="grid list-none grid-cols-1 gap-3 p-0 lg:grid-cols-2">
            {closed.map((group) => (
              <ProjectCard key={group.project.projectId} group={group} closed />
            ))}
          </ul>
        </section>
      )}

      <div className="border-edge flex flex-col gap-2 border-t pt-6 text-sm">
        <Link href="/portal/sign-ins" className="text-ink no-underline hover:underline">
          Who has signed in
        </Link>
        <Link href="/portal/preview" className="text-ink-muted no-underline hover:underline">
          The workspace being built — every number on it is invented
        </Link>
      </div>
    </Screen>
  )
}

export default PortalWorkspace
