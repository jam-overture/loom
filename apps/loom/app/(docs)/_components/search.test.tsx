import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  SEARCH_CODE_PATH,
  SEARCH_INDEX_PATH,
  SEARCH_PROSE_PATH,
  type SearchIndex,
} from "@/app/(docs)/_lib/search/model"

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
      code: "",
    },
    {
      href: "/docs/the-runtime/what-the-gate-decides#the-two-questions-it-asks",
      title: "The two questions it asks",
      context: "What the Gate decides",
      kind: "heading",
      summary: "",
      body: "How much damage could this do, and could it be taken back afterwards.",
      code: "",
    },
    {
      href: "/docs/getting-started/your-first-tree#a-tree-is-more-than-its-root",
      title: "A tree is more than its root",
      context: "Your first tree",
      kind: "heading",
      summary: "",
      body: "",
      code: 'const page = buildElement({ type: "stack" })\nconst next = applyDelta(page, delta)',
    },
    {
      href: "/docs/api-reference/runtime#s-evaluateGate",
      title: "evaluateGate",
      context: "@loom/runtime",
      kind: "export",
      summary: "",
      body: "",
      code: "",
    },
  ],
}

const fetchMock = vi.fn()

/**
 * The index as it really travels: three files, with the words in the second and
 * the code in the third.
 *
 * Served apart here rather than whole, because a mock that handed the component
 * a complete index however it asked would be testing a fetch the site does not
 * make — and the interesting moments are the ones in between, where the box
 * works and one of the two cheapest ranking bands does not answer yet.
 */
const withoutText = { entries: index.entries.map((entry) => ({ ...entry, body: "", code: "" })) }

const prose = {
  bodies: index.entries.filter((entry) => entry.body !== "").map((entry) => [entry.href, entry.body]),
}

const code = {
  blocks: index.entries.filter((entry) => entry.code !== "").map((entry) => [entry.href, entry.code]),
}

const serve = (path: string): unknown => {
  if (path === SEARCH_PROSE_PATH) return prose
  if (path === SEARCH_CODE_PATH) return code

  return withoutText
}

beforeEach(() => {
  push.mockReset()
  fetchMock.mockReset()
  fetchMock.mockImplementation((path: string) =>
    Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify(serve(path))) })
  )
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

  it("asks for each file once, however many times it is opened", async () => {
    render(<Search />)

    await open()
    await type("gate")

    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" })
    await open()
    await type("gate")

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock).toHaveBeenCalledWith(SEARCH_INDEX_PATH)
    expect(fetchMock).toHaveBeenCalledWith(SEARCH_PROSE_PATH)
    expect(fetchMock).toHaveBeenCalledWith(SEARCH_CODE_PATH)
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
     * The claim above is only worth making beside an account of what was
     * looked at. It used to end "code blocks are not", which was the one thing
     * a reader could see on the page and could not find; now it says the code
     * is searched, and it has to say so only because it is.
     */
    expect(screen.getByText(/the code in them .* are searched/i)).toBeTruthy()
  })

  /**
   * The moment between the two files.
   *
   * The words are three times the size of the index and nothing waits for them,
   * so there is a real interval in which the box is open and answering by title,
   * section and summary alone. Two things have to hold in it: the box works, and
   * it does not claim to have read what it has not read yet.
   */
  it("answers by name while the words are still on their way", async () => {
    fetchMock.mockImplementation((path: string) =>
      path === SEARCH_PROSE_PATH
        ? new Promise(() => undefined)
        : Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify(serve(path))) })
    )

    render(<Search />)

    await open()
    await type("gate")

    expect(screen.getByRole("listbox")).toBeTruthy()
    expect(screen.getAllByRole("option").length).toBeGreaterThan(0)
  })

  it("does not say it read the words until it has", async () => {
    fetchMock.mockImplementation((path: string) =>
      path === SEARCH_PROSE_PATH
        ? new Promise(() => undefined)
        : Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify(serve(path))) })
    )

    render(<Search />)

    await open()
    await type("kubernetes")

    expect(screen.getByText(/the words in them are still loading/i)).toBeTruthy()
    expect(screen.queryByText(/the words in them .* are searched/i)).toBeNull()
  })

  /**
   * A word that is only in a paragraph, found once the paragraph arrives.
   *
   * This is the seam the split could break silently: the prose travels keyed by
   * href, and an href the index does not carry would leave every body empty with
   * nothing red anywhere. So the fixture's one word that lives in prose alone is
   * searched for, and it has to come back.
   */
  it("finds a word that only the prose carries, once the prose has landed", async () => {
    render(<Search />)

    await open()
    await type("damage")

    expect(screen.getByRole("listbox")).toBeTruthy()
    expect(screen.getByText("The two questions it asks")).toBeTruthy()
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
   * A name that appears on the site only inside a block a reader was invited to
   * copy.
   *
   * This is the query the box could not answer for as long as it had existed:
   * somebody who has seen `applyDelta` in a snippet, or typed an install
   * command off a page, was told the site says nothing. The fixture's one
   * name that lives in code alone is searched for, and it has to come back.
   */
  it("finds a name that only a code block carries, once the code has landed", async () => {
    render(<Search />)

    await open()
    await type("applyDelta")

    expect(screen.getByRole("listbox")).toBeTruthy()
    expect(screen.getByText("A tree is more than its root")).toBeTruthy()
  })

  /**
   * And it shows the line, set as code.
   *
   * The row is in the list because of something a reader cannot see from its
   * title, so the line that put it there is the whole account they get — and a
   * line of TypeScript in the prose face reads as prose that has gone wrong.
   */
  it("shows the line of code a result was found by, in the mono face", async () => {
    render(<Search />)

    await open()
    await type("applyDelta")

    const row = screen.getByRole("option", { name: /more than its root/i })
    const excerpt = row.querySelector(".font-mono")

    expect(excerpt?.textContent).toContain("applyDelta(page, delta)")
    /* The other line of the same block is not the line it was found on. */
    expect(excerpt?.textContent).not.toContain("buildElement")
    expect(row.querySelector("mark")?.textContent).toBe("applyDelta")
  })

  it("answers by name while the code is still on its way", async () => {
    fetchMock.mockImplementation((path: string) =>
      path === SEARCH_CODE_PATH
        ? new Promise(() => undefined)
        : Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify(serve(path))) })
    )

    render(<Search />)

    await open()
    await type("applyDelta")

    expect(screen.queryByRole("listbox")).toBeNull()
    expect(screen.getByText(/the code in them is still loading/i)).toBeTruthy()
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
