import { buildElement, buildSlot, buildText, createTree, sequentialIdFactory } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { demoPageTree } from "./page-tree"
import { THE_TOP_OF_IT, THE_TOP_OF_IT_NOW, thePageItself } from "./the-page-itself"

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

    const window = thePageItself({ tree, shownElsewhere: false, landed: false })

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

    const window = thePageItself({ tree, shownElsewhere: false, landed: false })

    expect(inside).toBeDefined()
    expect(window?.tree.root.id).not.toBe(inside?.id)
    expect(window?.tree.root.kind === "element" ? window.tree.root.type : undefined).toBe(
      "loom.hero"
    )
  })

  /**
   * The one silence, and the whole of the condition.
   *
   * A screen where a card is rendering a band, or the stage is carrying a mark,
   * already has the page in front of the visitor — so a second window onto the
   * top of it would be the surface talking for its own sake. That is what the
   * condition was always claiming; until this run it was spelled *the visitor
   * has asked for something*, which was the same thing only while the first
   * press raised a question.
   */
  it("says nothing when something else is already showing the page", () => {
    expect(
      thePageItself({ tree: demoPageTree(), shownElsewhere: true, landed: false })
    ).toBeUndefined()
    expect(
      thePageItself({ tree: demoPageTree(), shownElsewhere: true, landed: true })
    ).toBeUndefined()
  })

  /**
   * And the state this run exists for: a change has landed and nothing else is
   * showing the page, which on this surface is a change to the page *itself* —
   * applied rather than held, so no band is in a card, and a configure against
   * the root, so `spotFor` draws no mark.
   *
   * Measured on `main` at `39c6ef3`, 390 × 844: after that press the window
   * went, the record landed at `y 981`, and the clinic's own `h1` stood at
   * `y 1,998`. The window is the only thing that can be on that screen.
   */
  it("stays, with the caption that says so, once a change of theirs is on the page", () => {
    const window = thePageItself({ tree: demoPageTree(), shownElsewhere: false, landed: true })

    expect(window?.caption).toBe(THE_TOP_OF_IT_NOW)
  })

  /**
   * And a declined question is not a change: the page is where it was, so the
   * window comes back saying what it said on arrival. The two booleans are read
   * off two different values in `rail.ts` (`landing`, and the marks and bands)
   * exactly so this state can differ from the one above.
   */
  it("does not say *now* over a page the visitor left where it was", () => {
    const window = thePageItself({ tree: demoPageTree(), shownElsewhere: false, landed: false })

    expect(window?.caption).toBe(THE_TOP_OF_IT)
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

    expect(thePageItself({ tree, shownElsewhere: false, landed: false })?.tree.root.id).toBe(band.id)
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

    expect(thePageItself({ tree, shownElsewhere: false, landed: false })).toBeUndefined()
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

    for (const caption of [THE_TOP_OF_IT, THE_TOP_OF_IT_NOW]) {
      expect(caption.toLowerCase()).not.toContain("scroll")
      expect(caption.toLowerCase()).not.toContain("below")
    }
  })

  /**
   * And the second caption is the first one with a word on it, which is the
   * claim worth holding: the window's job does not change when a change lands,
   * so its line should not become a different sentence. What it must not do is
   * narrate the change — that is the record card's, forty pixels down, and a
   * caption competing with it is the third place one change is told about.
   */
  it("says the same thing after a change, plus that it is the page as it stands", () => {
    expect(THE_TOP_OF_IT_NOW).toBe("This is the top of it, now.")
    expect(THE_TOP_OF_IT_NOW.startsWith(THE_TOP_OF_IT.replace(".", ""))).toBe(true)
    expect(THE_TOP_OF_IT_NOW).not.toMatch(/loom|chang|re-theme|applied/i)
  })
})
