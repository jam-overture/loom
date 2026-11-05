import { applyDelta, type LoomNode, type LoomTree, type TreeDelta } from "@jam-overture/loom"
import { catalogueOf } from "@jam-overture/loom/sdk"
import { describe, expect, it } from "vitest"

import {
  ALLOWED,
  AS_BUILT_PAGE,
  COFFEE_POLICY,
  EDIT_COLUMNS,
  EDIT_COUNT,
  EDITED_PAGE,
  EDITS,
  EDITS_CAPTION,
  FOR_A_GIFT_PAGE,
  HELD,
  inWords,
  THE_CLAIM,
  THE_EDITS,
  THE_WAY_BACK,
  TOO_MUCH,
  WHAT_ALLOWED_IT,
  WHEN_IT_ASKS,
} from "./allowed"
import { ARRANGEMENTS } from "./example"
import { partNameOf } from "./library"
import { siteRegistry } from "./registry"
import { readerCopy } from "./words"

/**
 * The band that says what allowed the change, held to the change.
 *
 * Every sentence in it is about a fact the framework produced, and this file
 * is the join between the two. The failures it is written to catch are all one
 * shape: **a sentence that outlives the thing it reports.** A tile edited in
 * `example.ts`, a threshold moved in the framework, a rule added to the Gate's
 * ladder — any of those can leave this band printing a number that was right
 * last month, and no reader could tell.
 *
 * `reported.ts`' test is the precedent and the division of labour is the same
 * one: the module refuses to build when it cannot make its claim at all, and
 * this file holds the claims a build can make wrongly.
 */

const copyOf = (tree: LoomTree): readonly string[] =>
  readerCopy(tree.root).map(({ text }) => text)

const idsIn = (tree: LoomTree): readonly string[] => {
  const found: string[] = []
  const walk = (node: LoomNode): void => {
    found.push(node.id)
    for (const child of node.kind === "text" ? [] : node.children) walk(child)
  }
  walk(tree.root)

  return found
}

const operationsOf = (delta: TreeDelta): readonly string[] =>
  delta.operations.map(({ op }) => op)

describe("the three edits are the two frames", () => {
  /**
   * **The claim of the whole band, and the only assertion here that could not
   * be replaced by reading the code.**
   *
   * The band says the right-hand frame is the left-hand frame after these
   * edits. That is checkable in exactly one way: apply them and compare what a
   * reader reads. Not the ids, which differ by construction — the tile that
   * arrives is minted by the change and the one in the built arrangement was
   * minted by the page — and not the shape, which the comparison below covers
   * anyway by walking the same copy in the same order.
   */
  it("turn the page on the left into the page on the right, word for word", () => {
    expect(copyOf(EDITED_PAGE)).toEqual(copyOf(FOR_A_GIFT_PAGE))
  })

  it("are a change the framework accepts rather than one it has to repair", () => {
    expect(applyDelta(AS_BUILT_PAGE, THE_EDITS).ok).toBe(true)
  })

  /**
   * The band names three kinds of change and never counts them, which is
   * `chain.ts`' rule about not putting a third number on a page that already
   * has two. The shape is still worth pinning: a fourth operation arriving
   * here would mean the example had grown a move, and *What happened* would
   * have a row nobody wrote a verb for.
   */
  it("are one of each kind the example needs, and nothing moves", () => {
    expect(operationsOf(THE_EDITS)).toEqual(["configure", "insert", "remove"])
  })

  it("leave the line under the heading alone, which is what makes it one page", () => {
    const steady = ARRANGEMENTS.asBuilt.line

    expect(ARRANGEMENTS.forAGift.line).toBe(steady)
    expect(copyOf(EDITED_PAGE)).toContain(steady)
  })

  /**
   * The insert cannot reuse a name the page already carries, and the framework
   * says so rather than this test: `applyDelta` returns `duplicate-node-id`.
   * What is held here is that the two namespaces really are disjoint, because
   * the day somebody gives the change the page's own namespace the only
   * symptom is a build that stops.
   */
  it("name the part that arrives something the page was not already using", () => {
    const page = new Set(idsIn(AS_BUILT_PAGE))
    const inserted = THE_EDITS.operations.filter(
      (operation): operation is Extract<typeof operation, { op: "insert" }> =>
        operation.op === "insert"
    )

    expect(inserted).toHaveLength(1)
    for (const { node } of inserted) {
      expect(page.has(node.id)).toBe(false)
    }
  })

  /** The part that arrives is one the deployment can actually draw. */
  it("add a part this site's own library registered", () => {
    const registered = catalogueOf(siteRegistry).map(({ type }) => type)

    for (const operation of THE_EDITS.operations) {
      if (operation.op !== "insert" || operation.node.kind !== "element") continue

      expect(COFFEE_POLICY.registeredPrimitiveTypes).toContain(operation.node.type)
      expect(registered).toContain(operation.node.type)
    }
  })
})

describe("what the band says about the verdict", () => {
  it("says nobody was asked, and the framework agrees", () => {
    expect(ALLOWED.verdict.kind).toBe("accepted")
    expect(WHAT_ALLOWED_IT).toContain("without waiting for you")
  })

  /**
   * The acceptance is the *easy* half and it is only worth printing because the
   * hold below is printed beside it. A policy that accepts everything is not a
   * policy, and a band showing one verdict cannot tell a reader which it has.
   */
  it("shows a change the same rules do not let through", () => {
    expect(HELD.verdict.kind).toBe("requires-confirmation")
    expect(WHEN_IT_ASKS.join(" ")).toContain("asks you")
  })

  /** One policy, both verdicts. The difference is the change and nothing else. */
  it("judges both by the same rules", () => {
    expect(ALLOWED.verdict.policyId).toBe(COFFEE_POLICY.policyId)
    expect(HELD.verdict.policyId).toBe(COFFEE_POLICY.policyId)
    expect(HELD.verdict.policyFingerprint).toBe(ALLOWED.verdict.policyFingerprint)
  })

  /**
   * The hold is a hold **because nobody asked for it**, which is the fifth
   * link's whole situation. Pinned here because the same change from a
   * developer's own hand would come back accepted, and a band that had quietly
   * drifted onto that origin would be showing a reader a verdict their page
   * will never get.
   */
  it("judges it as an adaptation nobody requested", () => {
    expect(COFFEE_POLICY.autoApplyCeiling["system-signal"]).toBe("low")
    expect(ALLOWED.verdict.stakes).toBe("low")
    expect(HELD.verdict.stakes).toBe("medium")
  })

  it("takes away exactly as much as the sentence beside it claims", () => {
    expect(ALLOWED.removed).toBe(1)
    expect(HELD.removed).toBe(ARRANGEMENTS.asBuilt.offers.length)
    expect(WHEN_IT_ASKS.join(" ")).toContain(`all ${inWords(HELD.removed)} away`)
    expect(operationsOf(TOO_MUCH).filter((op) => op === "remove")).toHaveLength(HELD.removed)
  })
})

describe("the way back", () => {
  it("exists, and the band says how many edits it is", () => {
    expect(ALLOWED.verdict.reversible).toBe(true)
    expect(ALLOWED.undoEdits).toBe(EDIT_COUNT)
    expect(THE_WAY_BACK).toContain(`${inWords(ALLOWED.undoEdits ?? 0)} more edits`)
  })

  /**
   * The claim the second sentence of {@link THE_WAY_BACK} makes is about
   * *when* the undo is worked out, and the framework's answer is *while it is
   * deciding*: the way back arrives on the assessment that the verdict is read
   * off, not on a later request. `HELD` is the one that proves it is not a
   * side effect of being accepted — the held change has its way back computed
   * too, before anybody has said yes to it.
   */
  it("was worked out for the change nobody has agreed to yet", () => {
    expect(HELD.undoEdits).toBeGreaterThan(0)
  })
})

describe("every sentence in the band", () => {
  const sentences = [THE_CLAIM, WHAT_ALLOWED_IT, THE_WAY_BACK, ...WHEN_IT_ASKS, EDITS_CAPTION]

  /**
   * The band's numbers are spelled, and this is what stops one being typed.
   * Every count in the copy is `inWords` over a value the framework produced,
   * so a digit anywhere in these strings is a number that came from somewhere
   * else.
   */
  it("carries no digit a reader could have to check", () => {
    expect(sentences.filter((sentence) => /\d/.test(sentence))).toEqual([])
  })

  it("counts the edits rather than claiming a number for them", () => {
    expect(EDIT_COUNT).toBe(THE_EDITS.operations.length)
    expect(THE_CLAIM).toContain(`${inWords(EDIT_COUNT)} edits`)
    expect(EDITS_CAPTION).toContain(inWords(EDIT_COUNT))
  })

  it("has a row for every edit and a column for every half of one", () => {
    expect(EDITS).toHaveLength(EDIT_COUNT)
    expect(EDIT_COLUMNS).toHaveLength(2)
    for (const { did, words } of EDITS) {
      expect(did.length).toBeGreaterThan(0)
      expect(words.length).toBeGreaterThan(0)
    }
  })

  /**
   * The words column is the fictional product's own copy, which is the half a
   * reader recognises from the frame above. A row whose words are not on
   * either frame would be a row about a change that is not the one being
   * shown.
   */
  it("quotes only copy that is on one of the two frames", () => {
    const shown = new Set([...copyOf(AS_BUILT_PAGE), ...copyOf(FOR_A_GIFT_PAGE)])

    for (const { words } of EDITS) {
      expect({ words, shown: shown.has(words) }).toEqual({ words, shown: true })
    }
  })

  /**
   * The verbs name the parts with `partNameOf`, which is the same function the
   * row of chips three bands above uses. So a part renamed in the library
   * renames it in both places, and the two bands cannot come to call one thing
   * by two names. Derived here rather than spelled, for the same reason.
   */
  it("names the parts exactly as the row of chips above names them", () => {
    const tile = partNameOf("loom.feature")
    const named = EDITS.filter(({ did }) => did.includes(tile))

    expect(catalogueOf(siteRegistry).map(({ type }) => type)).toContain("loom.feature")
    expect(named).toHaveLength(2)
    expect(EDITS[0]?.did).toContain(partNameOf("loom.heading").toLowerCase())
  })
})

describe("the spelling of a count", () => {
  it("is a word for every count this band can reach", () => {
    expect(inWords(0)).toBe("no")
    expect(inWords(3)).toBe("three")
    expect(inWords(9)).toBe("nine")
  })

  /** Better a build that stops than a digit arriving mid-sentence. */
  it("refuses a count it cannot spell", () => {
    expect(() => inWords(10)).toThrow(/cannot spell|more than/)
  })
})
