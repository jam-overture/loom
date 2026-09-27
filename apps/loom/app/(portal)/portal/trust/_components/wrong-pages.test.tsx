import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { proposalIdSchema, intentIdSchema, treeIdSchema } from "@jam-overture/loom"

import type { MissedClaim, MissedPage } from "@/app/(portal)/_lib/calibration-misses"
import { runtimeWordsIn } from "@/app/(portal)/_test/plain-language"
import type { PageName } from "@/app/(portal)/_lib/page-name"

import { WrongPages } from "./wrong-pages"

const named = (treeId: string, name: string): PageName => ({ name, treeId, derived: true })

const claim = (id: string, treeId: string, confidence: number): MissedClaim => ({
  proposalId: proposalIdSchema.parse(id),
  intentId: intentIdSchema.parse("i_1"),
  treeId: treeIdSchema.parse(treeId),
  confidence,
  verdict: "rejected",
  direction: "overconfident",
  surprise: confidence,
  cause: "irreversible",
  rationale: `rationale for ${id}`,
  proposedAt: "2026-08-17T09:30:00.000Z",
  policyId: "portal",
})

/** A page group as the fold produces it: claims worst first, pages unarranged. */
let nextClaim = 0

const pageOf = (treeId: string, ...confidences: readonly number[]): MissedPage => {
  const claims = confidences.map((confidence) => claim(`p_${(nextClaim += 1)}`, treeId, confidence))

  return { treeId: treeIdSchema.parse(treeId), claims, worstSurprise: claims[0]!.surprise }
}

const renderPages = (pages: readonly MissedPage[], names?: ReadonlyMap<string, PageName>) =>
  render(
    <WrongPages
      pages={pages}
      names={names ?? new Map(pages.map((page) => [page.treeId, named(page.treeId, page.treeId)]))}
    />
  )

describe("WrongPages", () => {
  it("names each page and keeps its id beside the name", () => {
    renderPages(
      [pageOf("t_pricing", 0.95, 0.8), pageOf("t_about", 0.7)],
      new Map([
        ["t_pricing", named("t_pricing", "Autumn prices")],
        ["t_about", named("t_about", "About us")],
      ])
    )

    expect(screen.getByText("Autumn prices")).toBeTruthy()
    expect(screen.getByText("t_pricing")).toBeTruthy()
    expect(screen.getByText("About us")).toBeTruthy()
    expect(screen.getByText("t_about")).toBeTruthy()
  })

  it("counts the wrong claims on each page", () => {
    renderPages([pageOf("t_pricing", 0.95, 0.8), pageOf("t_about", 0.7)])

    expect(screen.getByText("2 wrong claims")).toBeTruthy()
    expect(screen.getByText("1 wrong claim")).toBeTruthy()
  })

  /**
   * Two pages tied on the rung this list ranks by are separated by nothing the
   * order can say, so the figure a reader compares them on is on the row rather
   * than left for them to open both scopes and count.
   */
  it("shows the worst claim on each page", () => {
    renderPages([pageOf("t_pricing", 0.95, 0.8), pageOf("t_about", 0.7)])

    expect(screen.getByText("worst was 95% wide of the mark")).toBeTruthy()
    expect(screen.getByText("worst was 70% wide of the mark")).toBeTruthy()
  })

  /**
   * The row leads back to this same question narrowed to the page, not to the
   * page. A reader who has just been told the AI is unreliable about a page wants
   * the rest of *this* answer about it, and the strip on the scoped view is one
   * press from the page anyway.
   */
  it("leads to this same question about that one page", () => {
    renderPages([pageOf("t_pricing", 0.95)])

    expect(screen.getByRole("link", { name: /t_pricing/ }).getAttribute("href")).toBe(
      "/portal/trust?tree=t_pricing"
    )
  })

  /**
   * The whole row presses, which is `/portal/pages`' shape. A bare link in this
   * portal is drawn as plain text — Tailwind's preflight sets
   * `a { text-decoration: inherit }` — so a name-sized link here was
   * indistinguishable from the figures beside it, which is what a screenshot
   * showed on the run that built this.
   */
  it("makes the whole row the press rather than the name alone", () => {
    renderPages([pageOf("t_pricing", 0.95, 0.8)])

    const link = screen.getByRole("link")

    expect(link.textContent).toContain("2 wrong claims")
    expect(link.textContent).toContain("wide of the mark")
    expect(link.className).toContain("no-underline")
  })

  /**
   * One page and several pages are the two readings this section exists to tell
   * apart, so each gets its own sentence rather than a count that reads the same
   * either way.
   */
  it("says so when every wrong claim was about one page", () => {
    renderPages([pageOf("t_pricing", 0.95, 0.8, 0.7)])

    expect(screen.getByText(/Every one of the wrong claims above was made about the same page/))
      .toBeTruthy()
  })

  it("counts the pages when they are spread", () => {
    renderPages([pageOf("t_pricing", 0.95), pageOf("t_about", 0.8), pageOf("t_home", 0.7)])

    expect(screen.getByText(/spread across 3 of your pages/)).toBeTruthy()
  })

  /**
   * 0031 makes calibration a reader. The AI being wrong about a page is a fact
   * about the AI, and a section headed *which pages it was wrong about* is one
   * short step from reading as a list of bad pages — so the disclaimer is on the
   * surface rather than in the disclosure.
   */
  it("says a page here is one the AI misjudged rather than one with anything wrong with it", () => {
    renderPages([pageOf("t_pricing", 0.95)])

    expect(screen.getByText(/not one with anything wrong with it/)).toBeTruthy()
  })

  /** It is a list of pages, so it says which order it is in, like every other one. */
  it("says what order the pages are in", () => {
    renderPages([pageOf("t_pricing", 0.95), pageOf("t_about", 0.8)])

    expect(screen.getByText(/Pages the AI got most wrong come first/)).toBeTruthy()
    expect(screen.getByText(/every list here is in the same order/)).toBeTruthy()
  })

  /**
   * The rung, over the order the fold happened to produce. A group built by
   * walking the claims arrives in whichever page held the worst single claim
   * first, which is not the order this list is in.
   */
  it("leads with the page holding the most wrong claims, not the worst single one", () => {
    renderPages(
      [pageOf("t_about", 0.95), pageOf("t_pricing", 0.8, 0.7)],
      new Map([
        ["t_about", named("t_about", "About us")],
        ["t_pricing", named("t_pricing", "Autumn prices")],
      ])
    )

    const rows = screen.getAllByRole("listitem").map((row) => row.textContent ?? "")

    expect(rows[0]).toContain("Autumn prices")
    expect(rows[1]).toContain("About us")
  })

  /**
   * Two pages the rung cannot separate fall to the tiebreak every list in this
   * portal ends with, which is what makes two screens agree about the pages they
   * have nothing to say about.
   */
  it("falls back to the page's own name when two hold the same number", () => {
    renderPages(
      [pageOf("t_pricing", 0.95, 0.9), pageOf("t_about", 0.8, 0.7)],
      new Map([
        ["t_pricing", named("t_pricing", "Autumn prices")],
        ["t_about", named("t_about", "About us")],
      ])
    )

    const rows = screen.getAllByRole("listitem").map((row) => row.textContent ?? "")

    expect(rows[0]).toContain("About us")
    expect(rows[1]).toContain("Autumn prices")
  })

  /**
   * A page the store would not name still lists, still links and still shows its
   * id — `namesOf` answers for every id it was asked about, and a missing entry
   * means a failed read rather than a missing page.
   */
  it("still lists a page the store could not name", () => {
    renderPages([pageOf("t_gone", 0.9)], new Map())

    expect(screen.getByText("Untitled page")).toBeTruthy()
    expect(screen.getByText("t_gone")).toBeTruthy()
  })

  it("says all of it without the runtime's vocabulary", () => {
    renderPages([pageOf("t_pricing", 0.95), pageOf("t_about", 0.8)])

    const surface = screen
      .getAllByRole("listitem")
      .map((row) => row.textContent ?? "")
      .concat(screen.getByRole("heading").textContent ?? "")

    for (const line of surface) expect(runtimeWordsIn(line, ["id"]), line).toEqual([])
  })
})
