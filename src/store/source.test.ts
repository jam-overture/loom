import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { sequentialIdFactory, treeIdSchema } from "../ids.js"
import { renderRequest } from "../render/request.js"
import { composeChange, type CompositionRuntime } from "../runtime/pipeline.js"
import { fixedPolicy } from "../runtime/policy-source.js"
import { defaultGatePolicy } from "../runtime/policy.js"
import { buildIntent, buildProposal, collectingEventSink, fixedClock, scriptedInterpreter } from "../testing/doubles.js"
import { registryOf, testDefinitions } from "../testing/definitions.js"
import { sampleTree } from "../testing/fixtures.js"
import { buildElement, buildText } from "../tree/builders.js"

import { memoryTreeStore } from "./memory.js"
import { auditSnapshot } from "./replay.js"
import { treeSourceFromStore } from "./source.js"

/**
 * The join §3 left open: `TreeSource` was a seam with no implementation, so §2
 * and §3 have been connected only through fixtures. These tests drive the whole
 * path — an intent the Gate accepts, appended to the store, rendered from the
 * snapshot the append produced.
 */

describe("treeSourceFromStore", () => {
  it("renders what the store holds", async () => {
    const { tree } = sampleTree()
    const store = memoryTreeStore()
    await store.create(tree)

    const registry = registryOf(testDefinitions)
    const rendered = await renderRequest(
      { treeId: tree.treeId, editMode: false },
      { source: treeSourceFromStore(store), resolver: registry, validator: registry }
    )

    expect(rendered.ok).toBe(true)
    expect(rendered.ok && renderToStaticMarkup(rendered.value.element)).toContain("Welcome")
    expect(rendered.ok && rendered.value.tree.revision).toBe(0)
  })

  it("reports a tree the store does not have as a source failure, not a crash", async () => {
    const store = memoryTreeStore()
    const registry = registryOf(testDefinitions)

    const rendered = await renderRequest(
      { treeId: treeIdSchema.parse("t_absent"), editMode: false },
      { source: treeSourceFromStore(store), resolver: registry, validator: registry }
    )

    expect(rendered.ok).toBe(false)
    expect(rendered.ok ? "" : rendered.error.code).toBe("source-failed")
    expect(rendered.ok ? "" : rendered.error.code === "source-failed" && rendered.error.error.code).toBe(
      "not-found"
    )
  })

  /**
   * The end-to-end property the whole build order has been working toward: a
   * change the Gate accepted is in the store, in the log with its provenance, and
   * in the next render.
   */
  it("carries an accepted change from the runtime into the next render", async () => {
    const { tree, ids } = sampleTree()
    const store = memoryTreeStore()
    await store.create(tree)

    const idFactory = sequentialIdFactory("e2e")
    const note = buildElement(idFactory, {
      type: "loom.card",
      props: { variant: "outlined" },
      children: [buildText(idFactory, "Thanks for visiting")],
    })

    const intent = buildIntent(idFactory, {
      treeId: tree.treeId,
      baseRevision: tree.revision,
      utterance: "add a thank-you to the footer",
    })

    const proposal = buildProposal(idFactory, {
      intentId: intent.intentId,
      delta: {
        deltaId: idFactory.deltaId(),
        treeId: tree.treeId,
        baseRevision: tree.revision,
        operations: [{ op: "insert", parentId: ids.footer, index: 0, node: note }],
      },
    })

    const runtime: CompositionRuntime = {
      interpreter: scriptedInterpreter({ ok: true, value: proposal }),
      policySource: fixedPolicy(defaultGatePolicy),
      events: collectingEventSink(),
      clock: fixedClock(),
      idFactory,
    }

    const outcome = await composeChange(runtime, tree, intent)
    expect(outcome.kind).toBe("applied")

    const appended = await store.append(tree.treeId, {
      proposalId: proposal.proposalId,
      delta: proposal.delta,
      provenance: proposal.provenance,
      appliedAt: fixedClock().now(),
    })
    expect(appended.ok && appended.value.revision).toBe(1)

    const registry = registryOf(testDefinitions)
    const rendered = await renderRequest(
      { treeId: tree.treeId, editMode: false },
      { source: treeSourceFromStore(store), resolver: registry, validator: registry }
    )

    expect(rendered.ok && renderToStaticMarkup(rendered.value.element)).toContain(
      "Thanks for visiting"
    )
    expect(rendered.ok && rendered.value.tree.revision).toBe(1)

    /** The log kept who asked and what interpreted it, not just the new shape. */
    const log = await store.revisions(tree.treeId)
    expect(log.ok && log.value.revisions[0]?.provenance.origin).toBe("user-instruction")
    expect(log.ok && log.value.revisions[0]?.proposalId).toBe(proposal.proposalId)

    /** And the snapshot the renderer read is still what the log produces. */
    expect(await auditSnapshot(store, tree.treeId, tree)).toEqual({
      ok: true,
      value: { outcome: "agrees", revision: 1 },
    })
  })
})
