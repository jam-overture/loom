import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { Answer } from "./answer"

/**
 * These are tests of an order, not of a layout.
 *
 * Every one of them asserts that something is *not* on the screen yet. That is
 * the whole value of this control over the paper version: on paper the reader
 * can see the next page, and here they cannot see the pointer to the answer
 * until they have written one — nor rate their confidence after finding out how
 * it went, which is the only version of a confidence rating worth recording.
 */

const question = (onRecord = vi.fn()) => {
  render(
    <Answer
      question={3}
      total={8}
      body={<p>Why is a half-applied delta worse than a rejected one?</p>}
      resolve={{
        kind: "check",
        checkIn: [
          { kind: "lesson", name: "03", title: "Change as data: the delta", href: "/lessons/03" },
        ],
        onRecord,
      }}
    />
  )

  return onRecord
}

const prediction = (onWrite = vi.fn()) => {
  render(
    <Answer
      question={1}
      total={3}
      body={<p>How would you enforce that AI may never touch checkout?</p>}
      resolve={{ kind: "hold", note: "Held until Reflect.", onWrite }}
    />
  )

  return onWrite
}

describe("answering a question", () => {
  it("asks for a confidence before it offers anywhere to write", () => {
    question()

    expect(screen.queryByRole("textbox")).toBeNull()
    expect(screen.getByRole("group", { name: "Confidence" })).toBeTruthy()
  })

  it("offers the answer box only once the rating is in, and does not take it back", () => {
    question()
    fireEvent.click(screen.getByRole("button", { name: /^4 —/ }))

    expect(screen.getByRole("textbox")).toBeTruthy()
    expect(screen.queryByRole("group", { name: "Confidence" })).toBeNull()
    expect(screen.getByText(/Rated/).textContent).toContain("4")
  })

  it("keeps where-to-check hidden until an answer has been submitted", () => {
    question()
    fireEvent.click(screen.getByRole("button", { name: /^4 —/ }))

    expect(screen.queryByText("Where to check")).toBeNull()
    expect(screen.queryByRole("link")).toBeNull()

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "It leaves the tree wrong." } })
    fireEvent.click(screen.getByRole("button", { name: "Submit, then check" }))

    expect(screen.getByText("Where to check")).toBeTruthy()
    expect(screen.getByRole("link", { name: /03 — Change as data/ })).toBeTruthy()
  })

  it("will not submit an empty answer through the front door", () => {
    question()
    fireEvent.click(screen.getByRole("button", { name: /^2 —/ }))

    expect(screen.getByRole("button", { name: "Submit, then check" }).hasAttribute("disabled")).toBe(
      true
    )
  })

  it("records the rating taken before the reveal, with the grade given after it", () => {
    const onRecord = question()

    fireEvent.click(screen.getByRole("button", { name: /^5 —/ }))
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Half a delta is not a state." } })
    fireEvent.click(screen.getByRole("button", { name: "Submit, then check" }))
    fireEvent.click(screen.getByRole("button", { name: "Missed it" }))

    expect(onRecord).toHaveBeenCalledWith({
      question: 3,
      confidence: 5,
      answer: "Half a delta is not a state.",
      grade: "missed",
    })
  })

  it("lets a reader say they could not retrieve it, and records that as an attempt", () => {
    const onRecord = question()

    fireEvent.click(screen.getByRole("button", { name: /^1 —/ }))
    fireEvent.click(screen.getByRole("button", { name: /can.t retrieve this/ }))
    fireEvent.click(screen.getByRole("button", { name: "Missed it" }))

    expect(onRecord).toHaveBeenCalledWith({ question: 3, confidence: 1, answer: "", grade: "missed" })
  })

  it("never puts an answer next to the question it belongs to", () => {
    question()
    fireEvent.click(screen.getByRole("button", { name: /^3 —/ }))
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Something." } })
    fireEvent.click(screen.getByRole("button", { name: "Submit, then check" }))

    /** What unlocks is a pointer to the lesson, never the answer itself. */
    expect(screen.getByText(/going and getting it is another retrieval/)).toBeTruthy()
  })
})

describe("a prediction, which has nothing to check against yet", () => {
  it("asks for the rating first, exactly as a review question does", () => {
    prediction()

    expect(screen.queryByRole("textbox")).toBeNull()
    expect(screen.getByRole("group", { name: "Confidence" })).toBeTruthy()
  })

  it("hands over the rating taken before the lesson, with what was written", () => {
    const onWrite = prediction()

    fireEvent.click(screen.getByRole("button", { name: /^2 —/ }))
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "A lint rule on the diff." } })
    fireEvent.click(screen.getByRole("button", { name: "Commit to this" }))

    expect(onWrite).toHaveBeenCalledWith({ confidence: 2, answer: "A lint rule on the diff." })
  })

  it("offers nowhere to check and nothing to grade, because neither exists yet", () => {
    prediction()

    fireEvent.click(screen.getByRole("button", { name: /^4 —/ }))
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Something specific." } })

    expect(screen.queryByText("Where to check")).toBeNull()
    expect(screen.queryByRole("group", { name: "Self-grade" })).toBeNull()
  })
})
