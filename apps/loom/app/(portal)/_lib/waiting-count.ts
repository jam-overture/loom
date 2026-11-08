import { z } from "zod"

import { projectIdSchema, type ProjectId } from "@jam-overture/loom/store"

import { actorSchema, type Actor } from "./auth/accounts"
import type { Role } from "./auth/roles"

/**
 * What the rail is told about the changes waiting for a person in a project:
 * how many, or `null` where they could not be read, so the rail never says
 * nought for a list it could not read.
 */
export const waitingCountSchema = z.object({
  waiting: z.number().int().nonnegative().nullable(),
})

export type WaitingCount = z.infer<typeof waitingCountSchema>

/** The body the rail's read answers with. */
export const waitingCountBody = (waiting: number | undefined): WaitingCount => ({
  waiting: waiting ?? null,
})

/**
 * The count out of whatever came back, or `undefined` for anything that is not
 * an answer: a sign-in page a lapsed session was sent to, a refusal, a body
 * from a deployment that answers in another shape.
 */
export const waitingCountOf = (body: unknown): number | undefined => {
  const parsed = waitingCountSchema.safeParse(body)

  return parsed.success ? (parsed.data.waiting ?? undefined) : undefined
}

/** What answering the rail reads, given rather than imported so the guard is tested as written. */
export type WaitingCountSources = {
  readonly currentActor: () => Promise<string | null>
  readonly roleOf: (actor: Actor, projectId: ProjectId) => Promise<Role | null | undefined>
  readonly readWaitingCount: (projectId: ProjectId) => Promise<number | undefined>
}

/** Never kept by a browser or a cache: the count is only worth what it says now. */
const FRESH = { "Cache-Control": "no-store" } as const

const noCount = (status: number): Response =>
  Response.json(waitingCountBody(undefined), { status, headers: FRESH })

/**
 * The answer to the rail's question, how many changes wait in this project.
 *
 * Guarded as a screen is: a signed-in member of the project, or nothing. One
 * answer for *not yours* and *no such project*, as everywhere else, so this is
 * not a way to ask which ids exist; and a store that cannot say what somebody
 * may see is no count, never a count for somebody it could not check.
 */
export const answerWaitingCount =
  (sources: WaitingCountSources) =>
  async (project: string): Promise<Response> => {
    const actor = await sources.currentActor()

    if (actor === null) return noCount(401)

    const asked = projectIdSchema.safeParse(project)
    const member = actorSchema.safeParse(actor)

    if (!asked.success || !member.success) return noCount(404)

    const role = await sources.roleOf(member.data, asked.data)

    if (role === null) return noCount(404)
    if (role === undefined) return noCount(503)

    return Response.json(waitingCountBody(await sources.readWaitingCount(asked.data)), {
      headers: FRESH,
    })
  }
