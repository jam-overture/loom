import type Anthropic from "@anthropic-ai/sdk"
import { describe, expect, it } from "vitest"

import { INSERT_NOTE_REPLY } from "../testing/model-replies.js"

import { anthropicModelClient, type AnthropicMessages } from "./anthropic.js"
import type { ModelRequest } from "./client.js"
import { interpretationReplyJsonSchema } from "./schema.js"

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
  model: "claude-opus-5",
  container: null,
  content: [{ type: "text", text: INSERT_NOTE_REPLY, citations: null }],
  stop_reason: "end_turn",
  stop_sequence: null,
  stop_details: null,
  usage,
  ...overrides,
})

const request: ModelRequest = {
  model: "claude-opus-5",
  maxTokens: 16000,
  effort: "high",
  system: "you translate requests into edits",
  userMessage: "add a footer note",
  outputSchema: interpretationReplyJsonSchema(),
}

const stub = (
  reply: Anthropic.Message | Error
): AnthropicMessages & { readonly calls: Anthropic.MessageCreateParamsNonStreaming[] } => {
  const calls: Anthropic.MessageCreateParamsNonStreaming[] = []

  return {
    calls,
    create: (params) => {
      calls.push(params)

      return reply instanceof Error ? Promise.reject(reply) : Promise.resolve(reply)
    },
  }
}

describe("anthropicModelClient", () => {
  it("asks for the schema-constrained reply on a single user turn", async () => {
    const messages = stub(message({}))
    await anthropicModelClient(messages).complete(request)

    const [params] = messages.calls
    expect(params?.model).toBe("claude-opus-5")
    expect(params?.max_tokens).toBe(16000)
    expect(params?.system).toBe(request.system)
    expect(params?.output_config).toEqual({
      effort: "high",
      format: { type: "json_schema", schema: request.outputSchema },
    })
    expect(params?.messages).toEqual([{ role: "user", content: "add a footer note" }])
  })

  it("returns the reply text and the model that actually served it", async () => {
    const completion = await anthropicModelClient(stub(message({ model: "claude-opus-4-8" }))).complete(
      request
    )

    expect(completion.ok && completion.value.text).toBe(INSERT_NOTE_REPLY)
    expect(completion.ok && completion.value.servedBy).toBe("claude-opus-4-8")
  })

  it("reports a declined request as refused, carrying the category", async () => {
    const declined = message({
      stop_reason: "refusal",
      stop_details: { type: "refusal", category: "cyber", explanation: null },
      content: [],
    })

    const completion = await anthropicModelClient(stub(declined)).complete(request)

    expect(completion.ok).toBe(false)
    expect(completion.ok ? "" : completion.error).toEqual({ code: "refused", detail: "cyber" })
  })

  it("reports a reply cut off by the token ceiling as incomplete", async () => {
    const completion = await anthropicModelClient(stub(message({ stop_reason: "max_tokens" }))).complete(
      request
    )

    expect(completion.ok ? "" : completion.error.code).toBe("incomplete")
  })

  it("reports a reply with no text block as incomplete", async () => {
    const completion = await anthropicModelClient(stub(message({ content: [] }))).complete(request)

    expect(completion.ok ? "" : completion.error.code).toBe("incomplete")
  })

  it("turns a transport failure into unavailable rather than letting it throw", async () => {
    const completion = await anthropicModelClient(stub(new Error("socket hang up"))).complete(request)

    expect(completion.ok ? "" : completion.error).toEqual({
      code: "unavailable",
      detail: "socket hang up",
    })
  })

  it("survives a rejection that is not an Error", async () => {
    const completion = await anthropicModelClient({
      create: () => Promise.reject("nope"),
    }).complete(request)

    expect(completion.ok ? "" : completion.error.code).toBe("unavailable")
  })

  describe("what a thrown status says about who must act", () => {
    const thrownAt = (status: number): Error =>
      Object.assign(new Error(`${status} something the API said`), { status })

    const codeFor = async (thrown: Error): Promise<string> => {
      const completion = await anthropicModelClient(stub(thrown)).complete(request)

      return completion.ok ? "ok" : completion.error.code
    }

    it.each([
      ["a malformed request", 400],
      ["a model id that does not exist", 404],
      ["a request past the size ceiling", 413],
      ["an unprocessable body", 422],
    ])("reports %s as rejected, because sending it again would fail the same way", async (_, status) => {
      expect(await codeFor(thrownAt(status))).toBe("rejected")
    })

    it.each([
      ["a key the API does not accept", 401],
      ["an account that cannot pay", 402],
      ["a key without permission for this model", 403],
    ])("reports %s as misconfigured, because only an operator clears it", async (_, status) => {
      expect(await codeFor(thrownAt(status))).toBe("misconfigured")
    })

    it.each([
      ["a rate limit that outlasted the SDK's own retries", 429],
      ["a request timeout", 408],
      ["a conflict", 409],
      ["an internal error", 500],
      ["an overloaded API", 529],
    ])("reports %s as unavailable, because waiting is the whole remedy", async (_, status) => {
      expect(await codeFor(thrownAt(status))).toBe("unavailable")
    })

    it("keeps the message, so an operator still sees what the API said", async () => {
      const completion = await anthropicModelClient(stub(thrownAt(401))).complete(request)

      expect(completion.ok ? "" : completion.error.detail).toBe("401 something the API said")
    })

    it("falls back to unavailable for a status it does not recognise", async () => {
      expect(await codeFor(thrownAt(302))).toBe("unavailable")
    })

    /**
     * A status we cannot read is a status we cannot act on. Trusting a string
     * here would let `"400"` decide that a transient failure is permanent.
     */
    it("does not read a status that is not a number", async () => {
      const mistyped = Object.assign(new Error("weird"), { status: "400" })

      expect(await codeFor(mistyped)).toBe("unavailable")
    })

    it("stays unavailable when nothing carried a status at all", async () => {
      expect(await codeFor(new Error("socket hang up"))).toBe("unavailable")
    })
  })
})
