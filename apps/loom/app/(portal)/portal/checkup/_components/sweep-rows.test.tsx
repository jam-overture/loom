import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { TreeId } from "@jam-overture/loom"
import type { StoreError } from "@jam-overture/loom/store"

import type { AuditReport } from "@/app/(portal)/_lib/audit-view"
import type { PageCheck, StandingState } from "@/app/(portal)/_lib/checkup-sweep"
import type { PageName } from "@/app/(portal)/_lib/page-name"

import { SweepRows } from "./sweep-rows"

const report = (tone: AuditReport["tone"]): AuditReport => ({
  tone,
  headline: "…",
  detail: "…",
  differences: [],
  names: new Map(),
  omitted: 0,
  recycled: [],
  recyclingOmitted: 0,
  stoppedAt: null,
  revision: 4,
  restored: 0,
})

const unreadable: StoreError = { code: "unavailable", detail: "no connection" } as StoreError

const check = (id: string, state: StandingState): PageCheck => {
  const treeId = id as TreeId

  switch (state) {
    case "nothing-to-check-against":
      return { treeId, standing: { state } }
    case "could-not-be-read":
      return { treeId, standing: { state, error: unreadable } }
    case "adds-up":
      return { treeId, standing: { state, report: report("agrees") } }
    case "does-not-add-up":
      return { treeId, standing: { state, report: report("diverged") } }
    case "could-not-be-finished":
      return { treeId, standing: { state, report: report("unreplayable") } }
  }
}

const named = (...entries: readonly (readonly [string, string])[]): ReadonlyMap<string, PageName> =>
  new Map(entries.map(([treeId, name]) => [treeId, { name, treeId, derived: false }]))

describe("SweepRows", () => {
  /**
   * A list of faults cannot be counted against the tally above it. A reader who
   * sees *3 pages found* and one row has no way to know whether two were fine
   * or two were forgotten.
   */
  it("lists the pages that passed as well as the ones that did not", () => {
    const { container } = render(
      <SweepRows
        checks={[
          check("t_ok", "adds-up"),
          check("t_bad", "does-not-add-up"),
          check("t_skip", "nothing-to-check-against"),
        ]}
        names={named(["t_ok", "Autumn arrivals"], ["t_bad", "Pricing"], ["t_skip", "About"])}
      />
    )

    expect(container.querySelectorAll("li")).toHaveLength(3)
  })

  it("puts the page somebody opened this screen for first", () => {
    const { container } = render(
      <SweepRows
        checks={[check("t_ok", "adds-up"), check("t_bad", "does-not-add-up")]}
        names={named(["t_ok", "Autumn arrivals"], ["t_bad", "Pricing"])}
      />
    )
    const rows = [...container.querySelectorAll("li")].map((row) => row.textContent ?? "")

    expect(rows[0]).toContain("Pricing")
    expect(rows[1]).toContain("Autumn arrivals")
  })

  /**
   * Both halves of a page's identity, on every row. 22 August settled that the
   * id is not technical detail and does not go behind a disclosure — and the
   * name is what tells two rows apart.
   */
  it("names each page and keeps its id beside the name", () => {
    render(
      <SweepRows checks={[check("t_ok", "adds-up")]} names={named(["t_ok", "Autumn arrivals"])} />
    )

    expect(screen.getByText("Autumn arrivals")).toBeTruthy()
    expect(screen.getByText("t_ok")).toBeTruthy()
  })

  /** A page whose name could not be read still gets a row. */
  it("lists a page nobody could name", () => {
    const { container } = render(<SweepRows checks={[check("t_ok", "adds-up")]} names={new Map()} />)

    expect(container.querySelectorAll("li")).toHaveLength(1)
    expect(container.textContent).toContain("t_ok")
  })

  it.each([
    ["adds-up" as StandingState, "Adds up"],
    ["does-not-add-up" as StandingState, "Doesn’t add up"],
    ["could-not-be-finished" as StandingState, "Couldn’t be checked"],
    ["nothing-to-check-against" as StandingState, "Nothing to check against"],
    ["could-not-be-read" as StandingState, "Couldn’t be read"],
  ])("says %s in words", (state, label) => {
    const { container } = render(
      <SweepRows checks={[check("t_one", state)]} names={named(["t_one", "A page"])} />
    )

    expect(container.textContent).toContain(label)
  })

  /**
   * One destination for every row, including the ones that reached no verdict.
   * That page is the full account of this one page, and a row that had to
   * choose a different destination per standing would teach a reader that some
   * rows are dead ends. None of them is.
   */
  it("leads every row to that page's own checkup", () => {
    const { container } = render(
      <SweepRows
        checks={[
          check("t_ok", "adds-up"),
          check("t_bad", "does-not-add-up"),
          check("t_skip", "nothing-to-check-against"),
          check("t_unread", "could-not-be-read"),
        ]}
        names={named(["t_ok", "A"], ["t_bad", "B"], ["t_skip", "C"], ["t_unread", "D"])}
      />
    )
    const links = [...container.querySelectorAll("a")].map((link) => link.getAttribute("href"))

    expect(links).toEqual([
      "/portal/checkup?tree=t_bad",
      "/portal/checkup?tree=t_unread",
      "/portal/checkup?tree=t_skip",
      "/portal/checkup?tree=t_ok",
    ])
  })

  it("escapes an id that would otherwise change the address", () => {
    const { container } = render(
      <SweepRows checks={[check("t_a b", "adds-up")]} names={new Map()} />
    )

    expect(container.querySelector("a")?.getAttribute("href")).toBe("/portal/checkup?tree=t_a%20b")
  })

  it("renders nothing rather than an empty list when there is nothing to list", () => {
    const { container } = render(<SweepRows checks={[]} names={new Map()} />)

    expect(container.querySelectorAll("li")).toHaveLength(0)
  })
})

describe("what a row says beyond its standing", () => {
  const diverged = (parts: number): PageCheck => ({
    treeId: "t_bad" as TreeId,
    standing: {
      state: "does-not-add-up",
      report: {
        ...report("diverged"),
        differences: Array.from({ length: parts }, (_, index) => ({
          code: "missing" as const,
          nodeId: `n_${index}` as never,
          label: "loom.prose",
        })),
      },
    },
  })

  /**
   * A standing is a word and a word is the same width whether one part of a
   * page disagrees or forty do. The number is what turns *something is wrong
   * here* into *this is the page to open first*.
   */
  it("says how much of a page disagrees, beside the word that says it does", () => {
    const { container } = render(
      <SweepRows checks={[diverged(4)]} names={named(["t_bad", "Pricing"])} />
    )

    expect(container.textContent).toContain("Doesn’t add up")
    expect(container.textContent).toContain("4 parts disagree.")
  })

  /**
   * The space between the sentence and the note, asserted as one string across
   * the join. A `toContain` on either half passes whether or not the space
   * between them survived — the 20 September finding, which was two screens
   * shipping `1can’t be read`.
   */
  it("keeps a space between the standing's sentence and the count", () => {
    const { container } = render(<SweepRows checks={[diverged(4)]} names={new Map()} />)

    expect(container.textContent).toContain("Something here is unexplained. 4 parts disagree.")
  })

  it("adds nothing to a row with nothing to add", () => {
    const { container } = render(
      <SweepRows checks={[check("t_ok", "adds-up")]} names={named(["t_ok", "A page"])} />
    )

    expect(container.textContent).toContain("Adds up")
    expect(container.textContent).not.toContain("disagree")
  })
})
