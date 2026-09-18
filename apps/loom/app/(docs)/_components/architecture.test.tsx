import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { AlternativesLeftOpen, ArchitectureCosts } from "./architecture-costs"
import { ArchitectureIdeas } from "./architecture-ideas"
import { DecisionRecords } from "./decision-records"
import { OFF_SITE_MARK } from "./off-site-link"
import {
  alternativeTally,
  unsettledAlternatives,
} from "@/app/(docs)/_lib/architecture/alternatives"
import { ARCHITECTURE_COSTS } from "@/app/(docs)/_lib/architecture/costs"
import { COURSE } from "@/app/(docs)/_lib/architecture/course"
import { ARCHITECTURE_IDEAS } from "@/app/(docs)/_lib/architecture/ideas"
import { DECISION_RECORDS } from "@/app/(docs)/_lib/architecture/records"

/**
 * What a reader actually sees on the two Architecture pages.
 *
 * The lib tests hold the data against the repository; these hold the rendering
 * against the rule the section exists to keep — **point outward, and never put
 * a number in front of somebody who has no use for one.** Both are easy to
 * break with an innocent-looking edit to a component, and neither would show up
 * as an error anywhere.
 */

describe("the eight ideas, rendered", () => {
  it("gives every idea its paragraph and its two doors", () => {
    render(<ArchitectureIdeas />)

    for (const idea of ARCHITECTURE_IDEAS) {
      const section = screen.getByRole("region", { name: idea.title })

      expect(within(section).getByText(idea.plain)).toBeTruthy()
      expect(within(section).getByText(/Work through it/)).toBeTruthy()
      expect(within(section).getByText(/The ruling/)).toBeTruthy()
    }
  })

  it("links a ruling by what was decided, never by its number", () => {
    render(<ArchitectureIdeas />)

    for (const idea of ARCHITECTURE_IDEAS) {
      const link = screen.getByRole("link", { name: idea.record.title })

      expect(link.getAttribute("href")).toBe(idea.record.href)
    }

    for (const link of screen.getAllByRole("link")) {
      expect(link.textContent ?? "", link.getAttribute("href") ?? "").not.toMatch(/\b\d{4}\b/)
    }
  })

  it("says an unwritten lesson is unwritten instead of linking to it", () => {
    render(<ArchitectureIdeas />)

    /**
     * Empty as of lesson 15, which was the last of the eight to be unwritten.
     * The guard that used to assert this list non-empty is gone rather than
     * inverted: the rule it protects is still the rule, and it comes back into
     * force the day a ninth idea points at a lesson the course has not reached.
     */
    const unwritten = ARCHITECTURE_IDEAS.filter((idea) => idea.lesson.href === undefined)

    for (const idea of unwritten) {
      const section = screen.getByRole("region", { name: idea.title })

      expect(within(section).getByText(/not written yet/)).toBeTruthy()
      expect(
        within(section).queryByRole("link", { name: new RegExp(idea.lesson.title) })
      ).toBeNull()
    }
  })

  it("links every written lesson it names at the page that holds it", () => {
    render(<ArchitectureIdeas />)

    for (const idea of ARCHITECTURE_IDEAS) {
      if (idea.lesson.href === undefined) continue

      const link = screen.getByRole("link", {
        name: `Lesson ${idea.lesson.number} — ${idea.lesson.title}`,
      })

      expect(link.getAttribute("href")).toBe(idea.lesson.href)
      expect(link.getAttribute("href")).toMatch(/^\/lessons\//)
    }
  })

  /**
   * The two doors go to two kinds of place, and a reader is owed the difference
   * before they click rather than after. The mark is `aria-hidden`, so what is
   * asserted here is what a sighted reader sees; what a screen reader is told is
   * the sentence the page's own prose carries above this block.
   */
  it("marks the door that leaves this site, and leaves the one that does not unmarked", () => {
    render(<ArchitectureIdeas />)

    for (const idea of ARCHITECTURE_IDEAS) {
      const section = screen.getByRole("region", { name: idea.title })
      const marked = within(section)
        .getAllByRole("link")
        .filter((link) => (link.textContent ?? "").includes(OFF_SITE_MARK))

      expect(marked.map((link) => link.getAttribute("href")), idea.id).toEqual([idea.record.href])
    }
  })

  it("sends a reader to the course rather than leaving them with a list of files", () => {
    render(<ArchitectureIdeas />)

    expect(screen.getByRole("link", { name: "start it here" }).getAttribute("href")).toBe("/lessons")
  })

  /**
   * `CourseLesson.source` names the markdown each lesson is rendered from, and
   * no reader is ever handed it. That is the lessons surface's reason and not
   * this section's to overturn: the file is the one place a reader can also see
   * the printed answers, which is most of what that surface's gates are for. A
   * second "or just read the file" link under a door would be a kindness that
   * quietly disables the course.
   */
  it("offers no reader a lesson's markdown, only its page", () => {
    render(<ArchitectureIdeas />)

    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href") ?? "").not.toMatch(/github\.com\/.*\/lessons\//)
    }
  })
})

describe("the records index, rendered", () => {
  it("shows every record the repository has, once", () => {
    render(<DecisionRecords />)

    expect(screen.getAllByRole("row").length).toBe(DECISION_RECORDS.length + 1)
  })

  it("counts the states rather than printing a number somebody typed", () => {
    render(<DecisionRecords />)

    const inForce = DECISION_RECORDS.filter((record) => record.standing === "in force").length

    expect(screen.getByText(`${DECISION_RECORDS.length} records.`)).toBeTruthy()
    expect(screen.getByText(new RegExp(`${inForce} in force`))).toBeTruthy()
  })

  it("carries each record's own status wording, not a word of its own", () => {
    render(<DecisionRecords />)

    const superseded = DECISION_RECORDS.find((record) => record.standing === "superseded")

    expect(superseded).toBeDefined()
    expect(screen.getAllByText(superseded?.status ?? "—").length).toBeGreaterThan(0)
  })

  it("links each row at the record itself", () => {
    render(<DecisionRecords />)

    const first = DECISION_RECORDS[0]

    expect(first).toBeDefined()
    expect(
      screen.getByRole("link", { name: first?.title ?? "" }).getAttribute("href")
    ).toBe(first?.href)
  })

  /**
   * One row per record, all of them leaving the site, said once above the table
   * and marked at each row. The sentence is what a screen reader hears; saying it
   * per row instead would be correct and unusable.
   */
  it("says once that the whole table leaves, and marks every row", () => {
    render(<DecisionRecords />)

    expect(screen.getByText(/opens that record’s file in the repository/)).toBeTruthy()

    for (const link of screen.getAllByRole("link")) {
      expect(link.textContent ?? "", link.getAttribute("href") ?? "").toContain(OFF_SITE_MARK)
    }
  })
})

describe("the two readers of one syllabus", () => {
  it("shows a lesson under the number the course gives it", () => {
    render(<ArchitectureIdeas />)

    const second = COURSE.find((lesson) => lesson.number === 2)

    expect(second?.file).toBeDefined()
    expect(screen.getByText(new RegExp(`Lesson 2 — ${second?.title ?? ""}`))).toBeTruthy()
  })
})

describe("the eight costs, rendered", () => {
  it("gives every cost its plain sentence, its answer and its ruling", () => {
    render(<ArchitectureCosts />)

    for (const cost of ARCHITECTURE_COSTS) {
      const section = screen.getByRole("region", { name: cost.title })

      expect(within(section).getByText(cost.plain)).toBeTruthy()
      expect(within(section).getByText(/What you do instead/)).toBeTruthy()
      expect(
        within(section).getByRole("link", { name: cost.record.title }).getAttribute("href")
      ).toBe(cost.record.href)
    }
  })

  /**
   * The half that is read rather than written. A component that stopped
   * rendering these would leave eight tidy paragraphs and no evidence, which is
   * the failure this page is least able to show a reader.
   */
  it("names what each ruling turned down, in the record's words", () => {
    render(<ArchitectureCosts />)

    for (const cost of ARCHITECTURE_COSTS) {
      const section = screen.getByRole("region", { name: cost.title })

      for (const alternative of cost.turnedDown) {
        expect(within(section).getByText(alternative.lead, { exact: false })).toBeTruthy()
      }
    }
  })

  it("puts no decision number in front of a reader", () => {
    render(<ArchitectureCosts />)

    for (const link of screen.getAllByRole("link")) {
      expect(link.textContent ?? "", link.getAttribute("href") ?? "").not.toMatch(/\b\d{4}\b/)
    }
  })

  /**
   * Both kinds of link are on this page — the ruling, which is a file in the
   * repository, and *shows it happening*, which is a page here — so it is the
   * one place where getting the mark wrong is visible as an inconsistency
   * rather than only as a surprise.
   */
  it("marks the rulings and not the pages of this site", () => {
    render(<ArchitectureCosts />)

    for (const link of screen.getAllByRole("link")) {
      const href = link.getAttribute("href") ?? ""
      const marked = (link.textContent ?? "").includes(OFF_SITE_MARK)

      expect(marked, href).toBe(href.startsWith("http"))
    }
  })

  /**
   * A ruling that has since been replaced in part is still the ruling that
   * imposed the cost, and citing it silently would let a reader think the whole
   * of it still stands. The standing is shown as a word rather than as the
   * record's status line, because the status line names its replacement by
   * number and a number is the thing this section withholds.
   */
  it("says so where a ruling it cites has been replaced in part", () => {
    render(<ArchitectureCosts />)

    const replaced = ARCHITECTURE_COSTS.filter((cost) => cost.record.standing !== "in force")

    expect(replaced.length).toBeGreaterThan(0)

    for (const cost of replaced) {
      const section = screen.getByRole("region", { name: cost.title })

      expect(within(section).getByText(new RegExp(cost.record.standing))).toBeTruthy()
    }
  })
})

describe("what a ruling left open, rendered", () => {
  it("counts what it read rather than printing a number somebody typed", () => {
    render(<AlternativesLeftOpen />)

    const tally = alternativeTally()

    expect(
      screen.getByText(`${tally.alternatives} alternatives, across ${tally.records} rulings.`)
    ).toBeTruthy()
    expect(screen.getByText(new RegExp(`${tally.unsettled} of them are not closed`))).toBeTruthy()
  })

  it("shows the record's own sentence beside every row it marks", () => {
    render(<AlternativesLeftOpen />)

    const open = unsettledAlternatives()
    const rows = screen.getAllByRole("listitem")

    expect(rows.length).toBe(open.length)

    /**
     * Row by row rather than by text, because two rulings answer *"Rejected for
     * now."* in the same four words — a search of the whole page would find
     * either one and prove nothing about which row carries it.
     */
    open.forEach((alternative, index) => {
      const row = rows[index]

      expect(row, alternative.lead).toBeDefined()
      expect(within(row as HTMLElement).getByText(alternative.lead)).toBeTruthy()
      expect(within(row as HTMLElement).getByText(`“${alternative.note ?? ""}”`)).toBeTruthy()
    })
  })

  it("links each row at the ruling that has not closed it", () => {
    render(<AlternativesLeftOpen />)

    const first = unsettledAlternatives()[0]

    expect(first).toBeDefined()
    expect(
      screen.getAllByRole("link", { name: first?.recordTitle ?? "" })[0]?.getAttribute("href")
    ).toBe(first?.href)
  })
})
