import type { Application, ProjectId } from "@jam-overture/loom/store"

/**
 * The one application a project holds, which is what its key names (0296
 * clause 4), or `undefined` when it holds any other number.
 *
 * None is a project whose registration stopped part-way, which registration
 * reports rather than repairing. More than one is a project written
 * before 0296, and which of its applications a key should name is a question
 * for a person rather than for the order a listing came back in, which is the
 * answer `pnpm signals:key` gives the same question.
 */
export const soleApplicationOf = (
  applications: readonly Application[],
  projectId: ProjectId
): Application | undefined => {
  const inside = applications.filter((application) => application.projectId === projectId)

  return inside.length === 1 ? inside[0] : undefined
}
