"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { proposalIdSchema, randomIdFactory, systemClock } from "@loom/runtime"
import { commitIntent, confirmHeld, discardHeld, describeHoldError, revertRevision } from "@loom/runtime/write"

import { demoModelInterpreter } from "@/lib/demo/interpreter"
import { presetById, presetInterpreter } from "@/lib/demo/presets"
import { recordFromEvents } from "@/lib/demo/record"
import {
  beginDemoWrite,
  demoSession,
  newDemoSessionId,
  recordAwaiting,
  rememberRecord,
  spendModelCall,
} from "@/lib/demo/session"
import { DEMO_ACTOR, readVisitorId, rememberVisitorId } from "@/lib/demo/visitor"
import { reportOf, revertReportOf, type WriteReport } from "@/lib/outcome"

/**
 * The server side of the demo.
 *
 * The same three verbs the portal has, over the same write path (0017), against
 * a store that lives as long as the visit. Nothing here decides anything about a
 * change: `commitIntent` owns that, and this validates its inputs, chooses which
 * interpreter answers, and remembers what the runtime narrated so the page can
 * show it.
 *
 * A visitor is anonymous, so the actor is a constant rather than a form field.
 * That is the same rule the portal follows for the opposite reason: who is
 * asking is never something the client gets to assert.
 */

const askSchema = z
  .object({
    baseRevision: z.coerce.number().int().nonnegative(),
    presetId: z.string().optional(),
    utterance: z.string().trim().max(400).optional(),
  })
  .refine((input) => (input.presetId ?? "") !== "" || (input.utterance ?? "") !== "", {
    message: "Say what you want changed, or pick one of the suggestions.",
  })

const answerSchema = z.object({ proposalId: proposalIdSchema })

const revertSchema = z.object({ revision: z.coerce.number().int().positive() })

const invalid = (issue: string): WriteReport => ({
  tone: "inapplicable",
  headline: "not sent",
  detail: issue,
})

const firstIssue = (error: z.ZodError): string =>
  error.issues[0]?.message ?? "the form was not something the server could read"

/**
 * The visitor's session, minting an id when this browser has never asked for
 * anything before. Every action goes through here, so the cookie is set exactly
 * once and only ever by a request that is about to change something.
 */
const currentSession = async () => {
  const existing = await readVisitorId()
  if (existing) return demoSession(existing)

  const minted = newDemoSessionId()
  await rememberVisitorId(minted)

  return demoSession(minted)
}

export const askForChange = async (
  _previous: WriteReport | null,
  form: FormData
): Promise<WriteReport> => {
  const parsed = askSchema.safeParse({
    baseRevision: form.get("baseRevision"),
    presetId: form.get("presetId") ?? undefined,
    utterance: form.get("utterance") ?? undefined,
  })

  if (!parsed.success) return invalid(firstIssue(parsed.error))

  const session = await currentSession()
  const preset = parsed.data.presetId ? presetById(parsed.data.presetId) : undefined

  if (parsed.data.presetId && !preset) return invalid("that is not one of the suggestions")

  /**
   * Free text needs a model, and a model on a public page needs a budget. Both
   * refusals are reported the same way a refused change is, because from the
   * visitor's side "there is no model here" and "you have had your share of it"
   * are both answers rather than errors.
   */
  if (!preset && !demoModelInterpreter) {
    return invalid("no model is configured on this deployment — the suggestions below still work")
  }

  if (!preset && !spendModelCall(session, Date.now())) {
    return invalid("this demo's model allowance is spent for the moment — the suggestions still work")
  }

  const interpreter = preset
    ? presetInterpreter(preset, randomIdFactory, systemClock)
    : /** Checked above; narrowing here rather than asserting it away. */
      demoModelInterpreter

  if (!interpreter) return invalid("no model is configured on this deployment")

  const write = beginDemoWrite(session, interpreter)

  const outcome = await commitIntent(write.path, {
    intentId: randomIdFactory.intentId(),
    treeId: session.seed.treeId,
    baseRevision: parsed.data.baseRevision,
    origin: "user-instruction",
    actor: DEMO_ACTOR,
    utterance: preset ? preset.utterance : (parsed.data.utterance ?? ""),
    observedAt: systemClock.now(),
  })

  const record = recordFromEvents(write.narrated())
  if (record) rememberRecord(session, record)

  revalidatePath("/demo")

  return reportOf(outcome)
}

export const answerHeld = async (
  _previous: WriteReport | null,
  form: FormData
): Promise<WriteReport> => {
  const parsed = answerSchema.safeParse({ proposalId: form.get("proposalId") })
  if (!parsed.success) return invalid(firstIssue(parsed.error))

  const session = await currentSession()
  const write = beginDemoWrite(session)
  const confirming = form.get("answer") === "apply"

  /**
   * The record this answer completes. An answer narrates no intent — there is
   * nothing left to interpret — so the events are folded onto the card that was
   * waiting rather than becoming a second card about the same ask.
   */
  const waiting = recordAwaiting(session, parsed.data.proposalId)

  if (!confirming) {
    const discarded = await discardHeld(write.path, {
      proposalId: parsed.data.proposalId,
      actor: DEMO_ACTOR,
    })

    const refused = recordFromEvents(write.narrated(), waiting)
    if (refused) rememberRecord(session, refused)

    revalidatePath("/demo")

    return discarded.ok
      ? { tone: "rejected", headline: "discarded", detail: "The proposal was not applied." }
      : { tone: "inapplicable", headline: "nothing to answer", detail: describeHoldError(discarded.error) }
  }

  const outcome = await confirmHeld(write.path, {
    proposalId: parsed.data.proposalId,
    actor: DEMO_ACTOR,
  })

  /**
   * The confirmation is the Gate's second look, so it narrates a fresh
   * assessment and a fresh disposition. Folding those onto the record replaces
   * the hold with what actually became of it, rather than leaving a card that
   * still says it is waiting on someone.
   */
  const record = recordFromEvents(write.narrated(), waiting)
  if (record) rememberRecord(session, record)

  revalidatePath("/demo")

  return reportOf(outcome)
}

export const undoRevision = async (
  _previous: WriteReport | null,
  form: FormData
): Promise<WriteReport> => {
  const parsed = revertSchema.safeParse({ revision: form.get("revision") })
  if (!parsed.success) return invalid(firstIssue(parsed.error))

  const session = await currentSession()
  const write = beginDemoWrite(session)

  const outcome = await revertRevision(write.path, {
    treeId: session.seed.treeId,
    revision: parsed.data.revision,
    /** Replayed from the shape this instance built, so the undo is planned from
     * the log rather than from the snapshot it is trying to change (0028). */
    seed: session.seed,
    origin: "user-instruction",
    actor: DEMO_ACTOR,
  })

  const record = recordFromEvents(write.narrated())
  if (record) rememberRecord(session, record)

  revalidatePath("/demo")

  return revertReportOf(outcome)
}
