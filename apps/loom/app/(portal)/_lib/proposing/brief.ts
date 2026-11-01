import { z } from "zod"

import {
  DEFAULT_INTERPRETER_MODEL,
  err,
  ok,
  withCeiling,
  type JsonObject,
  type ModelClient,
  type Result,
} from "@jam-overture/loom"

import { evidenceText, type Evidence } from "./evidence"

/**
 * The AI deciding what to change about one page, from what its readers did
 * (0329 clause 1).
 *
 * This is the half of proposing a person used to do: it writes the request.
 * The interpreter then turns that request into a change and the Gate weighs it,
 * exactly as it would weigh anybody's, so nothing the model says here reaches a
 * page without passing the same rules. Its reason travels with the request, so
 * whoever answers the change on *Waiting* reads why it was raised.
 */

/** Long enough for a request and its reason, short enough to be one change. */
export const MAX_REQUEST_LENGTH = 500

const CEILING_MS = 120_000
const MAX_TOKENS = 4_000

export const BRIEF_SYSTEM_PROMPT = [
  "You improve one page of a website from what its readers did on it.",
  "You are given the page's parts in reading order with how many readers reached each one",
  "and, for parts with things inside them, how many of those readers did something there.",
  "Propose at most one change: the single change most likely to help readers get further or act more,",
  "that the evidence actually supports. Name the part by its id and say what to change about it,",
  "in one or two plain sentences an editor could carry out. Prefer changing words, order or emphasis",
  "over adding new sections. Do not propose a change the figures do not support:",
  'if nothing stands out, answer "nothing" and say why.',
].join(" ")

const replySchema = z.discriminatedUnion("outcome", [
  z.object({
    outcome: z.literal("change"),
    request: z.string().min(1),
    evidence: z.string().min(1),
  }),
  z.object({ outcome: z.literal("nothing"), reason: z.string().min(1) }),
])

const REPLY_JSON_SCHEMA: JsonObject = {
  type: "object",
  additionalProperties: false,
  required: ["outcome"],
  properties: {
    outcome: { type: "string", enum: ["change", "nothing"] },
    request: { type: "string", description: "The change to make, naming the part by its id." },
    evidence: { type: "string", description: "The figure that supports it, in one sentence." },
    reason: { type: "string", description: "Why nothing should change, when outcome is nothing." },
  },
}

/** What the AI decided about a page. */
export type Brief =
  | { readonly kind: "change"; readonly request: string }
  | { readonly kind: "nothing"; readonly reason: string }

export type BriefError = { readonly code: "model" | "unreadable"; readonly detail: string }

/** The request the interpreter is handed: the change, then the figure that argues for it. */
export const requestOf = (change: string, evidence: string): string => {
  const request = `${change.trim()} (Why: ${evidence.trim()})`

  return request.length <= MAX_REQUEST_LENGTH
    ? request
    : `${request.slice(0, MAX_REQUEST_LENGTH - 1)}…`
}

/** The model's reply, read. Pure. */
export const briefFrom = (text: string): Result<Brief, BriefError> => {
  const parsed = (() => {
    try {
      return replySchema.safeParse(JSON.parse(text))
    } catch {
      return undefined
    }
  })()

  if (parsed?.success !== true) {
    return err({ code: "unreadable", detail: "the model's answer was not one this could read" })
  }

  return parsed.data.outcome === "change"
    ? ok({ kind: "change", request: requestOf(parsed.data.request, parsed.data.evidence) })
    : ok({ kind: "nothing", reason: parsed.data.reason })
}

/** Ask the project's model what to change about a page, with the page's evidence. */
export const briefFor = async (
  client: ModelClient,
  pageName: string,
  evidence: Evidence
): Promise<Result<Brief, BriefError>> => {
  const completion = await withCeiling(
    CEILING_MS,
    () => err({ code: "unavailable" as const, detail: "the model did not answer in time" }),
    (signal) =>
      client.complete(
        {
          model: DEFAULT_INTERPRETER_MODEL,
          maxTokens: MAX_TOKENS,
          effort: "medium",
          system: BRIEF_SYSTEM_PROMPT,
          userMessage: `The page "${pageName}".\n\n${evidenceText(evidence)}`,
          outputSchema: REPLY_JSON_SCHEMA,
        },
        { signal }
      )
  )

  return completion.ok
    ? briefFrom(completion.value.text)
    : err({ code: "model", detail: completion.error.detail })
}
