import type { IdFactory } from "../ids.js"
import { assertNever, err, ok, type Result } from "../result.js"
import type { Clock } from "../runtime/events.js"
import type { EditIntent } from "../runtime/intent.js"
import type { ChangeInterpreter, InterpretationError } from "../runtime/interpreter.js"
import type { ProposedChange } from "../runtime/proposal.js"
import { parseDelta, type TreeDelta } from "../tree/delta.js"
import type { LoomTree } from "../tree/tree.js"

import type { ModelClient, ModelClientError, ModelEffort } from "./client.js"
import { interpretationReplySchema, type InterpretationReply } from "./draft.js"
import { materializeDelta } from "./materialize.js"
import { buildUserMessage, hashPrompt, INTERPRETER_SYSTEM_PROMPT } from "./prompt.js"
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

export type ModelInterpreterConfig = {
  readonly client: ModelClient
  readonly idFactory: IdFactory
  readonly clock: Clock
  readonly model?: string
  readonly maxTokens?: number
  readonly effort?: ModelEffort
  readonly draftDepth?: number
}

const fromClientError = (error: ModelClientError): InterpretationError => {
  switch (error.code) {
    case "unavailable":
      return { code: "interpreter-unavailable", detail: error.detail }
    case "refused":
      return { code: "interpreter-unavailable", detail: `model declined to answer: ${error.detail}` }
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

export const modelInterpreter = (config: ModelInterpreterConfig): ChangeInterpreter => ({
  interpret: async (
    intent: EditIntent,
    tree: LoomTree
  ): Promise<Result<ProposedChange, InterpretationError>> => {
    const userMessage = buildUserMessage(intent, tree)

    const completion = await config.client.complete({
      model: config.model ?? DEFAULT_INTERPRETER_MODEL,
      maxTokens: config.maxTokens ?? DEFAULT_MAX_TOKENS,
      effort: config.effort ?? DEFAULT_EFFORT,
      system: INTERPRETER_SYSTEM_PROMPT,
      userMessage,
      outputSchema: interpretationReplyJsonSchema(config.draftDepth ?? DEFAULT_DRAFT_DEPTH),
    })

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
        interpreter: completion.value.servedBy,
        promptHash: await hashPrompt(INTERPRETER_SYSTEM_PROMPT, userMessage),
        confidence: reply.value.confidence,
        interpretedAt: config.clock.now(),
      },
    })
  },
})
