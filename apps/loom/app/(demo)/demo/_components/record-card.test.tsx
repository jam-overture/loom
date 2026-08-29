import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { ChangeRecord } from "@/app/(demo)/_lib/record"
import { UNDO_IS_A_CHANGE } from "@/app/(demo)/_lib/undo"

import { RecordCard } from "./record-card"

/**
 * The card is the demo's argument, so what it must not do is quietly stop
 * showing part of it.
 *
 * Every assertion here is a field the runtime computed and a reader was promised:
 * the rationale, who authored it and how sure they were, both axes the Gate
 * weighed, which rule fired under which policy, the inverse, and the revision.
 * A refactor that drops one renders a page that still looks fine and no longer
 * makes the point.
 */

/** Everything both fixtures share: one ask, interpreted and weighed. */
const ASKED: Omit<ChangeRecord, "outcome" | "revision"> = {
  recordId: "i_1",
  askedAt: "2026-08-12T09:00:00.000Z",
  utterance: "Switch this page to the other palette.",
  origin: "user-instruction",
  actor: "a demo visitor",
  interpretation: {
    rationale: "A theme is three registered ids on the root node.",
    interpreter: "loom/demo-preset",
    authoredBy: "runtime",
    confidence: 1,
    interpretedAt: "2026-08-12T09:00:00.000Z",
    operations: ["configure n_1: loom.theme"],
  },
  stakes: { level: "low", factors: [] },
  reversibility: {
    reversible: true,
    retainedNodeCount: 0,
    reasons: [],
    inverseOperations: ["configure n_1: loom.theme"],
  },
  disposition: {
    kind: "accepted",
    ruleCode: "within-policy",
    detail: "stakes low, within the ceiling for user-instruction",
    policyId: "demo",
    policyFingerprint: "0123456789abcdef0123",
    confidence: 1,
  },
  repaired: false,
  /** Where the change is, which this card does not draw — the stage does. */
  touched: [],
}

const APPLIED: ChangeRecord = { ...ASKED, outcome: "applied", revision: { produced: 1, replaced: 0 } }

/** The same ask, held: no revision yet, and a proposal in custody. */
const HELD: ChangeRecord = {
  ...ASKED,
  outcome: "awaiting-you",
  recordId: "i_2",
  utterance: "Add a new band near the bottom of the page.",
  stakes: {
    level: "medium",
    factors: [{ code: "shallow-structural-change", level: "medium", detail: "restructures at depth 1" }],
  },
  disposition: {
    kind: "requires-confirmation",
    ruleCode: "stakes-above-ceiling",
    detail: "restructures at depth 1",
    policyId: "demo",
    confidence: 1,
  },
  heldProposalId: "p_9",
}

/**
 * The same held ask, after the visitor pressed *Apply this change*: the hold is
 * gone, a revision exists, the Gate's own verdict still says it stopped — and
 * `answeredBy` is the only field that says why it went ahead anyway.
 */
const ANSWERED: ChangeRecord = (({ heldProposalId: _answered, ...rest }) => ({
  ...rest,
  outcome: "applied" as const,
  revision: { produced: 1, replaced: 0 },
  answeredBy: "a demo visitor",
}))(HELD)

describe("a record card", () => {
  it("shows the ask, the rationale and the provenance of the proposal", () => {
    render(<RecordCard record={APPLIED} />)

    expect(screen.getByText(/Switch this page to the other palette/)).toBeTruthy()
    expect(screen.getByText(/A theme is three registered ids/)).toBeTruthy()
    expect(screen.getByText("loom/demo-preset")).toBeTruthy()
    expect(screen.getByText("runtime")).toBeTruthy()
    expect(screen.getByText("1.00")).toBeTruthy()
  })

  it("shows both axes the Gate weighed, separately", () => {
    render(<RecordCard record={APPLIED} />)

    expect(screen.getByText("low")).toBeTruthy()
    expect(screen.getByText(/^yes$/)).toBeTruthy()
    expect(screen.getByText("nothing this policy watches for")).toBeTruthy()
  })

  it("names the rule that fired and the policy it fired under", () => {
    render(<RecordCard record={APPLIED} />)

    expect(screen.getByText("within-policy")).toBeTruthy()
    expect(screen.getByText("demo")).toBeTruthy()
    expect(screen.getByText(/0123456789abcdef/)).toBeTruthy()
    expect(screen.getByText(/went ahead on its own/)).toBeTruthy()
  })

  it("says which revision it produced and offers to undo it", () => {
    render(<RecordCard record={APPLIED} />)

    expect(screen.getByText(/1, replacing 0/)).toBeTruthy()
    expect(screen.getByRole("button", { name: "Put it back" })).toBeTruthy()
  })

  /**
   * The undo does not promise the page will move, because three of the five
   * changes this surface offers come back held when a visitor asks for them
   * back — the panel's primary one included. Without this line a stranger
   * presses the only control on the payoff card and watches nothing happen.
   *
   * It is asserted here as *on the card, under the button that needs it*: the
   * words themselves and the reason for them are `_lib/undo.ts`'s, and are
   * held there.
   */
  it("says what the undo is before it is pressed, next to it", () => {
    render(<RecordCard record={APPLIED} />)

    const note = screen.getByText(UNDO_IS_A_CHANGE)
    const button = screen.getByRole("button", { name: "Put it back" })

    expect(note).toBeTruthy()
    /* The two are one control: a caption elsewhere on the card is not this. */
    expect(note.parentElement?.contains(button)).toBe(true)
  })

  /** No revision, nothing to put back, and nothing to explain about putting it back. */
  it("does not explain an undo it is not offering", () => {
    render(<RecordCard record={HELD} />)

    expect(screen.queryByText(UNDO_IS_A_CHANGE)).toBeNull()
  })

  /**
   * The disclosure is the plain-language rule's other half, so it is asserted
   * as a promise rather than as styling: the sentence a visitor reads without
   * asking is in the light, the rule code and the fingerprint are behind one
   * click, and *both* are on the card. A change that pushed the meaning down
   * there, or that dropped the evidence to make room, breaks this.
   */
  it("leads with the plain sentence and keeps the whole record one click away", () => {
    const { container } = render(<RecordCard record={APPLIED} />)

    const disclosure = container.querySelector("details")
    if (!disclosure) throw new Error("the card has no disclosure")

    expect(disclosure.open).toBe(false)
    expect(screen.getByText(/Show the full record/)).toBeTruthy()

    /* Read without opening anything. */
    expect(disclosure.contains(screen.getByText(/went ahead on its own/))).toBe(false)

    /* Still there, and only there. */
    expect(disclosure.contains(screen.getByText("0123456789abcdef…"))).toBe(true)
    expect(disclosure.contains(screen.getByText("within-policy"))).toBe(true)
  })

  it("offers an answer, and no undo, while a change is waiting on the visitor", () => {
    render(<RecordCard record={HELD} />)

    expect(screen.getByText("Waiting on you")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Apply this change" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "No thanks" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: /undo/ })).toBeNull()
    expect(screen.getByText("restructures at depth 1 · medium")).toBeTruthy()
  })

  it("shows the stake factors the Gate actually cited", () => {
    render(<RecordCard record={HELD} />)

    expect(screen.getByText("shallow-structural-change")).toBeTruthy()
    expect(screen.getByText("stakes-above-ceiling")).toBeTruthy()
  })

  /**
   * The demo's whole argument, as an assertion.
   *
   * Both of these cards say **Applied**, both say the change is live on the
   * page, and both are produced by the same three files. One of them Loom made
   * on its own; the other it refused to make until the person reading the card
   * allowed it. If the two read the same, this surface has demonstrated
   * "an AI changed a page" — which `docs/rollout.md` names as the least novel
   * thing here — and nothing else.
   *
   * It is asserted as a *difference* rather than as a sentence, because the
   * sentence is not the property worth guarding. Any wording that leaves the
   * unasked card silent and the answered one saying a person let it through
   * passes; anything that renders the two alike fails, however good it reads.
   */
  it("does not let a change the visitor allowed read like one Loom made alone", () => {
    const alone = render(<RecordCard record={APPLIED} />).container.textContent ?? ""
    const allowed = render(<RecordCard record={ANSWERED} />).container.textContent ?? ""

    expect(alone).toMatch(/went ahead on its own/)
    expect(alone).not.toMatch(/You said yes/)

    expect(allowed).toMatch(/You said yes/)
    expect(allowed).toMatch(/nothing on the page would have moved/)
  })

  /**
   * The plain-language rule, applied to the newest thing on the card: the
   * sentence is in the light and the runtime's own word for it is one click
   * down. Both, never one.
   */
  it("keeps the runtime's word for the answer in the record, under the disclosure", () => {
    const { container } = render(<RecordCard record={ANSWERED} />)

    const disclosure = container.querySelector("details")
    if (!disclosure) throw new Error("the card has no disclosure")

    expect(disclosure.contains(screen.getByText(/You said yes/))).toBe(false)
    expect(disclosure.contains(screen.getByText("confirmed by a demo visitor"))).toBe(true)
  })

  /**
   * Answering a hold ends it. A card still offering the two buttons after the
   * decision was made would be offering a decision that no longer exists.
   */
  it("stops asking once the visitor has answered, and offers the undo instead", () => {
    render(<RecordCard record={ANSWERED} />)

    expect(screen.queryByRole("button", { name: "Apply this change" })).toBeNull()
    expect(screen.queryByRole("button", { name: "No thanks" })).toBeNull()
    expect(screen.getByRole("button", { name: "Put it back" })).toBeTruthy()
  })
})
