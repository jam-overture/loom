import { describe, expect, it } from "vitest"

import { STAKE_ORDER, type StakeLevel } from "@jam-overture/loom"

import {
  ceilingOf,
  mayAccept,
  mayAddApplicationTo,
  mayAdminister,
  roleThatCanAccept,
  type Role,
} from "./roles"

/**
 * A role is an acceptance ceiling, and these are the sentences the workspace
 * screen is built out of.
 *
 * Written against the Gate's own `STAKE_ORDER` rather than a list of four
 * strings copied into this file, which is the property most worth holding: if a
 * fifth level is ever added to the scale, the table below stops being complete
 * and this suite says so — where a hand-written copy would go on passing while
 * the portal silently had no opinion about the new level.
 */

const ROLES: readonly Role[] = ["viewer", "approver", "owner"]

describe("ceilingOf", () => {
  it("gives a viewer no ceiling at all, rather than the lowest one", () => {
    expect(ceilingOf("viewer")).toBeNull()
  })

  /**
   * *May accept nothing* and *may accept the least consequential things* are
   * different statements, and the scale has no member for the first. A viewer
   * is not a weak approver.
   */
  it("keeps a viewer from accepting even the lowest stake", () => {
    expect(mayAccept("viewer", "low")).toBe(false)
  })

  it("puts an approver's ceiling below an owner's", () => {
    expect(ceilingOf("approver")).toBe("medium")
    expect(ceilingOf("owner")).toBe("critical")
  })
})

describe("mayAccept", () => {
  it("lets an approver release up to their ceiling and no further", () => {
    expect(mayAccept("approver", "low")).toBe(true)
    expect(mayAccept("approver", "medium")).toBe(true)
    expect(mayAccept("approver", "high")).toBe(false)
    expect(mayAccept("approver", "critical")).toBe(false)
  })

  it("lets an owner release every level the scale has", () => {
    for (const stake of STAKE_ORDER) {
      expect(mayAccept("owner", stake)).toBe(true)
    }
  })

  /**
   * The scale is ordered, so the roles over it must be too: anything an
   * approver may release, an owner may release. A table that got this backwards
   * at one level would be a portal where escalating to an owner made a change
   * *less* releasable.
   */
  it("never lets a lesser role release what a greater one cannot", () => {
    for (const stake of STAKE_ORDER) {
      if (mayAccept("approver", stake)) expect(mayAccept("owner", stake)).toBe(true)
      if (mayAccept("viewer", stake)) expect(mayAccept("approver", stake)).toBe(true)
    }
  })

  /**
   * Completeness against the Gate's scale rather than against four strings
   * written here. A fifth stake level would fail this.
   */
  it("has an answer for every level the Gate can assign", () => {
    for (const stake of STAKE_ORDER) {
      for (const role of ROLES) {
        expect(typeof mayAccept(role, stake)).toBe("boolean")
      }
    }
  })
})

describe("roleThatCanAccept", () => {
  it("names the least role that could release the change", () => {
    expect(roleThatCanAccept("low")).toBe("approver")
    expect(roleThatCanAccept("medium")).toBe("approver")
    expect(roleThatCanAccept("high")).toBe("owner")
    expect(roleThatCanAccept("critical")).toBe("owner")
  })

  /**
   * What the screen says has to be true: *waiting on an approver* must mean an
   * approver can actually release it. The two functions are separate and this
   * is the one that holds them together.
   */
  it("always names a role that may in fact accept it", () => {
    for (const stake of STAKE_ORDER) {
      expect(mayAccept(roleThatCanAccept(stake), stake)).toBe(true)
    }
  })
})

describe("mayAdminister", () => {
  it("is the owner's alone", () => {
    expect(mayAdminister("owner")).toBe(true)
    expect(mayAdminister("approver")).toBe(false)
    expect(mayAdminister("viewer")).toBe(false)
  })
})

describe("the scale this is built on", () => {
  /**
   * Pinned because every ceiling above is a member of it. If the Gate's scale
   * changes, this is the test that should fail first and say so plainly,
   * rather than a role table quietly meaning something new.
   */
  it("is the four levels the roles were written against", () => {
    expect(STAKE_ORDER).toEqual<readonly StakeLevel[]>(["low", "medium", "high", "critical"])
  })
})

describe("mayAddApplicationTo", () => {
  it("is the owner's alone, as administering is", () => {
    expect(mayAddApplicationTo("owner")).toBe(true)
    expect(mayAddApplicationTo("approver")).toBe(false)
    expect(mayAddApplicationTo("viewer")).toBe(false)
  })

  /**
   * The case this function exists for. Holding no role at all arrives as
   * `null`, and a call site that checked only the role would read `null` as
   * *not an owner* in one branch and as *nothing to refuse* in another — which
   * is how somebody puts an application in a project they were never added to.
   */
  it("refuses an actor who holds no role in the project", () => {
    expect(mayAddApplicationTo(null)).toBe(false)
  })
})
