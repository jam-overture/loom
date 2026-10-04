import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  deltaIdSchema,
  nodeIdSchema,
  proposalIdSchema,
  sequentialIdFactory,
  treeIdSchema,
  type IrreversibilityReason,
  type PrimitiveType,
} from "@jam-overture/loom"
import { recordOf, type AssessmentSummary, type ProposalEpisode } from "@jam-overture/loom/telemetry"
import { buildAssessment, buildProposal } from "@jam-overture/loom/testing"

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

/**
 * A judged change, narrated by the runtime rather than written out here.
 *
 * This fixture used to be an `AssessmentSummary` literal, and two of its values
 * described a record no run of Loom can produce: `irreversibilityReasons` held
 * the sentence *"a removal destroys content"* where the runtime only ever puts
 * one of two codes, and it paired that claim with `retainedNodeCount: 0` while
 * the runtime sets the retained count *from* the removal. It was green and
 * inert for as long as nothing read the field — and this line reads it now, so
 * the fixture would have gone on passing while the screen rendered a reason
 * nobody wrote a sentence for. Filed on 3 October by `Loom daily build`, with
 * this replacement written out, and this is it adopted (0216).
 *
 * `buildAssessment` derives the level from the factors, the reversible flag from
 * the reasons and the retained count from the removal, so none of the three can
 * be set to disagree with the others. `recordOf` then narrows it exactly as the
 * journal does — which is what makes the `AssessmentSummary` below the real
 * shape rather than this test's idea of it.
 */
const summaryOf = (reasons: readonly IrreversibilityReason[]): AssessmentSummary => {
  const ids = sequentialIdFactory("a")
  const built = buildProposal(ids, {
    intentId: ids.intentId(),
    delta: { deltaId: deltaIdSchema.parse("d_1"), treeId, baseRevision: 0, operations: [] },
    confidence: 0.82,
  })

  const record = recordOf({
    treeId,
    occurredAt: "2026-07-31T00:00:00.000Z",
    event: {
      type: "change-assessed",
      assessment: buildAssessment(ids, {
        proposal: built,
        analysis: { operationCount: 1, removedNodeCount: 4, shallowestAffectedDepth: 1 },
        factors: [
          { code: "large-removal", level: "high", detail: "removes 4 parts of the page" },
        ],
        irreversibilityReasons: reasons,
      }),
    },
  })

  if (record.event.type !== "change-assessed") throw new Error("narrated the wrong event")

  /*
   * The one field replaced afterwards. The episode this line is handed is keyed
   * by `p_1` throughout the file, and the double mints its own id — so the id is
   * put back and nothing else is, which keeps the hand-written half down to the
   * single fact the surrounding tests depend on.
   */
  return { ...record.event.assessment, proposalId }
}

const held = (
  reasons: readonly IrreversibilityReason[] = [
    { code: "retention-budget-exceeded", retainedNodeCount: 4, budget: 2 },
  ]
): ProposalEpisode =>
  proposal({
    held: true,
    assessment: summaryOf(reasons),
    disposition: {
      kind: "requires-confirmation",
      reason: { code: "irreversible", detail: "cannot be undone cleanly: retention-budget-exceeded" },
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
    expect(disclosure?.textContent).toContain("cannot be undone cleanly")
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
   * The change of 3 October, and the defect it closes is one sentence long:
   * this line has said `this one can't be undone` since it was written and has
   * never said *why*. The runtime computes two obstacles that ask opposite
   * things of the reader — go and check a payment, or decide whether content is
   * worth keeping — and the journal has carried the codes for both the whole
   * time.
   */
  it("says why a change cannot be undone, not only that it cannot", () => {
    const { container } = render(
      <ul>
        <ProposalLine proposal={held()} />
      </ul>
    )

    expect(unasked(container)).toContain("Too much would have to be kept to put it back.")
    expect(unasked(container)).toContain("gone for good")
    expect(unasked(container)).toContain("This one takes 4 parts off the page.")
  })

  /**
   * Strengthened on 4 October, when `outOfTreeEffectTypes` landed. It asserted
   * the generic clause — *"Check whatever that part is wired to"* — because the
   * record could not say **which** part, which this lane filed as a finding on
   * the 3rd. It can now, so the sentence names the piece and so does this.
   */
  it("names the piece that reaches outside the page, and says to go and look at it", () => {
    const { container } = render(
      <ul>
        <ProposalLine
          proposal={held([
            { code: "out-of-tree-effect", primitiveTypes: ["loom.form" as PrimitiveType] },
          ])}
        />
      </ul>
    )

    expect(unasked(container)).toContain("Check what Form is wired to before you say yes")
    expect(unasked(container)).toContain("This change sets up Form, which reaches beyond the page")
    expect(unasked(container)).not.toContain("Too much would have to be kept")
    /* The runtime's own identifier stays where every other code on this line is. */
    expect(unasked(container)).not.toContain("loom.form")
    expect(container.querySelector("details")?.textContent).toContain("out-of-tree-effect")
  })

  /** The codes go where every other code on this line already is. */
  it("keeps the obstacle's code and the retained count one click down", () => {
    const { container } = render(
      <ul>
        <ProposalLine proposal={held()} />
      </ul>
    )

    expect(unasked(container)).not.toContain("retention-budget-exceeded")
    expect(container.querySelector("details")?.textContent).toContain("retention-budget-exceeded")
    expect(container.querySelector("details")?.textContent).toContain("retained")
  })

  /**
   * The explanation belongs with the fact it explains. `this one can't be
   * undone` is a property of the change; what Loom then decided to do about it
   * is a separate question, and a refactor that files the reason under the
   * verdict has moved the answer away from the question.
   */
  it("explains the undo before saying what Loom decided", () => {
    const { container } = render(
      <ul>
        <ProposalLine proposal={held()} />
      </ul>
    )
    const read = unasked(container)

    expect(read.indexOf("can't be undone")).toBeLessThan(
      read.indexOf("Too much would have to be kept")
    )
    expect(read.indexOf("Too much would have to be kept")).toBeLessThan(
      read.indexOf("Loom stopped and asked first")
    )
  })

  /** A change that can be undone gets no block. The clause above it says so. */
  it("says nothing more about undo for a change that can be undone", () => {
    const { container } = render(
      <ul>
        <ProposalLine proposal={held([])} />
      </ul>
    )

    expect(unasked(container)).toContain("you could undo it")
    expect(unasked(container)).not.toContain("gone for good")
    expect(unasked(container)).not.toContain("Check whatever that part is wired to")
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
