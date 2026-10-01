import type Anthropic from "@anthropic-ai/sdk"

import {
  CONTRACT_REPLY,
  CONTRACT_SERVED_BY,
  describeModelClientContract,
  type ModelClientContract,
} from "../testing/model-contract.js"

import { anthropicModelClient, type AnthropicMessages } from "./anthropic.js"

/**
 * The published suite, run against the one adapter this package ships.
 *
 * It overlaps `anthropic.test.ts` on purpose and the overlap is the point: a
 * suite handed to a host writing a second adapter is worth exactly what it is
 * worth against the first, and the only way to know that is to run it there.
 * What stays in `anthropic.test.ts` is everything about *this* vendor — which
 * statuses it emits, how it shapes a message, that the signal reaches the SDK.
 * What is here is what any adapter owes the runtime.
 */

const usage: Anthropic.Usage = {
  cache_creation: null,
  cache_creation_input_tokens: null,
  cache_read_input_tokens: null,
  inference_geo: null,
  input_tokens: 1200,
  output_tokens: 180,
  output_tokens_details: null,
  server_tool_use: null,
  service_tier: null,
}

const message = (overrides: Partial<Anthropic.Message>): Anthropic.Message => ({
  id: "msg_1",
  type: "message",
  role: "assistant",
  model: CONTRACT_SERVED_BY,
  container: null,
  content: [{ type: "text", text: CONTRACT_REPLY, citations: null }],
  stop_reason: "end_turn",
  stop_sequence: null,
  stop_details: null,
  usage,
  ...overrides,
})

const answering = (reply: Anthropic.Message): AnthropicMessages => ({
  create: () => Promise.resolve(reply),
})

const throwing = (cause: unknown): AnthropicMessages => ({
  create: () => Promise.reject(cause),
})

const status = (code: number): Error =>
  Object.assign(new Error(`${code} what the API said`), { status: code })

const contract: ModelClientContract = {
  answers: () => anthropicModelClient(answering(message({}))),
  "answers-without-text": () => anthropicModelClient(answering(message({ content: [] }))),
  truncates: () => anthropicModelClient(answering(message({ stop_reason: "max_tokens" }))),
  refuses: () =>
    anthropicModelClient(
      answering(message({ stop_reason: "refusal", stop_details: { type: "refusal", category: "general_harms", explanation: "declined" } }))
    ),
  "refuses-the-caller": () => anthropicModelClient(throwing(status(401))),
  "refuses-the-request": () => anthropicModelClient(throwing(status(400))),
  "asks-for-later": () => anthropicModelClient(throwing(status(429))),
  "never-answers": () => anthropicModelClient(throwing(new Error("socket hang up"))),
}

describeModelClientContract("anthropicModelClient", contract)
