import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { TreeId } from "@loom/runtime"

import { RevisionBox } from "./revision-box"

const treeId = "tree_alpha/1" as TreeId

const fieldsOf = (container: HTMLElement): Record<string, string> =>
  Object.fromEntries(
    [...container.querySelectorAll<HTMLInputElement>("input[name]")].map((input) => [
      input.name,
      input.value,
    ])
  )

describe("RevisionBox", () => {
  it("asks for the version as a read, so the result is a URL worth sending on", () => {
    const { container } = render(<RevisionBox treeId={treeId} typed={undefined} />)
    const form = container.querySelector("form")

    expect(form?.getAttribute("action")).toBe("/portal/history")
    expect(form?.method).toBe("get")
  })

  it("submits the tree it is on and the version that was typed", () => {
    const { container } = render(<RevisionBox treeId={treeId} typed={undefined} />)

    expect(fieldsOf(container)).toEqual({ tree: "tree_alpha/1", at: "" })
  })

  /**
   * The one thing in this component that would have shipped broken. `historyRead`
   * resolves a cursor ahead of an anchor, so a form that carried `older` through
   * would name a revision the read then ignores — and from the second page onward
   * the box would appear to do nothing at all.
   */
  it("carries no cursor, so a typed version is a position and not a step", () => {
    const { container } = render(<RevisionBox treeId={treeId} typed={undefined} />)
    const submitted = Object.keys(fieldsOf(container))

    expect(submitted).not.toContain("older")
    expect(submitted).not.toContain("newer")
    expect(submitted).toEqual(["tree", "at"])
  })

  it("shows a reader what they sent, so a refusal is something they can correct", () => {
    const { container } = render(<RevisionBox treeId={treeId} typed="elevn" />)

    expect(fieldsOf(container)["at"]).toBe("elevn")
  })

  it("labels the field and explains what a version is, in sight and to a reader", () => {
    const { container } = render(<RevisionBox treeId={treeId} typed={undefined} />)
    const field = screen.getByLabelText("Jump to a version")
    const hint = field.getAttribute("aria-describedby")

    expect(field.getAttribute("name")).toBe("at")
    expect(hint).not.toBeNull()
    const described = container.querySelector(`#${hint ?? ""}`)
    expect(described?.textContent).toContain("A whole number from 1 up")
    /*
     * The hint used to be `sr-only`, which meant the one sentence saying what
     * the box is for was withheld from everybody who could see the screen.
     */
    expect(described?.className).not.toContain("sr-only")
  })

  it("offers a way to submit it", () => {
    render(<RevisionBox treeId={treeId} typed={undefined} />)

    expect(screen.getByRole("button", { name: "Go" }).getAttribute("type")).toBe("submit")
  })
})
