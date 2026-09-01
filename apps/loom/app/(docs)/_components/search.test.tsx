import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { SEARCH_INDEX_PATH, type SearchIndex } from "@/app/(docs)/_lib/search/model"

import { Search } from "./search"

/**
 * The dialog, driven the way a reader drives it: from the keyboard.
 *
 * The index here is a fixture rather than the site's own, and deliberately so
 * in both directions. The real index is built by reading files, which is a
 * server's job and not something to do inside a synthetic DOM — and whether a
 * query returns the right *page* is a claim about the documentation, already
 * held in `search/match.test.ts` against the real thing. What is left for this
 * file is the half only a browser has: focus, arrow keys, and the three states
 * a reader can end up in.
 */

const push = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))

const index: SearchIndex = {
  entries: [
    {
      href: "/docs/the-runtime/what-the-gate-decides",
      title: "What the Gate decides",
      context: "The runtime",
      kind: "page",
      summary: "Yes, ask a person, or no.",
      body: "",
    },
    {
      href: "/docs/the-runtime/what-the-gate-decides#the-two-questions-it-asks",
      title: "The two questions it asks",
      context: "What the Gate decides",
      kind: "heading",
      summary: "",
      body: "How much damage could this do, and could it be taken back afterwards.",
    },
    {
      href: "/docs/getting-started/your-first-tree#a-tree-is-more-than-its-root",
      title: "A tree is more than its root",
      context: "Your first tree",
      kind: "heading",
      summary: "",
      body: "",
    },
    {
      href: "/docs/api-reference/runtime#s-evaluateGate",
      title: "evaluateGate",
      context: "@loom/runtime",
      kind: "export",
      summary: "",
      body: "",
    },
  ],
}

const fetchMock = vi.fn()

beforeEach(() => {
  push.mockReset()
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({ ok: true, json: async () => JSON.parse(JSON.stringify(index)) })
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const open = async (): Promise<void> => {
  fireEvent.click(screen.getByRole("button", { name: /search the documentation/i }))

  await waitFor(() => expect(screen.getByRole("combobox")).toBeTruthy())
}

const type = async (query: string): Promise<void> => {
  fireEvent.change(screen.getByRole("combobox"), { target: { value: query } })

  await waitFor(() => expect(screen.queryByText("Loading the index…")).toBeNull())
}

describe("the search box", () => {
  it("costs nothing until somebody opens it", () => {
    render(<Search />)

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("asks for the index once, however many times it is opened", async () => {
    render(<Search />)

    await open()
    await type("gate")

    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" })
    await open()
    await type("gate")

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(SEARCH_INDEX_PATH)
  })

  it("opens on the shortcut every reader tries", async () => {
    render(<Search />)

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => expect(screen.getByRole("combobox")).toBeTruthy())
  })
})

describe("what a reader sees after typing", () => {
  it("offers the page they meant", async () => {
    render(<Search />)

    await open()
    await type("gate")

    expect(screen.getByRole("listbox").textContent).toContain("What the Gate decides")
  })

  it("says so plainly when the site has nothing, and says how much it looked at", async () => {
    render(<Search />)

    await open()
    await type("kubernetes")

    expect(screen.queryByRole("listbox")).toBeNull()
    expect(screen.getByText(/nothing on the site says/i)).toBeTruthy()
    /*
     * The claim above is only worth making beside the limit under it. The box
     * reads the prose but not the fenced code, and a reader looking at a word
     * they can see on the page has no other way to learn that.
     */
    expect(screen.getByText(/code blocks are not/i)).toBeTruthy()
  })

  /**
   * A row in the list because of a word in its paragraph, showing the paragraph
   * — without which the reader is handed a heading that does not contain what
   * they typed and has to take the site's word for it.
   */
  it("shows the sentence a result was found by, with the typed word marked", async () => {
    render(<Search />)

    await open()
    await type("damage")

    const row = screen.getByRole("option", { name: /two questions/i })

    expect(row.textContent).toContain("How much damage could this do")
    expect(row.querySelector("mark")?.textContent).toBe("damage")
  })

  it("does not show a sentence when the title already said it", async () => {
    render(<Search />)

    await open()
    await type("questions")

    const row = screen.getByRole("option", { name: /two questions/i })

    expect(row.querySelector("mark")).toBeNull()
    expect(row.textContent).not.toContain("could be taken back")
  })

  it("says the index failed rather than showing an empty list", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 })

    render(<Search />)

    await open()

    await waitFor(() => expect(screen.getByText(/could not be loaded/i)).toBeTruthy())
  })
})

describe("moving through the results", () => {
  it("marks exactly one as selected, and it is the first", async () => {
    render(<Search />)

    await open()
    await type("gate")

    const selected = screen.getAllByRole("option").filter((option) => option.ariaSelected === "true")

    expect(selected).toHaveLength(1)
    expect(selected[0]).toBe(screen.getAllByRole("option")[0])
  })

  it("moves down with the arrow key and says which one is active", async () => {
    render(<Search />)

    await open()
    await type("gate")

    fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" })

    const second = screen.getAllByRole("option")[1]

    expect(second?.ariaSelected).toBe("true")
    expect(screen.getByRole("combobox").getAttribute("aria-activedescendant")).toBe(second?.id)
  })

  it("wraps from the first to the last going up", async () => {
    render(<Search />)

    await open()
    await type("gate")

    fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowUp" })

    const options = screen.getAllByRole("option")

    expect(options[options.length - 1]?.ariaSelected).toBe("true")
  })

  it("goes to the selected result on Enter, and closes", async () => {
    render(<Search />)

    await open()
    await type("gate")

    const first = screen.getAllByRole("option")[0]
    const href = first?.querySelector("a")?.getAttribute("href")

    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" })

    expect(push).toHaveBeenCalledWith(href)
    expect(screen.queryByRole("combobox")).toBeNull()
  })

  it("leaves the query behind when it closes", async () => {
    render(<Search />)

    await open()
    await type("gate")

    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" })
    await open()

    const field = screen.getByRole("combobox")

    expect(field instanceof HTMLInputElement && field.value).toBe("")
    expect(screen.queryByRole("listbox")).toBeNull()
  })

  it("keeps focus inside the dialog it said was modal", async () => {
    render(<Search />)

    await open()

    const field = screen.getByRole("combobox")
    const tab = fireEvent.keyDown(field, { key: "Tab" })

    expect(tab).toBe(false)
    expect(document.activeElement).toBe(field)
  })

  it("returns the reader to the button they opened it with", async () => {
    render(<Search />)

    await open()
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" })

    expect(document.activeElement).toBe(screen.getByRole("button", { name: /search the documentation/i }))
  })

  /**
   * A result is still a link. Somebody who wants the reference in a second tab
   * middle-clicks it, and a row that only answered to a click handler would
   * quietly not be one.
   */
  it("renders each result as a real link to its own href", async () => {
    render(<Search />)

    await open()
    await type("gate")

    for (const option of screen.getAllByRole("option")) {
      expect(option.querySelector("a")?.getAttribute("href")).toMatch(/^\/docs\//)
    }
  })
})
