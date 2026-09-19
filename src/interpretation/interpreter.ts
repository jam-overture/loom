import { ceilingOf, describeCeiling, withCeiling } from "../deadline.js"
import type { IdFactory } from "../ids.js"
import { assertNever, err, ok, type Result } from "../result.js"
import type { Clock } from "../runtime/events.js"
import type { EditIntent } from "../runtime/intent.js"
import type {
  ChangeInterpreter,
  ChangeRepairer,
  InterpretationError,
  RepairRequest,
} from "../runtime/interpreter.js"
import type { ProposedChange } from "../runtime/proposal.js"
import { parseDelta, type TreeDelta } from "../tree/delta.js"
import type { LoomTree } from "../tree/tree.js"

import type { ModelClient, ModelClientError, ModelCompletion, ModelEffort } from "./client.js"
import { interpretationReplySchema, type InterpretationReply } from "./draft.js"
import { materializeDelta } from "./materialize.js"
import {
  buildRepairMessage,
  buildUserMessage,
  hashPrompt,
  INTERPRETER_SYSTEM_PROMPT,
  type PromptVocabularies,
} from "./prompt.js"
import { DEFAULT_DRAFT_DEPTH, interpretationReplyJsonSchema } from "./schema.js"

/**
 * A ChangeInterpreter backed by a model.
 *
 * Every step except the call itself is pure: assemble the prompt, hand it to
 * the client seam, parse what comes back, project it onto a TreeDelta. The
 * distinction the pipeline depends on is preserved here — a reply this module
 * cannot make sense of is an `InterpretationError`, never a proposal the Gate
 * gets to refuse, and never a thrown exception.
 *
 * The delta is authored against the revision the *intent* named, not the tree
 * as it stands now. An intent raised against a tree that has since moved on
 * therefore produces a proposal that fails to apply, which the pipeline reports
 * as `not-applicable` — rather than being quietly re-targeted at a tree the
 * asker never saw.
 */

export const DEFAULT_INTERPRETER_MODEL = "claude-opus-5"
export const DEFAULT_MAX_TOKENS = 16000
export const DEFAULT_EFFORT: ModelEffort = "high"

/**
 * Three minutes, which is long enough that no interpretation this repository has
 * measured comes near it and short enough that a request nobody is ever going to
 * answer is reported while somebody is still looking at the screen.
 *
 * It is a default rather than a constant because the right number is a property
 * of the deployment: a portal with a reader waiting wants less, a batch job
 * rewriting a hundred pages can afford more. What is not a property of the
 * deployment is whether to have one (0140).
 */
export const DEFAULT_INTERPRETER_CEILING_MS = 180_000

/**
 * Everything wired once per deployment: how to reach a model, and what to tell
 * it about this deployment. The second half is `PromptVocabularies`, composed
 * rather than restated so that a vocabulary added there reaches a host's wiring
 * and the prompt in the same change (0172).
 */
export type ModelInterpreterConfig = PromptVocabularies & {
  readonly client: ModelClient
  readonly idFactory: IdFactory
  readonly clock: Clock
  readonly model?: string
  readonly maxTokens?: number
  readonly effort?: ModelEffort
  /**
   * How long to wait for a reply before reporting that there was not one.
   * Defaults to `DEFAULT_INTERPRETER_CEILING_MS`; there is no way to wait
   * forever, deliberately (0140).
   */
  readonly ceilingMs?: number
  readonly draftDepth?: number
}

const fromClientError = (error: ModelClientError): InterpretationError => {
  switch (error.code) {
    case "unavailable":
      return { code: "interpreter-unavailable", detail: error.detail }
    case "rejected":
      return { code: "interpreter-request-rejected", detail: error.detail }
    case "misconfigured":
      return { code: "interpreter-misconfigured", detail: error.detail }
    case "refused":
      return { code: "refused", detail: `model declined to answer: ${error.detail}` }
    case "incomplete":
      return { code: "malformed-proposal", detail: `reply was cut off: ${error.detail}` }
    default:
      return assertNever(error, "fromClientError")
  }
}

const parseReply = (text: string): Result<InterpretationReply, InterpretationError> => {
  const decoded = ((): Result<unknown, InterpretationError> => {
    try {
      return ok(JSON.parse(text) as unknown)
    } catch {
      return err({ code: "malformed-proposal", detail: "reply was not valid JSON" })
    }
  })()

  if (!decoded.ok) return decoded

  const validated = interpretationReplySchema.safeParse(decoded.value)
  if (!validated.success) {
    const [issue] = validated.error.issues

    return err({
      code: "malformed-proposal",
      detail: issue ? `${issue.path.join(".") || "reply"}: ${issue.message}` : "reply did not match the schema",
    })
  }

  return ok(validated.data)
}

const buildDelta = (
  reply: Extract<InterpretationReply, { outcome: "change" }>,
  intent: EditIntent,
  config: ModelInterpreterConfig
): Result<TreeDelta, InterpretationError> => {
  const materialized = materializeDelta(reply.operations, {
    treeId: intent.treeId,
    baseRevision: intent.baseRevision,
    deltaId: config.idFactory.deltaId(),
    idFactory: config.idFactory,
  })

  if (!materialized.ok) {
    return err({ code: "malformed-proposal", detail: materialized.error })
  }

  const parsed = parseDelta(materialized.value)

  return parsed.ok
    ? ok(parsed.value)
    : err({ code: "malformed-proposal", detail: `${parsed.error.code}: ${JSON.stringify(parsed.error)}` })
}

/**
 * The one call path. Interpreting an utterance and revising a refused proposal
 * differ only in the user message, so they share everything else — the same
 * system prompt (which keeps the cacheable prefix identical), the same output
 * schema, the same parsing, and the same rules about what a bad answer means.
 */
const propose = async (
  config: ModelInterpreterConfig,
  intent: EditIntent,
  userMessage: string
): Promise<Result<ProposedChange, InterpretationError>> => {
  const ceiling = ceilingOf(config.ceilingMs, DEFAULT_INTERPRETER_CEILING_MS)

  /**
   * The ceiling is enforced here rather than in the Anthropic adapter, because
   * the seam's promise is to a caller of the interpreter and not to a vendor: a
   * host that brings its own `ModelClient` gets the same bound without having
   * written one (0140).
   */
  const completion = await withCeiling(
    ceiling,
    (): Result<ModelCompletion, ModelClientError> =>
      err({ code: "unavailable", detail: `no reply in ${describeCeiling(ceiling)}` }),
    (signal) =>
      config.client.complete(
        {
          model: config.model ?? DEFAULT_INTERPRETER_MODEL,
          maxTokens: config.maxTokens ?? DEFAULT_MAX_TOKENS,
          effort: config.effort ?? DEFAULT_EFFORT,
          system: INTERPRETER_SYSTEM_PROMPT,
          userMessage,
          outputSchema: interpretationReplyJsonSchema(config.draftDepth ?? DEFAULT_DRAFT_DEPTH),
        },
        { signal }
      )
  )

  if (!completion.ok) return err(fromClientError(completion.error))

  const reply = parseReply(completion.value.text)
  if (!reply.ok) return reply

  if (reply.value.outcome === "no-change") {
    return err({ code: "no-change-needed", detail: reply.value.rationale })
  }

  if (reply.value.outcome === "not-understood") {
    return err({ code: "not-understood", detail: reply.value.rationale })
  }

  const delta = buildDelta(reply.value, intent, config)
  if (!delta.ok) return delta

  return ok({
    proposalId: config.idFactory.proposalId(),
    intentId: intent.intentId,
    delta: delta.value,
    rationale: reply.value.rationale,
    provenance: {
      origin: intent.origin,
      /** Copied from the ask, never inferred from the reply: the model does not name who asked. */
      ...(intent.actor === undefined ? {} : { actor: intent.actor }),
      interpreter: completion.value.servedBy,
      authoredBy: "model",
      promptHash: await hashPrompt(INTERPRETER_SYSTEM_PROMPT, userMessage),
      confidence: reply.value.confidence,
      interpretedAt: config.clock.now(),
    },
  })
}

/**
 * Implements both seams. Whether a deployment actually repairs is decided by
 * whether this object is also wired in as the runtime's `repairer` — the
 * capability is offered here, but never assumed.
 */
export const modelInterpreter = (
  config: ModelInterpreterConfig
): ChangeInterpreter & ChangeRepairer => ({
  interpret: (intent: EditIntent, tree: LoomTree) =>
    propose(config, intent, buildUserMessage(intent, tree, config)),

  repair: (request: RepairRequest, tree: LoomTree) =>
    propose(config, request.intent, buildRepairMessage(request, tree, config)),
})
