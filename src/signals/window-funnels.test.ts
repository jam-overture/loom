import { describe, expect, it } from "vitest"

import type { AudienceId } from "../audience/audience.js"
import type { TreeId } from "../ids.js"
import type { JsonObject } from "../json.js"
import { nodeId, OTHER_TREE, primitiveType, RIDERS, SKIERS, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import {
  DEFAULT_REGION_FLOOR,
  funnelReachOf,
  treesIn,
  windowAssemblyOf,
  windowFunnelsOf,
  type DeploymentReadingContext,
  type FunnelPair,
  type PartDeclarations,
  type ReaderTally,
  type ReaderWindow,
  type StoredFunnel,
  type StoredPageViews,
  type StoredTally,
} from "./index.js"

/**
 * Built on real windows and real assemblies, because what is under test is a
 * composition: every answer below is checked against `funnelReachOf` called
 * directly with the rows this says it is entitled to, so the test passes only
 * where the line is the one a careful caller would have written.
 */

const element = (
  name: string,
  type: string,
  props: JsonObject = {},
  children: readonly LoomNode[] = []
): ElementNode => ({
  kind: "element",
  id: nodeId(name),
  type: primitiveType(type),
  props,
  children,
})

const PAGE = element("page", "loom.page", {}, [
  element("band", "loom.section", { body: "a word" }),
  element("cta", "loom.button", {}),
])

const treeOf = (treeId: TreeId, revision: number): LoomTree => ({
  treeId,
  schemaVersion: TREE_SCHEMA_VERSION,
  revision,
  root: PAGE,
})

const DECLARED: PartDeclarations = {
  copyFor: (type) => (type === "loom.section" ? ["body"] : undefined),
  typesWithRole: () => [],
}

const AT = "2026-11-01T09:00:00.000Z"

const tally = (
  where: { readonly treeId?: TreeId; readonly revision?: number; readonly audienceId?: AudienceId },
  name: string,
  counters: Partial<ReaderTally> = {}
): StoredTally =>
  ({
    treeId: where.treeId ?? TREE,
    revision: where.revision ?? 1,
    nodeId: nodeId(name),
    type: primitiveType(name === "cta" ? "loom.button" : "loom.section"),
    views: 10,
    reached: 10,
    engaged: 0,
    dwellMs: 0,
    activations: 0,
    opens: 0,
    closes: 0,
    completions: 0,
    updatedAt: AT,
    ...(where.audienceId === undefined ? {} : { audienceId: where.audienceId }),
    ...counters,
  }) as StoredTally

const door = (
  where: { readonly treeId?: TreeId; readonly revision?: number; readonly audienceId?: AudienceId },
  opened: number
): StoredPageViews =>
  ({
    treeId: where.treeId ?? TREE,
    revision: where.revision ?? 1,
    opened,
    appearances: opened,
    updatedAt: AT,
    ...(where.audienceId === undefined ? {} : { audienceId: where.audienceId }),
  }) as StoredPageViews

const pair = (from: string, to: string): FunnelPair => ({
  from: { nodeId: nodeId(from), kind: "viewed" },
  to: { nodeId: nodeId(to), kind: "completed" },
})

const funnel = (
  where: { readonly treeId?: TreeId; readonly revision?: number; readonly audienceId?: AudienceId },
  reached: number,
  converted: number
): StoredFunnel =>
  ({
    treeId: where.treeId ?? TREE,
    revision: where.revision ?? 1,
    pair: pair("band", "cta"),
    reached,
    converted,
    updatedAt: AT,
    ...(where.audienceId === undefined ? {} : { audienceId: where.audienceId }),
  }) as StoredFunnel

const windowOf = (held: Partial<ReaderWindow> = {}): ReaderWindow => ({
  tallies: [],
  funnels: [],
  pageViews: [],
  regions: undefined,
  ...held,
})

const TREES = treesIn([treeOf(TREE, 1), treeOf(TREE, 2), treeOf(OTHER_TREE, 1)])

const CONTEXT: DeploymentReadingContext = {
  trees: TREES,
  declarations: DECLARED,
  floor: DEFAULT_REGION_FLOOR,
  placings: { placingFor: () => undefined },
}

const funnelsOf = (held: Partial<ReaderWindow>) => {
  const window = windowOf(held)
  const assembly = windowAssemblyOf(window, CONTEXT)

  return { window, assembly, funnels: windowFunnelsOf(window, assembly) }
}

/** One page at two revisions, each with a question and a door row. */
const CHANGED: Partial<ReaderWindow> = {
  tallies: [tally({ revision: 1 }, "band"), tally({ revision: 2 }, "band")],
  pageViews: [door({ revision: 1 }, 100), door({ revision: 2 }, 100)],
  funnels: [funnel({ revision: 1 }, 80, 20), funnel({ revision: 2 }, 80, 60)],
}

describe("a window's funnels, read off the window and its assembly", () => {
  it("answers one reading per reading the window holds, in the readings' own order", () => {
    const { window, assembly, funnels } = funnelsOf(CHANGED)

    expect(funnels.pages).toHaveLength(assembly.readings.pages.length)
    expect(funnels.pages.map((answer) => answer.revision)).toEqual(
      assembly.readings.pages.map((reading) => reading.revision)
    )
    expect(funnels.pages).toEqual(
      assembly.readings.pages.map((reading) =>
        funnelReachOf(reading, window.funnels, window.pageViews)
      )
    )
  })

  it("filters each answer to its own revision, which is what a caller could get wrong", () => {
    const { funnels } = funnelsOf(CHANGED)

    const was = funnels.pages.find((answer) => answer.revision === 1)
    const now = funnels.pages.find((answer) => answer.revision === 2)

    expect(was?.pairs.map((held) => held.converted)).toEqual([20])
    expect(now?.pairs.map((held) => held.converted)).toEqual([60])
    /** The other revision's rows are named as ignored rather than silently gone. */
    expect(was?.foreignPairs).toBe(1)
  })

  it("scopes each answer to its own form, so two forms are two answers and not one", () => {
    const { funnels } = funnelsOf({
      tallies: [
        tally({ audienceId: SKIERS }, "band"),
        tally({ audienceId: RIDERS }, "band"),
      ],
      pageViews: [door({ audienceId: SKIERS }, 500), door({ audienceId: RIDERS }, 300)],
      funnels: [
        funnel({ audienceId: SKIERS }, 400, 40),
        funnel({ audienceId: RIDERS }, 200, 150),
      ],
    })

    expect(funnels.pages).toHaveLength(2)
    expect(
      funnels.pages.map((answer) => [answer.audienceId, answer.pairs[0]?.converted])
    ).toEqual([
      [RIDERS, 150],
      [SKIERS, 40],
    ])
    expect(funnels.pages.every((answer) => answer.otherAudiencePairs === 1)).toBe(true)
  })

  it("pairs the two revisions of a form, which is what a comparison of funnels takes", () => {
    const { funnels, assembly } = funnelsOf(CHANGED)

    expect(funnels.pairs).toHaveLength(assembly.pairs.pairs.length)
    expect(funnels.pairs[0]?.was.revision).toBe(1)
    expect(funnels.pairs[0]?.now.revision).toBe(2)
  })

  it("gives a pair's side the same answer object as the reading of that form", () => {
    const { funnels } = funnelsOf(CHANGED)

    const was = funnels.pages.find((answer) => answer.revision === 1)
    const now = funnels.pages.find((answer) => answer.revision === 2)

    /**
     * The same object and not an equal one: two answers of one revision on one
     * screen is what reusing them makes impossible.
     */
    expect(funnels.pairs[0]?.was).toBe(was)
    expect(funnels.pairs[0]?.now).toBe(now)
  })

  it("reads a pair's side that the readings do not hold, rather than dropping the pair", () => {
    const { window, assembly, funnels } = funnelsOf(CHANGED)

    const assembled = {
      ...assembly,
      readings: { ...assembly.readings, pages: [] },
    }
    const alone = windowFunnelsOf(window, assembled)

    expect(alone.pages).toEqual([])
    expect(alone.pairs).toHaveLength(1)
    expect(alone.pairs[0]?.was.pairs.map((held) => held.converted)).toEqual([20])
    /** Read rather than reused, so these are equal to the ordinary answers and not them. */
    expect(alone.pairs[0]?.was).toEqual(funnels.pairs[0]?.was)
    expect(alone.pairs[0]?.was).not.toBe(funnels.pairs[0]?.was)
  })

  it("answers a window with no funnel rows at all without inventing a question", () => {
    const { funnels } = funnelsOf({
      tallies: [tally({}, "band")],
      pageViews: [door({}, 10)],
    })

    expect(funnels.pages).toHaveLength(1)
    expect(funnels.pages[0]?.pairs).toEqual([])
    expect(funnels.pages[0]?.opened).toBe(10)
    expect(funnels.pairs).toEqual([])
  })

  it("holds a page the window has no tree for out of the answers, as the assembly does", () => {
    const unknown = treeOf(OTHER_TREE, 9)
    const { funnels, assembly } = funnelsOf({
      tallies: [tally({ treeId: unknown.treeId, revision: 9 }, "band")],
      pageViews: [door({ treeId: unknown.treeId, revision: 9 }, 10)],
      funnels: [funnel({ treeId: unknown.treeId, revision: 9 }, 5, 1)],
    })

    expect(assembly.readings.unjoined).toHaveLength(1)
    expect(funnels.pages).toEqual([])
    expect(funnels.pairs).toEqual([])
  })
})
