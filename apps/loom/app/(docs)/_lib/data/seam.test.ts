import { planTreeData, resolveTreeData } from "@loom/runtime"
import { renderLoomTree } from "@loom/runtime/react"
import { describe, expect, it } from "vitest"

import { docsRegistry, docsThemes } from "../loom/registry"

import {
  produceAnswers,
  produceMisdeclared,
  produceMissingAnswers,
  produceQuestions,
} from "./answers"
import { boundPage, shopRegistry } from "./shop"

/**
 * The data seam, held to what *Where the content comes from* says about it.
 *
 * Two different things are being checked here and they fail for different
 * reasons. The producers are checked against the runtime — a page that prints
 * four bindings coming to three questions is making a claim about
 * `planTreeData`, and the day that stops being true the page should go red
 * rather than merely out of date. The **tree** is checked against the renderer,
 * because a bound tree that no longer renders would make every word on the page
 * a description of something nobody can build.
 */

describe("the questions a bound page produces", () => {
  it("reads every binding written into the tree", () => {
    const { written } = produceQuestions()

    expect(written.map((binding) => binding.reads)).toEqual([
      "loom.data.services",
      "loom.data.services",
      "loom.data.hours",
      "loom.data.bio",
    ])
  })

  /**
   * The page's whole point about cost. Four declarations, three round trips,
   * because two of them are the same question with their keys in different
   * orders — which is what a plan written by two different planners looks like.
   */
  it("asks one question fewer than the tree has bindings", () => {
    const asked = produceQuestions()

    expect(asked.written).toHaveLength(4)
    expect(asked.asked).toBe(3)
    expect(asked.shared).toBe(1)
  })

  it("does not mind which order the keys were written in", () => {
    const asked = produceQuestions()
    const written = asked.written.filter((binding) => binding.source === "catalogue.services")

    expect(written).toHaveLength(2)
    expect(written[0]?.params).not.toBe(written[1]?.params)

    const shared = asked.questions.filter((question) => question.source === "catalogue.services")

    expect(shared).toHaveLength(1)
    expect(shared[0]?.askedBy).toHaveLength(2)
  })

  /**
   * Derived rather than written: whatever the story becomes, every binding in
   * the tree has to end up waiting on exactly one of the questions the page
   * prints.
   */
  it("leaves no binding waiting on a question the page does not show", () => {
    const asked = produceQuestions()
    const waiting = asked.questions.flatMap((question) => question.askedBy)

    expect(waiting).toHaveLength(asked.written.length)
  })
})

describe("what comes back", () => {
  it("answers every binding the plan made", async () => {
    const answers = await produceAnswers()

    expect(answers).toHaveLength(4)
    expect(answers.every((answer) => answer.status === "ready")).toBe(true)
  })

  /**
   * The sentence a reader is most likely to disbelieve, held to the shape it is
   * about: a source with nothing to say answers `ready` with an empty list, and
   * nothing anywhere calls that a failure.
   */
  it("calls an empty answer ready rather than unavailable", async () => {
    const answers = await produceAnswers()
    const hours = answers.find((answer) => answer.reads === "loom.data.hours")

    expect(hours?.status).toBe("ready")
    expect(hours?.rows).toBe(0)
  })

  it("hands the two bindings on one question the same answer", async () => {
    const answers = await produceAnswers()
    const [band, grid] = answers.filter((answer) => answer.source === "catalogue.services")

    expect(band?.value).toBe(grid?.value)
    expect(band?.rows).toBe(3)
  })

  it("gives back what the source promised and not what it holds", async () => {
    const answers = await produceAnswers()
    const services = answers.find((answer) => answer.reads === "loom.data.services")

    // Four services in the shop, three asked for.
    expect(services?.rows).toBe(3)
  })
})

describe("when there is no answer", () => {
  /**
   * One row per reason the seam has. The count is asserted against the union
   * rather than against six, so a reason added to the runtime takes this page
   * red instead of quietly going undocumented.
   */
  it("produces every reason a binding can have no value", async () => {
    const missing = await produceMissingAnswers()

    expect(missing.map((row) => row.reason).sort()).toEqual([
      "adapter-threw",
      "invalid-answer",
      "invalid-params",
      "no-such-source",
      "refused",
      "unavailable",
    ])
  })

  it("says something different about each of them", async () => {
    const missing = await produceMissingAnswers()

    expect(new Set(missing.map((row) => row.sentence)).size).toBe(missing.length)
  })

  /**
   * The two the deployment never even heard about. A cap declared in a schema is
   * a query that does not run; a cap enforced inside the adapter is a query that
   * does.
   */
  it("refuses a bad question before anybody's code runs", async () => {
    const missing = await produceMissingAnswers()
    const early = missing.filter((row) => row.reached === "the adapter was never called")

    expect(early.map((row) => row.reason).sort()).toEqual(["invalid-params", "no-such-source"])
  })

  it("reports a declaration it cannot read instead of throwing", () => {
    expect(produceMisdeclared()).toContain("source")
  })
})

describe("the bound tree itself", () => {
  /**
   * A page's worth of bindings is not a special kind of tree. It renders through
   * the ordinary registry, with the answers resolved, and the renderer has
   * nothing to complain about — which is the claim the whole page rests on.
   */
  it("renders with nothing the runtime could not honour", async () => {
    const { tree } = boundPage()
    const data = await resolveTreeData(tree, { registry: shopRegistry() })

    const rendered = renderLoomTree(tree, {
      resolver: docsRegistry,
      validator: docsRegistry,
      themes: docsThemes,
      data,
    })

    expect(rendered.diagnostics).toEqual([])
  })

  /**
   * And is told so when they are missing. A renderer handed a bound tree and no
   * resolution does not guess — it says the binding was never resolved, which is
   * the diagnostic a host sees the first time they forget the one await.
   */
  it("says so when the answers were never resolved", () => {
    const { tree } = boundPage()

    const rendered = renderLoomTree(tree, {
      resolver: docsRegistry,
      validator: docsRegistry,
      themes: docsThemes,
    })

    expect(rendered.diagnostics.map((diagnostic) => diagnostic.code)).toContain("data-unresolved")
  })

  it("builds the same tree every time", () => {
    expect(JSON.stringify(boundPage().tree.root)).toBe(JSON.stringify(boundPage().tree.root))
  })

  it("declares a binding on a node the planner can find", () => {
    const plan = planTreeData(boundPage().tree)

    expect(plan.problems).toEqual([])
    expect(plan.bindings).toHaveLength(4)
  })
})
