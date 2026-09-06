import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { REVERT_INTERPRETER } from "@loom/runtime/write"

import type { ProposalEffect } from "@/app/(portal)/_lib/proposal-effect"

import { ASK_AGAIN_CAUTION, ASK_AGAIN_LABEL, movedOn } from "@/app/(demo)/_lib/moved"
import type { PlainChange } from "@/app/(demo)/_lib/plain-change"
import type { ChangeRecord } from "@/app/(demo)/_lib/record"
import { UNDO_CAUTION, UNDO_SPENT, UNDO_WAITING } from "@/app/(demo)/_lib/undo"
import { WEIGHED_QUESTIONS } from "@/app/(demo)/_lib/weighed"

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

  /**
   * The two questions the rail promised, answered on the card in the words they
   * were asked in.
   *
   * Both facts were on the record from the day this surface was built and both
   * were behind the disclosure in the runtime's shorthand, so a stranger was
   * told what would be weighed, watched a verdict arrive, and never saw the
   * weighing. Asserted to be *outside* the disclosure rather than merely
   * present: the whole defect was that they were present.
   */
  it("answers both of the rail's questions without the visitor opening anything", () => {
    const { container } = render(<RecordCard record={HELD} />)

    const disclosure = container.querySelector("details")
    if (!disclosure) throw new Error("the card has no disclosure")

    const damage = screen.getByText(WEIGHED_QUESTIONS.damage)
    const reversal = screen.getByText(WEIGHED_QUESTIONS.reversal)

    expect(disclosure.contains(damage)).toBe(false)
    expect(disclosure.contains(reversal)).toBe(false)
    expect(screen.getByText(/Worth a look before you say yes/)).toBeTruthy()
  })

  /**
   * Order, and it is the argument rather than the layout: the rail says *weighed
   * on two questions, then a named rule decides*, so the two answers come before
   * the rule's sentence. Reversed, the card is a verdict with its reasoning
   * underneath — which is the shape this unit replaced.
   */
  it("weighs before it rules", () => {
    const { container } = render(<RecordCard record={HELD} />)
    const text = container.textContent ?? ""

    expect(text.indexOf(WEIGHED_QUESTIONS.damage)).toBeGreaterThan(-1)
    expect(text.indexOf(WEIGHED_QUESTIONS.damage)).toBeLessThan(
      text.indexOf("Riskier than a request from here")
    )
  })

  /**
   * The reassurance and the button it makes pressable, on one card.
   *
   * A held card's whole job is to be answerable. It describes a loss — *"This
   * comes off the page, and everything under it goes too"* — directly above a
   * green button, and until this block the only statement that the page could be
   * put back was three clicks down as `undo carries: 4 nodes`, or one press too
   * late on the card that appears *after* the visitor has already committed.
   */
  it("says the change can be taken back on the same card as the button that makes it", () => {
    render(<RecordCard record={HELD} plain={PLAIN} />)

    const reversal = screen.getByText(WEIGHED_QUESTIONS.reversal).closest("li")

    expect(reversal).toBeTruthy()
    expect(reversal?.textContent).toContain("Apply this change")
    expect(reversal?.textContent).toContain("already exists")
  })

  /**
   * And it stays once the change has landed. The weighing is what the Gate did
   * with this ask; a card that dropped it the moment it stopped being urgent
   * would be a record forgetting its own reasoning.
   */
  it("keeps the weighing on the card after the change is applied", () => {
    render(<RecordCard record={ANSWERED} />)

    expect(screen.getByText(WEIGHED_QUESTIONS.damage)).toBeTruthy()
    expect(screen.getByText(WEIGHED_QUESTIONS.reversal)).toBeTruthy()
  })

  /**
   * Nothing was removed to make room. The level and the retained count keep the
   * rows they always had, one click down, beside the factor codes they came
   * from.
   */
  it("keeps the runtime's own numbers in the record underneath", () => {
    const { container } = render(<RecordCard record={HELD} />)

    const disclosure = container.querySelector("details")
    if (!disclosure) throw new Error("the card has no disclosure")

    expect(disclosure.contains(screen.getByText("medium"))).toBe(true)
    expect(disclosure.contains(screen.getByText("0 nodes"))).toBe(true)
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
   * The rule sentence on this path ends *"riskier than a request from here is
   * allowed to be without asking"*, and until this run nothing on the card said
   * what *here* was. The one thing that came close was the origin code in the
   * corner, which is a token rather than a claim — so the assertion is that the
   * card now answers the question in the light and keeps the code, one click
   * down, rather than that it says any particular words.
   */
  it("says what an ask from here may do on its own, under the rule that read it", () => {
    const { container } = render(<RecordCard record={HELD} />)

    const disclosure = container.querySelector("details")
    if (!disclosure) throw new Error("the card has no disclosure")

    const said = screen.getByText(/will not let an ask like that land on its own/)

    expect(disclosure.contains(said)).toBe(false)
    expect(disclosure.contains(screen.getByText("low, for user-instruction"))).toBe(true)
  })

  /**
   * And the order it is read in. The weighing says how much risk this ask
   * carries, this says how much is allowed to land unasked, and the rule says
   * the first exceeded the second — so a card that put the threshold above the
   * measurement, or after the conclusion it explains, would be printing an
   * inequality out of sequence.
   */
  it("puts the ceiling between the weighing and the answer, under the rule that used it", () => {
    const { container } = render(<RecordCard record={HELD} />)

    const text = container.textContent ?? ""
    const weighed = text.indexOf(WEIGHED_QUESTIONS.damage)
    const rule = text.indexOf("Riskier than a request from here")
    const ceiling = text.indexOf("will not let an ask like that land on its own")
    const buttons = text.indexOf("Apply this change")

    expect(weighed).toBeGreaterThanOrEqual(0)
    expect(rule).toBeGreaterThan(weighed)
    expect(ceiling).toBeGreaterThan(rule)
    expect(buttons).toBeGreaterThan(ceiling)
  })

  /**
   * And it is said only where the ceiling decided. A change that went ahead
   * because nothing this project watches for was involved has no ceiling in its
   * story, and a card that explained one anyway would be reasoning about a
   * comparison the Gate never made.
   */
  it("says nothing about a ceiling on a change the ceiling did not decide", () => {
    render(<RecordCard record={APPLIED} />)

    expect(screen.queryByText(/land on its own above/)).toBeNull()
  })

  /**
   * The plain-language rule applied to the oldest jargon on this card. The
   * origin was a monospace `user-instruction` in the top right corner of every
   * card, in the light, unexplained — the runtime's word for what kind of act
   * the ask was. It is evidence, so it belongs with the evidence; and nothing is
   * ever removed, so it is still on the card.
   */
  it("keeps the runtime's code for the ask in the record, not in the light", () => {
    const { container } = render(<RecordCard record={HELD} />)

    const disclosure = container.querySelector("details")
    if (!disclosure) throw new Error("the card has no disclosure")

    expect(disclosure.contains(screen.getByText("user-instruction"))).toBe(true)
    expect(disclosure.contains(screen.getByText("2026-08-12T09:00:00.000Z"))).toBe(true)
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

/**
 * The card an ask gets once the visitor has moved the page out from under it.
 *
 * Everything about the held card is about a question that is still open — the
 * amber badge, *"Loom will not make this change until you say yes"*, the plain
 * reading of what allowing it would do, and two buttons. This question is shut,
 * and every one of those was still on the screen: the press was spent, the
 * buttons vanished with nothing in their place, and the only account of it was
 * `applied, then not written: revision-conflict` in the smallest type on the
 * card.
 */
describe("an ask the page has moved past", () => {
  const MOVED = movedOn(0, 1)
  if (MOVED === undefined) throw new Error("two different revisions have moved on by definition")

  /** The same held ask, with the suggestion it came from still on it. */
  const FROM_A_BUTTON: ChangeRecord = { ...HELD, presetId: "band" }

  it("stops offering an answer that cannot land", () => {
    render(<RecordCard record={HELD} moved={MOVED} />)

    expect(screen.queryByRole("button", { name: "Apply this change" })).toBeNull()
    expect(screen.queryByRole("button", { name: "No thanks" })).toBeNull()
  })

  /**
   * And stops saying it is waiting. The badge and the sentence under it are the
   * two things a visitor reads first, and both were false: the Gate is not
   * waiting on them, and no yes they can give will land this.
   */
  it("says what became of it, in the words the review queue uses for the same state", () => {
    render(<RecordCard record={HELD} moved={MOVED} />)

    expect(screen.getByText("Nothing changed")).toBeTruthy()
    expect(screen.queryByText("Waiting on you")).toBeNull()
    expect(screen.queryByText(/will not make this change until you say yes/)).toBeNull()
  })

  it("says why, in the sentence rather than in a code", () => {
    render(<RecordCard record={HELD} moved={MOVED} />)

    expect(screen.getByText(MOVED.sentence)).toBeTruthy()
  })

  /**
   * The one control a dead ask can honestly offer: the same request, weighed
   * again, against the revision the page is actually at. It is a fresh ask
   * rather than a retry and the caution says so, for the same reason
   * `UNDO_CAUTION` does — the Gate may hold it again.
   */
  it("offers the same ask again, against the page as it stands", () => {
    const { container } = render(<RecordCard record={FROM_A_BUTTON} moved={MOVED} />)

    expect(screen.getByRole("button", { name: ASK_AGAIN_LABEL })).toBeTruthy()
    expect(screen.getByText(ASK_AGAIN_CAUTION)).toBeTruthy()
    expect(container.querySelector('input[name="presetId"]')?.getAttribute("value")).toBe("band")
    expect(container.querySelector('input[name="baseRevision"]')?.getAttribute("value")).toBe(
      `${MOVED.now}`
    )
  })

  /**
   * An ask that named no suggestion gets no button — free text needs a model
   * that may be absent or out of budget, and an undo has its own control on the
   * card above. What it must not lose is the sentence.
   */
  it("still says what happened when there is no suggestion to repeat", () => {
    render(<RecordCard record={HELD} moved={MOVED} />)

    expect(screen.queryByRole("button", { name: ASK_AGAIN_LABEL })).toBeNull()
    expect(screen.getByText(MOVED.sentence)).toBeTruthy()
  })

  /**
   * Nothing is removed. The two revisions behind the sentence are one click
   * down, with the rest of the technical account, and so is the whole weighing
   * the Gate did — a record that dropped its own reasoning the moment the
   * reasoning stopped being actionable would not be a record.
   */
  it("keeps the two revisions, and the weighing, one click down", () => {
    render(<RecordCard record={HELD} moved={MOVED} />)

    expect(screen.getByText(MOVED.technical)).toBeTruthy()
    expect(screen.getByText("stakes-above-ceiling")).toBeTruthy()
  })

  /** And a hold the page has *not* moved past is untouched by any of it. */
  it("leaves a live hold with both of its buttons", () => {
    render(<RecordCard record={HELD} />)

    expect(screen.getByRole("button", { name: "Apply this change" })).toBeTruthy()
    expect(screen.getByText("Waiting on you")).toBeTruthy()
    expect(screen.queryByRole("button", { name: ASK_AGAIN_LABEL })).toBeNull()
  })
})
