import { render, screen } from "@testing-library/react"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { Callout } from "./callout"

/**
 * The two asides, rendered, and the count of them the site actually writes.
 *
 * A callout is the one thing on a documentation page that says *stop and read
 * this*, and there are seventy-nine of them. The component's own argument is
 * that there are **two kinds and no third** — a thing worth knowing and a thing
 * that will bite — because a palette of six turns a documented constraint into
 * decoration and a reader learns to skip all of them.
 *
 * Nothing held any of that. The checks that matter are the ones a page author
 * could break without noticing: a kind that is not one of the two renders a
 * callout with no label at all rather than failing, and the two kinds telling
 * each other apart is a claim about colour that a render test can hold as the
 * absence of a shared token.
 */

const here = (path: string): string => fileURLToPath(new URL(path, import.meta.url))

const pagesUnder = (root: string): readonly string[] =>
  readdirSync(root).flatMap((entry) => {
    const path = join(root, entry)

    if (statSync(path).isDirectory()) return pagesUnder(path)

    return entry === "page.mdx" ? [readFileSync(path, "utf8")] : []
  })

const aside = (): HTMLElement => {
  const found = document.querySelector("aside")

  if (found === null) throw new Error("the callout rendered no aside at all")

  return found as HTMLElement
}

const tokensOf = (element: Element): readonly string[] => (element.getAttribute("class") ?? "").split(/\s+/)

describe("the two kinds", () => {
  it("names each one in a word a reader can read, rather than in a colour alone", () => {
    render(<Callout kind="note">Something worth knowing.</Callout>)
    expect(screen.getByText("Note")).toBeDefined()
  })

  it("calls the other one Careful, which is a warning and not an error", () => {
    render(<Callout kind="warning">Something that will bite.</Callout>)
    expect(screen.getByText("Careful")).toBeDefined()
  })

  /**
   * Thirty-seven of the site's callouts write no `kind` at all, so what the
   * default is is a decision about most of them. Note is the gentler one, which
   * is the right way round: a page that meant to warn says so.
   */
  it("is a note when a page does not say, which is how most pages write one", () => {
    render(<Callout>Something worth knowing.</Callout>)
    expect(screen.getByText("Note")).toBeDefined()
  })

  /**
   * The whole value of having two is that a reader can tell them apart without
   * reading the label, so the two cannot be two shades of one colour. Held as
   * the absence of a shared token rather than as a pair of expected names: it
   * stays true through a rename of the palette and goes red the moment the
   * warning is given the note's ground.
   */
  it("shares no colour with the other, because two greens cannot be told apart", () => {
    const { unmount } = render(<Callout kind="note">A.</Callout>)
    const note = tokensOf(aside()).filter((token) => /note|warning/.test(token))

    unmount()
    render(<Callout kind="warning">B.</Callout>)
    const warning = tokensOf(aside()).filter((token) => /note|warning/.test(token))

    expect(note.length).toBeGreaterThanOrEqual(3)
    expect(warning.length).toBe(note.length)
    expect(note.filter((token) => warning.includes(token))).toEqual([])
  })
})

describe("the markdown a page writes inside one", () => {
  it("reaches the page", () => {
    render(
      <Callout>
        A sentence, <a href="/docs/getting-started/installation">a link</a> and{" "}
        <code>applyDelta</code>.
      </Callout>
    )

    expect(screen.getByRole("link", { name: "a link" }).getAttribute("href")).toBe(
      "/docs/getting-started/installation"
    )
    expect(screen.getByText("applyDelta")).toBeDefined()
  })

  /**
   * A callout is a `.not-prose` region holding authored markdown, which is the
   * one combination on this site that needs both: the prose rules kept out, and
   * the two treatments content cannot do without asked for again by name. Held
   * because the symptom of losing `callout-prose` is a link inside a callout
   * that is no longer underlined — invisible in a screenshot and invisible in a
   * diff.
   */
  it("sits inside the region that gives a link and a backtick their treatment back", () => {
    render(<Callout>A sentence.</Callout>)

    const region = aside().querySelector(".callout-prose")

    expect(region).not.toBeNull()
    expect(region?.textContent).toBe("A sentence.")
    expect(tokensOf(aside())).toContain("not-prose")
  })

  it("keeps the label out of the content, so a reader is not told Note twice", () => {
    render(<Callout kind="note">Note this.</Callout>)

    expect(aside().querySelector(".callout-prose")?.textContent).toBe("Note this.")
  })
})

/**
 * The half a render test cannot reach, read off the pages instead.
 *
 * `TONE` is a lookup, so `kind="danger"` on a page does not fail to compile and
 * does not fail to render: it renders an aside with an empty label and no colour.
 * TypeScript would refuse it in a `.tsx` file and MDX props are not checked, so
 * the pages are the only place the answer is.
 */
describe("what the pages actually write", () => {
  const sources = pagesUnder(here("../docs"))

  it("reads some pages, because an empty sweep would pass every check below", () => {
    expect(sources.length).toBeGreaterThanOrEqual(17)
  })

  it("asks for no third kind anywhere on the site", () => {
    const asked = sources.flatMap((source) => [...source.matchAll(/<Callout\s+kind="([^"]*)"/g)].map((m) => m[1]))

    expect(asked.length).toBeGreaterThan(0)
    expect([...new Set(asked)].sort()).toEqual(["note", "warning"])
  })

  it("uses both of them, so the second kind is a kind and not dead code", () => {
    const text = sources.join("\n")

    expect(text).toContain('<Callout kind="warning">')
    expect(text.includes("<Callout>") || text.includes('<Callout kind="note">')).toBe(true)
  })
})
