import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  SEARCH_CODE_PATH,
  SEARCH_INDEX_PATH,
  SEARCH_NAMES_PATH,
  searchProsePath,
  type SearchIndex,
} from "@/app/(docs)/_lib/search/model"

import { docsSectionOfPath } from "@/app/(docs)/_lib/search/shards"

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
const pathname = vi.hoisted(() => ({ at: "/docs/the-runtime/what-the-gate-decides" }))

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => pathname.at }))

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
      family: "",
    },
    {
      href: "/docs/the-runtime/what-the-gate-decides#the-two-questions-it-asks",
      title: "The two questions it asks",
      context: "What the Gate decides",
      kind: "heading",
      summary: "",
      body: "How much damage could this do, and could it be taken back afterwards.",
      code: "",
      family: "",
    },
    {
      href: "/docs/getting-started/your-first-tree#a-tree-is-more-than-its-root",
      title: "A tree is more than its root",
      context: "Your first tree",
      kind: "heading",
      summary: "",
      body: "",
      code: 'const page = buildElement({ type: "stack" })\nconst next = applyDelta(page, delta)',
      family: "",
    },
    {
      href: "/docs/api-reference/runtime#s-evaluateGate",
      title: "evaluateGate",
      context: "@jam-overture/loom",
      kind: "export",
      summary: "",
      body: "",
      code: "",
      family: "",
    },
    /*
     * A page of the generated section, which is here so the fixture has a
     * section with **no words in it**. That is a real case and the one most
     * likely to be got wrong: the browser asks for every section the table of
     * contents mentions, and the one built from data has to answer with an
     * empty file rather than with a 404.
     */
    {
      href: "/docs/api-reference/runtime",
      title: "@jam-overture/loom",
      context: "API reference",
      kind: "page",
      summary: "",
      body: "",
      code: "",
      family: "imports",
    },
    /*
     * A **second** door, which is here so the fixture has a family rather than a
     * lone member. Two pages of one family is the smallest fixture in which the
     * fold is visible at all, and the fold is the only thing about a result row
     * that a browser decides anything about.
     */
    {
      href: "/docs/api-reference/react",
      title: "@jam-overture/loom/react",
      context: "API reference",
      kind: "page",
      summary: "",
      body: "",
      code: "",
      family: "imports",
    },
  ],
}

const fetchMock = vi.fn()

/**
 * The index as it really travels: **four files**, and only the first is waited
 * for.
 *
 * Served apart here rather than whole, because a mock that handed the component
 * a complete index however it asked would be testing a fetch the site does not
 * make — and the interesting moments are the ones in between, where the box
 * works and one of the three later files does not answer yet.
 *
 * The names file is the one that carries **rows** rather than text, and it is
 * written here the way the site writes it: an entry point and the names under
 * it, with no address anywhere. The component rebuilds the addresses, which is
 * the point of the shape and is therefore the thing worth exercising through a
 * fixture rather than asserting about the builder.
 */
const contents = {
  entries: index.entries
    .filter((entry) => entry.kind !== "export")
    .map((entry) => ({ ...entry, body: "", code: "" })),
}

const names = { entryPoints: [{ specifier: "@jam-overture/loom", names: ["evaluateGate"] }] }

/**
 * The words, **one file per section**, which is how they really travel.
 *
 * Cut here the way the builder cuts them, off the same `docsSectionOfPath`, so
 * that a fixture cannot quietly agree with a component that has got the address
 * scheme wrong. The sections this fixture has are the two its entries are in —
 * the runtime and getting started — plus the API reference, which is a section
 * of the site with no words in it and answers with none.
 */
const PROSE_SECTIONS = ["the-runtime", "getting-started", "api-reference"] as const

const proseFor = (section: string): unknown => ({
  bodies: index.entries
    .filter((entry) => entry.body !== "" && docsSectionOfPath(entry.href) === section)
    .map((entry) => [entry.href, entry.body]),
})

const code = {
  blocks: index.entries.filter((entry) => entry.code !== "").map((entry) => [entry.href, entry.code]),
}

const proseSectionAsked = (path: string): string | undefined =>
  PROSE_SECTIONS.find((section) => path === searchProsePath(section))

const serve = (path: string): unknown => {
  const section = proseSectionAsked(path)

  if (section !== undefined) return proseFor(section)
  if (path === SEARCH_NAMES_PATH) return names
  if (path === SEARCH_CODE_PATH) return code

  return contents
}

beforeEach(() => {
  push.mockReset()
  pathname.at = "/docs/the-runtime/what-the-gate-decides"
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

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3 + PROSE_SECTIONS.length))
    expect(fetchMock).toHaveBeenCalledWith(SEARCH_INDEX_PATH)
    expect(fetchMock).toHaveBeenCalledWith(SEARCH_NAMES_PATH)
    expect(fetchMock).toHaveBeenCalledWith(SEARCH_CODE_PATH)

    for (const section of PROSE_SECTIONS) {
      expect(fetchMock, section).toHaveBeenCalledWith(searchProsePath(section))
    }
  })

  /**
   * The ordering the split was made for, as the only thing that can actually
   * demonstrate it: **what was asked for before anything came back.**
   *
   * Four requests leaving at once and arriving in whatever order a connection
   * gives them is not an ordering, so the reader's own section is asked for on
   * its own and the rest wait for it to settle. A reader standing in *The
   * runtime* who searches the runtime gets the band that answers them without
   * queueing behind the words of every other section.
   */
  it("asks for the reader's own section before any other", async () => {
    const held: (() => void)[] = []
    const answer = (path: string): unknown => ({
      ok: true,
      json: async () => JSON.parse(JSON.stringify(serve(path))),
    })

    /*
     * The words are held and **everything else is not**, which is the whole
     * point of the fixture. Holding the lot would prove nothing: the browser
     * cannot know which sections exist until the table of contents lands, so a
     * box that asked for one section would look identical to one that meant to
     * ask for all of them. Letting the contents land and holding only the words
     * is the arrangement in which the two differ.
     */
    fetchMock.mockImplementation((path: string) =>
      proseSectionAsked(path) === undefined
        ? Promise.resolve(answer(path))
        : new Promise((resolve) => held.push(() => resolve(answer(path))))
    )

    render(<Search />)
    await open()
    await type("gate")

    const proseAsked = (): readonly string[] =>
      fetchMock.mock.calls.map((call) => String(call[0])).filter((path) => proseSectionAsked(path) !== undefined)

    expect(proseAsked()).toEqual([searchProsePath("the-runtime")])

    for (const settle of [...held]) settle()

    await waitFor(() => expect(proseAsked().length).toBe(PROSE_SECTIONS.length))
  })

  /**
   * And a reader who opened the box from somewhere with no section of its own
   * is not left without words. The docs root is the honest example: a real
   * address on this site, and one no section owns.
   */
  it("sends for every section when the reader is not standing in one", async () => {
    pathname.at = "/docs"

    render(<Search />)

    await open()
    await type("gate")

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3 + PROSE_SECTIONS.length))

    for (const section of PROSE_SECTIONS) {
      expect(fetchMock, section).toHaveBeenCalledWith(searchProsePath(section))
    }
  })

  /**
   * The one that would be an outage rather than a slow band: a section whose
   * words never arrive must not take the other sections down with it. The
   * reader's own is the dangerous one, because everything else waits on it.
   */
  it("sends for the rest when the reader's own section never answers", async () => {
    fetchMock.mockImplementation((path: string) =>
      path === searchProsePath("the-runtime")
        ? Promise.resolve({ ok: false, status: 404 })
        : Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify(serve(path))) })
    )

    render(<Search />)

    await open()
    await type("gate")

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(searchProsePath("getting-started")))
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
      proseSectionAsked(path) !== undefined
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
      proseSectionAsked(path) !== undefined
        ? new Promise(() => undefined)
        : Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify(serve(path))) })
    )

    render(<Search />)

    await open()
    await type("kubernetes")

    expect(screen.getByText(/the words on them are still loading/i)).toBeTruthy()
    expect(screen.queryByText(/the words in them .* are searched/i)).toBeNull()
  })

  /**
   * The names, which are the one later file a reader can *see* is missing.
   *
   * The other two rank rows that are already in the list. This one brings the
   * rows — a thousand of them — so in the moment before it lands a reader who
   * types an export name gets nothing at all rather than a worse ordering.
   *
   * That is the whole reason the names left the first file on 19 September: the
   * first file was 78% published names by size, it grew whenever any lane in the
   * repository exported something, and a reader waiting for it was waiting for
   * a payload this surface neither writes nor can see coming. What it costs is
   * this interval, and what these three tests are is the argument that the
   * interval is honest.
   */
  it("finds a published name once the names have landed, at an address it built itself", async () => {
    render(<Search />)

    await open()
    await type("evaluateGate")

    const result = await waitFor(() => screen.getByRole("option"))

    expect(result.textContent).toContain("evaluateGate")
    /*
     * The href is not in the file the component was sent — `names` carries an
     * entry point and a name and no address anywhere. This is the assertion
     * that the address it rebuilt is the one the reference page really serves;
     * a scheme that changed on one side and not the other would be a search box
     * where every export result 404s, with nothing red to show for it.
     */
    expect(result.querySelector("a")?.getAttribute("href")).toBe(
      "/docs/api-reference/runtime#s-evaluateGate"
    )
  })

  it("answers by page while the names are still on their way", async () => {
    fetchMock.mockImplementation((path: string) =>
      path === SEARCH_NAMES_PATH
        ? new Promise(() => undefined)
        : Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify(serve(path))) })
    )

    render(<Search />)

    await open()
    await type("gate")

    expect(screen.getByRole("listbox").textContent).toContain("What the Gate decides")
  })

  it("does not claim to have searched the names until it has", async () => {
    fetchMock.mockImplementation((path: string) =>
      path === SEARCH_NAMES_PATH
        ? new Promise(() => undefined)
        : Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify(serve(path))) })
    )

    render(<Search />)

    await open()
    await type("evaluateGate")

    /*
     * The worst of the four states to be wrong about. A reader who typed a name
     * they read in a stack trace, got nothing, and was told every published
     * name had been searched would conclude the site has never heard of it.
     */
    expect(screen.getByText(/the published names are still loading/i)).toBeTruthy()
    expect(screen.queryByText(/every published name are searched/i)).toBeNull()
  })

  /**
   * Three of the four missing at once, in one sentence a person would say.
   *
   * Worth a test because the alternative shape — a sentence per combination —
   * is what a list like this turns into the moment nobody is checking, and
   * because the join is the only English in the component that has to be built
   * rather than written.
   */
  it("names all three of the files still in flight, in one sentence", async () => {
    fetchMock.mockImplementation((path: string) =>
      path === SEARCH_INDEX_PATH
        ? Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify(serve(path))) })
        : new Promise(() => undefined)
    )

    render(<Search />)

    await open()
    await type("kubernetes")

    expect(
      screen.getByText(
        /the published names, the words on them and the code blocks on them are still loading/i
      )
    ).toBeTruthy()
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
    fetchMock.mockImplementation(() => Promise.resolve({ ok: false, status: 500 }))

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
    expect(screen.getByText(/the code blocks on them are still loading/i)).toBeTruthy()
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

describe("a row that stands for a set of pages", () => {
  /**
   * The one thing about a *result* this file is the right place to hold.
   *
   * Which page a query ought to answer with is a claim about the documentation
   * and lives in `search/match.test.ts` against the real index. Whether a reader
   * can *see* that a row is standing in for eight others is a claim about the
   * screen, and there is nowhere else to make it.
   */
  it("says how many of the family the query reached", async () => {
    render(<Search />)

    await open()
    await type("loom")

    await waitFor(() => expect(screen.getByText("the closest of 2 imports")).toBeTruthy())

    /* One row for the two doors, and it is the first of them — the second is not
       on the screen at all, which is the whole of what the fold does. */
    const doors = screen
      .getAllByRole("option")
      .filter((option) => option.textContent?.includes("API reference"))

    expect(doors).toHaveLength(1)
    expect(doors[0]?.querySelector("a")?.getAttribute("href")).toBe("/docs/api-reference/runtime")
    expect(screen.queryByText("@jam-overture/loom/react")).toBeNull()
  })

  it("says nothing of the kind on a row that stands for itself", async () => {
    render(<Search />)

    await open()
    await type("damage")

    await waitFor(() => expect(screen.getByText("The two questions it asks")).toBeTruthy())

    expect(screen.queryByText(/the closest of/i)).toBeNull()
  })
})
