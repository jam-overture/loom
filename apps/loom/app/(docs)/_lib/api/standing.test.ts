import { describe, expect, it } from "vitest"

import type { ApiSymbol } from "./model"
import { standingBySpecifier, type StandingDoor } from "./standing"

/**
 * Where a door sits among the others.
 *
 * Over invented doors, for the reason `narrower.test.ts` gives: the claim
 * these numbers make to a reader — *most of this package is not behind this
 * import* — has to hold for shapes Loom's package does not happen to take. A
 * door whose every name is behind another one. Two doors publishing one name
 * that means two different things. Three doors publishing the same name. A
 * package with one door and nothing to compare it to.
 *
 * What the sixteen real doors produce is held against the generated file in
 * `extract.test.ts`, which is where the package's own shape is stated.
 */

const symbol = (name: string, signature: string): ApiSymbol => ({
  name,
  kind: "function",
  signature,
  truncated: false,
  summary: "",
})

const door = (specifier: string, symbols: readonly ApiSymbol[]): StandingDoor => ({
  specifier,
  slug: specifier.replace(/^@invented\//, ""),
  groups: [{ module: "m", title: "M", summary: "", symbols }],
})

const send = symbol("send", "send(): void")
const parse = symbol("parse", "parse(text: string): unknown")
const read = symbol("read", "read(): string")

describe("how much of a package is behind one of its doors", () => {
  it("counts a name once however many doors publish it", () => {
    const standing = standingBySpecifier([
      door("@invented/a", [send, parse]),
      door("@invented/b", [send, read]),
    ])

    /* Four export slots, three names a reader could import. Adding the doors
       up is the arithmetic a reader would do from the rail, and it is wrong. */
    expect(standing.get("@invented/a")?.packageNames).toBe(3)
    expect(standing.get("@invented/b")?.packageNames).toBe(3)
  })

  it("says how many other doors there are, which is every door but this one", () => {
    const standing = standingBySpecifier([
      door("@invented/a", [send]),
      door("@invented/b", [parse]),
      door("@invented/c", [read]),
    ])

    expect(standing.get("@invented/a")?.otherDoors).toBe(2)
  })

  it("counts the doors that publish not one name this one does", () => {
    const standing = standingBySpecifier([
      door("@invented/a", [send, parse]),
      door("@invented/b", [send]),
      door("@invented/c", [read]),
    ])

    expect(standing.get("@invented/a")?.doorsSharingNothing).toBe(1)
  })

  it("leaves a package of one door with nothing to compare against", () => {
    const standing = standingBySpecifier([door("@invented/only", [send])])

    expect(standing.get("@invented/only")).toEqual({
      packageNames: 1,
      otherDoors: 0,
      doorsSharingNothing: 0,
      widest: true,
      sharedWith: [],
      collisions: [],
    })
  })
})

describe("the widest door", () => {
  it("is the one publishing the most names", () => {
    const standing = standingBySpecifier([
      door("@invented/big", [send, parse, read]),
      door("@invented/small", [send]),
    ])

    expect(standing.get("@invented/big")?.widest).toBe(true)
    expect(standing.get("@invented/small")?.widest).toBe(false)
  })

  /**
   * Two doors publishing the same, largest number of names are both true
   * answers to *is there a bigger one*. Picking one of them would be picking
   * by the order `package.json` happens to list its conditions in, and the
   * page would tell one reader something it withheld from another for no
   * reason either could see.
   */
  it("is every door that ties for it, rather than whichever was listed first", () => {
    const standing = standingBySpecifier([
      door("@invented/a", [send, parse]),
      door("@invented/b", [read, symbol("write", "write(): void")]),
    ])

    expect(standing.get("@invented/a")?.widest).toBe(true)
    expect(standing.get("@invented/b")?.widest).toBe(true)
  })
})

describe("a name at two doors", () => {
  it("is an overlap when both doors declare it the same way", () => {
    const standing = standingBySpecifier([
      door("@invented/a", [send, parse]),
      door("@invented/b", [send]),
    ])

    expect(standing.get("@invented/a")?.sharedWith).toEqual([
      { specifier: "@invented/b", slug: "b", names: 1 },
    ])
    expect(standing.get("@invented/a")?.collisions).toEqual([])
  })

  /**
   * The case the package actually has. `horizonOf` is a function about reader
   * signals behind one door and a function about telemetry retention behind
   * another; a reader who searches the name gets two results that look exactly
   * like one export offered twice.
   */
  it("is a collision when the two declarations differ, and is never counted as an overlap", () => {
    const standing = standingBySpecifier([
      door("@invented/a", [symbol("horizonOf", "horizonOf(window: Window): string | null")]),
      door("@invented/b", [symbol("horizonOf", "horizonOf(policy: Policy): string | null")]),
    ])

    expect(standing.get("@invented/a")?.collisions).toEqual([
      { name: "horizonOf", specifier: "@invented/b", slug: "b" },
    ])
    expect(standing.get("@invented/a")?.sharedWith).toEqual([])
  })

  it("is a collision when the two doors give it different kinds under one signature", () => {
    const standing = standingBySpecifier([
      door("@invented/a", [{ ...symbol("Journal", "type Journal = { id: string }"), kind: "type" }]),
      door("@invented/b", [
        { ...symbol("Journal", "type Journal = { id: string }"), kind: "interface" },
      ]),
    ])

    expect(standing.get("@invented/a")?.collisions).toEqual([
      { name: "Journal", specifier: "@invented/b", slug: "b" },
    ])
  })

  /**
   * One door can be both at once, which is the shape `@jam-overture/loom/signals`
   * takes against `@jam-overture/loom/telemetry`: they share `ForgetOutcome`, which
   * is the same type, and `horizonOf`, which is not the same function. A rule
   * that let either reading win would say one of two true things and hide the
   * other.
   */
  it("counts the matching names as an overlap and the mismatched one as a collision, at the same door", () => {
    const standing = standingBySpecifier([
      door("@invented/a", [send, symbol("horizonOf", "horizonOf(a: A): string")]),
      door("@invented/b", [send, symbol("horizonOf", "horizonOf(b: B): string")]),
    ])

    expect(standing.get("@invented/a")?.sharedWith).toEqual([
      { specifier: "@invented/b", slug: "b", names: 1 },
    ])
    expect(standing.get("@invented/a")?.collisions).toEqual([
      { name: "horizonOf", specifier: "@invented/b", slug: "b" },
    ])
  })

  it("never names this door as the other one", () => {
    const standing = standingBySpecifier([
      door("@invented/a", [send]),
      door("@invented/b", [send]),
    ])

    expect(standing.get("@invented/a")?.sharedWith.map((other) => other.specifier)).toEqual([
      "@invented/b",
    ])
  })

  it("names every door that has it, rather than the first one found", () => {
    const standing = standingBySpecifier([
      door("@invented/a", [send]),
      door("@invented/c", [send]),
      door("@invented/b", [send]),
    ])

    expect(standing.get("@invented/a")?.sharedWith).toEqual([
      { specifier: "@invented/b", slug: "b", names: 1 },
      { specifier: "@invented/c", slug: "c", names: 1 },
    ])
  })
})

describe("the order of what a page prints", () => {
  /**
   * Sorted, so that reordering the `exports` map in `package.json` does not
   * move a line in the generated file. A diff that shows a band's sentence
   * changing should mean the package's surface changed.
   */
  it("puts collisions in name order, then door order", () => {
    const standing = standingBySpecifier([
      door("@invented/a", [symbol("zip", "zip(a: A): void"), symbol("apex", "apex(a: A): void")]),
      door("@invented/c", [symbol("zip", "zip(c: C): void"), symbol("apex", "apex(c: C): void")]),
      door("@invented/b", [symbol("apex", "apex(b: B): void")]),
    ])

    expect(standing.get("@invented/a")?.collisions).toEqual([
      { name: "apex", specifier: "@invented/b", slug: "b" },
      { name: "apex", specifier: "@invented/c", slug: "c" },
      { name: "zip", specifier: "@invented/c", slug: "c" },
    ])
  })
})
