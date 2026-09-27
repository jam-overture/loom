"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { proposalIdSchema, randomIdFactory, systemClock } from "@jam-overture/loom"
import { commitIntent, confirmHeld, discardHeld, describeHoldError, revertRevision } from "@jam-overture/loom/write"

import { demoModelInterpreter } from "@/app/(demo)/_lib/interpreter"
import { settingsOf } from "@/app/(demo)/_lib/plain-change"
import { askedWith, presetById, presetInterpreter } from "@/app/(demo)/_lib/presets"
import { recordFromEvents, type AssessedAgainst } from "@/app/(demo)/_lib/record"
import { demoRegistry } from "@/app/(demo)/_lib/registry"
import {
  beginDemoWrite,
  demoSession,
  newDemoSessionId,
  recordAwaiting,
  rememberRecord,
  spendModelCall,
  type DemoSession,
} from "@/app/(demo)/_lib/session"
import { undoOf } from "@/app/(demo)/_lib/undo"
import { DEMO_ACTOR, DEMO_PATH, readVisitorId, rememberVisitorId } from "@/app/(demo)/_lib/visitor"
import {
  invalidReport,
  reportOf,
  revertReportOf,
  stateReport,
  type WriteReport,
} from "@/app/(demo)/_lib/report"

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

/** The plain half and the technical half, both from `_lib/report`. */
const invalid = invalidReport

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

/**
 * Which props are a closed choice rather than words on the page.
 *
 * Read once per module rather than per write: it is a fact about the registry,
 * and the registry does not change between two asks.
 */
const DEMO_SETTINGS = settingsOf(demoRegistry)

/**
 * The tree this write is about to change, read before it changes.
 *
 * **This is the only moment it exists.** A change's plain reading — the sentence
 * saying what it does in the words on the page — resolves the delta against the
 * tree it was planned against, and one line below this that tree is a revision
 * behind. So the record's copy is computed at assessment (`record.ts`), and this
 * is the one caller that can honestly say what to compute it against.
 *
 * `undefined` when the head cannot be read, and that is the whole error
 * handling: the reading is an addition to the card, not a precondition for the
 * write. A failed read costs one sentence on one card. Refusing the ask because
 * a sentence could not be composed would cost the visitor the demo.
 *
 * **The asks already made travel with it, and they are read here rather than
 * later for the same reason the tree is.** Whether a change puts the last one
 * back is a fact about this session at the moment of the press: read it after
 * the write and the record being written is already in the list, comparing
 * itself against itself.
 */
const assessedAgainst = async (
  session: DemoSession,
  restoring = false
): Promise<AssessedAgainst | undefined> => {
  const head = await session.store.head(session.seed.treeId)

  return head.ok
    ? {
        before: head.value,
        settings: DEMO_SETTINGS,
        earlier: session.records,
        ...(restoring ? { restoring } : {}),
      }
    : undefined
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

  /* Read before the write, because after it the tree the delta describes is gone. */
  const against = await assessedAgainst(session)

  const outcome = await commitIntent(write.path, {
    intentId: randomIdFactory.intentId(),
    treeId: session.seed.treeId,
    baseRevision: parsed.data.baseRevision,
    origin: "user-instruction",
    actor: DEMO_ACTOR,
    utterance: preset ? preset.utterance : (parsed.data.utterance ?? ""),
    observedAt: systemClock.now(),
  })

  const record = recordFromEvents(write.narrated(), undefined, against)

  /**
   * Which button was pressed, kept on the record because nothing downstream can
   * recover it: the runtime was handed the preset's utterance and nothing to say
   * a button produced it. It is what an ask the page has moved past needs to be
   * able to offer itself again (`_lib/moved.ts`).
   */
  if (record) rememberRecord(session, preset ? askedWith(record, preset.id) : record)

  revalidatePath(DEMO_PATH)

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

    revalidatePath(DEMO_PATH)

    /*
     * The words come off the shared table like every other state's, rather than
     * being written here. `discardHeld` reports only whether it worked, so this
     * is the one place the surface picks the state itself — which is exactly
     * where a second, drifting copy of "You said no" would appear.
     *
     * The declined answer is folded onto the card that was waiting, so it is
     * recorded and the panel need not repeat it. An answer that was already
     * given narrated nothing to fold, so it has to be said here or nowhere.
     */
    return discarded.ok
      ? stateReport("declined", "The proposal was not applied.", refused !== undefined)
      : stateReport("already-answered", describeHoldError(discarded.error), false)
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

  revalidatePath(DEMO_PATH)

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

  /*
   * `restoring`, because this is the one call site that knows. An undo's
   * operations are ordinary inserts and removes (0032), so the delta cannot say
   * which way it is going — and a sentence reading "This went onto the page"
   * over three figures the visitor watched come *back* is the demo's own payoff,
   * narrated as an arrival.
   */
  const against = await assessedAgainst(session, true)

  const outcome = await revertRevision(write.path, {
    treeId: session.seed.treeId,
    revision: parsed.data.revision,
    /** Replayed from the shape this instance built, so the undo is planned from
     * the log rather than from the snapshot it is trying to change (0028). */
    seed: session.seed,
    origin: "user-instruction",
    actor: DEMO_ACTOR,
  })

  /**
   * Stamped with the revision it is undoing, which is knowledge this call has
   * and the events do not carry in a readable form. It is what lets the applied
   * card know whether its undo is still to be had, still waiting, or already
   * spent — none of which the card can see from its own press.
   */
  const record = recordFromEvents(write.narrated(), undefined, against)
  if (record) rememberRecord(session, undoOf(record, parsed.data.revision))

  revalidatePath(DEMO_PATH)

  return revertReportOf(outcome)
}
