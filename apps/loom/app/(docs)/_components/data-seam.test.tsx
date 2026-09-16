import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { produceAnswers, produceMissingAnswers, produceQuestions } from "@/app/(docs)/_lib/data/answers"
import { produceRepointing } from "@/app/(docs)/_lib/data/repointing"

import { WhatComesBack, WhatTheTreeAsks, WhenThereIsNoAnswer, WhoMayRepointIt } from "./data-seam"

/**
 * What these blocks owe a reader once the seam is real.
 *
 * The seam itself is checked beside the code that produces it. What is checked
 * here is the failure a generated block is prone to: printing some of what it
 * was handed. A dropped row is a question the page does not admit to asking; a
 * status on the wrong row is worse than no status, because half of this page is
 * about telling `ready` from `unavailable`; and an empty list printed as
 * nothing at all would undo the section it is there to prove.
 */

describe("what the tree asks", () => {
  it("shows every binding written into the tree", () => {
    const asked = produceQuestions()

    render(<WhatTheTreeAsks />)

    const rows = [...document.querySelectorAll("tbody tr")]

    // One row per binding, then one per question.
    expect(rows).toHaveLength(asked.written.length + asked.questions.length)
  })

  it("says how many bindings are waiting on each question", () => {
    const asked = produceQuestions()

    render(<WhatTheTreeAsks />)

    const counts = [...document.querySelectorAll("[data-asked-by]")].map((node) =>
      node.getAttribute("data-asked-by")
    )

    expect(counts).toEqual(asked.questions.map((question) => String(question.askedBy.length)))
  })

  it("prints the two orders the same params were written in", () => {
    render(<WhatTheTreeAsks />)

    const printed = document.body.textContent ?? ""

    expect(printed).toContain('{"tag":"baking","limit":3}')
    expect(printed).toContain('{"limit":3,"tag":"baking"}')
  })
})

describe("what comes back", () => {
  it("shows one answer per binding, with the status the producer gave it", async () => {
    const answers = await produceAnswers()

    render(await WhatComesBack())

    const rows = [...document.querySelectorAll("[data-status]")]

    expect(rows.map((row) => row.getAttribute("data-status"))).toEqual(
      answers.map((answer) => answer.status)
    )
  })

  /**
   * The second binding on the shared question does not repeat the answer, which
   * is the deduplication being visible rather than described. It names the row
   * it shares with, so the two can be checked against each other.
   */
  it("says where a shared answer was already shown instead of printing it twice", async () => {
    const answers = await produceAnswers()
    const shared = answers.filter((answer) => answer.sharedWith !== undefined)

    render(await WhatComesBack())

    const printed = [...document.querySelectorAll("[data-shared-with]")]

    expect(printed.map((node) => node.getAttribute("data-shared-with"))).toEqual(
      shared.map((answer) => answer.sharedWith)
    )
    expect(shared).toHaveLength(1)
  })

  /**
   * The row the section turns on. An empty answer that printed as a blank cell
   * would leave a reader with no reason to believe the page's claim about it.
   */
  it("says out loud that the empty answer has nothing in it", async () => {
    render(await WhatComesBack())

    const empty = document.querySelector('[data-rows="0"]')

    expect(empty?.textContent).toBe("nothing in it")
  })
})

describe("when there is no answer", () => {
  it("shows every reason the producer caused, and the unreadable declaration too", async () => {
    const missing = await produceMissingAnswers()

    render(await WhenThereIsNoAnswer())

    const reasons = [...document.querySelectorAll("[data-reason]")].map((row) =>
      row.getAttribute("data-reason")
    )

    expect(reasons).toEqual([...missing.map((row) => row.reason), "misdeclared"])
  })

  it("prints the runtime's own sentence rather than a paraphrase", async () => {
    const missing = await produceMissingAnswers()

    render(await WhenThereIsNoAnswer())

    const printed = document.body.textContent ?? ""

    for (const row of missing) expect(printed).toContain(row.sentence)
  })
})

describe("who may repoint a binding", () => {
  it("shows both verdicts, as the Gate gave them", async () => {
    const verdicts = await produceRepointing()

    render(await WhoMayRepointIt())

    const columns = [...document.querySelectorAll("[data-kind]")]

    expect(columns.map((column) => column.getAttribute("data-kind"))).toEqual(
      verdicts.map((verdict) => verdict.kind)
    )
  })

  /**
   * The block was a binary until 0163 made this comparison produce a refusal,
   * and it read a refused change as "held for a person" — the opposite of what
   * the prose beside it says. This is the check that a fourth kind, or a third
   * one arriving again, cannot be rendered as its opposite.
   */
  it("reads each verdict as what it is, refusal included", async () => {
    const verdicts = await produceRepointing()

    render(await WhoMayRepointIt())

    const printed = document.body.textContent ?? ""

    expect(verdicts.map((verdict) => verdict.kind)).toContain("rejected")
    expect(printed).toContain("Refused outright")
    expect(printed).not.toContain("Held for a person and")
  })

  it("names the reason code beside each of them", async () => {
    const verdicts = await produceRepointing()

    render(await WhoMayRepointIt())

    const printed = document.body.textContent ?? ""

    for (const verdict of verdicts) expect(printed).toContain(verdict.reasonCode)
  })
})
