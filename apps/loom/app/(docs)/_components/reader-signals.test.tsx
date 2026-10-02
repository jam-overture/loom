import { READER_SIGNAL_KINDS } from "@jam-overture/loom/signals"
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { produceKinds } from "@/app/(docs)/_lib/signals/page"

import { TheApprovedAddition, TheVocabulary, WhatAPageMaySay } from "./reader-signals"

/**
 * The vocabulary panel, rendered.
 *
 * It had no render test at all, and that is a hole of a shape this lane has now
 * filed three times: **every assertion about this block was about what the
 * producer computes**, and all of them stay green when the component stops
 * printing it. `produceKinds()` could return a perfect caveat for every kind and
 * the page could show a reader none of them, and `pnpm verify` would be as green
 * as it is today.
 *
 * So this renders the three blocks the page composes and reads the words back
 * out of the document. It is deliberately not a snapshot: what has to be true is
 * that each row's sentences reach a reader, not that the markup around them is
 * the markup somebody last approved.
 */

const panel = () => render(<TheVocabulary />).container

describe("the vocabulary panel", () => {
  /**
   * The floor first, and it is not pedantry: every assertion below walks
   * `produceKinds()`, and a producer returning nothing satisfies all of them at
   * once. *A test derived from the list it checks cannot see the list shrink* —
   * this lane's own entry, 28 September — so the row count is held against the
   * runtime's list rather than against the producer's, and against being more
   * than one.
   */
  it("prints a row per kind the runtime has", () => {
    const rows = panel().querySelectorAll("[data-kind]")

    expect(READER_SIGNAL_KINDS.length).toBeGreaterThan(1)
    expect(rows).toHaveLength(READER_SIGNAL_KINDS.length)
    expect(produceKinds()).toHaveLength(READER_SIGNAL_KINDS.length)
  })

  /**
   * The whole of the unit this file was added for: the sentence that stops a
   * reader over-reading a name is on the page, for every name, in the row the
   * name is in.
   */
  it("prints what each kind does not mean, beside what it does", () => {
    const container = panel()

    for (const row of produceKinds()) {
      const gap = container.querySelector(`[data-does-not-mean="${row.kind}"]`)

      expect(gap, `"${row.kind}" has no does-not-mean line on the page`).not.toBeNull()
      expect(gap?.textContent).toBe(row.doesNotMean)
    }
  })

  /**
   * Both halves in the same row, because a caveat that rendered in a block of
   * its own would be a footnote — which is the thing the finding behind this
   * change was about.
   */
  it("keeps the two halves in one row", () => {
    const container = panel()

    for (const row of produceKinds()) {
      const inRow = container.querySelector(`[data-kind="${row.kind}"]`)

      expect(inRow?.textContent, row.kind).toContain(row.means)
      expect(inRow?.textContent, row.kind).toContain(row.doesNotMean)
    }
  })

  it("prints the real signal under each row", () => {
    const container = panel()

    for (const row of produceKinds()) {
      expect(container.querySelector(`[data-kind="${row.kind}"]`)?.textContent, row.kind).toContain(
        row.example
      )
    }
  })

  /**
   * The list carries its own size as an attribute, which is what a camera and a
   * shot list have to aim at — there is no other handle on the panel as a whole.
   */
  it("says how long it is on the list itself", () => {
    expect(panel().querySelector("[data-vocabulary]")?.getAttribute("data-vocabulary")).toBe(
      String(READER_SIGNAL_KINDS.length)
    )
  })

  /** The caption counts, and the count is the runtime's. */
  it("says how many kinds it is showing, from the list it walked", () => {
    expect(panel().textContent).toContain(`${produceKinds().length} kinds`)
  })
})

describe("the two blocks either side of it", () => {
  it("writes the opening sentence's list rather than a list of its own", () => {
    expect(render(<WhatAPageMaySay />).container.textContent).toContain("which part someone looked at")
  })

  /**
   * It renders nothing while the runtime has every documented kind, which is the
   * reason it is a component. Asserted against the real state rather than a
   * rehearsed one — `page.test.ts` rehearses both.
   */
  it("announces nothing once the runtime has caught up", () => {
    expect(render(<TheApprovedAddition />).container.innerHTML).toBe("")
  })
})
