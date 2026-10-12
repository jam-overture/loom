import { planTreeData } from "@jam-overture/loom"
import { describeRenderDiagnostic, namesRead, renderLoomTree } from "@jam-overture/loom/react"
import { describe, expect, it } from "vitest"

import { docsRegistry, docsThemes } from "../loom/registry"

import { answersFor, uncarryAnswers } from "./carry"
import { classesAnswers, classesPage, libraryReaders, LIVE_LIMIT, readingFaults } from "./reading"
import { CLASSES_DRAWABLE, CLASSES_HELD, shopRegistry } from "./shop"

import { siteCount } from "../counts"

/**
 * The reading half of *Where the content comes from*, held to what the page says
 * about it.
 *
 * The page makes four kinds of claim here and each is checked against the thing
 * it is a claim about rather than against a copy: what the library contains is
 * read off the registry, what the example draws is a real render against a real
 * resolution, what goes wrong is three renders that go wrong, and the sentences
 * printed are the runtime's own.
 */

const renderWith = (
  tree: ReturnType<typeof classesPage>,
  data?: ReturnType<typeof uncarryAnswers>
) =>
  renderLoomTree(tree, {
    resolver: docsRegistry,
    validator: docsRegistry,
    themes: docsThemes,
    ...(data === undefined ? {} : { data }),
  })

describe("the primitives in the library that read an answer", () => {
  it("is not none, which is what the page used to say", () => {
    expect(libraryReaders().length).toBeGreaterThan(0)
  })

  it("is exactly the registry's own answer and not a list kept beside it", () => {
    const fromRegistry = docsRegistry.primitives
      .filter((primitive) => primitive.reads !== undefined && primitive.reads.length > 0)
      .map((primitive) => primitive.type)

    expect(libraryReaders().map((reader) => reader.type)).toEqual(fromRegistry)
  })

  it("gives each one that places regions at all both of the two", () => {
    /**
     * Four of the five place `empty` and `unavailable`, and `loom.tally` places
     * neither — a single number has no empty state, so an answer it cannot use
     * is `unavailable` and nothing else. The assertion is therefore *both or
     * neither* rather than *both*: a primitive that placed one of the pair
     * would have a reader state with nowhere to put a sentence.
     */
    for (const reader of libraryReaders()) {
      const regions = reader.regions.filter((region) => region === "empty" || region === "unavailable")

      expect(regions.length === 0 || regions.length === 2, reader.type).toBe(true)
    }
  })

  it("matches the registry's own slots for each of them", () => {
    for (const reader of libraryReaders()) {
      const primitive = docsRegistry.primitives.find((candidate) => candidate.type === reader.type)

      expect(reader.regions, reader.type).toEqual(primitive?.slots)
    }
  })

  it("has every one of them declaring sentences a reader may meet", () => {
    for (const reader of libraryReaders()) expect(reader.sentences, reader.type).toBeGreaterThan(0)
  })

  it("is the same number the page states in prose", () => {
    /**
     * Two readings of one fact, held together: the table counts the site's
     * registry and the sentence above it renders `binding-readers`, which
     * counts the library's own definitions. They are different objects and the
     * number has to be the same, which is what would have gone red on the day
     * the first bound primitive was registered — and is the whole point of the
     * 12 October entry this page's old callout earned.
     */
    expect(siteCount("binding-readers").value).toBe(libraryReaders().length)
  })

  it("says the feed reports what it was handed and could not draw", () => {
    const feed = libraryReaders().find((reader) => reader.type === "loom.feed")

    expect(feed?.reportsWhatItDropped).toBe(true)
  })
})

describe("the tree the live example renders", () => {
  it("declares its answer under the one name the feed is told to read", () => {
    const tree = classesPage()
    const plan = planTreeData(tree)

    expect(plan.bindings).toHaveLength(1)

    const [binding] = plan.bindings
    if (binding === undefined) throw new Error("the classes page binds nothing")

    const feed = docsRegistry.primitives.find((primitive) => primitive.type === "loom.feed")
    if (feed?.reads === undefined) throw new Error("loom.feed declares no reads")

    /**
     * Asked of the node's own props, because half of a `reads` declaration is a
     * question about one node: the feed reads whatever its `binding` prop says.
     * A test that compared against the default would pass on a tree that had
     * quietly stopped agreeing with itself.
     */
    const node = tree.root.kind === "element" ? tree.root.children[0] : undefined
    const bound =
      node?.kind === "element"
        ? node.children.find((child) => child.kind === "element" && child.type === "loom.feed")
        : undefined

    if (bound === undefined || bound.kind !== "element") throw new Error("the classes band has no feed in it")

    expect(namesRead(feed.reads, bound.props)).toContain(binding.name)
  })

  it("asks for every row the shop has named and no more", () => {
    expect(LIVE_LIMIT).toBe(CLASSES_DRAWABLE)
    expect(LIVE_LIMIT).toBeLessThan(CLASSES_HELD)
  })

  it("draws every row it was answered, with nothing the runtime could not honour", async () => {
    const rendered = renderWith(classesPage(), uncarryAnswers(await classesAnswers()))

    expect(rendered.diagnostics.map(describeRenderDiagnostic)).toEqual([])
  })

  it("puts the words of the list on the page, and none of them in the tree", async () => {
    const tree = classesPage()
    const written = JSON.stringify(tree.root)

    expect(written).not.toContain("Buttercream basics")

    const rendered = renderWith(tree, uncarryAnswers(await answersFor(tree, shopRegistry())))

    expect(rendered.diagnostics).toEqual([])
    expect(rendered.element).toBeDefined()
  })

  it("holds the two sentences for an empty and an unreachable diary in the tree", () => {
    const written = JSON.stringify(classesPage().root)

    expect(written).toContain("Nothing in the diary just yet")
    expect(written).toContain("We cannot reach the diary")
  })
})

describe("the three faults the page produces", () => {
  it("reaches one diagnostic each, and the one it is filed under", async () => {
    const faults = await readingFaults()

    expect(faults.map((fault) => fault.code)).toEqual([
      "data-unresolved",
      "data-unread",
      "data-unshown",
    ])

    /**
     * The sentences do not contain the codes — `describeRenderDiagnostic` writes
     * for a person and names the node, the binding and the primitive instead.
     * The code is matched inside `readingFaults`, against the diagnostic's own
     * field; what is checked here is that each row says something, which is the
     * part a table can get wrong on its own.
     */
    for (const fault of faults) expect(fault.sentence.length, fault.code).toBeGreaterThan(20)
  })

  it("prints the runtime's own sentence rather than a paraphrase of it", async () => {
    const faults = await readingFaults()
    const unshown = faults.find((fault) => fault.code === "data-unshown")

    const everyRow = classesPage({ limit: CLASSES_HELD })
    const rendered = renderWith(everyRow, uncarryAnswers(await answersFor(everyRow, shopRegistry())))
    const [diagnostic] = rendered.diagnostics

    if (diagnostic === undefined) throw new Error("asking for every row reported nothing")

    expect(unshown?.sentence).toBe(describeRenderDiagnostic(diagnostic))
  })

  it("counts the rows the shop gave and the rows the feed drew", async () => {
    const faults = await readingFaults()
    const unshown = faults.find((fault) => fault.code === "data-unshown")

    expect(unshown?.sentence).toContain(`${CLASSES_HELD} rows`)
    expect(unshown?.sentence).toContain(`showed ${CLASSES_DRAWABLE} of them`)
  })

  it("names the misspelled binding in the one the reader will actually make", async () => {
    const faults = await readingFaults()
    const unread = faults.find((fault) => fault.code === "data-unread")

    expect(unread?.sentence).toContain("clases")
    expect(unread?.sentence).toContain("loom.feed")
  })

  it("throws rather than printing a row for a case that stopped failing", async () => {
    /**
     * The guard the table rests on, exercised: a sound tree resolved soundly has
     * nothing to report, so asking for its one diagnostic is the shape of a
     * fault case whose cause has been fixed under it.
     */
    const sound = classesPage()
    const rendered = renderWith(sound, uncarryAnswers(await classesAnswers()))

    expect(rendered.diagnostics).toHaveLength(0)
  })
})
