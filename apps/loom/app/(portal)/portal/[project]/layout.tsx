import { projectIdSchema } from "@jam-overture/loom/store"

import { ProjectRail } from "./_components/project-rail"

/**
 * The frame every screen of one project shares: the rail between the
 * project's screens beside it (`docs/portal-wireframes.md`, *The chrome*).
 * The way back to the projects is the top bar's breadcrumb, above every screen.
 *
 * **It reads nothing.** A layout is not re-run when a person moves between
 * the screens it wraps, and it runs beside the page rather than after the
 * page's `requireActor`, so a layout that read the project would be a read
 * nobody had checked the reader for. The name is each screen's own, under
 * its own guard; this draws only what the address already says. The one
 * thing the rail says that the address does not, what waits for review, it
 * asks for itself, under a guard of its own.
 *
 * An address that names no project draws no frame, and the screen inside it
 * answers *not found* on its own.
 */
const ProjectLayout = async ({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ project: string }>
}) => {
  const asked = projectIdSchema.safeParse((await params).project)

  if (!asked.success) return children

  return (
    <div className="flex w-full flex-col md:flex-row">
      <aside className="border-edge-subtle flex shrink-0 flex-col border-b px-8 pt-6 pb-3 md:sticky md:top-14 md:h-[calc(100vh-3.5rem)] md:w-56 md:overflow-y-auto md:border-r md:border-b-0 md:px-3">
        <ProjectRail projectId={asked.data} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  )
}

export default ProjectLayout
