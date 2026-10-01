import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { NodeId } from "@jam-overture/loom"
import { LOOM_NODE_ATTRIBUTE } from "@jam-overture/loom/react"

import type { OutlineRow } from "@/app/(portal)/_lib/outline"

import { PreviewSurface } from "./preview-surface"
import { SelectionProvider } from "./selection-context"
import { TreeOutline } from "./tree-outline"

/**
 * The page made selectable without being re-rendered — and, as of phase 2, with
 * more than one part outlined at a time.
 *
 * It had no test until this change, and the reason it earns one now is that the
 * marking stopped being *move the mark* and became *clear every one, then set
 * the ones that are picked*. Those two are the same code for one selected part
 * and different code for two, so the behavior that matters is invisible to any
 * test written before this.
 *
 * The children stand in for what a Server Component produced. What this
 * component reads off them is one attribute, which is 0010's whole point: edit
 * mode decorates rather than restructures, so a plain div carrying the attribute
 * is a faithful stand-in for a rendered primitive.
 */
const marked = (nodeId: string, words: string) => (
  <div {...{ [LOOM_NODE_ATTRIBUTE]: nodeId }} data-words={words}>
    {words}
  </div>
)

const row = (nodeId: string, label: string): OutlineRow => ({
  nodeId: nodeId as NodeId,
  parentId: null,
  depth: 0,
  kind: "element",
  label,
  technical: "loom.card",
  addressing: { outcome: "addressable", nodeId: nodeId as NodeId },
})

/** The one row a click on the page cannot reach, so the mark has nowhere to go. */
const words: OutlineRow = {
  nodeId: "n_words" as NodeId,
  parentId: "n_left" as NodeId,
  depth: 1,
  kind: "text",
  label: "Hello there",
  technical: null,
  addressing: {
    outcome: "unaddressable",
    requested: "n_words" as NodeId,
    reason: "not-an-element",
  },
}

const rows: readonly OutlineRow[] = [row("n_left", "Left"), row("n_right", "Right"), words]

const surface = () =>
  render(
    <SelectionProvider rows={rows}>
      <TreeOutline />
      <PreviewSurface>
        {marked("n_left", "Autumn")}
        {marked("n_right", "Winter")}
      </PreviewSurface>
    </SelectionProvider>
  )

const marks = (container: HTMLElement): readonly string[] =>
  [...container.querySelectorAll("[data-loom-selected]")].map(
    (element) => element.getAttribute("data-words") ?? ""
  )

const page = (container: HTMLElement): HTMLElement => {
  const found = container.querySelector(".loom-preview")
  if (!(found instanceof HTMLElement)) throw new Error("no preview surface")

  return found
}

describe("PreviewSurface", () => {
  it("marks nothing before anything is picked", () => {
    const { container } = surface()

    expect(marks(container)).toEqual([])
  })

  it("marks the part a click on the page landed on", () => {
    const { container } = surface()

    fireEvent.click(screen.getByText("Autumn"))

    expect(marks(container)).toEqual(["Autumn"])
  })

  /**
   * The behavior phase 2 added, and the whole reason this file exists. Two
   * parts of one page outlined at once, without this component knowing how many
   * there are.
   */
  it("marks every picked part rather than moving one mark", () => {
    const { container } = surface()

    fireEvent.click(screen.getByText("Autumn"))
    fireEvent.click(screen.getByText("Winter"))

    expect(marks(container)).toEqual(["Autumn", "Winter"])
  })

  it("takes the mark off a part that was clicked a second time", () => {
    const { container } = surface()

    fireEvent.click(screen.getByText("Autumn"))
    fireEvent.click(screen.getByText("Winter"))
    fireEvent.click(screen.getByText("Autumn"))

    expect(marks(container)).toEqual(["Winter"])
  })

  /**
   * The one gesture a toggling selection needs and toggling cannot express, and
   * the one every canvas and file list already has.
   */
  it("lets everything go when the page itself is clicked", () => {
    const { container } = surface()

    fireEvent.click(screen.getByText("Autumn"))
    fireEvent.click(screen.getByText("Winter"))
    fireEvent.click(page(container))

    expect(marks(container)).toEqual([])
    expect(document.body.textContent).toContain("3 parts")
  })

  /**
   * A part the page cannot be clicked to reach is still a part a reader can pick
   * from the list. The mark has nowhere to go and nothing else may be marked in
   * its place — outlining the part around it would be the silent fallback 0019
   * refuses, drawn instead of said.
   */
  it("marks nothing for a picked part the page cannot address", () => {
    const { container } = surface()

    fireEvent.click(screen.getByRole("button", { name: /Hello there/ }))

    expect(marks(container)).toEqual([])
    expect(document.body.textContent).toContain("1 of 3 picked")
  })
})
