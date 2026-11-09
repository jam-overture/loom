import { projectIdSchema, type ProjectId } from "@jam-overture/loom/store"

import { actorSchema, type Actor } from "./auth/accounts"
import type { Role } from "./auth/roles"

/** What guarding a read of one project needs, given rather than imported so the guard is tested as written. */
export type MemberSources = {
  readonly currentActor: () => Promise<string | null>
  readonly roleOf: (actor: Actor, projectId: ProjectId) => Promise<Role | null | undefined>
}

/** Never kept by a browser or a cache: what the chrome asks for is only worth what it says now. */
const FRESH = { "Cache-Control": "no-store" } as const

/**
 * The answer to a question the chrome asks about one project, for its members
 * only: the rail's count of what waits, the top bar's name of the project.
 *
 * Guarded as a screen is: a signed-in member of the project, or `nothing`. One
 * answer for *not yours* and *no such project*, as everywhere else, so this is
 * not a way to ask which ids exist; and a store that cannot say what somebody
 * may see is `nothing`, never an answer for somebody it could not check.
 */
export const answerMember =
  <Body>(sources: MemberSources, nothing: Body, read: (projectId: ProjectId) => Promise<Body>) =>
  async (project: string): Promise<Response> => {
    const refuse = (status: number): Response =>
      Response.json(nothing, { status, headers: FRESH })

    const actor = await sources.currentActor()

    if (actor === null) return refuse(401)

    const asked = projectIdSchema.safeParse(project)
    const member = actorSchema.safeParse(actor)

    if (!asked.success || !member.success) return refuse(404)

    const role = await sources.roleOf(member.data, asked.data)

    if (role === null) return refuse(404)
    if (role === undefined) return refuse(503)

    return Response.json(await read(asked.data), { headers: FRESH })
  }
