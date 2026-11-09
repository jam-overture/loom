import { z } from "zod"

import { projectIdSchema, type ProjectId } from "@jam-overture/loom/store"

import { answerMember, type MemberSources } from "./member-answer"

/**
 * What the top bar is told about the project in the address: its name, or
 * `null` where it could not be read, so the breadcrumb falls back to the id
 * the address already says rather than to a name nobody read.
 */
export const projectNameSchema = z.object({
  name: z.string().min(1).nullable(),
})

export type ProjectName = z.infer<typeof projectNameSchema>

/** The body the top bar's read answers with. */
export const projectNameBody = (name: string | undefined): ProjectName => ({ name: name ?? null })

/**
 * The name out of whatever came back, or `undefined` for anything that is not
 * an answer: a sign-in page a lapsed session was sent to, a refusal, a body
 * from a deployment that answers in another shape.
 */
export const projectNameOf = (body: unknown): string | undefined => {
  const parsed = projectNameSchema.safeParse(body)

  return parsed.success ? (parsed.data.name ?? undefined) : undefined
}

/** What answering the top bar reads, given rather than imported so the guard is tested as written. */
export type ProjectNameSources = MemberSources & {
  readonly readProjectName: (projectId: ProjectId) => Promise<string | undefined>
}

/** The answer to the top bar's question, what this project is called, for its members only. */
export const answerProjectName = (sources: ProjectNameSources) =>
  answerMember(sources, projectNameBody(undefined), async (projectId) =>
    projectNameBody(await sources.readProjectName(projectId))
  )

/**
 * Where the top bar asks a project's name, read on every move because the top
 * bar is drawn once for the whole portal and a rename on *Settings* should show
 * on the next screen.
 */
export const projectNameHref = (projectId: ProjectId): string => `/portal/${projectId}/name`

/**
 * The project an address is inside, or `undefined` for one that is not a
 * project's: the projects themselves, the preview, signing in.
 */
export const projectInAddress = (pathname: string | null): ProjectId | undefined => {
  const [, portal, project] = (pathname ?? "").split("/")

  if (portal !== "portal" || project === undefined) return undefined

  const asked = projectIdSchema.safeParse(project)

  return asked.success ? asked.data : undefined
}
