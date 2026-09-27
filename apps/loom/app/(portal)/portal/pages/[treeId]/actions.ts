"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { nodeIdSchema, proposalIdSchema, randomIdFactory, systemClock, treeIdSchema } from "@jam-overture/loom"
import { commitIntent, confirmHeld, describeHoldError, discardHeld } from "@jam-overture/loom/write"

import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { reportOf, type WriteReport } from "@/app/(portal)/_lib/outcome"
import { beginWrite } from "@/app/(portal)/_lib/write"

/**
 * The server side of every change this portal makes.
 *
 * A server action is a route handler with a nicer call site, so the same rule
 * applies: validate at the boundary, then hand off. Nothing here decides
 * anything about the change — `commitIntent` owns that — and nothing here
 * touches the store, because 0017's single write path is only single if the
 * portal keeps it that way.
 *
 * The form asserts which revision it was looking at. That is not client
 * authority: it is the client saying what it saw, so the server can refuse a
 * write aimed at a tree that has moved.
 *
 * The actor is the opposite: it is never in the form at all. It comes from the
 * session, server-side, in every one of these three (0027) — a form field
 * naming who is asking is a form field anyone can edit.
 */

const proposeInputSchema = z.object({
  treeId: treeIdSchema,
  baseRevision: z.coerce.number().int().nonnegative(),
  utterance: z.string().trim().min(1, "Say what you want changed."),
  scopeNodeId: z.union([nodeIdSchema, z.literal("")]).optional(),
})

const answerInputSchema = z.object({
  treeId: treeIdSchema,
  proposalId: proposalIdSchema,
})

/**
 * The form did not arrive in a shape the server could read, so nothing was
 * asked of the runtime at all. The plain half says that; the issue itself is
 * the technical half, because a Zod message is written for whoever wrote the
 * form rather than for whoever filled it in.
 */
const invalid = (issue: string): WriteReport => ({
  tone: "inapplicable",
  headline: "Nothing was sent",
  meaning: "That didn't reach Loom, so nothing on the page has changed.",
  detail: issue,
})

const firstIssue = (error: z.ZodError): string =>
  error.issues[0]?.message ?? "the form was not something the server could read"

export const proposeChange = async (
  _previous: WriteReport | null,
  form: FormData
): Promise<WriteReport> => {
  const parsed = proposeInputSchema.safeParse({
    treeId: form.get("treeId"),
    baseRevision: form.get("baseRevision"),
    utterance: form.get("utterance"),
    scopeNodeId: form.get("scopeNodeId") ?? undefined,
  })

  if (!parsed.success) return invalid(firstIssue(parsed.error))

  const { treeId, baseRevision, utterance, scopeNodeId } = parsed.data

  const actor = await requireActor(`/portal/pages/${treeId}`)
  const write = beginWrite()

  const outcome = await commitIntent(write.path, {
    intentId: randomIdFactory.intentId(),
    treeId,
    baseRevision,
    /** A sentence someone typed, so the model interpreted it — 0017's own words. */
    origin: "user-instruction",
    actor,
    utterance,
    ...(scopeNodeId ? { scopeNodeId } : {}),
    observedAt: systemClock.now(),
  })

  await write.finish()

  revalidatePath(`/portal/pages/${treeId}`)

  /*
   * The Gate's reasoning travels with the verdict, from the write that made it.
   * `weighedAgainst` is handed over rather than read here, because which proposal
   * to ask about depends on how the write ended and `reportOf` is the module that
   * knows — see its note. A refusal that reached a repairer weighed two
   * proposals, and the one a person is being told about is the one that was
   * refused.
   */
  return reportOf(outcome, write.weighedAgainst)
}

export const confirmProposal = async (
  _previous: WriteReport | null,
  form: FormData
): Promise<WriteReport> => {
  const parsed = answerInputSchema.safeParse({
    treeId: form.get("treeId"),
    proposalId: form.get("proposalId"),
  })

  if (!parsed.success) return invalid(firstIssue(parsed.error))

  const actor = await requireActor(`/portal/pages/${parsed.data.treeId}`)
  const write = beginWrite()
  const outcome = await confirmHeld(write.path, { proposalId: parsed.data.proposalId, actor })

  await write.finish()

  /**
   * Only a commit re-renders the page. An answer the Gate refused on its second
   * look, or one whose tree moved underneath it, has to stay on screen long
   * enough to be read — revalidating would take the card away and the reason
   * with it, leaving a reviewer who clicked "apply" with nothing but a
   * disappearing row.
   */
  if (outcome.kind === "committed") revalidatePath(`/portal/pages/${parsed.data.treeId}`)

  /*
   * Handed over for the same reason, and it answers less here than above. A
   * confirmation is re-judged (0021), so a second judgement of the same proposal
   * happens in this request and is the one reported. What no write of this shape
   * can recover is the judgement that put the proposal in the queue in the first
   * place: that was a different request, and the card in the queue is where it is
   * read.
   */
  return reportOf(outcome, write.weighedAgainst)
}

export const discardProposal = async (
  _previous: WriteReport | null,
  form: FormData
): Promise<WriteReport> => {
  const parsed = answerInputSchema.safeParse({
    treeId: form.get("treeId"),
    proposalId: form.get("proposalId"),
  })

  if (!parsed.success) return invalid(firstIssue(parsed.error))

  const actor = await requireActor(`/portal/pages/${parsed.data.treeId}`)
  const write = beginWrite()
  const discarded = await discardHeld(write.path, { proposalId: parsed.data.proposalId, actor })

  await write.finish()

  revalidatePath(`/portal/pages/${parsed.data.treeId}`)

  return discarded.ok
    ? {
        tone: "rejected",
        headline: "You said no",
        meaning: "The change was turned down. The page was left as it was.",
        detail: "The proposal was not applied.",
      }
    : {
        tone: "inapplicable",
        headline: "Already answered",
        meaning: "Somebody has answered this one. There is nothing left to decide.",
        detail: describeHoldError(discarded.error),
      }
}
