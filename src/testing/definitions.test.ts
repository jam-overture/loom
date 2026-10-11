import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { z } from "zod"

import {
  createDataRegistry,
  defineSource,
  type DataRegistry,
  type SourceEntry,
} from "../data/adapter.js"
import { resolveTreeData } from "../data/resolve.js"
import { sequentialIdFactory } from "../ids.js"
import { DATA_PROP_KEY } from "../reserved-props.js"
import { ok } from "../result.js"
import { auditRegistry } from "../sdk/audit.js"
import type { PrimitiveEntry } from "../sdk/definition.js"
import { describeRenderDiagnostic, type RenderDiagnostic } from "../render/diagnostics.js"
import { renderLoomTree } from "../render/render.js"
import type { UnshownFault } from "../render/unshown.js"
import { buildElement, buildText } from "../tree/builders.js"
import { createTree, type LoomTree } from "../tree/tree.js"

import {
  brokenUnshownDefinition,
  pageDefinition,
  registryOf,
  UNSHOWN_BREAKAGES,
  type UnshownBreakage,
} from "./definitions.js"

/**
 * What `brokenUnshownDefinition` promises, held against the walk it stands in
 * for.
 *
 * It is a fixture that exists to be wrong, which makes *how* it is wrong the
 * only thing it has to offer. A stand-in that raised two diagnostics, or raised
 * the wrong one, or raised none because an unrelated prop omitted its node,
 * would be worse than the eleven lines each lane wrote before it existed: those
 * at least failed in the lane that wrote them.
 */

const SOURCE = "catalogue.entries"

const sources = (): DataRegistry => {
  const entry: SourceEntry = defineSource({
    id: SOURCE,
    description: "The entries this fixture offers",
    params: z.object({}).passthrough(),
    answers: z.array(z.string()),
    adapter: { fetch: () => Promise.resolve(ok(["A row"])) },
  })

  const registry = createDataRegistry([entry])
  if (!registry.ok) throw new Error(`test source registry refused: ${registry.error.code}`)

  return registry.value
}

/** One bound node per definition, under a page, each asking the one source. */
const treeOf = (definitions: readonly PrimitiveEntry[], props: object = {}): LoomTree => {
  const idFactory = sequentialIdFactory()

  const bound = definitions.map((definition) =>
    buildElement(idFactory, {
      type: definition.type,
      props: { ...props, [DATA_PROP_KEY]: { entries: { source: SOURCE } } } as never,
      children: [buildText(idFactory, "")],
    })
  )

  return createTree(
    buildElement(idFactory, {
      type: "loom.page",
      props: { title: "The broken declarations" } as never,
      children: bound,
    }),
    idFactory
  )
}

const renderOf = async (definitions: readonly PrimitiveEntry[], props: object = {}) => {
  const registry = registryOf([pageDefinition, ...definitions])
  const tree = treeOf(definitions, props)
  const data = await resolveTreeData(tree, { registry: sources() })

  return renderLoomTree(tree, { resolver: registry, validator: registry, data })
}

const faultOf = (diagnostic: RenderDiagnostic): UnshownFault => {
  if (diagnostic.code !== "unshown-unreadable") {
    throw new Error(`expected unshown-unreadable, got ${diagnostic.code}`)
  }

  return diagnostic.fault
}

const onlyDiagnosticFor = async (breakage: UnshownBreakage): Promise<RenderDiagnostic> => {
  const rendered = await renderOf([brokenUnshownDefinition(breakage)])

  /** Rendering is total and the node draws anyway (0206), so the markup is
   * produced here too: a declaration caught by the walk must not reappear as a
   * throw when React mounts the element it did not stop. */
  renderToStaticMarkup(rendered.element)

  expect(rendered.diagnostics).toHaveLength(1)

  return rendered.diagnostics[0] as RenderDiagnostic
}

/**
 * The sentence the runtime writes for each breakage, pinned.
 *
 * Not an assertion about the fixture — an assertion that the fixture still
 * reaches the refusal it was written to reach. `readUnshown` makes seven of
 * them and each detail is built from its own template; a member that stopped
 * reaching its own and started sharing another's would still be refused, still
 * be one diagnostic, and no longer demonstrate what its name says.
 */
const DETAILS: Readonly<Record<UnshownBreakage, UnshownFault>> = {
  throws: { kind: "threw", detail: "the reader of this answer is not written yet" },
  "not-an-array": {
    kind: "impossible",
    detail: "the declaration returned no readings at all",
  },
  "not-a-reading": { kind: "impossible", detail: "reading 0 is not a reading" },
  unnamed: { kind: "impossible", detail: "reading 0 names no binding" },
  "uncountable-given": {
    kind: "impossible",
    detail: 'reading 0 ("entries") was given NaN rows',
  },
  "uncountable-shown": {
    kind: "impossible",
    detail: 'reading 0 ("entries") showed 1.5 rows',
  },
  "more-shown-than-given": {
    kind: "impossible",
    detail: 'reading 0 ("entries") showed 2 of 1 rows',
  },
}

describe("a primitive that breaks the declaration it made", () => {
  it.each(UNSHOWN_BREAKAGES)(
    "raises unshown-unreadable and nothing else, broken %s",
    async (breakage) => {
      const diagnostic = await onlyDiagnosticFor(breakage)

      expect(diagnostic).toEqual({
        code: "unshown-unreadable",
        nodeId: expect.any(String),
        type: `test.unshown-${breakage}`,
        fault: DETAILS[breakage],
      })
    }
  )

  /**
   * The list's own claim. Two members producing one fault would mean a lane
   * showing the diagnostic once per shape shows the same shape twice, which is
   * the failure the names make invisible.
   */
  it("produces a different fault for every breakage it names", async () => {
    const faults = await Promise.all(
      UNSHOWN_BREAKAGES.map(async (breakage) => faultOf(await onlyDiagnosticFor(breakage)))
    )
    const sentences = faults.map((fault) => `${fault.kind}: ${fault.detail}`)

    expect(new Set(sentences).size).toBe(UNSHOWN_BREAKAGES.length)
    expect(new Set(faults.map((fault) => fault.kind))).toEqual(new Set(["threw", "impossible"]))
  })

  /**
   * The type carries the breakage so that a lane showing all seven needs one
   * registry and one tree rather than seven of each — which is the whole
   * difference between this and the broken component every lane wrote for
   * itself.
   */
  it("registers all seven together and reports each on its own node", async () => {
    const definitions = UNSHOWN_BREAKAGES.map(brokenUnshownDefinition)
    const rendered = await renderOf(definitions)

    expect(rendered.diagnostics).toHaveLength(UNSHOWN_BREAKAGES.length)
    expect(rendered.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      UNSHOWN_BREAKAGES.map(() => "unshown-unreadable")
    )
    expect(new Set(rendered.diagnostics.map((diagnostic) => diagnostic.nodeId)).size).toBe(
      UNSHOWN_BREAKAGES.length
    )
  })

  /**
   * Broken in the declaration and in nothing else. A fixture that also failed
   * the §4 probe would tell a lane that its registry is unfit for the portal,
   * which is a second fault wearing the same fixture's name.
   */
  it("is well-behaved in every respect but the declaration", () => {
    const registry = registryOf(UNSHOWN_BREAKAGES.map(brokenUnshownDefinition))
    const audit = auditRegistry(registry)

    expect(audit.notDecorated).toEqual([])
    expect(audit.notProbeable).toEqual([])
    expect(audit.unplacedSlots).toEqual([])
  })

  /**
   * Why its props are declared open where `loom.card` next door is strict.
   * A refused bag omits the node, which takes the declaration with it — so a
   * strict empty schema would let any unrelated prop hand a lane an empty
   * diagnostic list in place of the fault it asked for.
   */
  it("cannot be silenced by a prop it never declared", async () => {
    const rendered = await renderOf([brokenUnshownDefinition("throws")], { heading: "Entries" })

    expect(rendered.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "unshown-unreadable",
    ])
  })

  /** What a lane reading a log actually gets, for the one row it came for. */
  it("describes itself as a fault in the component rather than the tree", async () => {
    const sentence = describeRenderDiagnostic(await onlyDiagnosticFor("throws"))

    expect(sentence).toContain("test.unshown-throws")
    expect(sentence).toContain("the declaration threw")
  })
})
