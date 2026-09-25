import { describe, expect, it } from "vitest"

import type { EntryPoint } from "../entry-points"

import { apiDoorsFor, doorwayOf } from "./doors"
import type { ApiEntry, ApiSymbol } from "./model"
import { standingBySpecifier } from "./standing"

/**
 * The sixteen doors seen together.
 *
 * Over invented packages, for the reason `standing.test.ts` gives: what this
 * page tells a reader is a claim about the *shape* of a package — that its
 * imports do not nest, that almost no pair of them shares a name — and a test
 * that only ever saw Loom's package would pass on a rule that happened to be
 * true of Loom's package today. So the shapes are stated here: a door inside
 * another, a name meaning two things at two doors, a package whose doors all
 * overlap, and a package with one door and nothing to compare it to.
 *
 * The standings are computed by the real measurement rather than written by
 * hand, because a fixture that stated its own standing would be testing this
 * file against a second opinion of what a door publishes.
 */

const symbol = (name: string, signature: string): ApiSymbol => ({
  name,
  kind: "function",
  signature,
  truncated: false,
  summary: "",
})

const send = symbol("send", "send(): void")
const parse = symbol("parse", "parse(text: string): unknown")
const read = symbol("read", "read(): string")
const draw = symbol("draw", "draw(): void")
/** The same name as `read`, declared differently: one name, two things. */
const otherRead = symbol("read", "read(at: number): Uint8Array")

type Door = {
  readonly specifier: string
  readonly symbols: readonly ApiSymbol[]
  readonly audience?: EntryPoint["audience"]
}

const slugOf = (specifier: string): string => specifier.replace(/^@invented\/?/, "") || "root"

/** A package: its entries with real standings, and the site's list of its doors. */
const packageOf = (
  doors: readonly Door[]
): { readonly entries: readonly ApiEntry[]; readonly listed: readonly EntryPoint[] } => {
  const standings = standingBySpecifier(
    doors.map((door) => ({
      specifier: door.specifier,
      slug: slugOf(door.specifier),
      groups: [{ module: "m", title: "M", summary: "", symbols: door.symbols }],
    }))
  )

  return {
    entries: doors.map((door) => ({
      specifier: door.specifier,
      slug: slugOf(door.specifier),
      types: "dist/index.d.ts",
      requires: [],
      files: 1,
      narrower: [],
      standing: standings.get(door.specifier) ?? {
        packageNames: 0,
        otherDoors: 0,
        doorsSharingNothing: 0,
        widest: false,
        sharedWith: [],
        collisions: [],
      },
      groups: [{ module: "m", title: "M", summary: "", symbols: door.symbols }],
    })),
    listed: doors.map((door) => ({
      specifier: door.specifier,
      summary: `What is behind ${door.specifier}.`,
      audience: door.audience ?? "app",
    })),
  }
}

const doorwayFor = (doors: readonly Door[]) => {
  const { entries, listed } = packageOf(doors)

  return doorwayOf(entries, listed)
}

describe("the doors of a package, seen together", () => {
  it("counts names once for the package and twice for the doors", () => {
    const doorway = doorwayFor([
      { specifier: "@invented", symbols: [send, parse] },
      { specifier: "@invented/b", symbols: [send, read] },
    ])

    /* Three names a reader can import, four export slots. The difference is the
       arithmetic a reader does from the rail, and the page prints both. */
    expect(doorway.packageNames).toBe(3)
    expect(doorway.published).toBe(4)
  })

  it("pairs every door with every other, once", () => {
    const doorway = doorwayFor([
      { specifier: "@invented", symbols: [send] },
      { specifier: "@invented/b", symbols: [parse] },
      { specifier: "@invented/c", symbols: [read] },
      { specifier: "@invented/d", symbols: [draw] },
    ])

    expect(doorway.pairs).toBe(6)
    expect(doorway.pairsSharingNothing).toBe(6)
  })

  it("counts a pair that shares nothing once, not once from each side", () => {
    const doorway = doorwayFor([
      { specifier: "@invented", symbols: [send, parse] },
      { specifier: "@invented/b", symbols: [send] },
      { specifier: "@invented/c", symbols: [read] },
    ])

    /* Three pairs. Only the two involving `c` share nothing — and each of those
       is one pair, however many doors report it. */
    expect(doorway.pairs).toBe(3)
    expect(doorway.pairsSharingNothing).toBe(2)
  })

  it("lists an overlapping pair once, widest first", () => {
    const doorway = doorwayFor([
      { specifier: "@invented", symbols: [send, parse, read] },
      { specifier: "@invented/b", symbols: [send, parse] },
    ])

    expect(doorway.overlapping).toEqual([{ a: "@invented", b: "@invented/b", names: 2 }])
  })

  it("orders the overlaps by how much they share", () => {
    const doorway = doorwayFor([
      { specifier: "@invented", symbols: [send, parse, read, draw] },
      { specifier: "@invented/b", symbols: [send, parse] },
      { specifier: "@invented/c", symbols: [read] },
    ])

    expect(doorway.overlapping.map((pair) => pair.b)).toEqual(["@invented/b", "@invented/c"])
  })

  it("says which door is inside another, and of the one that is not", () => {
    const doorway = doorwayFor([
      { specifier: "@invented", symbols: [send, parse, read] },
      { specifier: "@invented/b", symbols: [send, parse] },
      { specifier: "@invented/c", symbols: [read, draw] },
    ])

    const inside = doorway.doors.map((door) => door.insideOf)

    expect(inside).toEqual([undefined, "@invented", undefined])
  })

  it("names a collision once, in rail order, rather than at both doors", () => {
    const doorway = doorwayFor([
      { specifier: "@invented", symbols: [send, read] },
      { specifier: "@invented/b", symbols: [parse, otherRead] },
    ])

    expect(doorway.collisions).toEqual([
      { name: "read", specifiers: ["@invented", "@invented/b"] },
    ])

    /* A name meaning two things is not an overlap: neither door gives a reader
       what the other one does. */
    expect(doorway.overlapping).toEqual([])
    expect(doorway.pairsSharingNothing).toBe(0)
  })

  it("carries the sentence and the audience the site already keeps", () => {
    const doorway = doorwayFor([
      { specifier: "@invented", symbols: [send], audience: "app" },
      { specifier: "@invented/b", symbols: [parse], audience: "host" },
      { specifier: "@invented/cli", symbols: [read], audience: "tooling" },
    ])

    expect(apiDoorsFor(doorway, "host").map((door) => door.specifier)).toEqual(["@invented/b"])
    expect(apiDoorsFor(doorway, "app")[0]?.summary).toBe("What is behind @invented.")
    expect(apiDoorsFor(doorway, "tooling")).toHaveLength(1)
  })

  it("calls every door that ties for the largest surface the widest", () => {
    const doorway = doorwayFor([
      { specifier: "@invented", symbols: [send, parse] },
      { specifier: "@invented/b", symbols: [read, draw] },
    ])

    expect(doorway.doors.filter((door) => door.widest)).toHaveLength(2)
  })

  it("describes a package with one door without comparing it to anything", () => {
    const doorway = doorwayFor([{ specifier: "@invented", symbols: [send, parse] }])

    expect(doorway.pairs).toBe(0)
    expect(doorway.pairsSharingNothing).toBe(0)
    expect(doorway.overlapping).toEqual([])
    expect(doorway.doors[0]?.widest).toBe(true)
  })

  it("refuses a reference with no doors in it at all", () => {
    expect(() => doorwayOf([], [])).toThrow(/no doors/)
  })

  /**
   * The two shapes that mean somebody's generator did not write this file. Both
   * would render as a sentence rather than as a crash — *0 names in all*, or a
   * door with a blank description — and a page printing a number nobody
   * measured is worse than a build that stops.
   */
  it("refuses a door the site has never heard of", () => {
    const { entries, listed } = packageOf([
      { specifier: "@invented", symbols: [send] },
      { specifier: "@invented/b", symbols: [parse] },
    ])

    expect(() => doorwayOf(entries, listed.slice(0, 1))).toThrow(/never heard of/)
  })

  it("refuses two doors that disagree about the size of the package", () => {
    const { entries, listed } = packageOf([
      { specifier: "@invented", symbols: [send] },
      { specifier: "@invented/b", symbols: [parse] },
    ])

    const [first, second] = entries

    if (first === undefined || second === undefined) throw new Error("two doors were made")

    expect(() =>
      doorwayOf(
        [first, { ...second, standing: { ...second.standing, packageNames: 99 } }],
        listed
      )
    ).toThrow(/publishes 99 names/)
  })

  it("refuses a reference where one door believes something another does not", () => {
    const { entries, listed } = packageOf([
      { specifier: "@invented", symbols: [send] },
      { specifier: "@invented/b", symbols: [parse] },
    ])

    const [first, second] = entries

    if (first === undefined || second === undefined) throw new Error("two doors were made")

    expect(() =>
      doorwayOf(
        [first, { ...second, standing: { ...second.standing, doorsSharingNothing: 0 } }],
        listed
      )
    ).toThrow(/every such pair has two sides/)
  })
})
