import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import {
  buildElement,
  buildText,
  createThemeRegistry,
  createTree,
  fixedPolicy,
  gatePolicySchema,
  ok,
  sequentialIdFactory,
} from "@jam-overture/loom"
import type { GatePolicy, LoomTree, NodeId } from "@jam-overture/loom"
import { renderLoomTree } from "@jam-overture/loom/react"
import { memoryTreeStore } from "@jam-overture/loom/store"
import {
  buildIntent,
  buildProposal,
  collectingEventSink,
  fixedClock,
  sampleTree,
  scriptedInterpreter,
  testRegistry,
} from "@jam-overture/loom/testing"
import { describeTreeStoreContract } from "@jam-overture/loom/testing/contracts"
import { commitIntent, memoryHoldStore } from "@jam-overture/loom/write"
import type { WritePath } from "@jam-overture/loom/write"

import { spellOut } from "../counts"
import { entryPoints } from "../entry-points"
import { WRITE_ENDING_ORDER } from "../write/endings"

/**
 * *Testing what you built*, run rather than read.
 *
 * A page of test recipes is the one page on this site where being compilable is
 * not enough. `_lib/fences/compiled` already puts every block through the
 * application's own typechecker, which catches a renamed export and a changed
 * signature. It cannot catch a recipe that compiles and no longer *works*: a
 * policy that stopped holding what the page says it holds, a fixture tree that
 * grew a node its own registry does not know, a sentence the Gate used to
 * produce and now words differently.
 *
 * So this file does what the page tells a reader to do, with the page's own
 * values, and holds the page's quoted outcomes against what actually comes
 * back. The quoted Gate sentence is the part most worth this: it is a string
 * the framework generates, printed inside backticks in a page nothing else
 * reads.
 */

const PAGE = fileURLToPath(
  new URL("../../docs/building-with-loom/testing-what-you-built/page.mdx", import.meta.url)
)

const page = readFileSync(PAGE, "utf8")

/*
 * The page's first two code blocks, here as code that runs. The fence pipeline
 * compiles the page's copy; this one is executed, and the assertions below are
 * the page's own claims about what comes back.
 */
const pricingPage = (): { readonly tree: LoomTree; readonly planId: NodeId } => {
  const ids = sequentialIdFactory("shop")

  const label = buildText(ids, "Starter")
  const plan = buildElement(ids, { type: "shop.plan", props: { price: "£9" }, children: [label] })
  const page = buildElement(ids, { type: "loom.page", props: { title: "Pricing" }, children: [plan] })

  return { tree: createTree(page, ids), planId: plan.id }
}

const askToRaiseThePrice = async (policy: GatePolicy) => {
  const { tree, planId } = pricingPage()
  const ids = sequentialIdFactory("ask")

  const intent = buildIntent(ids, {
    treeId: tree.treeId,
    baseRevision: tree.revision,
    utterance: "Put the starter plan up to £12",
  })

  const proposal = buildProposal(ids, {
    intentId: intent.intentId,
    delta: {
      deltaId: ids.deltaId(),
      treeId: tree.treeId,
      baseRevision: tree.revision,
      operations: [{ op: "configure", nodeId: planId, set: { price: "£12" }, unset: [] }],
    },
  })

  const store = memoryTreeStore()
  await store.create(tree)

  const path: WritePath = {
    store,
    holds: memoryHoldStore(),
    runtime: {
      interpreter: scriptedInterpreter(ok(proposal)),
      policySource: fixedPolicy(policy),
      events: collectingEventSink(),
      clock: fixedClock(),
      idFactory: ids,
    },
  }

  return commitIntent(path, intent)
}

const protectingPrice = (): GatePolicy =>
  gatePolicySchema.parse({ policyId: "shop", protectedPropKeys: ["price"] })

describe("the policy test this page teaches", () => {
  it("holds the change when the prop is protected", async () => {
    const outcome = await askToRaiseThePrice(protectingPrice())

    expect(outcome.kind).toBe("held")
  })

  /**
   * The half the page argues is the half that proves anything: a test of the
   * protected case alone passes against a policy that holds everything.
   */
  it("applies the same change when it is not", async () => {
    const outcome = await askToRaiseThePrice(gatePolicySchema.parse({ policyId: "shop" }))

    expect(outcome.kind).toBe("committed")
  })

  it("says why it held it, in the words the page quotes", async () => {
    const outcome = await askToRaiseThePrice(protectingPrice())

    if (outcome.kind !== "held") throw new Error("the price change was not held")

    const { detail } = outcome.held.disposition.reason

    expect(detail).toBe("configures protected price")
    expect(page, "the page quotes a sentence the Gate no longer produces").toContain(detail)
  })
})

describe("the fixture tree and the fixture registry", () => {
  const renderedWith = (tree: LoomTree, registry: ReturnType<typeof testRegistry>) =>
    renderLoomTree(tree, {
      resolver: registry,
      validator: registry,
      themes: createThemeRegistry(),
    })

  it("render each other with nothing to report", () => {
    expect(renderedWith(sampleTree().tree, testRegistry()).diagnostics).toEqual([])
  })

  /**
   * The page's reason for *do not reach for the fixture tree to test your own
   * primitives*: most of its type names exist in the starter library too, so the
   * answer a reader gets is neither a clean page nor an obviously broken one.
   * Held as the overlap rather than as the diagnostic it produces today, which
   * is a property of whichever name happens to be at the root.
   */
  it("hold names the starter library also publishes", async () => {
    const { createStarterPrimitiveRegistry } = await import("@jam-overture/loom/primitives")

    const starter = createStarterPrimitiveRegistry()
    if (!starter.ok) throw new Error("the starter registry was refused")

    const published = new Set(starter.value.primitives.map((primitive) => primitive.type))
    const shared = testRegistry()
      .primitives.map((primitive) => primitive.type)
      .filter((type) => published.has(type))

    expect(shared.length).toBeGreaterThan(0)
  })

  /**
   * *Read the diagnostics as the render's first complaint rather than its whole
   * list.* A node whose props are refused is never called, so the unknown
   * primitive underneath it is never reached. This is the measurement that
   * sentence is made of, and the reason the page asks for `toEqual([])` rather
   * than a count.
   */
  it("report nothing underneath a node whose props were refused", () => {
    const ids = sequentialIdFactory("reach")
    const unregistered = buildElement(ids, {
      type: "nobody.registered",
      children: [buildText(ids, "under it")],
    })

    const underValid = createTree(
      buildElement(ids, { type: "loom.page", props: { title: "Home" }, children: [unregistered] }),
      ids
    )

    const underRefused = createTree(
      buildElement(ids, { type: "loom.page", props: { notATitle: 1 }, children: [unregistered] }),
      ids
    )

    expect(renderedWith(underValid, testRegistry()).diagnostics.map((one) => one.code)).toEqual([
      "unknown-primitive",
    ])

    expect(renderedWith(underRefused, testRegistry()).diagnostics.map((one) => one.code)).toEqual([
      "invalid-props",
    ])
  })
})

describe("what the page imports", () => {
  const IMPORT_LINE = /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+"(@jam-overture\/[^"]+)"/g

  const lines = (): readonly { readonly specifier: string; readonly names: readonly string[] }[] =>
    [...page.matchAll(IMPORT_LINE)].map((match) => ({
      specifier: match[2] ?? "",
      names: (match[1] ?? "")
        .split(",")
        .map((name) => name.trim())
        .filter((name) => name.length > 0),
    }))

  it("imports something, so the checks below are not vacuous", () => {
    expect(lines().length).toBeGreaterThan(0)
  })

  it("only names doors the runtime publishes", () => {
    const published = new Set(entryPoints.map((entry) => entry.specifier))

    for (const line of lines()) {
      expect(published, `${line.specifier} is not a published entry point`).toContain(
        line.specifier
      )
    }
  })

  /**
   * The one number this page types, and the reason it is safe to type: the list
   * it counts is in this route group, so the word can be spelled from it. Same
   * rule `counts.ts` applies to a size read off Loom, one page further out.
   */
  it("counts the endings of a write correctly", () => {
    expect(page).toContain(`${spellOut(WRITE_ENDING_ORDER.length)} ways a write can end`)
  })

  it("reaches for both testing doors, which is what the page is about", () => {
    const reached = new Set(lines().map((line) => line.specifier))

    expect(reached).toContain("@jam-overture/loom/testing")
    expect(reached).toContain("@jam-overture/loom/testing/contracts")
  })
})

/**
 * The page's last claim, which is that one line of a reader's test file buys
 * them the whole suite. Run here against the implementation the page names, so
 * the line on the page is a line somebody has called.
 */
describeTreeStoreContract("memoryTreeStore", () => memoryTreeStore())
