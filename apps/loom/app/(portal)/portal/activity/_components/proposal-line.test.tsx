import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { deltaIdSchema, nodeIdSchema, proposalIdSchema, treeIdSchema } from "@loom/runtime"
import type { ProposalEpisode } from "@loom/runtime/telemetry"

import { ProposalLine } from "./proposal-line"

/**
 * The densest jargon on the Activity screen, and the place a refusal is read
 * back. This line used to open with five monospace pairs and then, if the Gate
 * had said anything at all, its disposition *kind* and the policy's own
 * `detail` — a sentence written about thresholds rather than about this change.
 * The rule the Gate actually cited was never named in words.
 *
 * Every one of those facts is still on the line. What these pin is the order,
 * which is the whole of what changed and exactly what a later refactor reverses
 * without noticing.
 */

const treeId = treeIdSchema.parse("t_1")
const proposalId = proposalIdSchema.parse("p_1")

const proposal = (overrides: Partial<ProposalEpisode> = {}): ProposalEpisode => ({
  proposalId,
  provenance: {
    origin: "user-instruction",
    interpreter: "claude-test-1",
    authoredBy: "model",
    confidence: 0.82,
    interpretedAt: "2026-07-31T00:00:00.000Z",
  },
  rationale: "Shorten the heading so it fits on a phone.",
  delta: { deltaId: deltaIdSchema.parse("d_1"), treeId, baseRevision: 0, operations: [] },
  proposedAt: "2026-07-31T00:00:00.000Z",
  held: false,
  repairRequested: false,
  ...overrides,
})

const held = (): ProposalEpisode =>
  proposal({
    held: true,
    assessment: {
      proposalId,
      stakes: "high",
      reversible: false,
      operationCount: 1,
      insertedNodeCount: 0,
      removedNodeCount: 0,
      movedNodeCount: 0,
      configuredNodeCount: 1,
      touchedPrimitiveTypes: [],
      shallowestAffectedDepth: 1,
      retainedNodeCount: 0,
      irreversibilityReasons: ["a removal destroys content"],
    },
    disposition: {
      kind: "requires-confirmation",
      reason: { code: "irreversible", detail: "reversibility below the policy floor" },
      stakes: "high",
      reversible: false,
      confidence: 0.82,
      policyId: "default@2",
    },
  })

const unasked = (container: HTMLElement): string => {
  const disclosure = container.querySelector("details")?.textContent ?? ""

  return (container.textContent ?? "").replace(disclosure, "")
}

describe("ProposalLine", () => {
  it("leads with what the AI wanted, in the AI's own words", () => {
    render(
      <ul>
        <ProposalLine proposal={held()} />
      </ul>
    )

    expect(screen.getByText("Shorten the heading so it fits on a phone.")).toBeTruthy()
  })

  /**
   * `confidence 0.82` is exact and means nothing without knowing the scale or
   * how well it has held up (0007, 0031). The number is never dropped — it is in
   * the disclosure — but the word leads, and it is attributed to the AI.
   */
  it("says how sure the AI was as a sentence, and keeps the number below", () => {
    const { container } = render(
      <ul>
        <ProposalLine proposal={held()} />
      </ul>
    )

    expect(unasked(container)).toContain("The AI says it is fairly sure")
    expect(unasked(container)).not.toContain("0.82")
    expect(container.querySelector("details")?.textContent).toContain("0.82")
  })

  it("says what it would have cost to be wrong, without the level's name", () => {
    const { container } = render(
      <ul>
        <ProposalLine proposal={held()} />
      </ul>
    )

    expect(unasked(container)).toContain("High risk")
    expect(unasked(container)).toContain("this one can't be undone")
    expect(unasked(container)).not.toContain("reversible")
  })

  /**
   * The change this line most needed. `requires-confirmation` was printed as a
   * hyphenated compound beside a sentence about thresholds, and the rule the
   * Gate cited was never said in words at all.
   */
  it("names what Loom decided and why, in words", () => {
    const { container } = render(
      <ul>
        <ProposalLine proposal={held()} />
      </ul>
    )

    expect(screen.getByText("Loom stopped and asked first.")).toBeTruthy()
    expect(unasked(container)).toContain("a person decides")
    expect(unasked(container)).not.toContain("requires-confirmation")
    expect(unasked(container)).not.toContain("irreversible")
  })

  /**
   * The verdict and its reason are two sentences set together, so the verdict
   * has to end. Without the stop this rendered as `Loom made this change on its
   * own Nothing this project watches for was involved` — a screenshot found it,
   * and the assertion above would have passed either way.
   */
  it("ends the verdict before the reason begins", () => {
    const { container } = render(
      <ul>
        <ProposalLine proposal={held()} />
      </ul>
    )
    const verdict = [...container.querySelectorAll("p")].find((p) =>
      p.textContent?.startsWith("Loom stopped and asked first")
    )

    expect(verdict?.textContent).toBe(
      "Loom stopped and asked first. It could not be cleanly undone, so a person decides — however small it is."
    )
  })

  /**
   * Nothing is removed to make a screen simple. A reviewer reading back a
   * refusal has to be able to go and find the rule that caused it.
   */
  it("keeps the rule code, the policy id and the policy's own words one click down", () => {
    const { container } = render(
      <ul>
        <ProposalLine proposal={held()} />
      </ul>
    )
    const disclosure = container.querySelector("details")

    expect(disclosure?.open).toBe(false)
    expect(disclosure?.textContent).toContain("irreversible")
    expect(disclosure?.textContent).toContain("default@2")
    expect(disclosure?.textContent).toContain("requires-confirmation")
    expect(disclosure?.textContent).toContain("reversibility below the policy floor")
    expect(disclosure?.textContent).toContain("claude-test-1")
  })

  /**
   * The delta is kept for every proposal, not only the applied ones (0023). For
   * a refused change it is the only surviving account of what was wanted.
   */
  it("keeps the delta's verbs for a proposal that never applied", () => {
    const { container } = render(
      <ul>
        <ProposalLine
          proposal={proposal({
            delta: {
              deltaId: deltaIdSchema.parse("d_2"),
              treeId,
              baseRevision: 0,
              operations: [{ op: "remove", nodeId: nodeIdSchema.parse("n_1") }],
            },
          })}
        />
      </ul>
    )

    expect(container.querySelector("details")?.textContent).toContain("delete")
  })

  /**
   * The hold exists to put a second person in the way of a change (0027), so the
   * answer is shown apart from who proposed it and never folded into it.
   */
  it("says who answered, as a sentence", () => {
    render(
      <ul>
        <ProposalLine proposal={proposal({ answer: "confirmed", answeredBy: "ana@loom.local" })} />
      </ul>
    )

    expect(screen.getByText("ana@loom.local said yes.")).toBeTruthy()
  })

  it("says an answer with no name on it is a gap rather than an absence", () => {
    render(
      <ul>
        <ProposalLine proposal={proposal({ answer: "discarded" })} />
      </ul>
    )

    expect(screen.getByText("Somebody said no, but the record doesn't say who.")).toBeTruthy()
  })

  /** Nobody has answered, which is a queue and not a gap. Neither line applies. */
  it("says nothing about an answer nobody has given", () => {
    const { container } = render(
      <ul>
        <ProposalLine proposal={proposal()} />
      </ul>
    )

    expect(container.textContent).not.toContain("said yes")
    expect(container.textContent).not.toContain("said no")
  })

  /** `a repair of p_1` names a mechanism; what a reader wants is why it exists. */
  it("explains a second attempt rather than naming the one it replaced", () => {
    const { container } = render(
      <ul>
        <ProposalLine proposal={proposal({ repairOf: proposalIdSchema.parse("p_0") })} />
      </ul>
    )

    expect(unasked(container)).toContain("second attempt")
    expect(unasked(container)).not.toContain("p_0")
    expect(container.querySelector("details")?.textContent).toContain("p_0")
  })

  /**
   * A failure said the stage and the runtime's detail and nothing about what it
   * meant. The reassurance is the part a reader needs; the detail is the part a
   * debugger needs, and both are here.
   */
  it("says what a failure meant for the page, and keeps the runtime's account below", () => {
    const { container } = render(
      <ul>
        <ProposalLine
          proposal={proposal({
            failure: { stage: "commit", code: "conflict", detail: "the base revision moved" },
          })}
        />
      </ul>
    )

    expect(unasked(container)).toContain("while the change was being written down")
    expect(unasked(container)).toContain("Nothing was lost")
    expect(unasked(container)).not.toContain("the base revision moved")
    expect(container.querySelector("details")?.textContent).toContain("the base revision moved")
  })

  /**
   * An ask that broke before the Gate looked at it has a confidence and no
   * assessment. The line gets shorter rather than printing "undefined".
   */
  it("renders without an assessment or a disposition", () => {
    const { container } = render(
      <ul>
        <ProposalLine proposal={proposal()} />
      </ul>
    )

    expect(container.textContent).not.toContain("undefined")
    expect(container.textContent).toContain("The AI says it is fairly sure")
  })
})
