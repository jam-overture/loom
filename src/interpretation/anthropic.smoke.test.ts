import Anthropic from "@anthropic-ai/sdk"
import { describe, expect, it } from "vitest"

import { randomIdFactory } from "../ids.js"
import { systemClock } from "../runtime/events.js"
import { buildIntent } from "../testing/doubles.js"
import { sampleTree } from "../testing/fixtures.js"
import { applyDelta } from "../tree/apply.js"
import { collectNodeIds } from "../tree/navigation.js"

import { anthropicModelClient } from "./anthropic.js"
import { modelInterpreter } from "./interpreter.js"

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

describe.skipIf(!liveApiKey)("modelInterpreter against the live API", () => {
  it(
    "turns a plain instruction into a delta that applies",
    async () => {
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
