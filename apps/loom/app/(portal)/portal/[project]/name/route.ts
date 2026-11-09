import type { ProjectId } from "@jam-overture/loom/store"

import { currentActor, roleOf } from "@/app/(portal)/_lib/auth/identity"
import { answerProjectName } from "@/app/(portal)/_lib/project-name"
import { portalProjects } from "@/app/(portal)/_lib/store"

export const dynamic = "force-dynamic"

const readProjectName = async (projectId: ProjectId): Promise<string | undefined> => {
  const project = await portalProjects.get(projectId)

  return project.ok ? project.value.name : undefined
}

const answer = answerProjectName({ currentActor, roleOf, readProjectName })

/**
 * What one project is called, for the breadcrumb in the top bar
 * (`docs/portal-wireframes.md`, *The chrome*), guarded as `answerMember` says.
 *
 * **Why a read of its own.** The top bar is drawn once for the whole portal,
 * above every route, so it never sees the project a screen is about; and a
 * layout that read it would be a read nobody had checked the reader for
 * (`portal/[project]/layout.tsx`).
 */
export const GET = async (
  _request: Request,
  { params }: { readonly params: Promise<{ project: string }> }
): Promise<Response> => answer((await params).project)
