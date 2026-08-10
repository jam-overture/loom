import Anthropic from "@anthropic-ai/sdk"
import { describe, expect, it } from "vitest"

import { randomIdFactory } from "../ids.js"
import { systemClock } from "../runtime/events.js"
import { interpretationFault, type InterpretationError } from "../runtime/interpreter.js"
import { buildIntent } from "../testing/doubles.js"
import { sampleTree } from "../testing/fixtures.js"
import { applyDelta } from "../tree/apply.js"
import { collectNodeIds } from "../tree/navigation.js"

import { anthropicModelClient } from "./anthropic.js"
import { DEFAULT_INTERPRETER_MODEL, modelInterpreter } from "./interpreter.js"
import { interpretationReplyJsonSchema } from "./schema.js"

/**
 * The one test that touches the network.
 *
 * It skips when no key is present, so `pnpm verify` is green offline and the
 * nightly suite never depends on the API being reachable. Everything it covers
 * is covered offline too — what it adds is proof that the schema we hand a real
 * model is one a real model can actually satisfy, which no fixture can tell us.
 */

/**
 * Two names, because the standard one is reserved where this suite runs.
 *
 * The scheduled agent that runs these sessions strips `ANTHROPIC_API_KEY` from
 * the environment of every process it spawns — it is the credential the agent
 * itself authenticates with, so it does not hand it to subprocesses. A key set
 * under that name therefore reaches the session and never reaches Vitest, which
 * is why this test skipped for three consecutive runs while the variable was
 * correctly configured.
 *
 * `LOOM_ANTHROPIC_API_KEY` is not reserved by anything and passes through, so it
 * is preferred here. The standard name is still honoured, for every environment
 * that does not reserve it.
 */
const liveApiKey = process.env["LOOM_ANTHROPIC_API_KEY"] ?? process.env["ANTHROPIC_API_KEY"]

/**
 * A provider that declines to answer has told us nothing, and a test that
 * cannot observe anything must not report a verdict. An overloaded API (529) or
 * a rate limit (429) is the same kind of fact as a missing key: the network was
 * not available to this session.
 *
 * Reading the code is now enough. Until day 37 this had to match a status out of
 * the message text, because `interpreter-unavailable` also covered a request the
 * API *rejected* — and a 400 means we assembled something invalid, which is the
 * defect this test exists to catch and must stay a failure. The client seam
 * separates those now, so a rejection is `interpreter-request-rejected` and a
 * bad key is `interpreter-misconfigured`; neither skips, and a key that is
 * present but refused fails the build rather than passing quietly.
 */
const isUnreachable = (error: InterpretationError): boolean =>
  interpretationFault(error) === "provider"

describe.skipIf(!liveApiKey)("modelInterpreter against the live API", () => {
  it(
    "turns a plain instruction into a delta that applies",
    async (context) => {
      const { tree } = sampleTree()
      const anthropic = new Anthropic({ apiKey: liveApiKey })
      const interpreter = modelInterpreter({
        client: anthropicModelClient(anthropic.messages),
        idFactory: randomIdFactory,
        clock: systemClock,
      })

      const intent = buildIntent(randomIdFactory, {
        treeId: tree.treeId,
        baseRevision: tree.revision,
        utterance: "Add a line of text to the footer that reads: Thanks for visiting.",
      })

      const interpreted = await interpreter.interpret(intent, tree)
      if (!interpreted.ok) {
        if (isUnreachable(interpreted.error)) {
          context.skip(`the API was not reachable: ${interpreted.error.detail.slice(0, 80)}`)
        }

        throw new Error(`interpretation failed: ${interpreted.error.code} — ${interpreted.error.detail}`)
      }

      expect(interpreted.value.provenance.interpreter).toContain("claude")
      expect(interpreted.value.provenance.confidence).toBeGreaterThan(0)
      expect(interpreted.value.rationale.length).toBeGreaterThan(0)

      const applied = applyDelta(tree, interpreted.value.delta)
      if (!applied.ok) throw new Error(`delta did not apply: ${applied.error.code}`)

      expect(collectNodeIds(applied.value.root).length).toBeGreaterThan(
        collectNodeIds(tree.root).length
      )
      expect(JSON.stringify(applied.value.root)).toContain("Thanks for visiting")
    },
    120_000
  )
})

/**
 * The one assumption a fixture cannot check.
 *
 * `classifyThrown` reads `status` off whatever the SDK throws. Every offline
 * test hands it an object shaped the way we believe the SDK shapes its errors —
 * which is exactly the belief that would be wrong, silently, and would collapse
 * all three codes back into `unavailable` with no test failing.
 *
 * A key the API will not accept costs nothing and is answered immediately, so
 * this asks the real API the one question stubs cannot. Gated on a key being
 * present, which is this suite's existing proxy for "this session has network" —
 * the request deliberately does not use it.
 */
describe.skipIf(!liveApiKey)("anthropicModelClient against the live API", () => {
  it(
    "reports a key the API rejects as a misconfiguration rather than an outage",
    async () => {
      const anthropic = new Anthropic({ apiKey: "sk-ant-not-a-real-key", maxRetries: 0 })
      const completion = await anthropicModelClient(anthropic.messages).complete({
        model: DEFAULT_INTERPRETER_MODEL,
        maxTokens: 16,
        effort: "low",
        system: "reply with the word ok",
        userMessage: "ok",
        outputSchema: interpretationReplyJsonSchema(),
      })

      expect(completion.ok).toBe(false)
      expect(completion.ok ? "" : completion.error.code).toBe("misconfigured")
    },
    30_000
  )
})
