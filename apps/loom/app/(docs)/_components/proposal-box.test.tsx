import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Example } from "./example"

/**
 * The box, driven the way a reader drives it.
 *
 * `run.test.ts` already proves the verdicts are the Gate's. What it cannot
 * prove is that the *page* shows them — a component that computed a refusal and
 * rendered "Applied" would pass every test in that file. So these click the
 * chips and read what a reader would read.
 */

const chip = (label: string) => screen.getByRole("button", { name: label })

const verdict = async (tone: "accepted" | "held" | "refused") =>
  waitFor(() => {
    const panel = document.querySelector(`[data-verdict="${tone}"]`)

    expect(panel, `no ${tone} verdict was shown`).not.toBeNull()

    return panel as HTMLElement
  })

describe("the propose-a-change box", () => {
  it("offers only the changes this tree gives something to do", () => {
    render(<Example id="first-tree" />)

    expect(screen.queryByRole("button", { name: "Make the whole card a link" })).toBeNull()
    expect(chip("Add a sentence")).toBeDefined()
  })

  it("offers the card chip on the tree that has a card", () => {
    render(<Example id="a-card-and-a-control" />)

    expect(screen.getByRole("button", { name: "Make the whole card a link" })).toBeDefined()
  })

  it("applies an ordinary change and moves the example on a revision", async () => {
    const { container } = render(<Example id="first-tree" />)

    fireEvent.click(chip("Add a sentence"))

    const panel = await verdict("accepted")

    expect(within(panel).getByText("Applied")).toBeDefined()
    expect(container.textContent).toContain("revision 1")
  })

  /**
   * The claim the page makes in prose, checked against the page: the rendered
   * example is the tree after the change, not a picture of the tree before it.
   */
  it("renders the changed tree rather than the original", async () => {
    const { container } = render(<Example id="first-tree" />)

    fireEvent.click(chip("Add a sentence"))
    await verdict("accepted")

    const frame = container.querySelector("[data-example='first-tree']")

    expect(frame?.textContent).toContain("proposed, judged and applied")
  })

  it("refuses to destroy what the deployment protects, and shows the runtime's reason", async () => {
    render(<Example id="first-tree" />)

    fireEvent.click(chip("Delete the page's heading"))

    const panel = await verdict("refused")

    expect(within(panel).getByText("Refused")).toBeDefined()
    expect(panel.textContent).toContain("stakes-at-refusal-floor")
    expect(panel.textContent).toContain("protected-type-removed")
  })

  it("leaves the page alone when it refuses", async () => {
    const { container } = render(<Example id="first-tree" />)

    fireEvent.click(chip("Delete the page's heading"))
    await verdict("refused")

    const frame = container.querySelector("[data-example='first-tree']")

    expect(frame?.textContent).toContain("Hello from a tree")
    expect(container.textContent).not.toContain("revision 1")
  })

  it("holds a change for the reader, and applies it when they answer", async () => {
    const { container } = render(<Example id="first-tree" />)

    fireEvent.click(chip("Demote the page's heading"))

    const panel = await verdict("held")

    expect(panel.textContent).toContain("stakes-above-ceiling")

    fireEvent.click(screen.getByRole("button", { name: "Apply it anyway" }))

    await verdict("accepted")

    expect(container.textContent).toContain("revision 1")
  })

  /**
   * The refusal whose damage is nowhere in the operation. The page says so in
   * prose; this is the assertion that the page is telling the truth.
   */
  it("refuses a configure that would nest a target inside a target", async () => {
    render(<Example id="a-card-and-a-control" />)

    fireEvent.click(chip("Make the whole card a link"))

    const panel = await verdict("refused")

    expect(panel.textContent).toContain("nested-target")
  })

  it("puts the example back when the reader starts over", async () => {
    const { container } = render(<Example id="first-tree" />)

    fireEvent.click(chip("Add a sentence"))
    await verdict("accepted")

    fireEvent.click(screen.getByRole("button", { name: "start over" }))

    await waitFor(() => {
      expect(container.textContent).not.toContain("revision 1")
    })

    expect(document.querySelector("[data-verdict]")).toBeNull()
  })

  /** Off is possible, because a page may want a still example beside prose. */
  it("can be left off an example", () => {
    render(<Example id="first-tree" interactive={false} />)

    expect(screen.queryByRole("button", { name: "Add a sentence" })).toBeNull()
  })
})
