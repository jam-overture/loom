import { describe, expect, it } from "vitest"

import { everyMemberOf } from "../closed-set.js"
import type { ModelClient, ModelClientError } from "../interpretation/client.js"
import { interpretationReplyJsonSchema } from "../interpretation/schema.js"
import type { ModelRequest } from "../interpretation/client.js"

import { INSERT_NOTE_REPLY } from "./model-replies.js"

/**
 * One suite, run against every `ModelClient`.
 *
 * `ModelClient` is the seam a host is likeliest to implement — 0005 made the
 * vendor adapter opt-in precisely so a host could bring its own — and it is the
 * only published seam that had no suite. The three stores and the journal each
 * got one as soon as there were two implementations; this one has had exactly
 * one implementation since day 37, so the promises it makes have been held by
 * `anthropic.test.ts` and by nothing a host can run.
 *
 * **The promises are not in the type, and they are not obvious.** `complete`
 * returns `Promise<Result<…>>` on paper whatever an implementation does with a
 * socket that closes; what the runtime needs is narrower, and all of it is
 * invisible to the compiler:
 *
 * - The five error codes name *who must act*, not what went wrong. A key the
 *   service rejects and a rate limit are both "it did not answer"; one needs an
 *   operator and the other needs a wait, and an implementation that collapses
 *   them tells a host to stop trying something that would have worked. They
 *   were one code until day 37, and the merge was a lie downstream could not
 *   detect.
 * - The reply text crosses **unchanged**. Parsing, validating and deciding what
 *   a bad answer means live above this seam (0005), so an adapter that trims,
 *   unwraps a fence or parses on the way through has moved a decision below the
 *   line and taken it away from the tests that cover it.
 * - Nothing throws. The interpreter reads a `Result`; a rejected promise from
 *   this call is an exception on a path that has no handler.
 *
 * ## What a host supplies
 *
 * Not a client — a **situation**, answered for every member of `ModelSituation`.
 * A suite that took one client could check that a success is a success and
 * nothing else, because nobody can make a real service return a 402 on demand.
 * So the host wires each situation to whatever their vendor does in it, the
 * same way `anthropic.test.ts` stubs `messages.create`, and this suite says
 * what the answer has to be.
 *
 * It is a record keyed by every situation rather than a list of the ones a host
 * felt like covering, and `everyMemberOf` makes that a compile-time fact: a
 * situation added here stops every host's call compiling until they have
 * answered it. A list would have gone quietly out of date on the first one.
 */

/**
 * What happened, in terms every vendor has rather than one vendor's.
 *
 * Each member is a thing that demonstrably occurs on a real service and that an
 * adapter has to turn into one of the five codes. The HTTP statuses are grouped
 * by the answer they require rather than listed, because the question this suite
 * asks is never "is 402 handled" — it is "does this implementation know that
 * only an operator can clear a 402".
 */
export type ModelSituation =
  /** The service answered, with this text, served by this model. */
  | "answers"
  /** The service answered, and there was nothing in the reply that was text. */
  | "answers-without-text"
  /** The answer stopped at the output ceiling, mid-sentence. */
  | "truncates"
  /** The model declined to answer this content. */
  | "refuses"
  /** A credential, entitlement or billing problem: 401, 402, 403. */
  | "refuses-the-caller"
  /** The request itself is wrong and would fail again unchanged: 400, 404, 413, 422. */
  | "refuses-the-request"
  /** Busy now, fine later: 408, 409, 429, 500, 503. */
  | "asks-for-later"
  /** No response at all — a closed socket, a DNS failure, a TLS error. */
  | "never-answers"

export const MODEL_SITUATIONS: readonly ModelSituation[] = everyMemberOf<ModelSituation>()([
  "answers",
  "answers-without-text",
  "truncates",
  "refuses",
  "refuses-the-caller",
  "refuses-the-request",
  "asks-for-later",
  "never-answers",
])

/**
 * The text this suite sends through, and the model it says served it.
 *
 * **Deliberately dirty, and that is the whole value of it.** A real reply
 * sometimes arrives wrapped in a code fence with whitespace around it, and an
 * adapter is *not* allowed to clean that up: what a malformed answer means is
 * the interpreter's decision and is covered by the interpreter's own tests
 * (0005). An adapter that trims has moved that decision below the seam, where
 * nothing watches it.
 *
 * This was found by breaking it. The first version of this constant was the
 * bare reply, and an adapter mutated to `text.trim().replace(/^```json/, "")`
 * passed all twenty-five cases — because a no-op on clean input is
 * indistinguishable from doing nothing. The fence and the newlines are what
 * make the assertion an assertion.
 *
 * `INSERT_NOTE_REPLY` inside it rather than a lorem string, so an adapter that
 * parses and re-serialises produces valid JSON that still fails the comparison.
 */
export const CONTRACT_REPLY = `\n\`\`\`json\n${INSERT_NOTE_REPLY}\n\`\`\`\n`
export const CONTRACT_SERVED_BY = "a-model-that-served-it"

/**
 * A client wired to behave as one situation does, or a statement that this
 * vendor has no such situation.
 *
 * `"not-expressible"` is a claim, not a skip, and the difference is the whole
 * reason it is spelled out. A vendor with no distinct refusal signal reports a
 * declined answer some other way, and an adapter that invented a `refused` for
 * it would be worse than one that said so. What the suite then checks is the
 * honest remainder: that the situation really cannot be produced is the host's
 * word, and the suite holds them to using one of the five codes for whatever
 * they *do* produce instead.
 */
export type ModelSituationClient = (() => ModelClient | Promise<ModelClient>) | "not-expressible"

export type ModelClientContract = Readonly<Record<ModelSituation, ModelSituationClient>>

/** The request every case sends. Fixed, because none of these turn on its content. */
export const contractRequest = (): ModelRequest => ({
  model: "a-model",
  maxTokens: 16000,
  effort: "high",
  system: "you translate requests into edits",
  userMessage: "add a footer note",
  outputSchema: interpretationReplyJsonSchema(),
})

type Answered =
  | { readonly ok: true; readonly text: string; readonly servedBy: string }
  | { readonly ok: false; readonly error: ModelClientError }
  | { readonly ok: false; readonly threw: string }

/**
 * Calls the client and reports what came back, including a throw.
 *
 * The throw is caught here rather than left to fail the test by itself, because
 * "this implementation throws" is a *finding* this suite reports in the same
 * vocabulary as a wrong code — and a rejected promise that escaped would
 * otherwise fail whichever assertion ran next, naming the wrong thing.
 */
const answered = async (client: ModelClient): Promise<Answered> => {
  try {
    const completion = await client.complete(contractRequest())

    return completion.ok
      ? { ok: true, text: completion.value.text, servedBy: completion.value.servedBy }
      : { ok: false, error: completion.error }
  } catch (cause) {
    return { ok: false, threw: cause instanceof Error ? cause.message : String(cause) }
  }
}

const EXPECTED: Readonly<Record<ModelSituation, ModelClientError["code"] | "ok">> = {
  answers: "ok",
  "answers-without-text": "incomplete",
  truncates: "incomplete",
  refuses: "refused",
  "refuses-the-caller": "misconfigured",
  "refuses-the-request": "rejected",
  "asks-for-later": "unavailable",
  "never-answers": "unavailable",
}

export const describeModelClientContract = (
  name: string,
  contract: ModelClientContract
): void => {
  describe(`${name} — ModelClient contract`, () => {
    /**
     * The invariant with no exceptions and no `not-expressible`: whatever the
     * situation, the caller gets a value. `modelInterpreter` reads a `Result`
     * and has nowhere to catch, so a rejected promise here is an exception on a
     * path with no handler — a page that never finishes rather than a proposal
     * that failed.
     */
    describe("answers rather than throwing, in every situation it has", () => {
      for (const situation of MODEL_SITUATIONS) {
        const make = contract[situation]
        if (make === "not-expressible") continue

        it(`returns a result when the service ${situation}`, async () => {
          const result = await answered(await make())

          expect(result).not.toHaveProperty("threw")
        })
      }
    })

    describe("names who must act", () => {
      for (const situation of MODEL_SITUATIONS) {
        const make = contract[situation]
        if (make === "not-expressible") continue

        it(`reports ${situation} as ${EXPECTED[situation]}`, async () => {
          const result = await answered(await make())

          expect(result.ok ? "ok" : "error" in result ? result.error.code : "threw").toBe(
            EXPECTED[situation]
          )
        })
      }
    })

    /**
     * A detail is what an operator reads at three in the morning. An empty one
     * is the difference between "your key is not accepted" and "something went
     * wrong", and nothing above this seam can recover what the service said.
     */
    describe("says what happened, not that something happened", () => {
      for (const situation of MODEL_SITUATIONS) {
        const make = contract[situation]
        if (make === "not-expressible" || EXPECTED[situation] === "ok") continue

        it(`carries a detail for ${situation}`, async () => {
          const result = await answered(await make())

          expect(result.ok === false && "error" in result && result.error.detail.length > 0).toBe(
            true
          )
        })
      }
    })

    /**
     * The seam's own line, and the one an adapter is most tempted to cross. The
     * reply is handed up as text so that parsing, validating and deciding what a
     * malformed answer means stay testable without a network (0005). An adapter
     * that trims whitespace, unwraps a code fence or parses and re-serialises has
     * moved one of those decisions below the line, where nothing covers it.
     */
    describe("hands the reply up unchanged", () => {
      const make = contract.answers

      if (make === "not-expressible") {
        throw new Error(
          "loom: a ModelClient that cannot answer is not a ModelClient — 'answers' may not be not-expressible"
        )
      }

      it("passes the text through byte for byte", async () => {
        const result = await answered(await make())

        expect(result.ok && result.text).toBe(CONTRACT_REPLY)
      })

      /**
       * Which model served the request is provenance, and it is recorded
       * rather than assumed (0005) — a service may answer with something other
       * than what was asked for, and a client that echoed the request's model
       * back would make that invisible exactly when it mattered.
       */
      it("reports the model that served the request, not the one asked for", async () => {
        const result = await answered(await make())

        expect(result.ok && result.servedBy).toBe(CONTRACT_SERVED_BY)
      })
    })
  })
}
