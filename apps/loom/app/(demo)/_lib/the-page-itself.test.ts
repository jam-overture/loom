import { buildElement, buildSlot, buildText, createTree, sequentialIdFactory } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { demoPageTree } from "./page-tree"
import { THE_TOP_OF_IT, thePageItself } from "./the-page-itself"

/**
 * The reading on its own, over the demo's real tree and over three trees it
 * will never be handed.
 *
 * `rail.test.ts` holds that the rail wires it and that it goes silent the
 * moment a visitor has asked for anything, over records the pipeline really
 * produced. What is held here is **which node the window is of**, which is the
 * only thing this module decides, and the two trees for which the answer is
 * nothing.
 */
describe("thePageItself", () => {
  /**
   * The screen it exists for. On a production build at 390 × 844 the rail is
   * 1,013px and the stage begins at `y 1,094` — 250px past the fold — so a
   * visitor on a phone is told *ask that page for a change* and *it's the page
   * below* on a screen with no page on it.
   */
  it("is the page's own top band, with the tree it came out of around it", () => {
    const tree = demoPageTree()
    const hero = tree.root.kind === "element" ? tree.root.children[0] : undefined

    const window = thePageItself({ tree, asked: false })

    expect(window?.tree.root.id).toBe(hero?.id)
    expect(window?.tree.treeId).toBe(tree.treeId)
    expect(window?.tree.revision).toBe(tree.revision)
    expect(window?.caption).toBe(THE_TOP_OF_IT)
  })

  /**
   * And it is the band rather than something inside it, which is the other way
   * a reading like this goes wrong: a search that descended would find the
   * hero's heading — a line of type with no ground under it and no edges a
   * visitor can see the page in.
   */
  it("is the band and not the first thing inside the band", () => {
    const tree = demoPageTree()
    const hero = tree.root.kind === "element" ? tree.root.children[0] : undefined
    const inside = hero?.kind === "element" ? hero.children[0] : undefined

    const window = thePageItself({ tree, asked: false })

    expect(inside).toBeDefined()
    expect(window?.tree.root.id).not.toBe(inside?.id)
    expect(window?.tree.root.kind === "element" ? window.tree.root.type : undefined).toBe(
      "loom.hero"
    )
  })

  /**
   * The one silence, and the whole of the condition.
   *
   * From the first press onwards every screen on this surface already brings
   * the page to the visitor — the question renders the band it is about inside
   * itself, answering carries them to the mark on the page, and a removal's
   * content is in the landed card. The arrival screen is the one screen with no
   * page on it.
   */
  it("says nothing once the visitor has asked for something", () => {
    expect(thePageItself({ tree: demoPageTree(), asked: true })).toBeUndefined()
  })

  /**
   * A slot is a named position rather than a thing on the page, and its
   * children are a fallback a parent primitive may never render — so it is
   * skipped rather than descended into, which is `in-question.ts`'s own reason
   * for refusing one.
   */
  it("skips a slot and takes the first element after it", () => {
    const ids = sequentialIdFactory("slotted")
    const band = buildElement(ids, { type: "loom.section", props: {}, children: [] })
    const tree = createTree(
      buildElement(ids, {
        type: "loom.page",
        props: {},
        children: [buildSlot(ids, "heading", []), band],
      }),
      ids
    )

    expect(thePageItself({ tree, asked: false })?.tree.root.id).toBe(band.id)
  })

  /**
   * And nothing at all for a page with no band on it. A bare string renders
   * with no ground under it and no edges, so a window onto one would be a
   * window onto nothing — the silently-empty frame this surface argues against
   * everywhere else.
   */
  it("says nothing for a page whose children are not elements", () => {
    const ids = sequentialIdFactory("bare")
    const tree = createTree(
      buildElement(ids, {
        type: "loom.page",
        props: {},
        children: [buildText(ids, "nothing to look at")],
      }),
      ids
    )

    expect(thePageItself({ tree, asked: false })).toBeUndefined()
  })

  /**
   * The words, held here rather than in the component, for the reason every
   * other sentence on this surface is held in `_lib`: the one in the markup is
   * a string nothing compares against anything.
   *
   * No instruction in it, which is the rule `rail-header.tsx` deleted two lines
   * for on 26 September — telling a stranger to go hunting on a 4,724px
   * document is worse than saying nothing, and they do not need to: the press
   * carries them.
   */
  it("says what the window is a part of, and tells nobody to scroll", () => {
    expect(THE_TOP_OF_IT).toBe("This is the top of it.")
    expect(THE_TOP_OF_IT.toLowerCase()).not.toContain("scroll")
    expect(THE_TOP_OF_IT.toLowerCase()).not.toContain("below")
  })
})
