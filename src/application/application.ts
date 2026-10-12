/**
 * The thing a customer registers with Loom, and the unit everything is stored
 * and governed under.
 *
 * A deployment used to be one registry, one policy source and one store wired
 * at a composition root, with no identifier anywhere for the thing that owned
 * them — there had only ever been one per process (0220). An application is
 * that identifier, and every tree, revision, hold and signal sits inside one. A
 * tree id is unique within its application and says nothing about any other.
 *
 * It is the third of three levels: an **account** holds **projects**, and a
 * project holds **applications** (0269). The level above this one is a grouping
 * and owns nothing yet, which is why nothing here defers to it but the
 * `projectId` an application carries.
 */

import { z } from "zod"

import { idPattern } from "../grammar.js"
import { projectIdSchema } from "../project/project.js"

/*
 * `app` and not `a`: every other id in `ids.ts` wears a single letter, and an
 * application id is the one identifier here that a person reads off a screen
 * and pastes into their own configuration — so it is spelled rather than
 * initialled, like the hosts that do the same job. It carried `prj` until the
 * hierarchy was settled on 12 October, when *project* turned out to name the
 * grouping above this rather than this.
 */
export const applicationIdSchema = z
  .string()
  .regex(idPattern("app"))
  .brand<"ApplicationId">()

export type ApplicationId = z.infer<typeof applicationIdSchema>

/**
 * The application every row written before applications existed belongs to.
 *
 * Nothing is migrated by guessing (0260). The rows that exist belong to the
 * deployment that wrote them, so they go into one application named for it rather
 * than into a distribution somebody invented. It is also what a store
 * built without an application uses, which is what keeps every existing caller —
 * the demo, the documentation's worked examples, the eight thousand tests —
 * meaning exactly what it meant before.
 *
 * **It is not a null.** Every read filters on it and every write sets it, so
 * it is an application like any other; what makes it the default is only that it is
 * the one a caller gets by saying nothing.
 */
export const DEFAULT_APPLICATION_ID: ApplicationId = applicationIdSchema.parse("app_default")

/**
 * What a deployment knows about one of its applications.
 *
 * Deliberately thin. The registry, the policy and the ingest credential are
 * each their own concern with their own store — this is the row that says the
 * application exists and what a person calls it, and nothing that another module
 * already owns.
 */
export const applicationSchema = z
  .object({
    applicationId: applicationIdSchema,
    /**
     * The project it is grouped under, which every application has exactly one
     * of. The grouping is organisational and nothing else yet — a project owns
     * no policy and no members, so nothing reads this but a screen deciding
     * which heading to put the application under. When it does own something,
     * this is the edge that inheritance travels along.
     */
    projectId: projectIdSchema,
    /** What a person calls it. Not unique, not an identifier, and editable. */
    name: z.string().min(1).max(200),
    createdAt: z.string().datetime(),
    /**
     * Where the application lives, when it has said so. Used to tell a reader
     * which application they are looking at, and — once ingest authenticates — to
     * decide which origins may post to it.
     */
    host: z.string().min(1).max(253).optional(),
  })
  .strict()

export type Application = z.infer<typeof applicationSchema>

/**
 * The application a store handle speaks for.
 *
 * A handle is scoped at construction rather than every method taking a
 * application, which is the cheaper of the two shapes that were priced (0220):
 * it leaves every signature in `@jam-overture/loom/store` alone, and
 * it makes *spanning two applications* unexpressible rather than merely forbidden.
 * A caller that wants two holds two handles.
 */
export type StoreScope = {
  readonly application?: ApplicationId
}
