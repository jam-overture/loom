import { z } from "zod"

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
