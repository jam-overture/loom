import { describe, expect, it } from "vitest"

import {
  buildElement,
  buildText,
  createTree,
  sequentialIdFactory,
  treeIdSchema,
  type IdFactory,
  type LoomNode,
  type LoomTree,
} from "@loom/runtime"
import { memoryTreeStore } from "@loom/runtime/store"

import { seedTree } from "./seed"

import { UNTITLED, nameFor, nameFrom, nameReading, namesOf, pageNameOf, unnamed } from "./page-name"

/**
 * What a page is called, derived from the page.
 *
 * The rule every test here is a face of: **the name never replaces the id.**
 * `PageName` carries both because every screen that shows one owes a reader the
 * other, and the failure this module was written against — a heading that was a
 * machine identifier — is not fixed by swapping which half is missing.
 */

const heading = (ids: IdFactory, level: 1 | 2 | 3, text: string): LoomNode =>
  buildElement(ids, {
    type: "loom.heading",
    props: { level },
    children: text === "" ? [] : [buildText(ids, text)],
  })

const prose = (ids: IdFactory, text: string): LoomNode =>
  buildElement(ids, { type: "loom.prose", children: [buildText(ids, text)] })

/**
 * A page built from the parts a test names, through the same builders the seed
 * uses.
 *
 * The namespace is a parameter because `sequentialIdFactory` is deterministic:
 * two pages built from the same namespace get the same tree id, and a store
 * asked to hold both would refuse the second as already existing.
 */
const pageOf = (namespace: string, build: (ids: IdFactory) => readonly LoomNode[]): LoomTree => {
  const ids = sequentialIdFactory(namespace)

  return createTree(buildElement(ids, { type: "loom.page", children: build(ids) }), ids)
}

describe("what a page is called", () => {
  it("reads the seeded page's own heading, which is the name a visitor is served", () => {
    expect(pageNameOf(seedTree()).name).toBe("Loom")
  })

  it("keeps the id beside the name rather than replacing it", () => {
    const tree = seedTree()
    const named = pageNameOf(tree)

    expect(named.treeId).toBe(tree.treeId)
    expect(named.derived).toBe(true)
  })

  /**
   * The *first* heading, not the highest level. A page whose opening heading is
   * a level 3 is a page whose author put that text at the top, and naming it
   * after a level 1 further down would name it after something nobody meets
   * first.
   */
  it("takes the heading a reader meets first, whatever its level", () => {
    const tree = pageOf("first", (ids) => [
      heading(ids, 3, "Autumn arrivals"),
      heading(ids, 1, "Everything else"),
    ])

    expect(pageNameOf(tree).name).toBe("Autumn arrivals")
  })

  it("finds a heading nested inside something else", () => {
    const tree = pageOf("nested", (ids) => [
      buildElement(ids, {
        type: "loom.card",
        children: [heading(ids, 2, "Inside a card")],
      }),
    ])

    expect(pageNameOf(tree).name).toBe("Inside a card")
  })

  it("joins a heading split across several text nodes, as the renderer does", () => {
    const ids = sequentialIdFactory("split")
    const tree = createTree(
      buildElement(ids, {
        type: "loom.page",
        children: [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 1 },
            children: [buildText(ids, "Autumn "), buildText(ids, "arrivals")],
          }),
        ],
      }),
      ids
    )

    expect(pageNameOf(tree).name).toBe("Autumn arrivals")
  })

  it("collapses the whitespace a heading was written with", () => {
    const tree = pageOf("spaces", (ids) => [heading(ids, 1, "  Autumn\n   arrivals  ")])

    expect(pageNameOf(tree).name).toBe("Autumn arrivals")
  })

  /**
   * A row is one line high. A headline long enough to wrap it would push the
   * revision count off the card, so it is cut — and the untruncated text stays
   * reachable, which is what `PageName`'s `title` attribute is for.
   */
  it("shortens a headline too long for a row, and says it has", () => {
    const long = "A headline about seasonal arrivals that simply will not stop going on and on"
    const tree = pageOf("long", (ids) => [heading(ids, 1, long)])
    const named = pageNameOf(tree)

    expect(named.name.length).toBeLessThan(long.length)
    expect(named.name.endsWith("…")).toBe(true)
    expect(named.name.startsWith("A headline about seasonal arrivals")).toBe(true)
    expect(named.name).not.toContain(" …")
  })

  it("leaves a headline that fits exactly as it was written", () => {
    const tree = pageOf("fits", (ids) => [heading(ids, 1, "Autumn arrivals")])

    expect(pageNameOf(tree).name).toBe("Autumn arrivals")
  })

  describe("when the page has not said what it is called", () => {
    it("says untitled rather than falling back to the id", () => {
      const tree = pageOf("bare", (ids) => [prose(ids, "No heading anywhere on this page.")])
      const named = pageNameOf(tree)

      expect(named.name).toBe(UNTITLED)
      expect(named.name).not.toBe(tree.treeId)
      expect(named.derived).toBe(false)
    })

    it("still carries the id, so a caller can always show one", () => {
      const tree = pageOf("bare", (ids) => [prose(ids, "No heading anywhere on this page.")])

      expect(pageNameOf(tree).treeId).toBe(tree.treeId)
    })

    it("treats a heading with nothing in it as no name at all", () => {
      const tree = pageOf("blank", (ids) => [heading(ids, 1, "")])

      expect(pageNameOf(tree).derived).toBe(false)
    })

    it("treats a heading of pure whitespace as no name at all", () => {
      const tree = pageOf("whitespace", (ids) => [heading(ids, 1, "   \n  ")])

      expect(pageNameOf(tree).derived).toBe(false)
    })
  })
})

describe("naming a listed page of trees", () => {
  const stored = async (): Promise<{
    store: ReturnType<typeof memoryTreeStore>
    trees: readonly LoomTree[]
  }> => {
    const store = memoryTreeStore()
    const first = pageOf("listedfirst", (ids) => [heading(ids, 1, "Autumn arrivals")])
    const second = pageOf("listedsecond", (ids) => [prose(ids, "Nothing but prose.")])

    await store.create(first)
    await store.create(second)

    return { store, trees: [first, second] }
  }

  it("names every id it was asked about", async () => {
    const { store, trees } = await stored()
    const names = await namesOf(
      store,
      trees.map((tree) => tree.treeId)
    )

    expect(names.size).toBe(2)
    expect(names.get(trees[0]!.treeId)?.name).toBe("Autumn arrivals")
    expect(names.get(trees[1]!.treeId)?.name).toBe(UNTITLED)
  })

  /**
   * The failure that matters, and the one this is written to pin. A page the
   * portal cannot read is not a page the portal may drop: a row that vanished on
   * a transient store error is indistinguishable from a page that is gone.
   */
  it("names a page it could not read rather than leaving it out", async () => {
    const { store } = await stored()
    const missing = treeIdSchema.parse("t_nothinghere")

    const names = await namesOf(store, [missing])

    expect(names.size).toBe(1)
    expect(names.get(missing)).toEqual(unnamed(missing))
  })

  it("asks for nothing when it was given nothing", async () => {
    const { store } = await stored()

    expect((await namesOf(store, [])).size).toBe(0)
  })

  it("gives a caller a name for an id that is not in the map at all", () => {
    const missing = treeIdSchema.parse("t_nothinghere")

    expect(nameFrom(new Map(), missing)).toEqual({
      name: UNTITLED,
      treeId: missing,
      derived: false,
    })
  })
})

/**
 * The scoped screens hold one id rather than a listing, so they ask for one
 * name. Same read, same failure story, a shape that does not make a caller
 * build a single-element array and then look up the only key in the map.
 */
describe("naming the one page a screen is scoped to", () => {
  it("reads the name off the page's own head revision", async () => {
    const store = memoryTreeStore()
    const tree = pageOf("scopedone", (ids) => [heading(ids, 1, "Autumn arrivals")])
    await store.create(tree)

    expect(await nameFor(store, tree.treeId)).toEqual({
      name: "Autumn arrivals",
      treeId: tree.treeId,
      derived: true,
    })
  })

  it("costs the name and nothing else when the read fails", async () => {
    const missing = treeIdSchema.parse("t_nothinghere")

    expect(await nameFor(memoryTreeStore(), missing)).toEqual(unnamed(missing))
  })
})

/**
 * How the pair reads as one string.
 *
 * The `PageName` component renders the two halves as two elements and a
 * sentence needs them as text; a space is the whole of the difference between
 * them, and a missing one is exactly the defect 24 August produced three times.
 */
describe("a named page as one string", () => {
  it("reads as the words, then the id", () => {
    expect(nameReading({ name: "Autumn arrivals", treeId: "t_seed1", derived: true })).toBe(
      "Autumn arrivals t_seed1"
    )
  })

  it("still reads as two things for a page with no name of its own", () => {
    expect(nameReading(unnamed("t_seed1"))).toBe(`${UNTITLED} t_seed1`)
  })
})
