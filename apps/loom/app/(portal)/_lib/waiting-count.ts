import { z } from "zod"

import type { ProjectId } from "@jam-overture/loom/store"

import { answerMember, type MemberSources } from "./member-answer"

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
export type WaitingCountSources = MemberSources & {
  readonly readWaitingCount: (projectId: ProjectId) => Promise<number | undefined>
}

/** The answer to the rail's question, how many changes wait in this project, for its members only. */
export const answerWaitingCount = (sources: WaitingCountSources) =>
  answerMember(sources, waitingCountBody(undefined), async (projectId) =>
    waitingCountBody(await sources.readWaitingCount(projectId))
  )
