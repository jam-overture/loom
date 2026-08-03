"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { treeIdSchema } from "@loom/runtime"
import { describeRevertRefusal, revertRevision } from "@loom/runtime/write"

import { requireActor } from "@/lib/auth/identity"
import { reportOf, type WriteReport } from "@/lib/outcome"
import { seedFor } from "@/lib/seeds"
import { beginWrite } from "@/lib/write"

/**
 * Undoing the latest revision.
 *
 * Thin for the same reason the other actions are: `revertRevision` decides
 * everything, including whether the Gate will allow it, and nothing here reaches
 * the store. The actor comes from the session rather than the form (0027), and
 * the revision comes from the form because that is the client saying which entry
 * it was looking at — which is what lets the server refuse an undo aimed at a
 * tree that has moved since the page rendered.
 */

const undoInputSchema = z.object({
  treeId: treeIdSchema,
  revision: z.coerce.number().int().positive(),
})

export const undoRevision = async (
  _previous: WriteReport | null,
  form: FormData
): Promise<WriteReport> => {
  const parsed = undoInputSchema.safeParse({
    treeId: form.get("treeId"),
    revision: form.get("revision"),
  })

  if (!parsed.success) {
    return {
      tone: "inapplicable",
      headline: "not sent",
      detail: parsed.error.issues[0]?.message ?? "the form was not something the server could read",
    }
  }

  const { treeId, revision } = parsed.data

  /**
   * 0032: an inverse is a function of the state its delta observed, so undoing
   * means replaying from a seed. A tree this host cannot reproduce is one it
   * cannot undo, and saying so is the honest answer.
   */
  const seed = seedFor(treeId)
  if (seed === undefined) {
    return {
      tone: "inapplicable",
      headline: "cannot undo",
      detail: "This host has no seed for that tree, so its log cannot be replayed to the point the change was made.",
    }
  }

  const actor = await requireActor(`/history?tree=${treeId}`)
  const write = beginWrite()
  const outcome = await revertRevision(write.path, { treeId, revision, actor }, seed)

  await write.finish()

  if (outcome.kind === "not-revertible") {
    return { tone: "inapplicable", headline: "cannot undo", detail: describeRevertRefusal(outcome.refusal) }
  }

  if (outcome.kind === "committed") {
    revalidatePath(`/history`)
    revalidatePath(`/trees/${treeId}`)
  }

  return reportOf(outcome)
}
