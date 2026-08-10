import type Anthropic from "@anthropic-ai/sdk"

import { err, ok, type Result } from "../result.js"

import type { ModelClient, ModelClientError, ModelCompletion, ModelRequest } from "./client.js"

/**
 * The Anthropic adapter: the one module in Loom that knows a specific vendor
 * exists. It is not exported from the package root — a host that brings its own
 * model never loads it, and the SDK stays an optional peer dependency.
 *
 * Its whole job is translation. It makes no decisions about prompts, schemas,
 * retries, or what a bad answer means; those belong to the interpreter, which
 * is why they are testable without this file.
 */

/**
 * Structurally satisfied by an `Anthropic` instance, so production passes the
 * real client and tests pass a stub, without either needing the other.
 */
export type AnthropicMessages = {
  readonly create: (
    params: Anthropic.MessageCreateParamsNonStreaming
  ) => Promise<Anthropic.Message>
}

const firstTextBlock = (message: Anthropic.Message): string | undefined =>
  message.content.find((block): block is Anthropic.TextBlock => block.type === "text")?.text

const errorDetail = (cause: unknown): string =>
  cause instanceof Error ? cause.message : "unknown transport failure"

/**
 * Read structurally rather than with `instanceof`, for the same reason this
 * module takes `AnthropicMessages` rather than an `Anthropic`: the SDK is an
 * optional peer, and a stub in a test throws whatever it likes.
 */
const statusOf = (cause: unknown): number | undefined => {
  if (typeof cause !== "object" || cause === null) return undefined

  const { status } = cause as { readonly status?: unknown }

  return typeof status === "number" ? status : undefined
}

/**
 * Which of the three "could not answer" codes a thrown error is.
 *
 * Only a status we positively recognise as this side's fault becomes `rejected`
 * or `misconfigured`; everything else — including a transport failure that
 * never got a response — stays `unavailable`. Guessing wrong in that direction
 * costs a retry that fails, where guessing wrong the other way tells a host to
 * stop trying something that would have worked.
 *
 * 408, 409 and 429 are the 4xx statuses that mean "later", and the SDK has
 * already retried them twice by the time one reaches here, so a 429 that
 * escapes is a rate limit that outlasted the client's own backoff.
 */
const classifyThrown = (status: number | undefined): "unavailable" | "rejected" | "misconfigured" => {
  if (status === undefined) return "unavailable"
  if (status === 401 || status === 402 || status === 403) return "misconfigured"

  const asksAgainLater = status === 408 || status === 409 || status === 429

  return status >= 400 && status < 500 && !asksAgainLater ? "rejected" : "unavailable"
}

const toCompletion = (
  message: Anthropic.Message
): Result<ModelCompletion, ModelClientError> => {
  if (message.stop_reason === "refusal") {
    return err({ code: "refused", detail: message.stop_details?.category ?? "unspecified" })
  }

  if (message.stop_reason === "max_tokens") {
    return err({ code: "incomplete", detail: "hit the output token ceiling" })
  }

  const text = firstTextBlock(message)
  if (text === undefined) {
    return err({ code: "incomplete", detail: "reply contained no text block" })
  }

  return ok({ text, servedBy: message.model })
}

export const anthropicModelClient = (messages: AnthropicMessages): ModelClient => ({
  complete: async (request: ModelRequest) => {
    try {
      const message = await messages.create({
        model: request.model,
        max_tokens: request.maxTokens,
        system: request.system,
        output_config: {
          effort: request.effort,
          format: { type: "json_schema", schema: request.outputSchema },
        },
        messages: [{ role: "user", content: request.userMessage }],
      })

      return toCompletion(message)
    } catch (cause) {
      return err({ code: classifyThrown(statusOf(cause)), detail: errorDetail(cause) })
    }
  },
})
