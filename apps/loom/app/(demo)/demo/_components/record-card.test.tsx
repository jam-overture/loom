import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { REVERT_INTERPRETER } from "@loom/runtime/write"

import { ruleSentence } from "@/app/(portal)/_lib/vocabulary"
import type { ProposalEffect } from "@/app/(portal)/_lib/proposal-effect"

import { ceilingNote } from "@/app/(demo)/_lib/ceiling"
import { ASK_AGAIN_CAUTION, ASK_AGAIN_LABEL, movedOn } from "@/app/(demo)/_lib/moved"
import type { PlainChange } from "@/app/(demo)/_lib/plain-change"
import type { ChangeRecord } from "@/app/(demo)/_lib/record"
import { SPOT_COLOURS } from "@/app/(demo)/_lib/spotlight"
import {
  UNDO_AGAIN_LABEL,
  UNDO_AGAIN_MEANING,
  UNDO_AGAIN_SPENT,
  UNDO_AGAIN_WAITING,
  UNDO_CAUTION,
  UNDO_LABEL,
  UNDO_SPENT,
  UNDO_WAITING,
} from "@/app/(demo)/_lib/undo"
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
      /*
       * Named on 11 September, when the portal's review queue started saying
       * *the stat grid* where it had said `loom.stat-grid`. `label` and
       * `placeNames` are the two halves that change with it: the runtime's word
       * is kept for the record, and the path a reader is shown is the path in
       * the same voice as the sentence above it.
       */
      subject: { name: "the stat grid", nodeId: "n_9" },
      label: "loom.stat-grid",
      place: ["loom.page"],
      placeNames: ["the page"],
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
      text.indexOf(ruleSentence("stakes-above-ceiling"))
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

  /**
   * The other half of a property that spans two files: there is exactly one
   * `bg-affirm` control on this rail at a time, and it is always the demo's next
   * step. While a question is open it is this one, and `AskPanel` gives its own
   * up (`set-aside.ts`). The class is asserted rather than the look because it is
   * the only thing the two files share.
   */
  it("carries the rail's one green button while it is the question waiting", () => {
    const { container } = render(<RecordCard record={HELD} />)

    const answer = screen.getByRole("button", { name: "Apply this change" })

    expect(container.querySelectorAll(".bg-affirm").length).toBe(1)
    expect(answer.className).toContain("bg-affirm")
  })

  /**
   * The other coupling to the same strip. `AskPanel`'s **Answer it first** is a
   * fragment pointing at this card's own id, and the strip it sits in is pinned
   * to the top of the rail — so without a scroll margin the fragment lands the
   * card behind the band that sent the visitor to it, `Waiting on you` and the
   * utterance included. Measured: the strip is 103px at 1280×900, and the card
   * arrives at 156 against a rail top of 44.
   */
  it("leaves room for what the rail pins above it", () => {
    const { container } = render(<RecordCard record={HELD} />)

    expect(container.querySelector("li")?.className).toContain("scroll-mt-28")
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

    /*
     * Read off the disclosure's own text rather than by finding an element
     * whose whole content is `loom.stat-grid`. There was one until 11
     * September — the review queue set the type in monospace as the subject of
     * its sentence — and there is not one now that the same sentence says *the
     * stat grid*. The rule this test is for is unchanged and is the stronger
     * reading: the runtime's word is behind the click, and not in front of it.
     */
    expect(disclosure.textContent).toContain("delete loom.stat-grid")
    expect(container.textContent?.replace(disclosure.textContent ?? "", "")).not.toContain(
      "loom.stat-grid"
    )
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
   * The rule sentence on this path states a conclusion and not the two numbers
   * it was drawn from, and the nearest thing the card ever had to them was the
   * origin code in the corner — a token rather than a claim. So the assertion is
   * that the comparison is answered in the light and the code is kept, one click
   * down, rather than that either says any particular words: both strings come
   * off `ceilingNote` itself.
   */
  it("says what an ask like this may do on its own, under the rule that read it", () => {
    const note = ceilingNote(HELD)
    if (note === undefined) throw new Error("the fixture is the ask the ceiling decided")

    const { container } = render(<RecordCard record={HELD} />)

    const disclosure = container.querySelector("details")
    if (!disclosure) throw new Error("the card has no disclosure")

    expect(disclosure.contains(screen.getByText(note.sentence))).toBe(false)
    expect(disclosure.contains(screen.getByText(note.technical))).toBe(true)
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

    /*
     * The sentence is read off the module rather than quoted, so a reword is a
     * one-file change and this test keeps asserting the thing it is about —
     * where the line sits — rather than what it says. It used to hold a fragment
     * of the old wording, which is why rewording it broke a placement test.
     */
    const said = ceilingNote(HELD)?.sentence
    if (said === undefined) throw new Error("the fixture is the ask the ceiling decided")

    const text = container.textContent ?? ""
    const weighed = text.indexOf(WEIGHED_QUESTIONS.damage)
    const rule = text.indexOf(ruleSentence("stakes-above-ceiling"))
    const ceiling = text.indexOf(said)
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
    /*
     * What this card would have said if the ceiling had decided it, so the
     * absence is asserted against the module's own sentence rather than against
     * a fragment of one wording of it.
     */
    const decidedByTheCeiling = HELD.disposition
    if (decidedByTheCeiling === undefined) throw new Error("the held fixture carries a verdict")

    const wouldSay = ceilingNote({ ...APPLIED, disposition: decidedByTheCeiling })?.sentence
    if (wouldSay === undefined) throw new Error("the ceiling rule should produce a sentence")

    const { container } = render(<RecordCard record={APPLIED} />)

    expect(container.textContent ?? "").not.toContain(wouldSay)
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
 * The last frame of the sixty seconds: the record of the undo that just landed.
 *
 * Everything on it was true and three of its strings were the same phrase.
 * *“Put it back.”* as the quotation, *“‘Put it back’ undoes it”* as the
 * sentence, and **Put it back** on a button that takes the change off again —
 * so the card's own title was what its only control would reverse.
 *
 * The button stays, and that is the point: an undo is a change of its own
 * (0032), weighed and recorded like any other, so it has an undo in its turn.
 * Only the words change.
 */
describe("the card for an undo that landed", () => {
  const APPLIED_UNDO: ChangeRecord = (({ heldProposalId: _held, ...rest }) => ({
    ...rest,
    outcome: "applied" as const,
    revision: { produced: 2, replaced: 1 },
    undoes: 1,
    answeredBy: "a demo visitor",
  }))(UNDONE)

  /** The property the whole unit is for. */
  it("says “Put it back” once, as the words the visitor pressed", () => {
    const { container } = render(<RecordCard record={APPLIED_UNDO} offer="offer" />)
    const uses = (container.textContent ?? "").split(UNDO_LABEL).length - 1

    expect(uses).toBe(1)
    expect(screen.getByText(`“${UNDO_LABEL}.”`)).toBeTruthy()
  })

  it("offers an undo of the undo, named for the card rather than for the page", () => {
    render(<RecordCard record={APPLIED_UNDO} offer="offer" />)

    expect(screen.getByRole("button", { name: UNDO_AGAIN_LABEL })).toBeTruthy()
    expect(screen.queryByRole("button", { name: UNDO_LABEL })).toBeNull()
  })

  /** Nothing is removed: the claim that undoing is itself a weighed change stays. */
  it("keeps the caution that says this press is weighed like any other", () => {
    render(<RecordCard record={APPLIED_UNDO} offer="offer" />)

    expect(screen.getByText(new RegExp(UNDO_CAUTION.slice(0, 40)))).toBeTruthy()
  })

  it("replaces the circular sentence with where the page now stands", () => {
    render(<RecordCard record={APPLIED_UNDO} offer="offer" />)

    expect(screen.getByText(UNDO_AGAIN_MEANING)).toBeTruthy()
    expect(screen.queryByText(/live on the page beside you/)).toBeNull()
  })

  it("points at the second question while an undo of the undo is held", () => {
    render(<RecordCard record={APPLIED_UNDO} offer="waiting" />)

    expect(screen.getByText(UNDO_AGAIN_WAITING)).toBeTruthy()
    expect(screen.queryByText(UNDO_WAITING)).toBeNull()
  })

  it("says the page has moved on once that one lands too", () => {
    render(<RecordCard record={APPLIED_UNDO} offer="spent" />)

    expect(screen.getByText(UNDO_AGAIN_SPENT)).toBeTruthy()
    expect(screen.queryByText(UNDO_SPENT)).toBeNull()
  })

  /**
   * The quotation the page worked out, when it differs from the one this card
   * can reach alone — an undo of an undo was raised from *Undo this change
   * too*, and the card cannot see the ask above its own.
   */
  it("quotes the line the page handed it, and keeps the runtime's own words below", () => {
    render(
      <RecordCard
        record={APPLIED_UNDO}
        offer="offer"
        asked={{ plain: `${UNDO_AGAIN_LABEL}.`, technical: APPLIED_UNDO.utterance }}
      />
    )

    expect(screen.getByText(`“${UNDO_AGAIN_LABEL}.”`)).toBeTruthy()
    expect(screen.queryByText(`“${UNDO_LABEL}.”`)).toBeNull()
  })

  /**
   * The gate is `record.revision`, not the state's name, so a card that has not
   * produced one keeps the shared table's sentence — which is about an open
   * question and has no direction to get wrong.
   */
  it("leaves the held undo's own card exactly as it was", () => {
    render(<RecordCard record={UNDONE} offer="offer" />)

    expect(screen.queryByText(UNDO_AGAIN_MEANING)).toBeNull()
    expect(screen.getByText(/Loom will not make this change until you say yes/)).toBeTruthy()
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

/**
 * The pill that says which of two amber rings on the page is this card's.
 *
 * A visitor with two questions open is doing a matching problem, and every other
 * way of solving it — naming the ask in the rail's line, numbering the marks, a
 * legend — asks them to read a sentence. This asks them to see that two things
 * are the same thing, so what is asserted here is sameness: the words, and the
 * colours, are the mark's own rather than a second copy.
 */
describe("the card's own mark", () => {
  it("wears the words the page is wearing for this change", () => {
    render(<RecordCard record={HELD} mark={{ label: "Something new would go here", tone: "awaiting" }} />)

    expect(screen.getByText("Something new would go here")).toBeTruthy()
  })

  /**
   * In the chip's colours, read from the one table the stylesheet on the stage is
   * drawn from. A Tailwind token here would be a second definition of one
   * colour, free to drift the first time either is retuned — and a pill that is
   * nearly the chip's colour is worse than no pill, because the whole mechanism
   * is a visitor recognising it without being told.
   */
  it("wears the mark's own colours, not a second copy of them", () => {
    /** The DOM keeps colours as `rgb()`; the table keeps them as the CSS writes them. */
    const rgb = (hex: string): string => {
      const parsed = /^#([0-9a-f]{6})$/i.exec(hex)?.[1]
      if (parsed === undefined) throw new Error(`${hex} is not a six-digit hex colour`)

      const [r, g, b] = [0, 2, 4].map((at) => Number.parseInt(parsed.slice(at, at + 2), 16))

      return `rgb(${r}, ${g}, ${b})`
    }

    render(<RecordCard record={HELD} mark={{ label: "This would be removed", tone: "awaiting" }} />)

    const style = screen.getByText("This would be removed").getAttribute("style") ?? ""

    expect(style).toContain(rgb(SPOT_COLOURS.awaiting.fill))
    expect(style).toContain(rgb(SPOT_COLOURS.awaiting.ink))
  })

  /**
   * And it says what it is to a reader who cannot see the page. "Waiting on you ·
   * Something new would go here" is two badges to the eye and one run-on sentence
   * to a screen reader.
   */
  it("says what the words are for, to a reader who cannot see the ring", () => {
    render(<RecordCard record={HELD} mark={{ label: "This would be removed", tone: "awaiting" }} />)

    expect(screen.getByText(/marked on the page/)).toBeTruthy()
  })

  /**
   * And that sentence is held inside the pill, which is a layout fact rather
   * than a style one.
   *
   * `sr-only` is `position: absolute`, and an absolutely positioned element is
   * not clipped by an `overflow: hidden` ancestor that is not itself positioned
   * — which the demo's `lg:h-screen lg:overflow-hidden` frame is not. Given no
   * positioned parent, this span is laid out at its static position deep in the
   * rail's own scroll, escapes the frame, and stretches the *document*: with two
   * questions open the one-viewport layout started scrolling, carrying the top
   * bar off screen and leaving 340px of empty ground beneath both panes.
   *
   * Nothing renders differently, which is why this is asserted rather than left
   * to the eye — and why it is asserted here rather than left to a screenshot
   * that only shows it in one of the states this card has.
   */
  it("keeps the words a screen reader hears inside the pill that carries them", () => {
    render(<RecordCard record={HELD} mark={{ label: "This would be removed", tone: "awaiting" }} />)

    const pill = screen.getByText(/marked on the page/).parentElement

    expect(pill?.className).toContain("relative")
  })

  /**
   * There is no pill when the page has one mark on it, which is the ordinary
   * case and the one six runs have tuned the top of this card for. A second badge
   * beside the state, on the first card a stranger ever sees, costs that card its
   * one-glance reading to answer a question nobody is asking yet.
   */
  it("is absent when there is nothing to be told apart from", () => {
    render(<RecordCard record={HELD} />)

    expect(screen.queryByText(/marked on the page/)).toBeNull()
    expect(screen.getByText("Waiting on you")).toBeTruthy()
  })
})

/**
 * What the change did, on the card of a change that has landed.
 *
 * The plain reading used to be the one thing on this card that did not survive
 * the press it was about. The page can only compute it against the tree on the
 * stage, so it was supplied while the change was still answerable and absent
 * the moment it applied — and for a change the Gate applies unattended it was
 * never supplied at all. Every other line on a landed card is about the
 * decision; this is the only one about the change.
 */
describe("the landed half of a card", () => {
  const DID: readonly PlainChange[] = [
    {
      sentence: "This came off the page, and everything under it went too.",
      words: ["3,400", "24", "92%"],
      more: 0,
    },
  ]

  it("says what the change did, in the words on the page", () => {
    render(<RecordCard record={{ ...APPLIED, did: DID }} />)

    expect(screen.getByText(/This came off the page/)).toBeTruthy()
    expect(screen.getByText("“3,400”")).toBeTruthy()
  })

  /**
   * The case the whole unit is for: a change the Gate let through on its own is
   * landed from its first render, so it has never had a held card to carry the
   * sentence and this is its only chance to say what it was.
   */
  it("says it for a change nobody was asked about", () => {
    render(<RecordCard record={{ ...APPLIED, did: DID }} />)

    expect(screen.queryByRole("button", { name: /Apply this change/ })).toBeNull()
    expect(screen.getByText(/This came off the page/)).toBeTruthy()
  })

  it("says it on a card the visitor answered yes to", () => {
    render(<RecordCard record={{ ...ANSWERED, did: DID }} />)

    expect(screen.getByText(/You said yes/)).toBeTruthy()
    expect(screen.getByText(/This came off the page/)).toBeTruthy()
  })

  /**
   * Never both readings at once, and the outcome is what keeps them apart.
   *
   * A card printing a change as both about to happen and already done is worse
   * than either alone, and the record carries its frozen copy from the moment
   * it is assessed — which is *before* the visitor has answered. So a held card
   * holds both strings and must print only the live one.
   */
  it("shows the live reading and not the frozen one while the change is waiting", () => {
    render(
      <RecordCard
        record={{ ...HELD, did: DID }}
        plain={[
          {
            sentence: "This comes off the page, and everything under it goes too.",
            words: ["3,400"],
            more: 0,
          },
        ]}
      />
    )

    expect(screen.getByText(/This comes off the page/)).toBeTruthy()
    expect(screen.queryByText(/This came off the page/)).toBeNull()
  })

  /**
   * A record from before this field existed, or one whose head could not be
   * read, prints nothing rather than an empty rule.
   */
  it("draws nothing when the record has no account of what it did", () => {
    render(<RecordCard record={APPLIED} />)

    expect(screen.queryByText(/came off the page/)).toBeNull()
  })

  /**
   * And a change that never landed has nothing to report either. A refused or
   * discarded ask carries no reading, and one that somehow did must not print
   * it under a badge saying nothing happened.
   */
  it("says nothing about what a discarded ask did", () => {
    /* The hold is dropped rather than set to `undefined`, which
     * `exactOptionalPropertyTypes` refuses and `ANSWERED` above already avoids
     * the same way: an answered ask has no proposal, it does not have a blank
     * one. */
    const discarded: ChangeRecord = (({ heldProposalId: _gone, ...rest }) => ({
      ...rest,
      outcome: "discarded" as const,
      did: DID,
    }))(HELD)

    render(<RecordCard record={discarded} />)

    expect(screen.queryByText(/This came off the page/)).toBeNull()
  })
})

/**
 * A card that has already been read.
 *
 * The card cannot see where it sits in the rail, so this is the one thing about
 * itself it is told (`_lib/reasoning.ts`). What matters is that being told
 * changes the card's *shape* and never its *contents* — the whole of the
 * argument above is still in the DOM, one click down, which is what
 * `the-reasoning.test.tsx` checks block by block and what these two check from
 * the card's own side.
 */
describe("a card whose reasoning has already been made", () => {
  it("folds the weighing, the rule and the comparison under one line", () => {
    const { container } = render(<RecordCard record={APPLIED} reasoning="folded" />)

    const summaries = [...container.querySelectorAll("summary")].map((s) => s.textContent ?? "")

    expect(summaries.some((s) => s.includes("Low risk, and you could undo it."))).toBe(true)
    /* And the technical record is still its own click, not swallowed into this one. */
    expect(summaries.some((s) => s.includes("Show the full record"))).toBe(true)
  })

  /**
   * Nothing is ever removed. The two questions, the rule's own sentence and the
   * ceiling comparison are all still on a folded card — and so is the line
   * saying what the change did, which is the one thing that genuinely differs
   * between two cards and so must never be the thing that folds.
   */
  it("keeps every word of the account, and leaves what the change did in the open", () => {
    const record: ChangeRecord = {
      ...APPLIED,
      did: [
        {
          sentence: "This came off the page, and everything under it went too.",
          words: [],
          more: 0,
        },
      ],
    }

    render(<RecordCard record={record} reasoning="folded" />)

    expect(screen.getByText(WEIGHED_QUESTIONS.damage)).toBeTruthy()
    expect(screen.getByText(WEIGHED_QUESTIONS.reversal)).toBeTruthy()
    expect(screen.getByText(ruleSentence("within-policy"))).toBeTruthy()

    const did = screen.getByText("This came off the page, and everything under it went too.")

    expect(did.closest("details")).toBeNull()
  })

  /**
   * The undo is the demo's payoff — *the inverse, as a button that really puts
   * it back* — and a fold that put it behind a click would have taken the point
   * of the surface with it.
   */
  it("leaves the undo where a visitor can press it", () => {
    render(<RecordCard record={APPLIED} reasoning="folded" />)

    const undo = screen.getByRole("button", { name: UNDO_LABEL })

    expect(undo.closest("details")).toBeNull()
  })

  /** A card rendered on its own has nothing above it, so it argues in full. */
  it("shows the working when nothing says otherwise", () => {
    const { container } = render(<RecordCard record={APPLIED} />)

    expect(screen.getByText(WEIGHED_QUESTIONS.damage).closest("details")).toBeNull()
    expect(
      [...container.querySelectorAll("summary")].map((s) => s.textContent ?? "")
    ).toEqual(["Show the full record"])
  })
})
