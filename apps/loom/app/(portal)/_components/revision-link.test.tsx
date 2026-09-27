import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { TreeId } from "@jam-overture/loom"

import { RevisionLink } from "./revision-link"

const treeId = "tree_alpha/1" as TreeId

describe("RevisionLink", () => {
  it("sends a reader to the version, on the page that holds it, at the row that is it", () => {
    render(<RevisionLink treeId={treeId} revision={4} />)

    const link = screen.getByRole("link", { name: "version 4" })

    expect(link.getAttribute("href")).toBe("/portal/history?tree=tree_alpha%2F1&at=4#revision-4")
  })

  it("renders version 0 as text, because there is no entry to send anyone to", () => {
    render(<RevisionLink treeId={treeId} revision={0} />)

    expect(screen.queryByRole("link")).toBeNull()
    expect(screen.getByText("version 0")).toBeInstanceOf(HTMLElement)
  })

  it("keeps the number monospaced whether or not it links, because it is an identifier", () => {
    const { container } = render(
      <>
        <RevisionLink treeId={treeId} revision={1} />
        <RevisionLink treeId={treeId} revision={0} />
      </>
    )

    expect(container.querySelectorAll(".font-mono")).toHaveLength(2)
  })
})
