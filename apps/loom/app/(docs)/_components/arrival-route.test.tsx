import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ARRIVAL_ROUTE, ARRIVAL_TOTALS } from "@/app/(docs)/_lib/arrival/route"

import { ArrivalRoute } from "./arrival-route"

/**
 * The module decides what is true; this decides what a reader can see.
 *
 * The failure worth catching here is a step that resolves perfectly and renders
 * as a number with no sentence beside it — the route's whole value to somebody
 * on the first page is *what you will have when it is done*, and a component
 * that quietly dropped that half would still pass every check in `route.ts`.
 */

const route = () => render(<ArrivalRoute />)

describe("the route as a reader meets it", () => {
  it("shows every step, numbered, with the page it is on", () => {
    const { container } = route()
    const items = container.querySelectorAll("li")

    expect(items).toHaveLength(ARRIVAL_ROUTE.length)

    ARRIVAL_ROUTE.forEach((step, position) => {
      const item = items[position]

      expect(item?.textContent, step.id).toContain(String(position + 1))
      expect(item?.textContent, step.id).toContain(step.title)
    })
  })

  it("says what each step gets you, in the sentence and not a summary of it", () => {
    const { container } = route()

    for (const step of ARRIVAL_ROUTE) {
      expect(container.textContent, step.id).toContain(step.done)
    }
  })

  it("names the checkpoint on every step", () => {
    const { container } = route()

    for (const step of ARRIVAL_ROUTE) {
      expect(container.textContent, step.id).toContain(step.checkpoint)
    }
  })

  it("links each title to the top of its page, and never into the middle of one", () => {
    const { container } = route()
    const titles = [...container.querySelectorAll("h3 a")].map((link) => link.getAttribute("href"))

    expect(titles).toEqual(ARRIVAL_ROUTE.map((step) => step.href))
  })

  /**
   * A checkpoint whose name is used before the page's first heading has nowhere
   * of its own to point at, so it is printed rather than linked — a second link
   * to the same address, one line under the first, is a reader being offered a
   * choice that is not one.
   */
  it("links a checkpoint into the page only where the page has a heading to land on", () => {
    const items = [...route().container.querySelectorAll("li")]

    ARRIVAL_ROUTE.forEach((step, position) => {
      const links = [...(items[position]?.querySelectorAll("a") ?? [])].map((link) =>
        link.getAttribute("href")
      )

      expect(links, step.id).toEqual(
        step.checkpointHref === step.href ? [step.href] : [step.href, step.checkpointHref]
      )
    })
  })

  it("prints the totals it was given rather than counting them again", () => {
    const { container } = route()
    const text = container.textContent ?? ""

    expect(text).toContain(`${ARRIVAL_TOTALS.steps} pages of the ${ARRIVAL_TOTALS.sitePages}`)
    expect(text).toContain(`${ARRIVAL_TOTALS.blocks} code blocks`)
    expect(text).toContain(`${ARRIVAL_TOTALS.minutes} minutes of reading`)
    expect(text).toContain(`${ARRIVAL_TOTALS.compiled} of those blocks are TypeScript`)
  })

  /**
   * The heading over this component promises an hour, and the footer is where
   * the page says which part of it is reading. A footer that printed the
   * minutes without that sentence would be quietly claiming the hour is spent
   * reading twenty minutes of prose.
   */
  it("says plainly that the hour is the typing", () => {
    expect(route().container.textContent).toContain("the hour is the typing")
  })

  it("offers the way round the first steps", () => {
    const { container } = route()
    const last = [...container.querySelectorAll("a")].at(-1)

    expect(last?.getAttribute("href")).toBe("/docs/getting-started/scaffolding-a-project")
  })
})
