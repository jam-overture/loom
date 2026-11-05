import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { audienceIdSchema } from "../audience/audience.js"
import type { AudienceOverlay } from "../audience/compose.js"
import { sequentialIdFactory, treeIdSchema } from "../ids.js"
import { ok } from "../result.js"
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
import {
  composingTreeSourceFromStore,
  treeSourceFromStore,
  type AudienceOverlaySource,
} from "./source.js"

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
      value: { outcome: "agrees", revision: 1, idReturns: [] },
    })
  })
})

/**
 * The composing source, driven end to end: a store holding a base, an overlay
 * beside it, and a reader whose context decides which page they get. One render
 * per context, from one published revision.
 */

const overlayOf = (overlay: AudienceOverlay): AudienceOverlaySource => ({
  load: async () => ok(overlay),
})

describe("composingTreeSourceFromStore", () => {
  const audience = audienceIdSchema.parse("aud_eu")

  const renderFor = async (
    treeId: ReturnType<typeof treeIdSchema.parse>,
    source: ReturnType<typeof composingTreeSourceFromStore>,
    context?: Record<string, string>
  ) => {
    const registry = registryOf(testDefinitions)

    return renderRequest(
      { treeId, editMode: false, ...(context ? { context } : {}) },
      { source, resolver: registry, validator: registry }
    )
  }

  const baseAndOverlay = async () => {
    const { tree, ids } = sampleTree()
    const store = memoryTreeStore()
    await store.create(tree)

    const spare = sequentialIdFactory("overlay")
    const banner = buildElement(spare, {
      type: "loom.header",
      children: [buildText(spare, "Sondertarif")],
    })

    const overlay: AudienceOverlay = {
      rules: [{ audienceId: audience, clauses: [{ key: "region", anyOf: ["eu"] }] }],
      forms: [
        {
          audienceId: audience,
          delta: {
            deltaId: spare.deltaId(),
            treeId: tree.treeId,
            baseRevision: 0,
            operations: [{ op: "insert", parentId: ids.page, index: 0, node: banner }],
          },
        },
      ],
    }

    return { tree, store, overlay }
  }

  it("serves the reader in the audience the page their delta made", async () => {
    const { tree, store, overlay } = await baseAndOverlay()

    const rendered = await renderFor(
      tree.treeId,
      composingTreeSourceFromStore(store, overlayOf(overlay)),
      { region: "eu" }
    )

    expect(rendered.ok && renderToStaticMarkup(rendered.value.element)).toContain("Sondertarif")
  })

  it("serves everybody else the base, from the same store and the same overlay", async () => {
    const { tree, store, overlay } = await baseAndOverlay()
    const source = composingTreeSourceFromStore(store, overlayOf(overlay))

    const outside = await renderFor(tree.treeId, source, { region: "us" })
    const noContext = await renderFor(tree.treeId, source)

    expect(outside.ok && renderToStaticMarkup(outside.value.element)).not.toContain("Sondertarif")
    expect(outside.ok && renderToStaticMarkup(outside.value.element)).toContain("Welcome")
    expect(noContext.ok && renderToStaticMarkup(noContext.value.element)).not.toContain("Sondertarif")
  })

  /**
   * The identity claim, read off a render rather than off the composition: both
   * readers report the revision the store published, which is what makes two
   * audiences comparable on one version.
   */
  it("reports the base revision to both readers", async () => {
    const { tree, store, overlay } = await baseAndOverlay()
    const source = composingTreeSourceFromStore(store, overlayOf(overlay))

    const inside = await renderFor(tree.treeId, source, { region: "eu" })
    const outside = await renderFor(tree.treeId, source, { region: "us" })

    expect(inside.ok && inside.value.tree.revision).toBe(0)
    expect(outside.ok && outside.value.tree.revision).toBe(0)
  })

  it("refuses the request when the matched delta is against a revision the page has left", async () => {
    const { tree, store, overlay } = await baseAndOverlay()
    const { ids } = sampleTree()
    const moved = sequentialIdFactory("moved")
    await store.append(tree.treeId, {
      proposalId: moved.proposalId(),
      delta: {
        deltaId: moved.deltaId(),
        treeId: tree.treeId,
        baseRevision: 0,
        operations: [{ op: "configure", nodeId: ids.card, set: { elevation: 2 }, unset: [] }],
      },
      provenance: {
        origin: "user-instruction",
        interpreter: "test",
        authoredBy: "model",
        confidence: 1,
        interpretedAt: fixedClock().now(),
      },
      appliedAt: fixedClock().now(),
    })

    /**
     * Asserted rather than assumed: this test passed while the append was
     * malformed and silently did nothing, because a page that never moved
     * refuses for no reason at all. The staleness has to be real.
     */
    const head = await store.head(tree.treeId)
    expect(head.ok && head.value.revision).toBe(1)

    const rendered = await renderFor(
      tree.treeId,
      composingTreeSourceFromStore(store, overlayOf(overlay)),
      { region: "eu" }
    )

    expect(rendered.ok).toBe(false)
    expect(!rendered.ok && JSON.stringify(rendered.error)).toContain("aud_eu")
  })

  it("passes a missing page through as not-found, the same as the uncomposing source", async () => {
    const store = memoryTreeStore()

    const rendered = await renderFor(
      treeIdSchema.parse("t_absent"),
      composingTreeSourceFromStore(store, overlayOf({ rules: [], forms: [] }))
    )

    expect(!rendered.ok && JSON.stringify(rendered.error)).toContain("not-found")
  })

  it("passes an overlay that cannot be read through rather than serving the base", async () => {
    const { tree, store } = await baseAndOverlay()
    const broken: AudienceOverlaySource = {
      load: async () => ({ ok: false, error: { code: "unavailable", detail: "rules unreachable" } }),
    }

    const rendered = await renderFor(tree.treeId, composingTreeSourceFromStore(store, broken), {
      region: "eu",
    })

    expect(!rendered.ok && JSON.stringify(rendered.error)).toContain("rules unreachable")
  })
})
