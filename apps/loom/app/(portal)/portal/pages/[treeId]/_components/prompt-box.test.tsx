import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { NodeId } from "@jam-overture/loom"

import type { OutlineRow } from "@/app/(portal)/_lib/outline"

import { PromptBox } from "./prompt-box"
import { SelectionProvider } from "./selection-context"
import { TreeOutline } from "./tree-outline"

/**
 * The one obvious thing to do on this screen, which is the test Vercel and
 * Supabase pass on every page and this one did not.
 *
 * The button said `propose` — the name of the object being created rather than
 * of the thing the person is doing. The scope read `scoped to n_shot2`. And
 * with no API key the box was simply disabled behind a placeholder reading
 * `Set LOOM_ANTHROPIC_API_KEY to compose changes.`: an instruction addressed to
 * whoever deployed this, printed at whoever opened it, in a box they cannot
 * type in.
 */

/**
 * A card holding a heading and a space, under a page — the smallest shape in
 * which the scope can be something other than what was picked.
 *
 * It grew from one row when the box stopped reading the selection and started
 * reading `_lib/selection-scope.ts`: the sentence under test is the one a reader
 * gets when their two picks do not have a single part between them, and one row
 * cannot produce it.
 */
const row = (
  nodeId: string,
  parentId: string | null,
  label: string,
  kind: OutlineRow["kind"] = "element"
): OutlineRow => ({
  nodeId: nodeId as NodeId,
  parentId: parentId === null ? null : (parentId as NodeId),
  depth: 0,
  kind,
  label,
  technical: null,
  addressing: { outcome: "addressable", nodeId: nodeId as NodeId },
})

const rows: readonly OutlineRow[] = [
  row("n_page", null, "Page"),
  row("n_card", "n_page", "Card"),
  row("n_shot2", "n_card", "Heading"),
  row("n_space", "n_card", "Body space", "slot"),
]

const box = (configured: boolean) =>
  render(
    <SelectionProvider rows={rows}>
      <TreeOutline />
      <PromptBox treeId="t_seed1" revision={4} configured={configured} />
    </SelectionProvider>
  )

describe("PromptBox", () => {
  it("asks for the change in the reader's words, and offers to do it in theirs", () => {
    box(true)

    expect(screen.getByRole("heading", { name: "Ask for a change" })).toBeInstanceOf(HTMLElement)
    expect(screen.getByRole("button", { name: "Ask Loom" })).toBeInstanceOf(HTMLElement)
  })

  it("never calls the primary action after the object it creates", () => {
    box(true)

    expect(screen.queryByRole("button", { name: /propose/i })).toBeNull()
  })

  it("says what will happen when it is pressed, before it is pressed", () => {
    box(true)

    expect(document.body.textContent).toContain("checks it against your rules")
    expect(document.body.textContent).toContain("stops and asks you first")
  })

  /**
   * The most useful sentence on the screen once you know what it means, and
   * meaningless before that. Kept exactly, one click down, under a plain
   * account of the same three steps.
   */
  it("keeps the pipeline's own three verbs, one click down", () => {
    const { container } = box(true)

    const details = [...container.querySelectorAll("details")].find((element) =>
      element.textContent?.includes("composed on the server")
    )

    expect(details?.open).toBe(false)
    expect(details?.textContent).toContain("composed on the server, gated, then written")
  })

  it("says the whole page is in scope when nothing is picked", () => {
    box(true)

    expect(document.body.textContent).toContain("Anywhere on this page")
  })

  /**
   * The scope is the node the user selected, not the node the DOM could
   * address — scoping narrows interpretation, which happens over the tree. The
   * hidden field is the thing that has to stay right; the label beside it is
   * what tells the reader it did.
   */
  it("names the picked part, and posts it as the scope", () => {
    const { container } = box(true)

    fireEvent.click(screen.getByRole("button", { name: /Heading/ }))

    expect(document.body.textContent).toContain("Just this part: Heading")
    expect(container.querySelector('input[name="scopeNodeId"]')).toHaveProperty(
      "value",
      "n_shot2"
    )
  })

  /**
   * The line exists so a reader recognises what they are about to change. An
   * id is the one name they cannot check against the page in front of them, so
   * it follows the part's own name rather than standing in for it — and it
   * still stands there, because it is what the ask actually posts.
   */
  it("leads that line with the part's name and keeps its id after it", () => {
    const { container } = box(true)

    fireEvent.click(screen.getByRole("button", { name: /Heading/ }))

    const line = [...container.querySelectorAll("span")]
      .map((element) => element.textContent ?? "")
      .find((text) => text.startsWith("Just this part:"))

    expect(line).toBe("Just this part: Heading n_shot2")
  })

  /**
   * 0019's promise, applied to a set: the selection resolves to something other
   * than what was picked, and the screen says so beside the button rather than
   * performing it silently.
   */
  it("names the part that holds both when two are picked inside one", () => {
    const { container } = box(true)

    fireEvent.click(screen.getByRole("button", { name: /Heading/ }))
    fireEvent.click(screen.getByRole("button", { name: /Body space/ }))

    expect(document.body.textContent).toContain("The part that holds all of them: Card")
    expect(container.querySelector('input[name="scopeNodeId"]')).toHaveProperty(
      "value",
      "n_card"
    )
  })

  it("says what a widened ask costs, on the surface and not behind a disclosure", () => {
    const { container } = box(true)

    fireEvent.click(screen.getByRole("button", { name: /Heading/ }))
    fireEvent.click(screen.getByRole("button", { name: /Body space/ }))

    const surface = container.cloneNode(true) as HTMLElement
    for (const details of surface.querySelectorAll("details")) details.remove()

    expect(surface.textContent).toContain("may change other things inside it too")
  })

  /**
   * Two parts with nothing smaller than the page between them. The ask becomes
   * the whole page, and it is posted the way an unpicked page always was — one
   * encoding, not two spellings of it.
   */
  it("falls back to the whole page, and posts no scope at all", () => {
    const { container } = box(true)

    fireEvent.click(screen.getByRole("button", { name: /^Page/ }))
    fireEvent.click(screen.getByRole("button", { name: /Heading/ }))

    expect(document.body.textContent).toContain("The whole page")
    expect(container.querySelector('input[name="scopeNodeId"]')).toHaveProperty("value", "")
  })

  it("stops naming a part once it has been let go of again", () => {
    const { container } = box(true)

    fireEvent.click(screen.getByRole("button", { name: /Heading/ }))
    fireEvent.click(screen.getByRole("button", { name: /Heading/ }))

    expect(document.body.textContent).toContain("Anywhere on this page")
    expect(container.querySelector('input[name="scopeNodeId"]')).toHaveProperty("value", "")
  })

  it("posts the page and the revision it was looking at, and never a delta", () => {
    const { container } = box(true)

    expect(container.querySelector('input[name="treeId"]')).toHaveProperty("value", "t_seed1")
    expect(container.querySelector('input[name="baseRevision"]')).toHaveProperty("value", "4")
    expect(container.querySelector('input[name="delta"]')).toBeNull()
  })

  /**
   * A disabled textarea behind an instruction the reader cannot act on is a
   * wall. What replaces it says what is missing, who can fix it, and — the part
   * that was never there — what still works without it.
   */
  it("explains an unconfigured deployment instead of disabling a box", () => {
    const { container } = box(false)

    expect(container.querySelector("textarea")).toBeNull()
    expect(document.body.textContent).toContain("Asking for changes isn't switched on here.")
    expect(document.body.textContent).toContain("Everything else on this screen works")
  })

  it("does not offer a button that cannot do anything", () => {
    box(false)

    expect(screen.queryByRole("button", { name: "Ask Loom" })).toBeNull()
  })

  it("reads as a notice rather than as a failure", () => {
    const { container } = box(false)

    expect(container.querySelector("[data-tone]")?.getAttribute("data-tone")).toBe("notice")
  })

  /**
   * Nothing is removed. The variable to set is the one fact somebody deploying
   * this needs, and it is still named — one click down, where it is not in the
   * way of somebody who cannot set it.
   */
  it("keeps the variable to set, one click down", () => {
    const { container } = box(false)

    const details = [...container.querySelectorAll("details")].find((element) =>
      element.textContent?.includes("LOOM_ANTHROPIC_API_KEY")
    )

    expect(details?.open).toBe(false)
    expect(details?.textContent).toContain("LOOM_ANTHROPIC_API_KEY")
  })

  it("puts the instruction to a deployer nowhere a reader meets it unasked", () => {
    const { container } = box(false)

    const surface = container.cloneNode(true) as HTMLElement
    for (const details of surface.querySelectorAll("details")) details.remove()

    expect(surface.textContent).not.toContain("LOOM_ANTHROPIC_API_KEY")
  })

  it("labels the box for a reader who cannot see the heading", () => {
    box(true)

    expect(screen.getByLabelText("What would you like changed?")).toBeInstanceOf(
      HTMLTextAreaElement
    )
  })
})
