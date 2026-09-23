import { describe, expect, it } from "vitest"

import type { ApiEntry, ApiSymbol } from "./model"
import { narrowerDoorsBySpecifier, surfaceOf, type DoorFacts } from "./narrower"

/**
 * When one door is another door onto a smaller room.
 *
 * Every test here is over invented doors, for the reason the walk's tests are:
 * the claim this band makes to a reader — *that one gives you the same things
 * and loads less* — has to be shown to survive shapes Loom's own package does
 * not happen to take today. Two doors that each load a subset of the other's
 * packages. Two doors that share a name meaning two different things. A door
 * that publishes nothing at all.
 *
 * Loom has exactly one qualifying pair, and it is measured against the real
 * package in `extract.test.ts`, where what this produces for the sixteen doors
 * is held against what the generated file carries. One pair is not enough
 * evidence for a rule, which is what the invented ones are for.
 */

const symbol = (name: string, signature: string): ApiSymbol => ({
  name,
  kind: "function",
  signature,
  truncated: false,
  summary: "",
})

const door = (
  specifier: string,
  symbols: readonly ApiSymbol[],
  files: number,
  packages: readonly string[]
): DoorFacts => ({
  entry: {
    specifier,
    slug: specifier.replace(/^@invented\//, ""),
    types: `dist/${specifier}.d.ts`,
    requires: [],
    files,
    narrower: [],
    groups: [{ module: "m", title: "M", summary: "", symbols }],
  } satisfies ApiEntry,
  packages: new Set(packages),
})

const send = symbol("send", "send(): void")
const parse = symbol("parse", "parse(text: string): unknown")

describe("a door's surface", () => {
  it("is every export against the declaration the package gives it", () => {
    expect([...surfaceOf(door("@invented/wide", [send, parse], 3, []).entry)]).toEqual([
      ["send", "function send(): void"],
      ["parse", "function parse(text: string): unknown"],
    ])
  })
})

describe("which door a reader should have gone through instead", () => {
  it("finds the one that loads less and publishes a subset", () => {
    const narrower = narrowerDoorsBySpecifier([
      door("@invented/wide", [send, parse], 12, ["zod"]),
      door("@invented/narrow", [send], 4, []),
    ])

    expect(narrower.get("@invented/wide")).toEqual([
      { specifier: "@invented/narrow", slug: "narrow", avoids: ["zod"], shared: 1, files: 4 },
    ])
  })

  it("does not point the other way, from the narrow door to the wide one", () => {
    const narrower = narrowerDoorsBySpecifier([
      door("@invented/wide", [send, parse], 12, ["zod"]),
      door("@invented/narrow", [send], 4, []),
    ])

    expect(narrower.get("@invented/narrow")).toEqual([])
  })

  it("names only the packages the wider door loads and the narrower one does not", () => {
    const narrower = narrowerDoorsBySpecifier([
      door("@invented/wide", [send, parse], 12, ["zod", "react", "drizzle-orm"]),
      door("@invented/narrow", [send], 4, ["react"]),
    ])

    expect(narrower.get("@invented/wide")?.[0]?.avoids).toEqual(["drizzle-orm", "zod"])
  })

  it("leaves alone a door whose exports the wider one does not publish", () => {
    /*
     * This is the half of the rule a reader would feel. `telemetry/postgres`
     * loads a strict subset of `telemetry`'s packages and publishes four names
     * that are none of that door's sixty-four: they are two doors to two
     * different places, and a rule of packages alone would send somebody
     * looking for the journal to the Postgres journal.
     */
    const narrower = narrowerDoorsBySpecifier([
      door("@invented/journal", [send, parse], 12, ["zod", "drizzle-orm"]),
      door("@invented/journal-postgres", [symbol("tables", "tables(): void")], 4, ["drizzle-orm"]),
    ])

    expect(narrower.get("@invented/journal")).toEqual([])
  })

  it("leaves alone a shared name that means two different things", () => {
    const narrower = narrowerDoorsBySpecifier([
      door("@invented/wide", [send, parse], 12, ["zod"]),
      door("@invented/narrow", [symbol("send", "send(to: URL): Promise<void>")], 4, []),
    ])

    expect(narrower.get("@invented/wide")).toEqual([])
  })

  it("leaves alone a door that publishes the same names under a different kind", () => {
    const narrower = narrowerDoorsBySpecifier([
      door("@invented/wide", [send, parse], 12, ["zod"]),
      door("@invented/narrow", [{ ...send, kind: "value" }], 4, []),
    ])

    expect(narrower.get("@invented/wide")).toEqual([])
  })

  it("is not satisfied by two doors that load the same packages", () => {
    /*
     * Equal is not narrower. Following this band has to take something out of
     * a reader's bundle; a pair that loads the same libraries would be a
     * recommendation about taste wearing a measurement's clothes.
     */
    const narrower = narrowerDoorsBySpecifier([
      door("@invented/wide", [send, parse], 40, ["zod"]),
      door("@invented/narrow", [send], 4, ["zod"]),
    ])

    expect(narrower.get("@invented/wide")).toEqual([])
  })

  it("never offers a door with nothing behind it", () => {
    /*
     * The empty set is a subset of every set, so without this the rule would
     * offer a reader an import with no exports as a way to save a package —
     * true, and useless, the way importing nothing at all is true and useless.
     */
    const narrower = narrowerDoorsBySpecifier([
      door("@invented/wide", [send, parse], 12, ["zod"]),
      door("@invented/empty", [], 1, []),
    ])

    expect(narrower.get("@invented/wide")).toEqual([])
  })

  it("lists two narrower doors in one order whatever order the package declares them", () => {
    const wide = door("@invented/wide", [send, parse], 12, ["zod", "react"])
    const b = door("@invented/b", [send], 4, [])
    const a = door("@invented/a", [parse], 5, ["react"])

    expect(narrowerDoorsBySpecifier([wide, b, a]).get("@invented/wide")?.map((d) => d.specifier)).toEqual([
      "@invented/a",
      "@invented/b",
    ])
    expect(narrowerDoorsBySpecifier([wide, a, b]).get("@invented/wide")?.map((d) => d.specifier)).toEqual([
      "@invented/a",
      "@invented/b",
    ])
  })

  it("answers for every door it was given, so a page never reads an absence", () => {
    const narrower = narrowerDoorsBySpecifier([
      door("@invented/wide", [send, parse], 12, ["zod"]),
      door("@invented/narrow", [send], 4, []),
      door("@invented/other", [symbol("other", "other(): void")], 2, ["react"]),
    ])

    expect([...narrower.keys()].sort()).toEqual(["@invented/narrow", "@invented/other", "@invented/wide"])
  })
})
