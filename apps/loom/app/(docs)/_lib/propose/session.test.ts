import { describe, expect, it } from "vitest"

import { docsExamples } from "../examples/catalogue"

import { openDocsSession } from "./session"

/**
 * The store an example opens, and the two things a page claims about it.
 */

const seedOf = (id: string) => {
  const example = docsExamples.get(id)
  if (example === undefined) throw new Error(`no example is registered as "${id}"`)

  return example.build()
}

describe("opening a session on an example", () => {
  it("starts at revision 0 with an empty log, which is what a new page is", async () => {
    const seed = seedOf("first-tree")
    const session = await openDocsSession(seed)
    const head = await session.store.head(session.treeId)
    const page = await session.store.revisions(session.treeId)

    expect(head.ok && head.value.revision).toBe(0)
    expect(page.ok && page.value.revisions).toEqual([])
  })

  /**
   * The seed is kept, not rebuilt. Planning an undo replays the log from a tree
   * older than the target (0028), and a seed that was not this tree's own
   * revision 0 produces a plan that cannot be inverted.
   */
  it("keeps the tree it was opened on, so an undo has something to replay from", async () => {
    const seed = seedOf("first-tree")
    const session = await openDocsSession(seed)

    expect(session.seed).toBe(seed)
    expect(session.treeId).toBe(seed.treeId)
  })

  /** Every documented example can be put in a store, checked rather than assumed. */
  it("opens on every example the site holds", async () => {
    for (const example of docsExamples.values()) {
      const session = await openDocsSession(example.build())
      const head = await session.store.head(session.treeId)

      expect(head.ok, `"${example.id}" could not be stored`).toBe(true)
    }
  })
})
