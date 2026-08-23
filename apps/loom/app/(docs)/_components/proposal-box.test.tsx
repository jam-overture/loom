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

/**
 * Clicks a control once it is actually clickable.
 *
 * Every button in the box stands down while a change is in flight, and a change
 * settles over more than one commit: the log appears, then the transition ends.
 * A test that clicked as soon as it saw the result of the previous click would
 * be pressing a disabled button — which does nothing, silently, and only some of
 * the time. Waiting for `disabled` to clear is what a reader does without
 * thinking about it.
 */
const press = async (label: string) => {
  const button = await waitFor(() => {
    const found = chip(label) as HTMLButtonElement

    expect(found.disabled, `"${label}" is still busy`).toBe(false)

    return found
  })

  fireEvent.click(button)
}

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

    expect(within(panel).getByText("Applied, and appended to the log")).toBeDefined()
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

    await press("Apply it anyway")

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

/**
 * The half a verdict cannot show: what the log says afterwards, and the undo
 * that reads it.
 *
 * These drive the store through the component rather than calling into it,
 * because the failure worth catching is a box that computed a history and did
 * not render it — which every test in `run.test.ts` would pass.
 */
describe("the log the box shows", () => {
  const rows = () => [...document.querySelectorAll("[data-revision]")]

  const settled = async (count: number) =>
    waitFor(() => {
      expect(rows().length, `the log should hold ${count} entries`).toBe(count)
    })

  it("is empty until something has been applied", () => {
    render(<Example id="first-tree" />)

    expect(document.querySelector("[data-history]")).toBeNull()
  })

  it("shows a row for the applied change, naming who asked and what it did", async () => {
    render(<Example id="first-tree" />)

    fireEvent.click(chip("Add a sentence"))
    await settled(1)

    const [row] = rows()

    expect(row?.textContent).toContain("#1")
    expect(row?.textContent).toContain("insert")
    expect(row?.textContent).toContain("the reader")
  })

  it("shows nothing after a refusal, because nothing happened", async () => {
    render(<Example id="first-tree" />)

    fireEvent.click(chip("Delete the page's heading"))
    await verdict("refused")

    expect(document.querySelector("[data-history]")).toBeNull()
  })

  it("names who allowed a change the reader had to answer", async () => {
    render(<Example id="first-tree" />)

    fireEvent.click(chip("Demote the page's heading"))
    await verdict("held")

    await press("Apply it anyway")
    await settled(1)

    expect(rows()[0]?.textContent).toContain("allowed by the reader")
  })

  it("undoes a revision by proposing it, so the log grows rather than shrinks", async () => {
    const { container } = render(<Example id="first-tree" />)

    fireEvent.click(chip("Add a sentence"))
    await settled(1)

    await press("Undo")
    await settled(2)

    expect(container.textContent).toContain("revision 2")
    expect(rows()[0]?.textContent).toContain("loom/revert")

    const frame = container.querySelector("[data-example='first-tree']")

    expect(frame?.textContent).not.toContain("proposed, judged and applied")
  })

  /**
   * 0035, in front of the reader. Undoing a revision something later built on
   * says what it would write over *before* the button is pressed.
   */
  it("says what an undo would write over, on the row that would do it", async () => {
    render(<Example id="first-tree" />)

    fireEvent.click(chip("Add a sentence"))
    await settled(1)

    await press("Move the last block to the top")
    await settled(2)

    const [newest, oldest] = rows()

    expect(oldest?.textContent).toContain("writes over #2")
    expect(newest?.textContent).not.toContain("writes over")
  })

  it("clears when the reader starts over", async () => {
    render(<Example id="first-tree" />)

    fireEvent.click(chip("Add a sentence"))
    await settled(1)

    fireEvent.click(screen.getByRole("button", { name: "start over" }))

    await waitFor(() => {
      expect(document.querySelector("[data-history]")).toBeNull()
    })
  })

  it("is left off a still example along with the chips", () => {
    render(<Example id="first-tree" interactive={false} />)

    expect(document.querySelector("[data-history]")).toBeNull()
  })
})
