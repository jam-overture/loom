import { describe, expect, it } from "vitest"

import { treeIdSchema } from "@jam-overture/loom"

import type { Latest } from "./arrivals"
import { lastArrivalFigureOf, type LastArrivalContext } from "./last-arrival"

const treeId = treeIdSchema.parse("t_pricing")

const arrived: Latest = { kind: "arrived", at: "2026-11-09T09:30:00.000Z", treeId }
const counted: Latest = { kind: "counted", at: "2026-11-09T09:30:00.000Z", treeId }

const context: LastArrivalContext = {
  projectId: "prj_a",
  host: "example.com",
  names: new Map([["t_pricing", "Pricing"]]),
  range: "24h",
}

describe("the last arrival figure", () => {
  /** The door takes this project's signals from its own address and nowhere else (0298). */
  it("names the project's own site and the page the newest delivery came from", () => {
    const figure = lastArrivalFigureOf(arrived, context)

    expect(figure.label).toBe("Last arrival")
    expect(figure.note).toBe("Received from example.com, on Pricing (t_pricing).")
  })

  /** Loom keeps no origin on a delivery, so a project with no address cannot name one. */
  it("does not guess a site for a project that names none", () => {
    const figure = lastArrivalFigureOf(arrived, { ...context, host: undefined })

    expect(figure.note).toBe(
      "Received from a site holding this project's key, on Pricing (t_pricing)."
    )
  })

  it("names a page that published no name of its own by its id", () => {
    const figure = lastArrivalFigureOf(arrived, { ...context, names: new Map() })

    expect(figure.note).toBe("Received from example.com, on the page t_pricing.")
  })

  /** A kept delivery is listed on Events, so the link lands on it. */
  it("links a kept delivery's page to Events on that page, keeping the range", () => {
    expect(lastArrivalFigureOf(arrived, context).link).toEqual({
      label: "Events on this page",
      href: "/portal/prj_a/signals?on=t_pricing",
    })
    expect(lastArrivalFigureOf(arrived, { ...context, range: "7d" }).link?.href).toBe(
      "/portal/prj_a/signals?on=t_pricing&range=7d"
    )
  })

  /**
   * Once the journal holds nothing, the page's row on By page is what is left
   * of it, so the link opens that page's drawer rather than an empty list.
   */
  it("says a counted page was counted, not arrived, and links its By page drawer", () => {
    const figure = lastArrivalFigureOf(counted, context)

    expect(figure.label).toBe("Last counted")
    expect(figure.note).toMatch(/^Last added up on Pricing \(t_pricing\)\./)
    expect(figure.note).not.toMatch(/example\.com/)
    expect(figure.link).toEqual({
      label: "This page on By page",
      href: "/portal/prj_a/signals/pages?page=t_pricing",
    })
  })

  it("says nothing has arrived, with nothing to follow, before anything has", () => {
    expect(lastArrivalFigureOf(undefined, context)).toEqual({
      label: "Last arrival",
      value: "Nothing yet",
      note: "Nothing has arrived from one of your pages.",
      link: undefined,
    })
  })
})
