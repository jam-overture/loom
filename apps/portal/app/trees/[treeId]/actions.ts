"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { nodeIdSchema, proposalIdSchema, randomIdFactory, systemClock, treeIdSchema } from "@loom/runtime"
import { commitIntent, confirmHeld, describeHoldError, discardHeld } from "@loom/runtime/write"

import { reportOf, type WriteReport } from "@/lib/outcome"
import { portalWritePath } from "@/lib/write"

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

const invalid = (issue: string): WriteReport => ({
  tone: "inapplicable",
  headline: "not sent",
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

  const outcome = await commitIntent(portalWritePath, {
    intentId: randomIdFactory.intentId(),
    treeId,
    baseRevision,
    /** A sentence someone typed, so the model interpreted it — 0017's own words. */
    origin: "user-instruction",
    utterance,
    ...(scopeNodeId ? { scopeNodeId } : {}),
    observedAt: systemClock.now(),
  })

  revalidatePath(`/trees/${treeId}`)

  return reportOf(outcome)
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

  const outcome = await confirmHeld(portalWritePath, parsed.data.proposalId)

  /**
   * Only a commit re-renders the page. An answer the Gate refused on its second
   * look, or one whose tree moved underneath it, has to stay on screen long
   * enough to be read — revalidating would take the card away and the reason
   * with it, leaving a reviewer who clicked "apply" with nothing but a
   * disappearing row.
   */
  if (outcome.kind === "committed") revalidatePath(`/trees/${parsed.data.treeId}`)

  return reportOf(outcome)
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

  const discarded = await discardHeld(portalWritePath, parsed.data.proposalId)

  revalidatePath(`/trees/${parsed.data.treeId}`)

  return discarded.ok
    ? { tone: "rejected", headline: "discarded", detail: "The proposal was not applied." }
    : { tone: "inapplicable", headline: "nothing to answer", detail: describeHoldError(discarded.error) }
}
