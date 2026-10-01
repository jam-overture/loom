import { describe, expect, it } from "vitest"

import {
  buildElement,
  buildText,
  composeChange,
  createTree,
  defaultGatePolicy,
  deltaIdSchema,
  fixedPolicy,
  nodeIdSchema,
  noopEventSink,
  primitiveTypeSchema,
  sequentialIdFactory,
  systemClock,
  type ChangeInterpreter,
  type CompositionOutcome,
  type CompositionRuntime,
  type EditIntent,
  type LoomTree,
  type PropsVocabulary,
  type StakeFactorCode,
  type TreeDelta,
  type TreeOperation,
} from "@jam-overture/loom"

import { portalPolicy, portalPropsVocabulary } from "./policy"

/**
 * The two floors this deployment had left open, measured on both sides.
 *
 * ## What this file is evidence of
 *
 * `Loom marketing` filed, on 23 September, that nothing in this repository wired
 * a props vocabulary and that 0173's registered-types list was unset on all four
 * surfaces. Its own row is closed. This is the portal's, and a suite that only
 * asserted the new behavior would be worth much less than one that also measures
 * the old: *this change is refused now* is a fact about a policy, and **this exact
 * change was committed yesterday** is the fact that says why the policy needed
 * changing.
 *
 * So every case below is put twice — once to this deployment's real policy and
 * real vocabulary, and once to `defaultGatePolicy` with neither wired, which is
 * what this portal ran for a month and what every deployment gets until it opts
 * in. The second half is the measurement and it must keep passing: it is not a
 * test of something broken, it is the record of what the default does.
 *
 * ## Why it composes rather than commits
 *
 * `composeChange` is the published seam that stops at the verdict (0021):
 * interpret, analyse, judge, and hand back what was decided without writing
 * anything. `commitIntent` would need a store, a hold store and a journal to say
 * the same thing, and the thing being measured happens before any of the three.
 *
 * The interpreter is a fixture rather than a model, for the reason 0057 gives
 * about a preset: what is being demonstrated is what the **write path** does with
 * a bad change, and where the bad change came from is no part of the claim.
 */

const ids = () => sequentialIdFactory("floor")

/**
 * A page built only from types this portal registers, so nothing about the page
 * itself is at stake in any of this.
 */
const page = (): LoomTree => {
  const factory = ids()

  return createTree(
    buildElement(factory, {
      type: "loom.page",
      props: {},
      children: [
        buildElement(factory, {
          type: "loom.heading",
          props: { level: 1 },
          children: [buildText(factory, "Autumn arrivals")],
        }),
        buildElement(factory, {
          type: "loom.prose",
          props: { tone: "muted" },
          children: [buildText(factory, "Everything new, in one place.")],
        }),
      ],
    }),
    factory
  )
}

/**
 * The ids the builders mint, a child before its parent: text, heading, text,
 * prose, page.
 */
const HEADING = nodeIdSchema.parse("n_floor2")
const PROSE = nodeIdSchema.parse("n_floor4")
const PAGE = nodeIdSchema.parse("n_floor5")

/**
 * A second factory for the parts a change *adds*, and it has to be a second one.
 *
 * `sequentialIdFactory("floor")` starts at one every time it is called, so a node
 * built for an insert with a fresh factory of the same prefix is minted `n_floor1`
 * — which is the id of the page's first text. The insert then fails to apply
 * before the Gate weighs anything, and the whole suite reports `not-applicable`
 * where it means to report a refusal. Worth the comment because the failure looks
 * exactly like the floor not being wired.
 */
const added = sequentialIdFactory("new")

const planned = (operations: readonly TreeOperation[]): ChangeInterpreter => ({
  interpret: async (intent, tree) => {
    const factory = ids()
    const delta: TreeDelta = {
      deltaId: deltaIdSchema.parse("d_floor"),
      treeId: tree.treeId,
      baseRevision: tree.revision,
      operations,
    }

    return {
      ok: true,
      value: {
        proposalId: factory.proposalId(),
        intentId: intent.intentId,
        delta,
        rationale: "a fixture, so that what is measured is the write path",
        /**
         * High on purpose. Every rule about confidence is satisfied, so a
         * refusal in either half of this file can only have come from a floor —
         * which is the whole point of pinning it rather than leaving it at
         * whatever a default happens to be.
         */
        provenance: {
          origin: intent.origin,
          /**
           * `model`, although this fixture is not one. The floors are about what
           * a model gets wrong at three in the morning, and `runtime` would make
           * every reading of these refusals say the change was worked out from
           * the record rather than asked of a model (0007, 0031) — a different
           * story from the one being measured.
           */
          authoredBy: "model",
          confidence: 0.99,
          interpreter: "floors-fixture",
          interpretedAt: systemClock.now(),
        },
      },
    }
  },
})

const put = async (
  operations: readonly TreeOperation[],
  wiring: { readonly policy: typeof portalPolicy; readonly propsVocabulary?: PropsVocabulary }
): Promise<CompositionOutcome> => {
  const factory = ids()
  const runtime: CompositionRuntime = {
    interpreter: planned(operations),
    policySource: fixedPolicy(wiring.policy),
    events: noopEventSink,
    clock: systemClock,
    idFactory: factory,
    ...(wiring.propsVocabulary ? { propsVocabulary: wiring.propsVocabulary } : {}),
  }

  const intent: EditIntent = {
    intentId: factory.intentId(),
    treeId: page().treeId,
    baseRevision: 0,
    /**
     * The origin with the most latitude of the four, so it is the hardest case to
     * refuse and the only honest one to measure on. A floor that only held
     * against a schedule would be a ceiling.
     */
    origin: "user-instruction",
    actor: "somebody using the portal",
    utterance: "a fixture",
    observedAt: systemClock.now(),
  }

  return await composeChange(runtime, page(), intent)
}

const asThisDeployment = (operations: readonly TreeOperation[]) =>
  put(operations, {
    policy: portalPolicy,
    ...(portalPropsVocabulary ? { propsVocabulary: portalPropsVocabulary } : {}),
  })

/** Neither floor wired: the runtime's own default, and this portal until today. */
const withNeitherFloor = (operations: readonly TreeOperation[]) =>
  put(operations, { policy: defaultGatePolicy })

const factorsOf = (outcome: CompositionOutcome): readonly StakeFactorCode[] =>
  "assessment" in outcome ? outcome.assessment.stakes.factors.map((factor) => factor.code) : []

const undrawable = () =>
  buildElement(added, {
    type: primitiveTypeSchema.parse("app.testimonial-wall"),
    props: {},
    children: [],
  })

/**
 * A part naming a kind of thing this portal has never registered, added **inside
 * the heading** rather than at the page root.
 *
 * The depth is not incidental and getting it wrong cost this file a rewrite. The
 * default policy counts a structural change at depth 1 or above as rearranging
 * the page, so an insert directly under the root raises `shallow-structural-change`
 * as well — two factors, and a suite asserting one would have been asserting the
 * wrong one half the time. Depth 2 isolates the floor, which is what every
 * assertion here is about.
 *
 * The two-factor case has a describe block of its own below, because it is worth
 * having rather than worth avoiding.
 */
const ADDS_AN_UNDRAWABLE_PART: readonly TreeOperation[] = [
  { op: "insert", parentId: HEADING, index: 1, node: undrawable() },
]

/** The same part, at the root, where the shape of the change counts against it too. */
const ADDS_AN_UNDRAWABLE_PART_AT_THE_ROOT: readonly TreeOperation[] = [
  { op: "insert", parentId: PAGE, index: 2, node: undrawable() },
]

/** A setting `loom.prose` declares an enum for, set to a value outside it. */
const SETS_A_VALUE_THE_PART_REFUSES: readonly TreeOperation[] = [
  {
    op: "configure",
    nodeId: PROSE,
    set: { tone: "shouty" },
    unset: [],
  },
]

describe("a change that adds a kind of part this site cannot draw", () => {
  it("is refused on this deployment", async () => {
    const outcome = await asThisDeployment(ADDS_AN_UNDRAWABLE_PART)

    expect(outcome.kind).toBe("rejected")
  })

  it("is weighed as the most serious kind there is, by the floor and not by its shape", async () => {
    const outcome = await asThisDeployment(ADDS_AN_UNDRAWABLE_PART)

    /*
     * The level and the factor asserted together, because either alone is
     * satisfiable by the wrong thing. `critical` alone would pass if a rule about
     * protected types had fired; the factor alone would pass if the floor had
     * been wired at a level that lets the change through.
     */
    expect({
      level: "assessment" in outcome ? outcome.assessment.stakes.level : undefined,
      factors: factorsOf(outcome),
    }).toEqual({ level: "critical", factors: ["unknown-primitive"] })
  })

  /**
   * The measurement. Nothing about this change is different in this half — same
   * page, same operations, same confidence, same origin — and it **applies**.
   */
  it("was accepted, and would have drawn a hole on the page, before either floor was wired", async () => {
    const outcome = await withNeitherFloor(ADDS_AN_UNDRAWABLE_PART)

    expect({ kind: outcome.kind, factors: factorsOf(outcome) }).toEqual({
      kind: "applied",
      factors: [],
    })
  })

  it("names the type, so a repairer and a reader are told which part does not exist", async () => {
    const outcome = await asThisDeployment(ADDS_AN_UNDRAWABLE_PART)
    const detail = "assessment" in outcome ? outcome.assessment.stakes.factors[0]?.detail : ""

    expect(detail).toContain("app.testimonial-wall")
  })
})

/**
 * Two things wrong with one change, which is the ordinary case rather than the
 * exotic one: a model adding a band it invented adds it at the top of the page,
 * where the shape of the change counts against it as well.
 *
 * Worth its own block because it is the shape `refusal.ts` sorts, and because the
 * property that matters is that the floor is **not** lost among the others: a
 * reader of this refusal has to be told the part cannot be drawn, whatever else
 * was also true of it.
 */
describe("a change with more than one thing wrong with it", () => {
  it("records both, with the floor among them", async () => {
    const outcome = await asThisDeployment(ADDS_AN_UNDRAWABLE_PART_AT_THE_ROOT)

    expect(outcome.kind).toBe("rejected")
    expect(factorsOf(outcome)).toContain("unknown-primitive")
    expect(factorsOf(outcome)).toContain("shallow-structural-change")
  })

  /**
   * And the measurement again, on the interesting half of it. With neither floor
   * wired this change was still weighed — `shallow-structural-change` fired, the
   * Gate had something to say — and what it had to say was the wrong thing: a
   * verdict about the page being rearranged, on a change whose real problem was
   * that one of its parts would not draw.
   */
  it("was weighed on its shape alone before the floors, and applied", async () => {
    const outcome = await withNeitherFloor(ADDS_AN_UNDRAWABLE_PART_AT_THE_ROOT)

    expect(outcome.kind).toBe("applied")
    expect(factorsOf(outcome)).toEqual(["shallow-structural-change"])
  })
})

describe("a change that sets a part up in a way that part refuses", () => {
  it("is refused on this deployment", async () => {
    const outcome = await asThisDeployment(SETS_A_VALUE_THE_PART_REFUSES)

    expect(outcome.kind).toBe("rejected")
  })

  it("is caught on its own floor and not on the other one's", async () => {
    const outcome = await asThisDeployment(SETS_A_VALUE_THE_PART_REFUSES)

    expect(factorsOf(outcome)).toEqual(["invalid-props"])
  })

  /**
   * The same measurement as above, and the one that was the more visible of the
   * two on this deployment: a value outside a part's own list was written, kept in
   * the record, and found out about at the next render — by every reader rather
   * than by the one who asked.
   */
  it("was accepted before the vocabulary was wired", async () => {
    const outcome = await withNeitherFloor(SETS_A_VALUE_THE_PART_REFUSES)

    expect({ kind: outcome.kind, factors: factorsOf(outcome) }).toEqual({
      kind: "applied",
      factors: [],
    })
  })

  /**
   * Three things a refusal has to carry for it to be one a repairer or a person
   * can act on, and 0179's whole argument is that a refusal missing any of them
   * is useless: which setting, what was asked for, and what that part does offer.
   */
  it("names the setting, the value asked for, and the values that part offers", async () => {
    const outcome = await asThisDeployment(SETS_A_VALUE_THE_PART_REFUSES)
    const detail = "assessment" in outcome ? (outcome.assessment.stakes.factors[0]?.detail ?? "") : ""

    expect(detail).toContain("tone")
    expect(detail).toContain("shouty")
    expect(detail).toContain("normal")
    expect(detail).toContain("muted")
  })
})

/**
 * The floor is a floor and not a ban on editing, which is the property that makes
 * it safe to have wired at all. A page already holding a type nobody registered
 * is untouched, and only what a change *introduces* is counted — so the ordinary
 * work of a deployment is not now refused for a reason nobody asked about.
 */
describe("what the floors deliberately do not refuse", () => {
  it("lets an ordinary change to a part this site does register through", async () => {
    const outcome = await asThisDeployment([
      { op: "configure", nodeId: PROSE, set: { tone: "normal" }, unset: [] },
    ])

    expect({ kind: outcome.kind, factors: factorsOf(outcome) }).toEqual({
      kind: "applied",
      factors: [],
    })
  })

  it("lets a part be added, as long as this site can draw it", async () => {
    const outcome = await asThisDeployment([
      {
        op: "insert",
        parentId: HEADING,
        index: 1,
        node: buildElement(added, {
          type: primitiveTypeSchema.parse("loom.card"),
          props: {},
          children: [],
        }),
      },
    ])

    expect({ kind: outcome.kind, factors: factorsOf(outcome) }).toEqual({
      kind: "applied",
      factors: [],
    })
  })
})

/**
 * What the wiring is, asserted rather than assumed.
 *
 * Both halves of this file would still pass if `portalPolicy` listed four types
 * that happened to include everything used above and `portalPropsVocabulary` were
 * a validator of somebody else's registry. These two say the list is **derived
 * from the registry the renderer resolves against**, which is the property the
 * module comment claims and the reason the two seams cannot drift.
 */
describe("this deployment's wiring", () => {
  it("declares exactly the types it registers, and at least one", () => {
    expect(portalPolicy.registeredPrimitiveTypes.length).toBeGreaterThan(0)
    expect([...portalPolicy.registeredPrimitiveTypes].sort()).toEqual(
      ["loom.card", "loom.heading", "loom.page", "loom.prose"].map((type) =>
        primitiveTypeSchema.parse(type)
      )
    )
  })

  it("checks settings against the same primitives", () => {
    expect(portalPropsVocabulary).toBeDefined()
    expect(portalPropsVocabulary?.(primitiveTypeSchema.parse("loom.prose"), { tone: "shouty" })).toMatchObject(
      { outcome: "invalid" }
    )
    expect(portalPropsVocabulary?.(primitiveTypeSchema.parse("loom.prose"), { tone: "muted" })).toMatchObject(
      { outcome: "valid" }
    )
  })
})
