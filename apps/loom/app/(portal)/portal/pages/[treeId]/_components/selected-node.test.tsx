import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { treeIdSchema, type NodeId } from "@jam-overture/loom"

import type { NodeCredit } from "@/app/(portal)/_lib/attribution-view"
import type { OutlineRow } from "@/app/(portal)/_lib/outline"

import { SelectedNode } from "./selected-node"
import { SelectionProvider } from "./selection-context"
import { TreeOutline } from "./tree-outline"

/**
 * The densest block of the runtime's vocabulary anywhere in the portal: three
 * monospace pairs headed `node`, `kind` and `addresses`, with `nothing` a
 * legitimate value of the third, and under them — when the news was bad —
 * `this primitive does not spread loom.editable, so selection falls back to
 * n_card`.
 *
 * Every word of that is true. None of it answers the question the reader has,
 * which is whether they can change the thing they just clicked. They almost
 * always can, and the pane never said so.
 *
 * The pane is driven through the outline rather than by handing it a
 * selection, because selection is genuinely shared state (0019's two panes,
 * one answer) and a test that set it directly would not exercise the thing
 * that breaks.
 */

const treeId = treeIdSchema.parse("t_seed1")

const row = (
  nodeId: string,
  kind: OutlineRow["kind"],
  label: string,
  technical: string | null,
  addressing: OutlineRow["addressing"]
): OutlineRow => ({
  nodeId: nodeId as NodeId,
  parentId: null,
  depth: 0,
  kind,
  label,
  technical,
  addressing,
})

const rows: readonly OutlineRow[] = [
  row("n_card", "element", "Card", "loom.card", {
    outcome: "addressable",
    nodeId: "n_card" as NodeId,
  }),
  row("n_words", "text", "Hello there", null, {
    outcome: "delegated",
    nodeId: "n_card" as NodeId,
    requested: "n_words" as NodeId,
    reason: "not-an-element",
  }),
  row("n_lost", "element", "Mystery", "loom.mystery", {
    outcome: "unaddressable",
    requested: "n_lost" as NodeId,
    reason: "undecorated-primitive",
  }),
]

const credit: NodeCredit = {
  placed: "added",
  by: "jonathan asked, the model wrote it",
  revision: 3,
  since: [],
  omitted: 0,
  partial: false,
}

const pane = (credits: Record<string, NodeCredit> = {}) =>
  render(
    <SelectionProvider rows={rows}>
      <TreeOutline />
      <SelectedNode credits={credits} treeId={treeId} />
    </SelectionProvider>
  )

const pick = (name: RegExp) => fireEvent.click(screen.getByRole("button", { name }))

/**
 * The pane's own disclosure. The outline rendered beside it has one too — its
 * legend — so a test reaching for the first `<details>` in the tree would be
 * asserting about the wrong pane.
 */
const addressing = (container: HTMLElement): HTMLDetailsElement | undefined =>
  [...container.querySelectorAll("details")].find((element) =>
    element.textContent?.includes("addresses")
  )

describe("SelectedNode", () => {
  /**
   * An empty state is where a new person actually starts, so it is the one
   * screen that must answer "what do I do now". It used to read "Select a node
   * — in the outline, or by clicking the preview — to see what it addresses",
   * which names two panes by words neither of them uses and offers a reward
   * ("what it addresses") nobody wants.
   */
  it("tells a reader who has picked nothing what picking something is for", () => {
    pane()

    expect(document.body.textContent).toContain("Nothing picked yet.")
    expect(document.body.textContent).toContain("ask for a change to just that part")
    expect(document.body.textContent).not.toContain("Select a node")
  })

  it("names both ways of picking, in the words those two panes actually use", () => {
    pane()

    expect(document.body.textContent).toContain("Click any part of the page")
    expect(document.body.textContent).toContain("choose one from the list")
  })

  /**
   * The 22 August layout defect settled this: a plain sentence describes a
   * class, and what tells two of them apart is the name of the thing. A
   * reviewer who cannot see which part they picked cannot go and look at it.
   */
  it("keeps the part's own name on the surface", () => {
    const { container } = pane()

    pick(/Hello there/)

    const surface = container.cloneNode(true) as HTMLElement
    for (const details of surface.querySelectorAll("details")) details.remove()

    expect(surface.textContent).toContain("n_words")
  })

  it("says what kind of thing it is in a person's words", () => {
    pane()

    pick(/Hello there/)

    expect(document.body.textContent).toContain("Words")
  })

  /**
   * The pane led with `n_seed9` in the largest text it had. An id answers
   * *which part is this* for the log and for nothing a person can see, and the
   * reader has just clicked the thing — what they want back is its name.
   */
  it("leads with what the part is, and keeps the id under it", () => {
    const { container } = pane()

    pick(/Card/)

    const lines = [...container.querySelectorAll("p")].map((line) => line.textContent)
    const name = lines.indexOf("Card")
    const id = lines.indexOf("n_card")

    expect(name).toBeGreaterThan(-1)
    expect(id).toBeGreaterThan(name)
  })

  /**
   * Where `loom.card` went when the rail stopped printing it on every row —
   * into the disclosure that already held the node and the kind. Moved, not
   * deleted: this is the test that would fail if a later run made the screen
   * simpler by losing it.
   */
  it("keeps the registered type the rail used to print, one click down", () => {
    const { container } = pane()

    pick(/Card/)

    const surface = container.cloneNode(true) as HTMLElement
    for (const details of surface.querySelectorAll("details")) details.remove()

    expect(surface.textContent).not.toContain("loom.card")
    expect(addressing(container)?.textContent).toContain("loom.card")
  })

  /** A text row is its words, and the runtime would only say them back. */
  it("adds no type pair for a part that has no name of its own", () => {
    const { container } = pane()

    pick(/Hello there/)

    expect(addressing(container)?.textContent).not.toContain("type")
  })

  it("says plainly when the page can be clicked to reach it", () => {
    pane()

    pick(/Card/)

    expect(document.body.textContent).toContain("picks exactly this part")
  })

  /**
   * The sentence that was missing entirely. Pointing is about the DOM; scoping
   * a request is about the tree, which is why `PromptBox` posts the requested
   * node rather than the addressed one. A reader told only that a click "falls
   * back" has no way to know a change still reaches what they picked.
   */
  it("tells a reader a part they cannot click is still a part they can change", () => {
    pane()

    pick(/Hello there/)

    expect(document.body.textContent).toContain("still applies to this part")
  })

  it("says the same of a part with nothing clickable around it either", () => {
    pane()

    pick(/Mystery/)

    expect(document.body.textContent).toContain("still applies to it")
  })

  /**
   * A fallback and a dead end are different facts and were the same amber box
   * only by accident of both being "not addressable". A delegated click still
   * lands somewhere; an unaddressable one does not, and it is not a refusal.
   */
  it("does not colour a part nobody can click as a refusal", () => {
    const { container } = pane()

    pick(/Mystery/)

    expect(container.querySelector(".bg-rejected")).toBeNull()
    expect(container.querySelector(".bg-inapplicable")).toBeInstanceOf(HTMLElement)
  })

  it("keeps the runtime's vocabulary off the surface once something is picked", () => {
    const { container } = pane()

    pick(/Hello there/)

    const surface = container.cloneNode(true) as HTMLElement
    for (const details of surface.querySelectorAll("details")) details.remove()

    expect(surface.textContent).not.toMatch(/\b(loom\.editable|addresses|delegat\w+)\b/i)
  })

  /**
   * Nothing is deleted to make a screen simpler. All three pairs the pane used
   * to lead with are still here, closed, where find-in-page still reaches them.
   */
  it("keeps every pair it used to lead with, one click down", () => {
    const { container } = pane()

    pick(/Hello there/)

    const details = addressing(container)

    expect(details?.open).toBe(false)
    expect(details?.textContent).toContain("node")
    expect(details?.textContent).toContain("kind")
    expect(details?.textContent).toContain("text")
    expect(details?.textContent).toContain("n_card")
  })

  it("keeps the runtime's own description of the fallback, one click down", () => {
    const { container } = pane()

    pick(/Hello there/)

    expect(container.textContent).toContain("renders without an element of its own")
  })

  it("says a click reaches nothing, rather than leaving the pair blank", () => {
    const { container } = pane()

    pick(/Mystery/)

    const details = addressing(container)

    expect(details?.textContent).toContain("nothing")
  })

  it("shows who put the part there when the log could say", () => {
    pane({ n_words: credit })

    pick(/Hello there/)

    expect(document.body.textContent).toContain("added")
    expect(document.body.textContent).toContain("the model wrote it")
  })

  it("costs nothing but the credit when the log could not say", () => {
    pane()

    pick(/Hello there/)

    expect(document.body.textContent).toContain("n_words")
    expect(document.body.textContent).not.toContain("the model wrote it")
  })

  /**
   * Phase 2. A reader can pick several parts, and the honest treatment of that
   * is the one that loses nothing: every picked part gets the block it got when
   * it was the only one. A compact list with the detail collapsed behind a row
   * would be a screen made simpler by removing what it used to say, which is
   * the one thing this surface is not allowed to do.
   */
  it("gives every picked part the same block, in full", () => {
    const { container } = pane({ n_words: credit })

    pick(/Card/)
    pick(/Hello there/)

    expect(container.textContent).toContain("n_card")
    expect(container.textContent).toContain("n_words")
    expect(container.textContent).toContain("the model wrote it")
    expect(container.querySelectorAll("[title='Card']").length).toBe(1)
  })

  /**
   * In the order the page holds them, not the order they were clicked. A rail
   * that remembered the clicks would disagree with the pictures under the page
   * about what "these two parts" means, and a set of parts has no arrangement
   * of its own to remember (0199).
   */
  it("keeps them in the order the page holds them, however they were picked", () => {
    const { container } = pane()

    pick(/Mystery/)
    pick(/Card/)

    const ids = [...container.querySelectorAll("p")]
      .map((line) => line.textContent ?? "")
      .filter((text) => text === "n_card" || text === "n_lost")

    expect(ids).toEqual(["n_card", "n_lost"])
  })

  it("goes back to the empty state when the last one is let go of", () => {
    pane()

    pick(/Card/)
    pick(/Card/)

    expect(document.body.textContent).toContain("Nothing picked yet.")
  })
})
