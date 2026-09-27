import { describe, expect, it } from "vitest"

import { randomIdFactory, type LoomTree } from "@jam-overture/loom"

import { partTheAskWouldTouch } from "./before-the-press"
import { partInQuestion } from "./in-question"
import { demoPageTree } from "./page-tree"
import { DEMO_LEADING_PRESET, presetById, type DemoPresetId } from "./presets"

/**
 * What the one invited press is about, read before it is pressed.
 *
 * The properties here are all versions of one claim: **this is the same reading
 * the question already gets, one step earlier.** So every test that can be
 * written as a comparison against `partInQuestion` is, rather than against a
 * string — a fixture of what the excerpt should contain would pass while the
 * two readings drifted apart, and the two drifting apart is the only failure
 * that matters.
 */

const tree = (): LoomTree => demoPageTree()

const presetOf = (id: DemoPresetId) => {
  const preset = presetById(id)
  if (!preset) throw new Error(`no preset ${id}`)

  return preset
}

const askAbout = (id: DemoPresetId, against: LoomTree) =>
  partTheAskWouldTouch(against, randomIdFactory, presetOf(id))

describe("the part the ask would touch", () => {
  /**
   * The failure this whole unit exists for: *Take the numbers off* promises the
   * appointments, the years and the waiting time, and on the arrival screen
   * there were no appointments, years or waiting time anywhere — the band is
   * below the fold at 1280×900 and about four thousand pixels down at 390×844.
   */
  it("brings the numbers to the button that would take them off", () => {
    const part = askAbout(DEMO_LEADING_PRESET, tree())

    expect(part).toBeDefined()
    expect(part?.tree.root.type).toBe("loom.stat-grid")
    expect(part?.lead).toBe("This is what would come off the page.")
  })

  /**
   * **The same node the question would show**, which is the claim that keeps
   * the two from drifting. A second walk of the tree written beside this one
   * could point at the stat grid today and at its first child after a refactor,
   * and every assertion about the words in it would still pass.
   */
  it("names the node the question would name, because it is the same reading", () => {
    const against = tree()
    const preset = presetOf(DEMO_LEADING_PRESET)
    const operations = preset.plan(against, randomIdFactory)

    expect(operations).toBeDefined()

    const asked = partTheAskWouldTouch(against, randomIdFactory, preset)
    const questioned = partInQuestion(against, {
      deltaId: randomIdFactory.deltaId(),
      treeId: against.treeId,
      baseRevision: against.revision,
      operations: operations ?? [],
    })

    expect(asked?.tree.root.id).toBe(questioned?.tree.root.id)
    expect(asked?.lead).toBe(questioned?.lead)

    /** The same node and the same sentence, and the one thing that differs. */
    expect(asked?.where).toBe("ask")
    expect(questioned?.where).toBe("question")
  })

  /**
   * **The moment, and it is the assertion this file exists to carry.**
   *
   * `globals.css` hangs two rules off it and the first is `display: none` on a
   * wide screen — right for a question, which is answered beside a stage that
   * is already ringed, and wrong for an ask, where nothing is ringed because a
   * ring is what a press produces. It was a prop of the view for one hour of
   * this run: the defect was restored — the ask's excerpt handed the question's
   * moment — and **caught by nothing**, because the only place the answer could
   * be written was `page.tsx`, which no `vitest` run can reach.
   */
  it("says it is an ask, which is the rule that draws it on a wide screen", () => {
    expect(askAbout(DEMO_LEADING_PRESET, tree())?.where).toBe("ask")
  })

  /**
   * The excerpt is the page from that node down, carrying the page's own tree
   * id and revision — because that is what it is, rather than a copy kept
   * beside it. Nothing here is stored, committed or proposed against.
   */
  it("is the page itself, from that node down", () => {
    const against = tree()
    const part = askAbout(DEMO_LEADING_PRESET, against)

    expect(part?.tree.treeId).toBe(against.treeId)
    expect(part?.tree.revision).toBe(against.revision)
  })

  /**
   * A re-theme is one configure against the root, and an excerpt of the root is
   * the whole page rendered a second time inside the rail beside it. The
   * refusal is `in-question.ts`'s and it is inherited rather than repeated —
   * this asserts it survives the second caller.
   */
  it("shows nothing for an ask that names the page itself", () => {
    expect(askAbout("palette", tree())).toBeUndefined()
  })

  /**
   * The insert is the one ask whose subject is not on the page, so its preview
   * is the proposal's own node — the only way to show a band that does not
   * exist yet, and the reason a preview is worth building at all.
   */
  it("shows a band that is not on the page yet, for the ask that would add one", () => {
    const part = askAbout("band", tree())

    expect(part?.lead).toBe("This is what would be added.")
    expect(part?.tree.root.type).toBe("loom.section")
  })

  /** Every preset the table offers is either previewable or deliberately not. */
  it("answers for every ask on the table", () => {
    const against = tree()

    for (const id of ["palette", "backdrop", "band", "trim", "promote"] as const) {
      expect(() => askAbout(id, against)).not.toThrow()
    }
  })

  /**
   * **The plan is computed against the tree in front of it**, which is what
   * makes the preview follow the page rather than describe it. Move the quote
   * to position 1 and the move has nothing left to do; the preview goes with
   * the ask rather than pointing at a change that cannot happen.
   */
  it("goes away when the tree gives the ask nothing to do", () => {
    const against = tree()
    const quote = against.root.children.find(
      (child) => child.kind === "element" && child.type === "loom.quote"
    )

    expect(quote).toBeDefined()

    const moved: LoomTree = {
      ...against,
      root: {
        ...against.root,
        children: [
          against.root.children[0]!,
          quote!,
          ...against.root.children.slice(1).filter((child) => child !== quote),
        ],
      },
    }

    expect(askAbout("promote", moved)).toBeUndefined()
  })
})
