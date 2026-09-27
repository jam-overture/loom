import { describe, expect, it } from "vitest"

import type { TreeId } from "@jam-overture/loom"

import { elsewhereFrom, namedScreens, screenHref, screenName } from "./screen-names"

const TREE = "t_seed1" as TreeId

describe("the screens this portal names once", () => {
  it("names the three screens the record group is made of", () => {
    expect(namedScreens().map((screen) => screen.route)).toEqual([
      "/portal",
      "/portal/activity",
      "/portal/history",
    ])
  })

  /**
   * The whole defect, in one assertion. `Activity` and `History` are synonyms in
   * ordinary English and the two screens are nearly opposites; `Waiting on you`
   * named the front door and also its first section and also the state of a
   * change on every badge in the portal.
   *
   * Normalised because the reader who is confused does not distinguish `What's
   * changed` from `Whats Changed`.
   */
  it("gives no two screens a name a reader could confuse", () => {
    const normalised = namedScreens().map((screen) =>
      screen.name.toLowerCase().replace(/[^a-z0-9]+/gu, " ").trim()
    )

    expect(new Set(normalised).size).toBe(normalised.length)
  })

  it("names them in a person's words rather than the route's", () => {
    expect(screenName("/portal/activity")).not.toMatch(/activity/iu)
    expect(screenName("/portal/history")).not.toMatch(/history/iu)
  })
})

describe("what a screen says it is not", () => {
  /**
   * A screen pointing at itself would render a line telling a reader that what
   * they want is where they already are, and it is the exact mistake a
   * copy-pasted entry makes.
   */
  it("points every screen at a different screen, which is itself named here", () => {
    const routes = namedScreens().map((screen) => screen.route)

    for (const screen of namedScreens()) {
      expect(screen.elsewhere.route).not.toBe(screen.route)
      expect(routes).toContain(screen.elsewhere.route)
    }
  })

  /**
   * The clause and the link read as one sentence, so the clause must end where a
   * name can follow it — not on a full stop, and not on the name itself.
   */
  it("ends every clause where the neighbour's name begins", () => {
    for (const screen of namedScreens()) {
      expect(screen.elsewhere.clause).not.toMatch(/[.!?]$/u)
      expect(screen.elsewhere.clause).not.toContain(screenName(screen.elsewhere.route))
    }
  })

  /**
   * The pair the portal was actually failing on. Each of the two record screens
   * has to name the other, because the difference between them — a request that
   * changed nothing still happened — is the one thing neither name can carry.
   */
  it("makes the two record screens name each other", () => {
    expect(elsewhereFrom("/portal/activity").route).toBe("/portal/history")
    expect(elsewhereFrom("/portal/history").route).toBe("/portal/activity")
  })
})

describe("a link that carries the page the reader is on", () => {
  it("keeps the scope when crossing between two scoped screens", () => {
    expect(screenHref("/portal/activity", TREE)).toBe("/portal/activity?tree=t_seed1")
    expect(screenHref("/portal/history", TREE)).toBe("/portal/history?tree=t_seed1")
  })

  it("asks for every page when there is no page in mind", () => {
    expect(screenHref("/portal/activity")).toBe("/portal/activity")
  })

  /**
   * The front door is a queue over every page and reads no `tree`. A URL
   * carrying a filter the screen does not apply is a claim it will not keep, so
   * the scope is dropped rather than appended.
   */
  it("never offers the front door a filter it does not read", () => {
    expect(screenHref("/portal", TREE)).toBe("/portal")
  })
})
