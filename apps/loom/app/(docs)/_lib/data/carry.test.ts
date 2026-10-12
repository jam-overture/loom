import { planTreeData, resolveTreeData, type NodeId } from "@jam-overture/loom"
import { renderLoomTree } from "@jam-overture/loom/react"
import { describe, expect, it } from "vitest"

import { docsRegistry, docsThemes } from "../loom/registry"

import { answersFor, carryAnswers, uncarryAnswers } from "./carry"
import { classesPage } from "./reading"
import { pageWithAMisdeclaredBinding, shopRegistry } from "./shop"

/**
 * The carrier, held to being a courier rather than an author.
 *
 * It exists for one reason: a resolution is two closures and the examples on
 * this site are rendered in a browser, so the answers have to cross a boundary
 * a function cannot. The risk a courier carries is that it quietly becomes a
 * second opinion — answering where the real resolution did not, rounding an
 * absence to an empty bag, dropping a problem nobody looked at. Each of those
 * is a test here, and the last one is the one that matters: a tree whose
 * answers did not arrive has to still earn its `data-unresolved`.
 */

const resolutionFor = async (tree: ReturnType<typeof classesPage>) =>
  resolveTreeData(tree, { registry: shopRegistry() })

describe("carrying a resolution across a boundary", () => {
  it("answers every bound node exactly as the resolution it was read from", async () => {
    const tree = classesPage()
    const plan = planTreeData(tree)
    const original = await resolutionFor(tree)
    const carried = uncarryAnswers(carryAnswers(plan, original))

    expect(plan.bindings.length).toBeGreaterThan(0)

    for (const binding of plan.bindings) {
      expect(carried.lookup(binding.nodeId)[binding.name]).toEqual(
        original.lookup(binding.nodeId)[binding.name]
      )
    }
  })

  it("survives being turned into JSON and back, which is what the boundary does", async () => {
    const tree = classesPage()
    const plan = planTreeData(tree)
    const posted = JSON.parse(JSON.stringify(carryAnswers(plan, await resolutionFor(tree))))
    const carried = uncarryAnswers(posted)

    const [binding] = plan.bindings
    if (binding === undefined) throw new Error("the classes page binds nothing")

    const outcome = carried.lookup(binding.nodeId)[binding.name]

    expect(outcome?.status).toBe("ready")
  })

  it("renders the same page on the other side, with the same diagnostics", async () => {
    const tree = classesPage()
    const options = { resolver: docsRegistry, validator: docsRegistry, themes: docsThemes }

    const here = renderLoomTree(tree, { ...options, data: await resolutionFor(tree) })
    const there = renderLoomTree(tree, { ...options, data: uncarryAnswers(await answersFor(tree, shopRegistry())) })

    expect(there.diagnostics).toEqual(here.diagnostics)
  })

  it("says nothing about a node nobody asked about", async () => {
    const tree = classesPage()
    const carried = uncarryAnswers(await answersFor(tree, shopRegistry()))

    expect(carried.lookup("n_nobody" as NodeId)).toEqual({})
    expect(carried.problemsFor("n_nobody" as NodeId)).toEqual([])
  })

  it("leaves a tree whose answers did not travel to earn its own diagnostic", () => {
    /**
     * The failure this module could most easily hide, and the reason
     * `uncarryAnswers` reaches for the runtime's own `NO_DATA` rather than
     * returning an empty object of its own. A bound node handed an empty bag
     * *with no problem beside it* is, in the seam's own words, a caller that
     * resolved a different tree — and the walk says so. A carrier that quietly
     * answered "nothing, and nothing was wrong" would make a page missing all
     * of its data render clean.
     */
    const rendered = renderLoomTree(classesPage(), {
      resolver: docsRegistry,
      validator: docsRegistry,
      themes: docsThemes,
      data: uncarryAnswers({ answers: [], problems: [] }),
    })

    expect(rendered.diagnostics.map((diagnostic) => diagnostic.code)).toContain("data-unresolved")
  })

  it("reports a name read by nobody, where the answers are for a name the tree stopped using", async () => {
    /**
     * The other half of that pair, and worth keeping apart from it. Every
     * example on this site is built by a deterministic id factory, so two trees
     * built from one builder share their node ids — which means answers
     * resolved for a *renamed* binding do reach the right node, under the wrong
     * name. That is `data-unread` rather than `data-unresolved`, and the
     * distinction is the one `loom.feed`'s own declaration exists to make.
     */
    const renamed = classesPage({ declaredName: "somethingElse" })

    const rendered = renderLoomTree(renamed, {
      resolver: docsRegistry,
      validator: docsRegistry,
      themes: docsThemes,
      data: uncarryAnswers(await answersFor(renamed, shopRegistry())),
    })

    expect(rendered.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["data-unread"])
  })

  it("carries a problem for a node whose declaration could not be read at all", async () => {
    const tree = pageWithAMisdeclaredBinding()
    const plan = planTreeData(tree)
    const carried = uncarryAnswers(carryAnswers(plan, await resolveTreeData(tree, { registry: shopRegistry() })))

    expect(plan.problems.length).toBeGreaterThan(0)

    const [problem] = plan.problems
    if (problem === undefined) throw new Error("the misdeclared page reports no problem")

    expect(carried.problemsFor(problem.nodeId).map((reported) => reported.kind)).toContain("misdeclared")
  })

  it("carries nothing for a tree that asks nothing", async () => {
    const empty = { answers: [], problems: [] } as const
    const carried = uncarryAnswers(empty)

    expect(carried.lookup("n_anything" as NodeId)).toEqual({})
  })
})
