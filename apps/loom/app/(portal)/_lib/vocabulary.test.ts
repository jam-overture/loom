import { describe, expect, it } from "vitest"

import { dispositionReasonCodeSchema, stakeLevelSchema, type NodeId, type NodeKind } from "@loom/runtime"
import {
  describeAddressing,
  type Addressing,
  type UnaddressableReason,
} from "@loom/runtime/react"
import type { RevertOutcome, WriteOutcome } from "@loom/runtime/write"

import {
  CANNOT_UNDO,
  CHANGE_STATES,
  PART_KINDS,
  STAKES,
  confidenceWord,
  plainState,
  pointingWords,
  ruleSentence,
  stateOfRevert,
  stateOfWrite,
  toneClasses,
  type ChangeState,
  type OutcomeTone,
} from "./vocabulary"

/**
 * Written out rather than derived, so adding a member to `WriteOutcome` fails
 * this file instead of silently rendering as whatever the last branch was.
 */
const everyWriteKind: readonly WriteOutcome["kind"][] = [
  "committed",
  "held",
  "refused",
  "not-interpreted",
  "not-applicable",
  "not-written",
  "not-answerable",
]

const everyState: readonly ChangeState[] = [
  "applied",
  "waiting",
  "refused",
  "declined",
  "misunderstood",
  "no-change",
  "not-saved",
  "already-answered",
  "unfinished",
]

/**
 * The rule the whole file exists to keep: a label is what a person says, not
 * what the runtime's type system says. Every one of these appeared on a portal
 * screen before this branch.
 */
const RUNTIME_JARGON: readonly string[] = [
  "not-interpreted",
  "did-not-apply",
  "not-applicable",
  "in-flight",
  "held",
  "committed",
  "not-written",
  "not-answerable",
  "not-revertable",
  "uninterpreted",
  "inapplicable",
  "discarded",
]

describe("the change states", () => {
  it("names every one of them", () => {
    expect(Object.keys(CHANGE_STATES).sort()).toEqual([...everyState].sort())
  })

  it("gives every state a label, a meaning and the runtime's own name", () => {
    for (const state of everyState) {
      const plain = plainState(state)

      expect(plain.label.length).toBeGreaterThan(0)
      expect(plain.meaning.length).toBeGreaterThan(0)
      expect(plain.technical.length).toBeGreaterThan(0)
    }
  })

  /**
   * The point of the table, asserted directly. A label that reads
   * `did-not-apply` is the failure this branch is about, and it is the kind of
   * thing that comes back one component at a time.
   */
  it("puts no runtime identifier in a label a person reads", () => {
    for (const state of everyState) {
      const { label, meaning } = plainState(state)

      for (const jargon of RUNTIME_JARGON) {
        expect(label.toLowerCase()).not.toContain(jargon)
        expect(meaning.toLowerCase()).not.toContain(jargon)
      }
      expect(label).not.toMatch(/-/)
    }
  })

  it("starts every label with a capital, so a badge does not read as code", () => {
    for (const state of everyState) {
      expect(plainState(state).label[0]).toBe(plainState(state).label[0]?.toUpperCase())
    }
  })

  it("gives each state its own label, so two are never confusable", () => {
    expect(new Set(everyState.map((state) => plainState(state).label)).size).toBe(everyState.length)
  })

  it("keeps the runtime's name for every state it renamed", () => {
    for (const kind of everyWriteKind) {
      expect(plainState(stateOfWrite(kind)).technical).toBe(kind)
    }
  })

  it("ends every meaning as a sentence", () => {
    for (const state of everyState) {
      expect(plainState(state).meaning).toMatch(/[.?]$/)
    }
  })
})

describe("stateOfWrite", () => {
  it("has a state for every kind a write can end in", () => {
    for (const kind of everyWriteKind) {
      expect(everyState).toContain(stateOfWrite(kind))
    }
  })

  /**
   * 0019 turns on these two not collapsing into one another: "you may not" and
   * "I did not understand" are different answers, and a reader who cannot tell
   * them apart cannot tell a policy from an outage.
   */
  it("keeps a refusal and a failed interpretation apart", () => {
    expect(stateOfWrite("refused")).not.toBe(stateOfWrite("not-interpreted"))
    expect(plainState(stateOfWrite("refused")).tone).not.toBe(
      plainState(stateOfWrite("not-interpreted")).tone
    )
  })

  it("calls only a committed write applied", () => {
    const applied = everyWriteKind.filter((kind) => stateOfWrite(kind) === "applied")

    expect(applied).toEqual(["committed"])
  })
})

describe("stateOfRevert", () => {
  const everyRevertKind: readonly RevertOutcome["kind"][] = [...everyWriteKind, "not-revertable"]

  it("reads a plan that produced no undo as its own state, not as a refusal", () => {
    expect(stateOfRevert("not-revertable")).toBe("cannot-undo")
    expect(CANNOT_UNDO.tone).not.toBe(plainState("refused").tone)
  })

  it("says something for every kind an undo can end in", () => {
    for (const kind of everyRevertKind) {
      const state = stateOfRevert(kind)

      expect(state === "cannot-undo" ? CANNOT_UNDO.label : plainState(state).label).not.toBe("")
    }
  })
})

describe("the stakes", () => {
  it("has a plain name for every level the runtime grades", () => {
    for (const level of stakeLevelSchema.options) {
      expect(STAKES[level].label.length).toBeGreaterThan(0)
      expect(STAKES[level].technical).toBe(level)
    }
  })

  /** "critical" says where you are on a scale; the label has to say what it costs. */
  it("says what the level is for, not only which level it is", () => {
    expect(STAKES.critical.label).not.toBe("critical")
    expect(STAKES.low.label).not.toBe("low")
  })
})

/**
 * These sentences came from the demo's `record` module, where only the demo
 * could read them. The check that every code has one moved with them, and got
 * stronger on the way: it reads the schema's own options rather than a list
 * copied out of it, so a rule added to the runtime fails here.
 */
describe("ruleSentence", () => {
  it("explains every rule the Gate can cite", () => {
    for (const code of dispositionReasonCodeSchema.options) {
      expect(ruleSentence(code).length, code).toBeGreaterThan(20)
      expect(ruleSentence(code)).toMatch(/[.]$/)
    }
  })

  it("never answers with the code itself", () => {
    for (const code of dispositionReasonCodeSchema.options) {
      expect(ruleSentence(code)).not.toContain(code)
    }
  })
})

describe("confidenceWord", () => {
  /**
   * 0007 makes the number a self-grade and 0031 makes calibration the only
   * thing that says whether it is worth anything, so the word is attributed
   * rather than asserted. "Very sure" would be the portal vouching for it.
   */
  it("attributes the grade to the AI rather than stating it as fact", () => {
    for (const confidence of [0.05, 0.5, 0.72, 0.95]) {
      expect(confidenceWord(confidence)).toContain("The AI says")
    }
  })

  it("reads as less sure the lower it goes", () => {
    expect(new Set([0.95, 0.75, 0.55, 0.2].map(confidenceWord)).size).toBe(4)
  })

  it("survives the ends of the scale", () => {
    expect(confidenceWord(0).length).toBeGreaterThan(0)
    expect(confidenceWord(1).length).toBeGreaterThan(0)
  })
})

describe("toneClasses", () => {
  const everyTone: readonly OutcomeTone[] = [
    "applied",
    "awaiting",
    "rejected",
    "uninterpreted",
    "inapplicable",
  ]

  it("maps every tone to a background and a foreground", () => {
    for (const tone of everyTone) {
      expect(toneClasses(tone).split(" ")).toHaveLength(2)
    }
  })

  it("gives each tone its own classes", () => {
    expect(new Set(everyTone.map(toneClasses)).size).toBe(everyTone.length)
  })
})

/**
 * The page screen's half of the table. `element`, `slot` and `text` were printed
 * at a reviewer under a heading reading `kind`, which is the schema's own word
 * for the schema's own three cases.
 */
describe("PART_KINDS", () => {
  const everyKind: readonly NodeKind[] = ["element", "slot", "text"]

  it("names every kind of part a tree can hold", () => {
    for (const kind of everyKind) {
      expect(PART_KINDS[kind].label.length, kind).toBeGreaterThan(3)
      expect(PART_KINDS[kind].meaning, kind).toMatch(/[.]$/)
    }
  })

  it("never leads with the runtime's own word", () => {
    for (const kind of everyKind) {
      expect(PART_KINDS[kind].label.toLowerCase(), kind).not.toContain(kind)
    }
  })

  it("keeps the runtime's own word, so a reader can match the two up", () => {
    for (const kind of everyKind) {
      expect(PART_KINDS[kind].technical).toBe(kind)
    }
  })

  it("gives each kind its own label", () => {
    expect(new Set(everyKind.map((kind) => PART_KINDS[kind].label)).size).toBe(everyKind.length)
  })
})

/**
 * The sentence 0019 requires and the sentence it never occurred to the runtime
 * to write. Delegation is stated — that is 0019 — but the reader's actual
 * question is whether the thing they have picked can still be changed, and for
 * every one of these outcomes the answer is yes.
 */
describe("pointingWords", () => {
  const addressable: Addressing = { outcome: "addressable", nodeId: "n_1" as NodeId }

  const delegated = (reason: UnaddressableReason): Addressing => ({
    outcome: "delegated",
    nodeId: "n_card" as NodeId,
    requested: "n_text" as NodeId,
    reason,
  })

  const unaddressable = (reason: UnaddressableReason): Addressing => ({
    outcome: "unaddressable",
    requested: "n_text" as NodeId,
    reason,
  })

  const everyReason: readonly UnaddressableReason[] = [
    "not-an-element",
    "undecorated-primitive",
    "absent",
  ]

  const everyAddressing: readonly Addressing[] = [
    addressable,
    ...everyReason.map(delegated),
    ...everyReason.map(unaddressable),
  ]

  it("answers for every shape of addressing the runtime can produce", () => {
    for (const addressing of everyAddressing) {
      const plain = pointingWords(addressing)

      expect(plain.label.length, addressing.outcome).toBeGreaterThan(10)
      expect(plain.meaning, addressing.outcome).toMatch(/[.]$/)
    }
  })

  /**
   * The property the whole redirection is for. `loom.editable`, `primitive`,
   * `node`, `selection` and `ancestor` are all in the runtime's sentence for
   * one of these, and none of them may reach the surface.
   */
  it("keeps the runtime's vocabulary out of what a person reads", () => {
    const jargon = /\b(node|nodes|primitive|primitives|selection|ancestor|delegat\w*|DOM|tree)\b/i

    for (const addressing of everyAddressing) {
      const plain = pointingWords(addressing)

      expect(plain.label, plain.label).not.toMatch(jargon)
      expect(plain.meaning, plain.meaning).not.toMatch(jargon)
    }
  })

  /** Guards the guard: the technical reading must actually trip that regex. */
  it("finds the vocabulary it bans in the reading it is kept out of", () => {
    expect(pointingWords(delegated("undecorated-primitive")).technical).toMatch(
      /\b(primitive|node|selection)\b/i
    )
  })

  /**
   * The sentence that was missing. Pointing is about the DOM and scoping is
   * about the tree, so a part nobody can click is still a part anybody can
   * change — and a reader told only that a click "falls back" has no way to
   * know it.
   */
  it("tells a reader a part they cannot click is still a part they can change", () => {
    for (const reason of everyReason) {
      for (const addressing of [delegated(reason), unaddressable(reason)]) {
        expect(pointingWords(addressing).meaning, reason).toContain("still applies")
      }
    }
  })

  it("says plainly when a click does reach the thing asked for", () => {
    expect(pointingWords(addressable).meaning).toContain("exactly this part")
  })

  /** Each reason is a different fact about the page, so each gets its own words. */
  it("gives every reason its own sentence", () => {
    const meanings = everyReason.map((reason) => pointingWords(delegated(reason)).meaning)

    expect(new Set(meanings).size).toBe(everyReason.length)
  })

  it("keeps the runtime's own description verbatim, one click down", () => {
    for (const addressing of everyAddressing) {
      expect(pointingWords(addressing).technical).toBe(describeAddressing(addressing))
    }
  })
})
