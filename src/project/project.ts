/**
 * The thing a deployment holds many of, and the thing an application registers
 * as.
 *
 * A deployment used to be one registry, one policy source and one store wired
 * at a composition root, with no identifier anywhere for the thing that owned
 * them — there had only ever been one per process (0220). A project is that
 * identifier, and every tree, revision, hold and signal now sits inside one
 * (0260). A tree id is unique within its project and says nothing about any
 * other.
 */

import { z } from "zod"

import { idPattern } from "../grammar.js"

/*
 * `prj` and not `p`: every other id in `ids.ts` wears a single letter and `p`
 * is the proposal's. The grammar takes any prefix, and a project id is the one
 * identifier here that a person reads off a screen and pastes into their own
 * configuration — so it is spelled rather than initialled, like the hosts that
 * do the same job.
 */
export const projectIdSchema = z
  .string()
  .regex(idPattern("prj"))
  .brand<"ProjectId">()

export type ProjectId = z.infer<typeof projectIdSchema>

/**
 * The project every row written before projects existed belongs to.
 *
 * Nothing is migrated by guessing (0260). The rows that exist belong to the
 * deployment that wrote them, so they go into one project named for it rather
 * than into a distribution somebody invented. It is also what a store
 * built without a project uses, which is what keeps every existing caller —
 * the demo, the documentation's worked examples, the eight thousand tests —
 * meaning exactly what it meant before.
 *
 * **It is not a null.** Every read filters on it and every write sets it, so
 * it is a project like any other; what makes it the default is only that it is
 * the one a caller gets by saying nothing.
 */
export const DEFAULT_PROJECT_ID: ProjectId = projectIdSchema.parse("prj_default")

/**
 * What a deployment knows about one of its projects.
 *
 * Deliberately thin. The registry, the policy and the ingest credential are
 * each their own concern with their own store — this is the row that says the
 * project exists and what a person calls it, and nothing that another module
 * already owns.
 */
export const projectSchema = z
  .object({
    projectId: projectIdSchema,
    /** What a person calls it. Not unique, not an identifier, and editable. */
    name: z.string().min(1).max(200),
    createdAt: z.string().datetime(),
    /**
     * Where the application lives, when it has said so. Used to tell a reader
     * which project they are looking at, and — once ingest authenticates — to
     * decide which origins may post to it.
     */
    host: z.string().min(1).max(253).optional(),
  })
  .strict()

export type Project = z.infer<typeof projectSchema>

/**
 * The project a store handle speaks for.
 *
 * A handle is scoped at construction rather than every method taking a
 * project, which is the cheaper of the two shapes that were priced (0220):
 * it leaves every signature in `@jam-overture/loom/store` alone, and
 * it makes *spanning two projects* unexpressible rather than merely forbidden.
 * A caller that wants two holds two handles.
 */
export type StoreScope = {
  readonly project?: ProjectId
}
