import { walkTree, type ElementNode, type LoomTree } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { pageTreeFor } from "./render"
import { DEFAULT_THEME, HOME } from "./site"
import { wordsOf } from "./words"

/**
 * The front door's headline, word for word.
 *
 * It is the maintainer's, and it was changed out from under him once: swapped
 * on 24 October on a misreading of his reply, and restored at his instruction
 * on 7 November, after he had had to repeat it. `copy.ts` has the history.
 *
 * **The literal is written here a second time on purpose.** Importing
 * `HEADLINE` would let one edit to `copy.ts` change the page and this test
 * together, and the test would pass. Changing the headline now takes two edits,
 * which is a change somebody meant, and it should only ever be his.
 */
const HIS_HEADLINE = "Make your web page dynamic with AI and Loom"

const firstLevelOneHeading = (tree: LoomTree): ElementNode | undefined =>
  [...walkTree(tree.root)].find(
    (node): node is ElementNode =>
      node.kind === "element" && node.type === "loom.heading" && node.props["level"] === 1
  )

describe("the front door's headline", () => {
  it("is the maintainer's, word for word", () => {
    const heading = firstLevelOneHeading(pageTreeFor(HOME, { theme: DEFAULT_THEME }))

    expect(heading === undefined ? "(no headline)" : wordsOf(heading).trim()).toBe(HIS_HEADLINE)
  })
})
