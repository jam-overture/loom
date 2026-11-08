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

import type { Goal } from "../goals/goal"
import { GOAL_KIND_WORDS } from "../vocabulary"
import { evidenceText, type Evidence } from "./evidence"
import type { TurnedDown } from "./turned-down"

/**
 * The AI deciding what to change about one page, from what its readers did
 * (0329 clause 1).
 *
 * This is the half of proposing a person used to do: it writes the request.
 * The interpreter then turns that request into a change and the Gate weighs it,
 * exactly as it would weigh anybody's, so nothing the model says here reaches a
 * page without passing the same rules. Its reason travels with the request, so
 * whoever answers the change on *For review* reads why it was raised.
 *
 * It aims at one goal (0352): the model is told what the goal counts, and
 * proposes the change most likely to get more readers to do it.
 */

/** Long enough for a request and its reason, short enough to be one change. */
export const MAX_REQUEST_LENGTH = 500

const CEILING_MS = 120_000
const MAX_TOKENS = 4_000

export const BRIEF_SYSTEM_PROMPT = [
  "You improve one page of a website from what its readers did on it.",
  "You are given the page's goal: what the site wants readers to do, on which part of the page.",
  "You are given the page's parts in reading order with how many readers reached each one",
  "and, for parts with things inside them, how many of those readers did something there.",
  "Propose at most one change: the single change most likely to get more readers to do what the goal counts,",
  "that the evidence actually supports. Name the part by its id and say what to change about it,",
  "in one or two plain sentences an editor could carry out. Prefer changing words, order or emphasis",
  "over adding new sections. Do not propose a change the figures do not support:",
  'if nothing stands out, answer "nothing" and say why.',
  "You may also be given changes a person already turned down on this page, with their reason when",
  "they gave one. Do not propose one of those again, or anything that amounts to it, unless the figures",
  "now argue for it clearly more strongly than any reason it was turned down for. If you do propose it",
  'again, say in "again" what has changed since it was turned down. Otherwise leave "again" out.',
].join(" ")

const replySchema = z.discriminatedUnion("outcome", [
  z.object({
    outcome: z.literal("change"),
    request: z.string().min(1),
    evidence: z.string().min(1),
    again: z.string().min(1).optional(),
  }),
  z.object({ outcome: z.literal("nothing"), reason: z.string().min(1) }),
])

const REPLY_JSON_SCHEMA: JsonObject = {
  type: "object",
  additionalProperties: false,
  required: ["outcome"],
  properties: {
    outcome: { type: "string", enum: ["change", "nothing"] },
    request: {
      type: "string",
      description: "The change to make, naming the part by its id.",
    },
    evidence: {
      type: "string",
      description: "The figure that supports it, in one sentence.",
    },
    reason: {
      type: "string",
      description: "Why nothing should change, when outcome is nothing.",
    },
    again: {
      type: "string",
      description:
        "Only when the change was turned down before: what has changed since, in one sentence.",
    },
  },
}

/** What the AI decided about a page. */
export type Brief =
  | { readonly kind: "change"; readonly request: string }
  | { readonly kind: "nothing"; readonly reason: string }

export type BriefError = {
  readonly code: "model" | "unreadable"
  readonly detail: string
}

/**
 * The request the interpreter is handed: the change, then the figure that
 * argues for it, then, for a change turned down before, why it is back (0341).
 */
export const requestOf = (change: string, evidence: string, again?: string): string => {
  const request = `${change.trim()} (Why: ${evidence.trim()})${
    again === undefined ? "" : ` (Turned down before. Proposed again because: ${again.trim()})`
  }`

  return request.length <= MAX_REQUEST_LENGTH
    ? request
    : `${request.slice(0, MAX_REQUEST_LENGTH - 1)}…`
}

/** A request read back into what `requestOf` joined, for whoever answers it. */
export type RequestParts = {
  readonly change: string
  /** The figure argued for it; `null` where the request carries none, as a person's does. */
  readonly why: string | null
  /** Why a change turned down before is back (0341); `null` where it was not turned down. */
  readonly again: string | null
}

const JOINED =
  /^(?<change>.+?) \(Why: (?<why>.+?)\)(?: \(Turned down before\. Proposed again because: (?<again>.+)\))?$/su

/**
 * The parts of a request as `requestOf` wrote it. A request it did not write,
 * or one cut to length, is all change and no figure, so nothing is invented
 * from a part of a sentence. Pure.
 */
export const requestPartsOf = (request: string): RequestParts => {
  const groups = JOINED.exec(request)?.groups

  return groups?.change === undefined || groups.why === undefined
    ? { change: request, why: null, again: null }
    : { change: groups.change, why: groups.why, again: groups.again ?? null }
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
    return err({
      code: "unreadable",
      detail: "the model's answer was not one this could read",
    })
  }

  return parsed.data.outcome === "change"
    ? ok({
        kind: "change",
        request: requestOf(parsed.data.request, parsed.data.evidence, parsed.data.again),
      })
    : ok({ kind: "nothing", reason: parsed.data.reason })
}

const DAY = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

/**
 * What was turned down on the page, newest first, as the model reads it. Pure.
 * Empty when nothing was, so a page with no history reads exactly as before.
 */
export const turnedDownText = (turnedDown: readonly TurnedDown[]): string =>
  turnedDown.length === 0
    ? ""
    : [
        "Changes a person turned down on this page before, newest first:",
        ...turnedDown.map(
          (entry) =>
            `- On ${DAY.format(entry.at)}: "${entry.request}". ${
              entry.reason === null ? "No reason was given." : `Their reason: ${entry.reason}`
            }`
        ),
      ].join("\n")

/** The goal as the model reads it: what readers do, to which part. Pure. */
export const goalText = (goal: Goal): string =>
  `The goal, "${goal.name}", counts each time a reader ${GOAL_KIND_WORDS[goal.kind].does} ${goal.nodeId}.`

/** Everything one brief is written from. */
export type BriefInput = {
  readonly pageName: string
  readonly goal: Goal
  readonly evidence: Evidence
  readonly turnedDown: readonly TurnedDown[]
}

/** The message the model is given: the page, its goal, its evidence, and what was turned down on it. Pure. */
export const briefMessage = ({ pageName, goal, evidence, turnedDown }: BriefInput): string =>
  [`The page "${pageName}".`, goalText(goal), evidenceText(evidence), turnedDownText(turnedDown)]
    .filter((part) => part !== "")
    .join("\n\n")

/** Ask the project's model what to change about a page, toward its goal, with its evidence and history. */
export const briefFor = async (
  client: ModelClient,
  input: BriefInput
): Promise<Result<Brief, BriefError>> => {
  const completion = await withCeiling(
    CEILING_MS,
    () =>
      err({
        code: "unavailable" as const,
        detail: "the model did not answer in time",
      }),
    (signal) =>
      client.complete(
        {
          model: DEFAULT_INTERPRETER_MODEL,
          maxTokens: MAX_TOKENS,
          effort: "medium",
          system: BRIEF_SYSTEM_PROMPT,
          userMessage: briefMessage(input),
          outputSchema: REPLY_JSON_SCHEMA,
        },
        { signal }
      )
  )

  return completion.ok
    ? briefFrom(completion.value.text)
    : err({ code: "model", detail: completion.error.detail })
}
