import { describe, expect, it } from "vitest"

import { sequentialIdFactory, type LoomTree, type TreeDelta, type TreeOperation } from "@loom/runtime"

import { demoPageTree } from "./page-tree"
import { plainChange, settingsOf } from "./plain-change"
import { presetById } from "./presets"
import { demoRegistry } from "./registry"

/**
 * The plain half of a held proposal.
 *
 * Read against the real page and the real presets rather than a fixture,
 * because the property that matters is not that the function returns strings —
 * it is that **the strings it returns are on the page a visitor is looking
 * at**. A fixture would pass while the demo quoted three enum values at a
 * stranger.
 */

const ids = sequentialIdFactory("plain")
const settings = settingsOf(demoRegistry)

const planOf = (id: string, tree: LoomTree): readonly TreeOperation[] => {
  const preset = presetById(id)
  if (!preset) throw new Error(`no preset ${id}`)

  const operations = preset.plan(tree, ids)
  if (!operations) throw new Error(`preset ${id} planned nothing`)

  return operations
}

const deltaOf = (tree: LoomTree, operations: readonly TreeOperation[]): TreeDelta => ({
  deltaId: ids.deltaId(),
  treeId: tree.treeId,
  baseRevision: tree.revision,
  operations,
})

const linesFor = (id: string) => {
  const tree = demoPageTree()

  return plainChange(tree, deltaOf(tree, planOf(id, tree)), settings)
}

describe("what a held change would do, in the words on the page", () => {
  /**
   * The one that matters. This is the demo's leading ask, and the sentence it
   * replaced was `delete loom.stat-grid · loom.page · and 3 nodes under it`.
   */
  it("names a removal by the figures a visitor was just reading", () => {
    const [line] = linesFor("trim")

    expect(line?.sentence).toBe("This comes off the page, and everything under it goes too.")
    expect(line?.words).toEqual(["3,400", "24", "92%"])
    expect(line?.more).toBe(0)
  })

  /**
   * One string per node and never all of them: a stat carries three, so taking
   * every string in order would spend the whole allowance on the first figure
   * and report the numbers band as *"3,400" · "appointments last year" · "four
   * clinicians, six days a week"* — one figure, described three ways.
   */
  it("takes one word from each node, so three words are three things", () => {
    const [line] = linesFor("trim")

    expect(line?.words).not.toContain("appointments last year")
  })

  it("names an insert by the words it would bring", () => {
    const [line] = linesFor("band")

    expect(line?.sentence).toBe("This goes onto the page, and nothing already on it is touched.")
    expect(line?.words[0]).toBe("Opening hours")
    expect(line?.words).toContain("Where to find us")
  })

  it("says a move changes no words, and quotes the ones it does not change", () => {
    const [line] = linesFor("promote")

    expect(line?.sentence).toBe(
      "This moves to a different place on the page. Not a word of it changes."
    )
    expect(line?.words[0]).toMatch(/^I had been told for two years/u)
  })

  /**
   * The re-theme is the demo's proof that a page's whole appearance is three
   * registered ids on the root (0049), so the sentence has to be the one thing
   * a stranger would otherwise get wrong: nothing it says changes.
   */
  it("tells a re-theme of the whole page apart from a repaint of one band", () => {
    expect(linesFor("palette")[0]?.sentence).toBe(
      "How the whole page looks changes. Not a word on it changes."
    )
    expect(linesFor("backdrop")[0]?.sentence).toBe(
      "How one part of the page looks changes. Not a word on it changes."
    )
  })

  it("quotes nothing for a change of settings, because there is nothing to quote", () => {
    expect(linesFor("palette")[0]?.words).toEqual([])
    expect(linesFor("backdrop")[0]?.more).toBe(0)
  })
})

describe("which strings count as words", () => {
  /**
   * The whole reason this is derived from the registry rather than written
   * here. `tone`, `align`, `backdrop`, `variant` and the rest are closed
   * vocabularies their authors declared, and a primitive that gains one is
   * excluded on the next render with nothing to maintain — which is what makes
   * this safe in a repository where another lane ships primitives most weeks.
   */
  it("excludes every prop the registry says is a closed choice", () => {
    expect(settings.has("loom.section.tone")).toBe(true)
    expect(settings.has("loom.hero.backdrop")).toBe(true)
    expect(settings.has("loom.action.variant")).toBe(true)

    for (const line of linesFor("band")) {
      expect(line.words).not.toContain("surface")
      expect(line.words).not.toContain("muted")
    }
  })

  /**
   * A primitive with no closed choice at all contributes every string it
   * carries, and `loom.stat` is why that is right: `value`, `label` and
   * `caption` are all printed on the page.
   */
  it("keeps every string of a primitive that declares no choices", () => {
    expect(settings.has("loom.stat.value")).toBe(false)
    expect(settings.has("loom.stat.label")).toBe(false)
  })

  /**
   * An address is a string a primitive carries and nobody reads off the page.
   * Quoting `mailto:reception@harbourline.example` back at a visitor as one of
   * "the words that would go" would be a claim about what they can see.
   */
  it("leaves addresses out, because nobody reads one off a page", () => {
    const tree = demoPageTree()
    const hero = tree.root.children[0]
    if (hero === undefined) throw new Error("the demo page has no hero")

    const lines = plainChange(tree, deltaOf(tree, [{ op: "remove", nodeId: hero.id }]), settings)

    expect(lines[0]?.words.join(" ")).not.toContain("mailto:")
    expect(lines[0]?.words.join(" ")).not.toContain("tel:")
  })

  /**
   * Three shown and the rest counted. A removal that quoted three of a hero's
   * eleven strings and stopped would read as a removal of three things.
   */
  it("counts the words it does not show", () => {
    const tree = demoPageTree()
    const hero = tree.root.children[0]
    if (hero === undefined) throw new Error("the demo page has no hero")

    const lines = plainChange(tree, deltaOf(tree, [{ op: "remove", nodeId: hero.id }]), settings)

    expect(lines[0]?.words).toHaveLength(3)
    expect(lines[0]?.more).toBeGreaterThan(0)
  })

  it("cuts a long string rather than printing a paragraph on a card", () => {
    const tree = demoPageTree()
    const quote = plainChange(
      tree,
      deltaOf(tree, planOf("promote", tree)),
      settings
    )[0]

    expect(quote?.words[0]?.length).toBeLessThanOrEqual(57)
    expect(quote?.words[0]?.endsWith("…")).toBe(true)
  })
})

describe("a proposal the page can no longer honour", () => {
  /**
   * The card exists to ask the visitor to allow something, so an operation
   * naming a node that is not there is the most important line on it and must
   * not be silently dropped.
   */
  it("says so rather than saying nothing", () => {
    const tree = demoPageTree()
    const gone = { op: "remove", nodeId: tree.root.children[0]?.id ?? tree.root.id } as const

    const lines = plainChange(
      tree,
      deltaOf(tree, [gone, gone]),
      settings
    )

    expect(lines).toHaveLength(2)
    expect(lines[1]?.sentence).toBe("This would take off something the page no longer has.")
  })

  /**
   * One sentence per operation, in order, so a two-step proposal cannot be
   * shown to a visitor as a one-step one.
   */
  it("keeps one line per operation", () => {
    const tree = demoPageTree()
    const lines = plainChange(
      tree,
      deltaOf(tree, [...planOf("trim", tree), ...planOf("palette", tree)]),
      settings
    )

    expect(lines).toHaveLength(2)
    expect(lines[0]?.words).toEqual(["3,400", "24", "92%"])
    expect(lines[1]?.words).toEqual([])
  })
})

/**
 * The property the whole unit is for, stated once as a property rather than as
 * a string: **nothing this card says unasked may be vocabulary a stranger has
 * not met.** A rendering that starts naming primitive types, node ids or delta
 * verbs fails here however well it reads.
 */
describe("the plain half stays plain", () => {
  const RESERVED = ["loom.", "delta", "node", "revision", "proposal", "n_", "i_"]

  it("names no type, no id and no word out of the runtime's vocabulary", () => {
    for (const id of ["trim", "band", "promote", "palette", "backdrop"]) {
      for (const line of linesFor(id)) {
        for (const reserved of RESERVED) {
          expect(line.sentence.toLowerCase()).not.toContain(reserved)
        }
      }
    }
  })
})
