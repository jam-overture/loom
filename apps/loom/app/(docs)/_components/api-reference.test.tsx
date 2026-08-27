import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { EntryProse, ProseMention } from "@/app/(docs)/_lib/api/mentions"
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

/** Nothing on this site names either of these two exports. */
const noProse: EntryProse = { pages: [], named: 0, byName: new Map() }

const mention = (over: Partial<ProseMention> = {}): ProseMention => ({
  href: "/docs/getting-started/rendering-a-tree#pointing-at-a-node",
  pageTitle: "Rendering a tree",
  sectionTitle: "Getting started",
  headingText: "Pointing at a node",
  ...over,
})

describe("an entry point's reference", () => {
  it("says how much is behind the door and where it was read from", () => {
    render(<ApiEntryReference entry={entry} prose={noProse} />)

    expect(screen.getByText(/2 exports, in 2 modules/)).toBeTruthy()
    expect(screen.getByText("./dist/render/index.d.ts")).toBeTruthy()
  })

  it("links to every module on the page, with a count", () => {
    render(<ApiEntryReference entry={entry} prose={noProse} />)

    const contents = screen.getByRole("navigation", { name: "On this page" })

    expect(within(contents).getByRole("link", { name: "Addressing" }).getAttribute("href")).toBe(
      "#m-render-addressing"
    )
    expect(within(contents).getAllByText("1")).toHaveLength(2)
  })

  it("gives every export an anchor of its own", () => {
    const { container } = render(<ApiEntryReference entry={entry} prose={noProse} />)

    expect(container.querySelector("#s-addressNode")).toBeTruthy()
    expect(container.querySelector("#s-NO_TEXT")).toBeTruthy()
  })

  it("puts the sentence before the signature", () => {
    const { container } = render(<ApiEntryReference entry={entry} prose={noProse} />)
    const block = container.querySelector("#s-addressNode")
    const text = block?.textContent ?? ""

    expect(text.indexOf("The node a click lands on")).toBeLessThan(text.indexOf("const addressNode"))
  })

  it("says so when a signature was cut short, and only then", () => {
    render(<ApiEntryReference entry={entry} prose={noProse} />)

    expect(screen.getAllByText(/Cut short here/)).toHaveLength(1)
  })

  it("leaves out a module's paragraph when it has none rather than printing an empty one", () => {
    const { container } = render(<ApiEntryReference entry={entry} prose={noProse} />)

    const described = container.querySelector(`#${apiGroupAnchor("render/addressing")}`)
    const bare = container.querySelector(`#${apiGroupAnchor("render/text")}`)

    /** Module path, module paragraph, the export's own sentence. */
    expect(described?.querySelectorAll("p")).toHaveLength(3)

    /** Module path and the note that a signature was cut short — no empty paragraph between them. */
    expect(bare?.querySelectorAll("p")).toHaveLength(2)
    expect(bare?.textContent).not.toContain("Which node")
  })
})

describe("the way back into the prose", () => {
  const prose: EntryProse = {
    pages: [
      { href: "/docs/getting-started/rendering-a-tree", title: "Rendering a tree", sectionTitle: "Getting started", named: 1 },
    ],
    named: 1,
    byName: new Map([["addressNode", [mention()]]]),
  }

  it("offers the written pages before the list of names", () => {
    const { container } = render(<ApiEntryReference entry={entry} prose={prose} />)
    const text = container.textContent ?? ""

    expect(text.indexOf("Start with the prose")).toBeLessThan(text.indexOf("On this page"))
  })

  it("says how few of the exports a written page reaches", () => {
    render(<ApiEntryReference entry={entry} prose={prose} />)

    expect(screen.getByText(/1 of the 2 exports below are shown in use/)).toBeTruthy()
  })

  it("sends a reader from an export to the paragraph that shows it", () => {
    const { container } = render(<ApiEntryReference entry={entry} prose={prose} />)
    const link = container.querySelector("#s-addressNode a")

    expect(link?.getAttribute("href")).toBe(
      "/docs/getting-started/rendering-a-tree#pointing-at-a-node"
    )
    expect(container.querySelector("#s-addressNode")?.textContent).toContain(
      "Shown in use on Rendering a tree — Pointing at a node"
    )
  })

  it("says nothing at all under an export no page names", () => {
    const { container } = render(<ApiEntryReference entry={entry} prose={prose} />)

    expect(container.querySelector("#s-NO_TEXT")?.textContent).not.toContain("Shown in use")
  })

  it("names the page and not a heading when the mention is above the first one", () => {
    const opening: EntryProse = {
      ...prose,
      byName: new Map([
        ["addressNode", [mention({ href: "/docs/getting-started/rendering-a-tree", headingText: "" })]],
      ]),
    }

    const { container } = render(<ApiEntryReference entry={entry} prose={opening} />)
    const shown = container.querySelector("#s-addressNode")?.textContent ?? ""

    expect(shown).toContain("Shown in use on Rendering a tree")
    expect(shown).not.toContain("—")
  })

  it("joins two pages with an 'and' rather than a comma", () => {
    const two: EntryProse = {
      ...prose,
      byName: new Map([
        [
          "addressNode",
          [
            mention(),
            mention({
              href: "/docs/the-runtime/proposing-a-change",
              pageTitle: "Proposing a change",
              sectionTitle: "The runtime",
              headingText: "",
            }),
          ],
        ],
      ]),
    }

    const { container } = render(<ApiEntryReference entry={entry} prose={two} />)

    expect(container.querySelector("#s-addressNode")?.textContent).toContain(
      "Rendering a tree — Pointing at a node and Proposing a change"
    )
  })

  it("says so plainly when no page names anything behind this import", () => {
    render(<ApiEntryReference entry={entry} prose={noProse} />)

    const band = screen.getByRole("navigation", { name: "Written pages about this import" })

    expect(band.textContent).toContain("No written page names any of this import's exports yet")
    expect(band.querySelector("a")).toBeNull()
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
