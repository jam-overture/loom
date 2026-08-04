"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { treeIdSchema } from "@loom/runtime"
import { revertRevision } from "@loom/runtime/write"

import { requireActor } from "@/lib/auth/identity"
import { revertReportOf, type WriteReport } from "@/lib/outcome"
import { seedFor } from "@/lib/seeds"
import { beginWrite } from "@/lib/write"

/**
 * Undoing a revision.
 *
 * Thin for the same reason the other actions are: `revertRevision` decides
 * everything, including whether the log allows it and whether the Gate agrees,
 * and nothing here touches the store. The actor comes from the session rather
 * than the form (0027); the revision comes from the form, because that is the
 * client saying which entry it was looking at.
 */

const undoInputSchema = z.object({
  treeId: treeIdSchema,
  revision: z.coerce.number().int().positive(),
})

const refused = (headline: string, detail: string): WriteReport => ({
  tone: "inapplicable",
  headline,
  detail,
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
    return refused(
      "not sent",
      parsed.error.issues[0]?.message ?? "the form was not something the server could read"
    )
  }

  const { treeId, revision } = parsed.data

  /**
   * 0032 inherited 0028's condition: an inverse is a function of the state its
   * delta observed, so undoing means replaying from a seed. A tree this host
   * cannot reproduce is one it cannot undo, and saying so is the honest answer.
   */
  const seed = seedFor(treeId)
  if (seed === undefined) {
    return refused(
      "cannot undo",
      "This host has no seed for that tree, so its log cannot be replayed to the point the change was made."
    )
  }

  const actor = await requireActor(`/history?tree=${treeId}`)
  const write = beginWrite()

  const outcome = await revertRevision(write.path, {
    treeId,
    revision,
    seed,
    origin: "user-instruction",
    actor,
  })

  await write.finish()

  /**
   * A refusal has to stay on screen long enough to be read, so only a commit
   * revalidates *this* page — the same rule `confirmProposal` follows, and for
   * the same reason: re-rendering would take the row away and the reason with
   * it.
   *
   * The tree's page is revalidated for a hold as well, because a held undo puts
   * a card in its review queue (0035) and that queue is where the reviewer is
   * being sent.
   */
  if (outcome.kind === "committed") revalidatePath("/history")
  if (outcome.kind === "committed" || outcome.kind === "held") {
    revalidatePath(`/trees/${treeId}`)
  }

  return revertReportOf(outcome)
}
