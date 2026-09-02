import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { REVERT_INTERPRETER } from "@loom/runtime/write"

import type { ProposalEffect } from "@/app/(portal)/_lib/proposal-effect"

import type { PlainChange } from "@/app/(demo)/_lib/plain-change"
import type { ChangeRecord } from "@/app/(demo)/_lib/record"
import { UNDO_CAUTION, UNDO_SPENT, UNDO_WAITING } from "@/app/(demo)/_lib/undo"

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

/**
 * The card the third press produces: an undo, whose utterance the runtime
 * synthesised out of the revision number it was given (`revertRevision`).
 */
const UNDONE: ChangeRecord = {
  ...ASKED,
  recordId: "i_3",
  outcome: "awaiting-you",
  utterance: "Undo revision 1.",
  interpretation: {
    rationale: "the inverse of revision 1, node for node",
    interpreter: REVERT_INTERPRETER,
    authoredBy: "runtime",
    confidence: 1,
    interpretedAt: "2026-08-12T09:00:00.000Z",
    operations: ["insert element into n_1 at 3"],
  },
  heldProposalId: "p_11",
}

/**
 * The two readings of one held proposal that the card has to keep apart: the
 * review tool's, which names the primitive and counts the nodes, and the plain
 * one, which quotes what is printed on the page.
 */
const EFFECT: ProposalEffect = {
  operations: [
    {
      op: "remove",
      verb: "delete",
      subject: "loom.stat-grid",
      place: ["loom.page"],
      detail: "and 3 nodes under it",
      into: null,
      before: null,
      from: null,
      changes: [],
      /*
       * Empty, and that is the fixture being accurate rather than lazy. The
       * portal's `text` walks text nodes, and a `loom.stat-grid` carries every
       * figure it prints in props — so on the demo's leading ask this field is
       * genuinely empty, which is the whole reason this lane harvests its own
       * words. Filling it here would make the test agree with a page that does
       * not exist.
       */
      text: [],
      carries: 4,
      missing: false,
      inert: false,
    },
  ],
  applies: true,
  obstacle: null,
  baseRevision: 0,
  treeRevision: 0,
  stale: false,
  inertCount: 0,
}

const PLAIN: readonly PlainChange[] = [
  {
    sentence: "This comes off the page, and everything under it goes too.",
    words: ["3,400", "24", "92%"],
    more: 0,
  },
]

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
   * The undo is gated like any other change (0032), so pressing it can move
   * nothing at all until a second question is answered. A visitor who has not
   * been told that has pressed the one control on the payoff card and watched
   * it do nothing.
   */
  it("says the undo may wait for an answer, next to the undo", () => {
    const { container } = render(<RecordCard record={APPLIED} />)

    const caution = screen.getByText(new RegExp(UNDO_CAUTION.slice(0, 40)))

    expect(caution).toBeTruthy()
    expect(container.querySelector("details")?.contains(caution)).toBe(false)
    expect(screen.getByRole("button", { name: "Put it back" }).closest("form")?.contains(caution)).toBe(
      true
    )
  })

  /**
   * The reserved line at the top of a card is the one a visitor is meant to
   * recognise as their own, and an undo's utterance is synthesised by the
   * runtime out of a revision number. `revision` is on the list of words this
   * surface may not put in front of a stranger before it has earned them
   * (`what-happens.test.tsx`), and the third press of the demo put it in
   * quotation marks at the top of a card.
   */
  it("quotes an undo as the button that produced it, not as the runtime's revision number", () => {
    const { container } = render(<RecordCard record={UNDONE} />)

    const quoted = screen.getByText(/“Put it back\.”/)

    expect(container.querySelector("details")?.contains(quoted)).toBe(false)
    expect(quoted.textContent).not.toContain("revision")
  })

  /** And nothing is removed: the runtime's sentence is one click down. */
  it("keeps the undo's own utterance under the disclosure", () => {
    const { container } = render(<RecordCard record={UNDONE} />)

    const disclosure = container.querySelector("details")
    if (!disclosure) throw new Error("the card has no disclosure")

    expect(disclosure.contains(screen.getByText("Undo revision 1."))).toBe(true)
  })

  /** An ordinary ask is quoted once, not once in the light and again below. */
  it("does not repeat an ordinary ask inside the record", () => {
    render(<RecordCard record={APPLIED} />)

    expect(screen.getAllByText(/Switch this page to the other palette/).length).toBe(1)
    expect(screen.queryByText("asked")).toBeNull()
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
   * The plain-language rule at the one moment it costs something to break: the
   * card is asking the visitor to allow a change, and what it tells them it
   * would do must be checkable against the page rather than against the tree.
   *
   * `loom.stat-grid` and `delete` are still on the card — they are the review
   * tool's reading of the same proposal and nothing has been removed — and they
   * are behind the click, with the fingerprint and the inverse.
   */
  it("asks in the words on the page, and keeps the delta's own words one click down", () => {
    const { container } = render(<RecordCard record={HELD} effect={EFFECT} plain={PLAIN} />)

    const disclosure = container.querySelector("details")
    if (!disclosure) throw new Error("the card has no disclosure")

    expect(disclosure.contains(screen.getByText(/This comes off the page/))).toBe(false)
    expect(disclosure.contains(screen.getByText("“3,400”"))).toBe(false)

    expect(disclosure.contains(screen.getByText("loom.stat-grid"))).toBe(true)
    expect(disclosure.contains(screen.getByText(/delete loom\.stat-grid/))).toBe(true)
  })

  /**
   * Above the buttons and not below them. A visitor deciding whether to allow
   * something reads down to the control and presses it; a description that
   * arrives after the press has arrived too late.
   */
  it("says what would happen before it offers the two answers", () => {
    const { container } = render(<RecordCard record={HELD} effect={EFFECT} plain={PLAIN} />)

    const said = screen.getByText(/This comes off the page/)
    const answer = screen.getByRole("button", { name: "Apply this change" })

    expect(said.compareDocumentPosition(answer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(container.contains(said)).toBe(true)
  })

  /**
   * An applied change has no proposal left to picture, and a card that kept
   * saying what a change *would* do after it had done it would be describing a
   * page that no longer exists.
   */
  it("stops describing a change once it has happened", () => {
    render(<RecordCard record={ANSWERED} />)

    expect(screen.queryByText(/This comes off the page/)).toBeNull()
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

/**
 * The payoff card, and the control it spent five runs learning to keep.
 *
 * The offer used to be gated on whether an undo had been *pressed*, and on this
 * demo's primary path the first thing that comes back from a press is a hold —
 * the Gate stopping an undo exactly as it stops any other change (0032). So the
 * button went away while the page had not moved, off a card whose own sentence
 * still named it. Which state the card is in is decided from the record list
 * (`undoOffer`), because the undo is answered on a different card and this one
 * cannot see that happen.
 */
describe("what the payoff card offers", () => {
  it("offers the undo, and says what pressing it may do, before anything is pressed", () => {
    render(<RecordCard record={APPLIED} offer="offer" />)

    expect(screen.getByRole("button", { name: "Put it back" })).toBeTruthy()
    expect(screen.getByText(new RegExp(UNDO_CAUTION.slice(0, 40)))).toBeTruthy()
  })

  /**
   * The frame the defect produced: the undo is held, the page has not moved,
   * and the card has to say where the question went rather than withdrawing the
   * control and leaving the sentence pointing at nothing.
   */
  it("points at the waiting question instead of the button, while the undo is held", () => {
    render(<RecordCard record={APPLIED} offer="waiting" />)

    expect(screen.queryByRole("button", { name: "Put it back" })).toBeNull()
    expect(screen.getByText(UNDO_WAITING)).toBeTruthy()
  })

  /** And it must not still be claiming the change can be undone from here. */
  it("stops promising the button once the undo has landed", () => {
    render(<RecordCard record={APPLIED} offer="spent" />)

    expect(screen.queryByRole("button", { name: "Put it back" })).toBeNull()
    expect(screen.getByText(UNDO_SPENT)).toBeTruthy()
    expect(screen.queryByText(/live on the page beside you/)).toBeNull()
  })

  /**
   * The badge is not the sentence. "Applied" is what became of *this ask* and
   * stays true after the change is put back; what changes is the line under it,
   * which is about where the page stands now.
   */
  it("still says the ask was applied after it has been put back", () => {
    render(<RecordCard record={APPLIED} offer="spent" />)

    expect(screen.getByText("Applied")).toBeTruthy()
  })

  /** An unanswered change has no undo to offer in any of the three states. */
  it("offers no undo on a change that is still waiting on the visitor", () => {
    render(<RecordCard record={HELD} offer="offer" />)

    expect(screen.queryByRole("button", { name: "Put it back" })).toBeNull()
    expect(screen.queryByText(UNDO_WAITING)).toBeNull()
  })
})
