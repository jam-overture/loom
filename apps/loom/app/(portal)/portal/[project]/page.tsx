import { notFound, redirect } from "next/navigation"

import { projectIdSchema } from "@jam-overture/loom/store"

import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { projectHome } from "@/app/(portal)/_lib/project-tabs"

/**
 * A project's own address, which is the one a person types or bookmarks, and
 * which forwards to the screen a project opens on rather than being a screen
 * of its own. Signed in first, so the address survives the trip through
 * sign-in; whether the visitor may see the project is the screen's question.
 */
const ProjectPage = async ({ params }: { params: Promise<{ project: string }> }) => {
  const asked = projectIdSchema.safeParse((await params).project)

  if (!asked.success) notFound()

  await requireActor(`/portal/${asked.data}`)

  redirect(projectHome(asked.data))
}

export default ProjectPage
