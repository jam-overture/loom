import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { primitiveTypeSchema, treeIdSchema, type NodeId } from "@loom/runtime"
import type { RenderDiagnostic } from "@loom/runtime/react"

import { PreviewFrame } from "./preview-frame"

/**
 * The first thing anybody sees on the screen a developer actually works in.
 *
 * It opened with an `h1` reading `preview` — the name of the pane, not of the
 * thing in it — and its diagnostics were a monospace list in an amber box with
 * no sentence around them. What is pinned here is the pair of facts a reader
 * needs before anything else: which page this is, and that a diagnostic is
 * degradation rather than damage.
 */

const treeId = treeIdSchema.parse("t_seed1")

const unregistered: RenderDiagnostic = {
  code: "unknown-primitive",
  nodeId: "n_1" as NodeId,
  type: primitiveTypeSchema.parse("loom.mystery"),
}

const badProps: RenderDiagnostic = {
  code: "invalid-props",
  nodeId: "n_2" as NodeId,
  type: primitiveTypeSchema.parse("loom.heading"),
  issues: [{ path: "level", message: "expected number" }],
}

describe("PreviewFrame", () => {
  it("leads with the page's own name rather than with the name of the pane", () => {
    render(
      <PreviewFrame treeId={treeId} revision={4} diagnostics={[]}>
        <p>rendered</p>
      </PreviewFrame>
    )

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("t_seed1")
    expect(document.body.textContent).not.toContain("preview")
  })

  /**
   * The one thing this screen can do that a screenshot cannot, said before the
   * reader has to discover it by clicking something at random.
   */
  it("says the page can be clicked, and what clicking it is for", () => {
    render(
      <PreviewFrame treeId={treeId} revision={4} diagnostics={[]}>
        <p>rendered</p>
      </PreviewFrame>
    )

    expect(document.body.textContent).toContain("Click anything on it")
    expect(document.body.textContent).toContain("ask for a change")
  })

  it("counts the changes behind the page rather than printing a bare number", () => {
    render(
      <PreviewFrame treeId={treeId} revision={4} diagnostics={[]}>
        <p>rendered</p>
      </PreviewFrame>
    )

    expect(document.body.textContent).toContain("4 changes have been applied")
  })

  /**
   * A picture found this and no test did. At `revision 0` the line read
   * `revision 0 — 0 changes have been applied to this page` — the runtime's
   * handle first, then the same number twice — and a page nothing has happened
   * to yet is exactly the page a new person opens first.
   */
  it("says a page nothing has happened to yet has had nothing happen to it", () => {
    render(
      <PreviewFrame treeId={treeId} revision={0} diagnostics={[]}>
        <p>rendered</p>
      </PreviewFrame>
    )

    expect(document.body.textContent).toContain("Nothing has been changed here yet.")
    expect(document.body.textContent).not.toContain("0 changes have been applied")
  })

  it("leads with the sentence and follows it with the revision, never the reverse", () => {
    const { container } = render(
      <PreviewFrame treeId={treeId} revision={4} diagnostics={[]}>
        <p>rendered</p>
      </PreviewFrame>
    )

    const line = [...container.querySelectorAll("p")].find((element) =>
      element.textContent?.includes("4 changes have been applied")
    )

    expect(line?.textContent?.indexOf("4 changes")).toBeLessThan(
      line?.textContent?.indexOf("revision") ?? -1
    )
  })

  /**
   * A one-character defect, and a screenshot is the only thing that shows it.
   * Written as `{...}{" "}` followed by a literal `·`, JSX dropped the space
   * and the line rendered `…here yet.· revision 0`. Separators are the sort of
   * thing that survives a rewrite by being invisible in the source.
   */
  it("keeps a space on both sides of the separator", () => {
    const { container } = render(
      <PreviewFrame treeId={treeId} revision={4} diagnostics={[]}>
        <p>rendered</p>
      </PreviewFrame>
    )

    const line = [...container.querySelectorAll("p")].find((element) =>
      element.textContent?.includes("4 changes have been applied")
    )

    expect(line?.textContent).toContain(" \u00b7 ")
    expect(line?.textContent).not.toMatch(/[^ ]\u00b7|\u00b7[^ ]/u)
  })

  it("says one change in the singular", () => {
    render(
      <PreviewFrame treeId={treeId} revision={1} diagnostics={[]}>
        <p>rendered</p>
      </PreviewFrame>
    )

    expect(document.body.textContent).toContain("1 change has been applied")
  })

  it("shows nothing about drawing when everything drew", () => {
    render(
      <PreviewFrame treeId={treeId} revision={1} diagnostics={[]}>
        <p>rendered</p>
      </PreviewFrame>
    )

    expect(document.querySelector("details")).toBeNull()
  })

  /**
   * 0008 made the renderer total: it leaves out what it cannot draw rather than
   * failing the page. A reader who does not know that reads an amber box as a
   * broken page, so the consequence is stated before the codes.
   */
  it("says the rest of the page is fine before it says what failed", () => {
    render(
      <PreviewFrame treeId={treeId} revision={2} diagnostics={[unregistered]}>
        <p>rendered</p>
      </PreviewFrame>
    )

    expect(document.body.textContent).toContain("One part of this page didn't draw.")
    expect(document.body.textContent).toContain("The rest of the page is fine")
  })

  it("counts them when there is more than one", () => {
    render(
      <PreviewFrame treeId={treeId} revision={2} diagnostics={[unregistered, badProps]}>
        <p>rendered</p>
      </PreviewFrame>
    )

    expect(document.body.textContent).toContain("2 parts of this page didn't draw.")
  })

  /**
   * Nothing is removed to make a screen simpler. Every sentence the frame used
   * to print is still in the DOM — closed, where find-in-page still reaches it.
   */
  it("keeps the renderer's own account of every diagnostic, one click down", () => {
    const { container } = render(
      <PreviewFrame treeId={treeId} revision={2} diagnostics={[unregistered, badProps]}>
        <p>rendered</p>
      </PreviewFrame>
    )

    const details = container.querySelector("details")

    expect(details?.open).toBe(false)
    expect(details?.querySelectorAll("li")).toHaveLength(2)
    expect(details?.textContent).toContain("loom.mystery")
    expect(details?.textContent).toContain("loom.heading")
  })

  it("renders the tree it was given", () => {
    render(
      <PreviewFrame treeId={treeId} revision={2} diagnostics={[]}>
        <p>the page itself</p>
      </PreviewFrame>
    )

    expect(document.body.textContent).toContain("the page itself")
  })
})
