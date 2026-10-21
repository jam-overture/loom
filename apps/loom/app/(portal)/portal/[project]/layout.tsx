import Link from "next/link"

import { projectIdSchema } from "@jam-overture/loom/store"

import { screenName } from "@/app/(portal)/_lib/screen-names"

import { ProjectTabs } from "./_components/project-tabs"

/**
 * The frame every screen of one project shares: the way back to the
 * workspace, and the tabs between the project's screens.
 *
 * **It reads nothing.** A layout is not re-run when a person moves between
 * the screens it wraps, and it runs beside the page rather than after the
 * page's `requireActor`, so a layout that read the project would be a read
 * nobody had checked the reader for. The name is each screen's own, under
 * its own guard; this draws only what the address already says.
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
    <div className="flex w-full flex-col">
      <div className="flex w-full max-w-[90rem] flex-col gap-3 px-8 pt-6">
        <Link href="/portal" className="text-ink-muted text-sm no-underline hover:underline">
          ← {screenName("/portal")}
        </Link>
        <ProjectTabs projectId={asked.data} />
      </div>
      {children}
    </div>
  )
}

export default ProjectLayout
