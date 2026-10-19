/**
 * The grouping a person puts their applications into.
 *
 * Three levels, settled by the maintainer on 12 October: an **account** holds
 * **projects**, and a project holds **applications**. The application is the
 * unit everything is stored and governed under — it owns the pages, the
 * signals, the policy and the credentials — and this is the folder it sits in.
 *
 * **It is organisational and nothing else, deliberately.** A project owns no
 * policy, no members and no credentials today; those were named as later work
 * and are not anticipated here, because a level that owns nothing is cheap to
 * carry and a level that owns the wrong things is expensive to correct. What it
 * has is an identity and a name, which is the whole of what grouping needs.
 *
 * Nothing scoped by an application is also scoped by a project, for the same
 * reason: the project is reachable from the application, so storing it twice
 * would be two places to disagree. When a project does own something — policy
 * inherited by its applications is the likeliest — the edge to travel is
 * `Application.projectId`, which already exists.
 */

import { z } from "zod"

import { idPattern } from "../grammar.js"
import { randomIdBody } from "../ids.js"

/*
 * `prj`, which is the prefix an application id wore until 12 October. It moves
 * here rather than being retired because it always meant *the thing with a name
 * that a person organises by*, and that is what a project is now. The ids that
 * were minted under it belong to applications and are migrated to `app_`;
 * nothing holds both meanings at once.
 */
export const projectIdSchema = z.string().regex(idPattern("prj")).brand<"ProjectId">()

export type ProjectId = z.infer<typeof projectIdSchema>

/** A new project's id, minted when somebody makes one. Random, as an application's is. */
export const newProjectId = (): ProjectId => projectIdSchema.parse(`prj_${randomIdBody()}`)

/**
 * The project every application written before projects existed belongs to.
 *
 * Nothing is migrated by guessing (0260, and its successor). The applications
 * that exist belong to the deployment that wrote them, so they go into one
 * project named for it rather than into a distribution somebody invented.
 */
export const DEFAULT_PROJECT_ID: ProjectId = projectIdSchema.parse("prj_default")

/**
 * What a deployment knows about one of its projects, which is as little as a
 * grouping can be and still be one.
 */
export const projectSchema = z
  .object({
    projectId: projectIdSchema,
    /** What a person calls it. Not unique, not an identifier, and editable. */
    name: z.string().min(1).max(200),
    createdAt: z.string().datetime(),
    /**
     * The repository this project's pages live in, or absent (0292).
     *
     * **At most one, and a repository belongs to at most one project**, which
     * is what makes the write-back expressible: the first one is a pull
     * request against the customer's repository (0275), and a pull request has
     * exactly one destination. The uniqueness is the store's to
     * enforce, because two projects claiming one repository is a race rather
     * than a typo.
     *
     * Absent is the ordinary first state and stays legal: a project that keeps
     * its tree in a working copy or in its own database has no repository, and
     * being connected for observation alone needs none at all (0275).
     *
     * Spelled `owner/name`. Not a URL, because the forge is not in the value —
     * a URL would make `github.com/a/b` and `https://github.com/a/b/` two
     * repositories, and the uniqueness above is only as good as the spelling.
     * What understands it is the write-back adapter, which does not exist yet.
     */
    repository: z
      .string()
      .regex(/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/)
      .max(140)
      .optional(),
    /**
     * When it was closed, or absent while it is open (0289).
     *
     * Closing is what this store has instead of deleting: a project's rows are
     * its applications' trees, revisions, holds and policy history, and a
     * delete would either orphan them or cascade through the governance record
     * Loom exists to keep.
     *
     * **An instant rather than a flag**, because *when* is the question anybody
     * asks about a closed project — did this stop before or after the thing I
     * am looking at — and a boolean cannot answer it for the same storage.
     */
    closedAt: z.string().datetime().optional(),
  })
  .strict()

export type Project = z.infer<typeof projectSchema>
