import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { produceAnswers, produceQueue, produceSecondLook } from "@/app/(docs)/_lib/holds/queue"

import { TheSecondLook, WhatAnsweringDoes, WhatIsWaiting } from "./review-queue"

/**
 * What these blocks owe a reader once the answers are real.
 *
 * The answers are checked beside the code that produces them. What is checked
 * here is the failure a generated block is prone to: printing some of what it
 * was handed. A dropped row is a change nobody can see is waiting; a badge on
 * the wrong row is worse than no badge, because the whole page is about telling
 * one row from the other; and a number rendered as `undefined` is the one thing
 * on this page that has to be exact.
 */

describe("what is waiting", () => {
  it("shows one card per change in the queue", async () => {
    const queue = await produceQueue()

    render(await WhatIsWaiting())

    expect(document.querySelectorAll("[data-answerable]")).toHaveLength(queue.waiting.length)
  })

  it("badges each card with what the producer said about that change", async () => {
    const queue = await produceQueue()

    render(await WhatIsWaiting())

    const cards = [...document.querySelectorAll("[data-answerable]")]

    expect(cards.map((card) => card.getAttribute("data-answerable"))).toEqual(
      queue.waiting.map((row) => String(row.stillAnswerable))
    )
  })

  it("puts the revision a change was judged against on its own card", async () => {
    const queue = await produceQueue()

    render(await WhatIsWaiting())

    const printed = [...document.querySelectorAll("[data-held-against]")].map(
      (node) => node.textContent
    )

    expect(printed).toEqual(queue.waiting.map((row) => String(row.heldAgainst)))
  })

  it("counts the two kinds of row against the page's own revision", async () => {
    const queue = await produceQueue()

    render(await WhatIsWaiting())

    expect(document.querySelector("[data-head]")?.textContent).toBe(String(queue.head))
    expect(document.querySelector("[data-answerable-count]")?.textContent).toBe(
      String(queue.answerable)
    )
    expect(document.querySelector("[data-dead-count]")?.textContent).toBe(String(queue.dead))
  })

  it("says why each change is waiting, in words and in the Gate's own code", async () => {
    const queue = await produceQueue()

    render(await WhatIsWaiting())

    const text = document.body.textContent ?? ""

    for (const row of queue.waiting) {
      expect(text, row.asked).toContain(row.reason)
      expect(text, row.asked).toContain(row.detail)
      expect(text, row.asked).toContain(row.asked)
    }

    expect(text).not.toContain("undefined")
  })
})

describe("what answering does", () => {
  it("shows one row per answer, in the order they were given", async () => {
    const answers = await produceAnswers()

    render(await WhatAnsweringDoes())

    const rows = [...document.querySelectorAll("[data-ending]")]

    expect(rows.map((row) => row.getAttribute("data-ending"))).toEqual(
      answers.map((answer) => answer.ending)
    )
  })

  it("prints the runtime's own sentence rather than a summary of it", async () => {
    const answers = await produceAnswers()

    render(await WhatAnsweringDoes())

    const text = document.body.textContent ?? ""

    for (const answer of answers) {
      expect(text, answer.answer).toContain(answer.said)
    }
  })

  it("shows where the page was before and after each answer", async () => {
    const answers = await produceAnswers()

    render(await WhatAnsweringDoes())

    const text = document.body.textContent ?? ""

    for (const answer of answers) {
      expect(text, answer.answer).toContain(`revision ${answer.headBefore} → ${answer.headAfter}`)
    }

    expect(text).not.toContain("undefined")
  })
})

describe("the second look", () => {
  it("names both policies, and never the same one twice", async () => {
    const look = await produceSecondLook()

    render(await TheSecondLook())

    expect(document.querySelector("[data-held-under]")?.textContent).toBe(look.heldUnder)
    expect(document.querySelector("[data-answered-under]")?.textContent).toBe(look.answeredUnder)
  })

  it("prints both verdicts, which are the pair the section is about", async () => {
    const look = await produceSecondLook()

    render(await TheSecondLook())

    const text = document.body.textContent ?? ""

    expect(text).toContain(look.heldReason)
    expect(text).toContain(look.nowReason)
    expect(text).not.toContain("undefined")
  })

  it("says the page did not move", async () => {
    const look = await produceSecondLook()

    render(await TheSecondLook())

    expect(document.querySelector("[data-head]")?.textContent).toBe(String(look.head))
  })
})
