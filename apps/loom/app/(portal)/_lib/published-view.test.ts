import { describe, expect, it } from "vitest"

import { buildElement, createTree, sequentialIdFactory } from "@jam-overture/loom"

import { pageFixture } from "@/app/_lib/pages/fixtures"

import { UNTITLED } from "./page-name"
import { pageNamesOf, publishedRowOf } from "./published-view"

const AT = Date.UTC(2026, 9, 24, 14, 5)

describe("a published page, as the Pages screen shows it", () => {
  it("is named by its own heading, with its id, version and arrival beside it", () => {
    const tree = pageFixture("home", "Welcome", 3)

    expect(publishedRowOf({ tree, receivedAt: AT })).toEqual({
      name: "Welcome",
      derived: true,
      treeId: tree.treeId,
      revision: 3,
      received: "24 October 2026 at 14:05 UTC",
    })
  })

  it("is called untitled when it has no heading, and says so", () => {
    const ids = sequentialIdFactory("bare")
    const tree = createTree(buildElement(ids, { type: "loom.stack" }), ids)

    expect(publishedRowOf({ tree, receivedAt: AT })).toMatchObject({
      name: UNTITLED,
      derived: false,
    })
  })
})

describe("the names published pages give themselves", () => {
  it("names each page by id, and leaves out one that has no heading", () => {
    const ids = sequentialIdFactory("bare")
    const bare = createTree(buildElement(ids, { type: "loom.stack" }), ids)
    const home = pageFixture("home", "Welcome")

    expect(
      pageNamesOf([
        { tree: home, receivedAt: AT },
        { tree: bare, receivedAt: AT },
      ])
    ).toEqual(new Map([[home.treeId, "Welcome"]]))
  })
})
