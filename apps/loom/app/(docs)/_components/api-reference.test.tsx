import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { ApiEntry } from "@/app/(docs)/_lib/api/model"
import { ApiEntryReference, apiGroupAnchor, Prose } from "./api-reference"

/**
 * What the reference has to get right when it renders.
 *
 * The generated file is checked elsewhere. What is checked here is the part a
 * reader actually meets: that the sentence arrives before the signature, that
 * every export is reachable by a link rather than by scrolling, and that a
 * backtick in a doc comment becomes code rather than a stray character.
 */

const entry: ApiEntry = {
  specifier: "@loom/runtime/react",
  slug: "react",
  types: "./dist/render/index.d.ts",
  groups: [
    {
      module: "render/addressing",
      title: "Addressing",
      summary: "Which node a click can land on.",
      symbols: [
        {
          name: "addressNode",
          kind: "function",
          signature: "const addressNode: (node: LoomNode) => Addressing",
          truncated: false,
          summary: "The node a click lands on when the user meant `nodeId`.",
        },
      ],
    },
    {
      module: "render/text",
      title: "Text",
      summary: "",
      symbols: [
        {
          name: "NO_TEXT",
          kind: "value",
          signature: "const NO_TEXT: TextResolver",
          truncated: true,
          summary: "",
        },
      ],
    },
  ],
}

describe("an entry point's reference", () => {
  it("says how much is behind the door and where it was read from", () => {
    render(<ApiEntryReference entry={entry} />)

    expect(screen.getByText(/2 exports, in 2 modules/)).toBeTruthy()
    expect(screen.getByText("./dist/render/index.d.ts")).toBeTruthy()
  })

  it("links to every module on the page, with a count", () => {
    render(<ApiEntryReference entry={entry} />)

    const contents = screen.getByRole("navigation", { name: "On this page" })

    expect(within(contents).getByRole("link", { name: "Addressing" }).getAttribute("href")).toBe(
      "#m-render-addressing"
    )
    expect(within(contents).getAllByText("1")).toHaveLength(2)
  })

  it("gives every export an anchor of its own", () => {
    const { container } = render(<ApiEntryReference entry={entry} />)

    expect(container.querySelector("#s-addressNode")).toBeTruthy()
    expect(container.querySelector("#s-NO_TEXT")).toBeTruthy()
  })

  it("puts the sentence before the signature", () => {
    const { container } = render(<ApiEntryReference entry={entry} />)
    const block = container.querySelector("#s-addressNode")
    const text = block?.textContent ?? ""

    expect(text.indexOf("The node a click lands on")).toBeLessThan(text.indexOf("const addressNode"))
  })

  it("says so when a signature was cut short, and only then", () => {
    render(<ApiEntryReference entry={entry} />)

    expect(screen.getAllByText(/Cut short here/)).toHaveLength(1)
  })

  it("leaves out a module's paragraph when it has none rather than printing an empty one", () => {
    const { container } = render(<ApiEntryReference entry={entry} />)

    const described = container.querySelector(`#${apiGroupAnchor("render/addressing")}`)
    const bare = container.querySelector(`#${apiGroupAnchor("render/text")}`)

    /** Module path, module paragraph, the export's own sentence. */
    expect(described?.querySelectorAll("p")).toHaveLength(3)

    /** Module path and the note that a signature was cut short — no empty paragraph between them. */
    expect(bare?.querySelectorAll("p")).toHaveLength(2)
    expect(bare?.textContent).not.toContain("Which node")
  })
})

describe("a doc comment's backticks", () => {
  it("become code", () => {
    const { container } = render(<Prose text="The node the user meant, by `nodeId`." />)

    expect(container.querySelector("code")?.textContent).toBe("nodeId")
    expect(container.textContent).toBe("The node the user meant, by nodeId.")
  })

  it("leave prose with none of them alone", () => {
    const { container } = render(<Prose text="Nothing to mark up here." />)

    expect(container.querySelector("code")).toBeNull()
    expect(container.textContent).toBe("Nothing to mark up here.")
  })
})
