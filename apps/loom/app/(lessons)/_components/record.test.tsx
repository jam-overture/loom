import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { StudyRecord } from "./record"
import { RECORD_FORMAT } from "../_lib/record"
import type { Progress } from "../_lib/progress"

/**
 * The page that holds the only copy of anything.
 *
 * Two properties are worth a test each and neither is about layout. An answer
 * the reader wrote must not appear on a page they can reach from anywhere,
 * because half of those answers belong to questions the corrections queue is
 * about to ask again. And an import must be checked before it is applied,
 * because it is the one action on this surface that can quietly change a number
 * — the retrieval count on a missed question — that decides what the course
 * asks the reader next.
 */

const KEY = "loom.lessons.progress.v1"

const RECORD: Progress = {
  lessons: { "4": "2026-03-01", "5": "2026-03-08" },
  sets: {
    "set-a": {
      attempts: [
        {
          question: 1,
          confidence: 5,
          answer: "the id is minted, the position is derived",
          grade: "missed",
          on: "2026-03-03",
        },
      ],
      completedOn: "2026-03-03",
    },
  },
  predictions: {},
  corrections: [
    {
      set: "set-a",
      question: 1,
      confidence: 3,
      answer: "second go at it",
      grade: "got-it",
      on: "2026-03-04",
    },
  ],
}

const stored = (): unknown => JSON.parse(window.localStorage.getItem(KEY) ?? "null")

beforeEach(() => {
  window.localStorage.clear()
  window.localStorage.setItem(KEY, JSON.stringify(RECORD))
})

describe("what the page shows", () => {
  it("counts the record without printing a word of it", () => {
    render(<StudyRecord />)

    expect(screen.getByText(/2 lessons worked through/)).toBeTruthy()
    expect(screen.getByText(/1 answer you were sure about and wrong about/)).toBeTruthy()
    expect(document.body.textContent).not.toContain("the id is minted")
    expect(document.body.textContent).not.toContain("second go at it")
  })

  it("shows the raw record only after a control that says what that costs", () => {
    render(<StudyRecord />)

    fireEvent.click(screen.getByRole("button", { name: "Show it as text" }))

    expect(screen.getByText(/including to questions that are coming back/)).toBeTruthy()
    expect(
      (screen.getByLabelText("Your record, as text") as HTMLTextAreaElement).value
    ).toContain("the id is minted")
  })

  it("says the record is empty rather than offering a copy of nothing", () => {
    window.localStorage.clear()
    render(<StudyRecord />)

    expect(screen.getByText(/Nothing yet/)).toBeTruthy()
    expect((screen.getByRole("button", { name: "Save a copy" }) as HTMLButtonElement).disabled).toBe(
      true
    )
  })
})

describe("bringing a record in", () => {
  const paste = (value: unknown): void => {
    fireEvent.change(screen.getByLabelText("A record, as text"), {
      target: { value: typeof value === "string" ? value : JSON.stringify(value) },
    })
    fireEvent.click(screen.getByRole("button", { name: "Check it" }))
  }

  it("says what a merge would do and changes nothing until it is confirmed", () => {
    render(<StudyRecord />)

    paste({
      format: RECORD_FORMAT,
      version: 1,
      progress: { ...RECORD, lessons: { "6": "2026-03-15" } },
    })

    expect(screen.getByText(/Brings in 1 lesson/)).toBeTruthy()
    expect(stored()).toEqual(RECORD)

    fireEvent.click(screen.getByRole("button", { name: "Merge it into this record" }))

    expect(screen.getByRole("status").textContent).toContain("1 lesson brought in")
    expect((stored() as Progress).lessons["6"]).toBe("2026-03-15")
  })

  it("leaves the record alone when the reader says leave it", () => {
    render(<StudyRecord />)

    paste({ lessons: { "6": "2026-03-15" } })
    fireEvent.click(screen.getByRole("button", { name: "Leave it" }))

    expect(stored()).toEqual(RECORD)
    expect(screen.queryByRole("button", { name: "Merge it into this record" })).toBeNull()
  })

  it("says so when a second import of the same file would do nothing", () => {
    render(<StudyRecord />)

    paste(RECORD)

    expect(screen.getByText(/Everything in it is already here/)).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Merge it into this record" }))

    expect(stored()).toEqual(RECORD)
  })

  it("empties the paste box once it parses, and keeps it when it does not", () => {
    render(<StudyRecord />)

    const box = (): HTMLTextAreaElement => screen.getByLabelText("A record, as text") as HTMLTextAreaElement

    paste("{ nearly")
    expect(box().value).toBe("{ nearly")

    paste({ lessons: { "6": "2026-03-15" } })
    expect(box().value).toBe("")
    expect(document.body.textContent).not.toContain("2026-03-15")
  })

  it("refuses what is not JSON, and what is JSON but not a record", () => {
    render(<StudyRecord />)

    paste("not json at all")
    expect(screen.getByRole("alert").textContent).toContain("That is not JSON")

    paste({ hello: "world" })
    expect(screen.getByRole("alert").textContent).toContain("no study history in it")
    expect(stored()).toEqual(RECORD)
  })

  it("does not add a re-answer the record already holds, because the count is a schedule", () => {
    render(<StudyRecord />)

    paste({
      ...RECORD,
      corrections: [
        ...RECORD.corrections,
        { ...RECORD.corrections[0], on: "2026-03-12", answer: "third go" },
      ],
    })
    fireEvent.click(screen.getByRole("button", { name: "Merge it into this record" }))

    expect((stored() as Progress).corrections.map((each) => each.on)).toEqual([
      "2026-03-04",
      "2026-03-12",
    ])
  })
})
