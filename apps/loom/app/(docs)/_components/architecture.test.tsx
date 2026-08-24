import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ArchitectureIdeas } from "./architecture-ideas"
import { DecisionRecords } from "./decision-records"
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

  it("links every written lesson it names at the file that holds it", () => {
    render(<ArchitectureIdeas />)

    for (const idea of ARCHITECTURE_IDEAS) {
      if (idea.lesson.href === undefined) continue

      const link = screen.getByRole("link", {
        name: `Lesson ${idea.lesson.number} — ${idea.lesson.title}`,
      })

      expect(link.getAttribute("href")).toBe(idea.lesson.href)
    }
  })

  it("sends a reader to the course rather than leaving them with a list of files", () => {
    render(<ArchitectureIdeas />)

    expect(screen.getByRole("link", { name: "start it here" }).getAttribute("href")).toBe("/lessons")
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
})

describe("the two readers of one syllabus", () => {
  it("shows a lesson under the number the course gives it", () => {
    render(<ArchitectureIdeas />)

    const second = COURSE.find((lesson) => lesson.number === 2)

    expect(second?.file).toBeDefined()
    expect(screen.getByText(new RegExp(`Lesson 2 — ${second?.title ?? ""}`))).toBeTruthy()
  })
})
