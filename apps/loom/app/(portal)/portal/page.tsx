import Link from "next/link"

import { Screen } from "@/app/(portal)/_components/screen"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { portalApplications, portalProjects } from "@/app/(portal)/_lib/store"

/**
 * The front door: what this deployment actually has, read out of the store.
 *
 * ## It was a redirect for one day, and that was a mistake
 *
 * Unit 0 deleted the screen that stood here and left `redirect("/portal/preview")`
 * in its place, reasoning that the front door should be the shape being built
 * rather than a smaller version of what was removed. The maintainer signed in
 * the next morning and landed in the prototype:
 *
 * > *"I noticed that the link in the marketing page is just to the preview. I
 * > would like to still sign in to see the progress of the actual portal."*
 *
 * He is right, and the error is worth naming because it is the same one the
 * whole cut was against. **A redirect into invented data is still invented data
 * at the address a person typed.** The rule was *no screen ships numbers nobody
 * produced*; forwarding to a screen that does satisfies the letter of it and
 * none of the point. What a person who signs in is owed is the truth about
 * their own deployment, however small that truth currently is.
 *
 * ## What it shows, and what it deliberately does not
 *
 * Every project and every application in the store, grouped, with the id and the
 * host each one really carries. That is the whole of what this portal knows
 * today, and saying so plainly is the honest version of *progress*.
 *
 * **There are no counts on this screen** — not pages, not what is waiting — and
 * their absence is the design rather than a gap to fill in later.
 * `workspace.ts` already shapes a summary that carries all three, and it is not
 * used here, because a tree store handle speaks for exactly one application
 * (0220's scoping, which 0260 keeps) and counting per application means a handle
 * per application. Unit 1 gives the rows their project dimension and unit 3
 * gives this screen the counts off it. A number assembled before then would be
 * a number about the whole deployment wearing one application's name, which is
 * the precise failure 0260 clause 1 exists to prevent.
 *
 * **The prototype is linked, and labelled.** It is where the portal is going and
 * a person should be able to look at it; the link says it runs on invented data
 * so that looking at it is never mistaken for reading this deployment.
 */
const PortalFrontDoor = async () => {
  await requireActor("/portal")

  const [projects, applications] = await Promise.all([
    portalProjects.list(),
    portalApplications.list(),
  ])

  /**
   * A store that cannot answer is said out loud rather than drawn as an empty
   * deployment. *Nothing is registered* and *the database is unreachable* are
   * different facts and a reader acts differently on each.
   */
  const unreadable = !projects.ok || !applications.ok
  const everyProject = projects.ok ? projects.value : []
  const everyApplication = applications.ok ? applications.value : []

  const grouped = everyProject.map((project) => ({
    project,
    applications: everyApplication.filter(
      (application) => application.projectId === project.projectId
    ),
  }))

  const known = new Set(everyProject.map((project) => project.projectId))
  const orphaned = everyApplication.filter((application) => !known.has(application.projectId))

  return (
    <Screen>
      <div className="flex flex-col gap-2 pb-2">
        <h1 className="text-2xl tracking-tight">This deployment</h1>
        <p className="text-ink-muted max-w-lg text-sm">
          Everything Loom is holding for you, as it stands.
        </p>
      </div>

      {unreadable ? (
        <p className="border-edge text-ink-muted rounded-md border border-dashed p-6 text-sm">
          The store did not answer. Nothing here is a statement about what is registered.
        </p>
      ) : grouped.length === 0 && orphaned.length === 0 ? (
        <p className="border-edge text-ink-muted rounded-md border border-dashed p-6 text-sm">
          Nothing is registered yet.{" "}
          <Link href="/portal/new" className="text-ink underline">
            Register an application
          </Link>{" "}
          to start.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map(({ project, applications: inProject }) => (
            <section key={project.projectId} className="flex flex-col gap-2">
              <div className="flex items-baseline gap-3">
                <h2 className="text-lg tracking-tight">{project.name}</h2>
                <span className="text-ink-muted font-mono text-xs">{project.projectId}</span>
              </div>
              {inProject.length === 0 ? (
                <p className="text-ink-muted text-sm">No applications under it yet.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {inProject.map((application) => (
                    <li
                      key={application.applicationId}
                      className="border-edge flex flex-col gap-0.5 rounded-md border p-4"
                    >
                      <span className="text-sm">{application.name}</span>
                      <span className="text-ink-muted font-mono text-xs">
                        {application.applicationId}
                      </span>
                      {application.host !== undefined && (
                        <span className="text-ink-muted text-xs">{application.host}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {orphaned.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-lg tracking-tight">Under no project</h2>
              <ul className="flex flex-col gap-2">
                {orphaned.map((application) => (
                  <li
                    key={application.applicationId}
                    className="border-edge flex flex-col gap-0.5 rounded-md border p-4"
                  >
                    <span className="text-sm">{application.name}</span>
                    <span className="text-ink-muted font-mono text-xs">
                      {application.applicationId}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <div className="border-edge flex flex-col gap-2 border-t pt-6 text-sm">
        <Link href="/portal/new" className="text-ink no-underline hover:underline">
          Register an application
        </Link>
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

export default PortalFrontDoor
