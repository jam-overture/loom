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
      return err({ code: "unavailable", detail: errorDetail(cause) })
    }
  },
})
