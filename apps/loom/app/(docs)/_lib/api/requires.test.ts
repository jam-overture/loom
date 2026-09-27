import { describe, expect, it } from "vitest"

import type { PublishedEntry } from "./extract"
import {
  doorReach,
  packageOf,
  packagesNamedIn,
  packagesReachedFrom,
  peersOf,
  reachFrom,
  requirementsFor,
  type Peers,
  type ReadFile,
} from "./requires"

/**
 * What a page may tell a reader to install.
 *
 * Every test here is over an invented package held in a `Map`, and that is the
 * point rather than a convenience. The claim the band makes — *without this,
 * your import throws* — has to be shown to survive the shapes a real package
 * takes: a barrel four re-exports deep, two files that import each other, a
 * type-only import that is gone by the time the code runs. Arranging any of
 * those in `dist/` would mean breaking the runtime to test a docs page.
 *
 * The one thing measured against the real package is in `extract.test.ts`,
 * where what this produces for Loom's own sixteen doors is held against what
 * the generated file carries.
 */

const files = (entries: Readonly<Record<string, string>>) => (path: string) => entries[path]

describe("the package a specifier belongs to", () => {
  it("keeps the scope on a scoped name", () => {
    expect(packageOf("@anthropic-ai/sdk")).toBe("@anthropic-ai/sdk")
  })

  it("drops a subpath", () => {
    expect(packageOf("drizzle-orm/pg-core")).toBe("drizzle-orm")
    expect(packageOf("@scope/pkg/deep/path")).toBe("@scope/pkg")
  })

  it("leaves a bare name alone", () => {
    expect(packageOf("vitest")).toBe("vitest")
  })
})

describe("the packages a door loads", () => {
  it("follows a re-export as far as it goes", () => {
    const reached = packagesReachedFrom(
      "/dist/door.js",
      files({
        "/dist/door.js": `export * from "./inner/suite.js";`,
        "/dist/inner/suite.js": `import { helper } from "../helper.js"; export const suite = helper;`,
        "/dist/helper.js": `import { describe } from "vitest"; export const helper = describe;`,
      })
    )

    expect([...reached]).toEqual(["vitest"])
  })

  it("visits a file once, so two modules importing each other terminate", () => {
    const reached = packagesReachedFrom(
      "/dist/a.js",
      files({
        "/dist/a.js": `import "./b.js"; import "left-pad";`,
        "/dist/b.js": `import "./a.js";`,
      })
    )

    expect([...reached]).toEqual(["left-pad"])
  })

  it("stops the generator when a relative import is not there", () => {
    expect(() =>
      packagesReachedFrom("/dist/door.js", files({ "/dist/door.js": `export * from "./gone.js";` }))
    ).toThrow(/gone\.js is imported by the built package and is not there/)
  })

  it("reports a package once however many files reach it", () => {
    const reached = packagesReachedFrom(
      "/dist/door.js",
      files({
        "/dist/door.js": `import "./one.js"; import "./two.js";`,
        "/dist/one.js": `import "drizzle-orm";`,
        "/dist/two.js": `import "drizzle-orm/pg-core";`,
      })
    )

    expect([...reached]).toEqual(["drizzle-orm"])
  })
})

describe("how much of the package a door goes through", () => {
  it("counts every file the walk visited, the door's own included", () => {
    const reach = reachFrom(
      "/dist/door.js",
      files({
        "/dist/door.js": `export * from "./a.js"; export * from "./b.js";`,
        "/dist/a.js": `import "./shared.js";`,
        "/dist/b.js": `import "./shared.js";`,
        "/dist/shared.js": `import "zod"; export const shared = 1;`,
      })
    )

    expect(reach.files).toBe(4)
    expect([...reach.packages]).toEqual(["zod"])
  })

  it("counts a file once however many others import it", () => {
    const reach = reachFrom(
      "/dist/door.js",
      files({
        "/dist/door.js": `import "./a.js"; import "./b.js";`,
        "/dist/a.js": `import "./b.js";`,
        "/dist/b.js": `export const b = 1;`,
      })
    )

    expect(reach.files).toBe(3)
  })

  it("is nothing at all for a door with no implementation behind it", () => {
    const reach = doorReach(
      { specifier: "@jam-overture/loom/typesonly", types: "/dist/door.d.ts", runtime: undefined },
      files({ "/dist/door.d.ts": `import type A from "@anthropic-ai/sdk";` })
    )

    expect(reach.files).toBe(0)
    expect([...reach.packages]).toEqual([])
  })
})

describe("the packages a declaration file names", () => {
  it("reads the file itself and follows nothing", () => {
    const named = packagesNamedIn(
      "/dist/door.d.ts",
      files({
        "/dist/door.d.ts": `import type Anthropic from "@anthropic-ai/sdk";\nexport * from "./inner.js";`,
        "/dist/inner.d.ts": `import type { Pool } from "drizzle-orm";`,
      })
    )

    expect([...named]).toEqual(["@anthropic-ai/sdk"])
  })

  it("says nothing about a file that is not there", () => {
    expect([...packagesNamedIn("/dist/gone.d.ts", files({}))]).toEqual([])
  })
})

describe("what a package expects its host to bring", () => {
  it("reads the range, and whether the package can do without it", () => {
    expect(
      peersOf({
        peerDependencies: { vitest: "^3.0.5", react: "^19.0.0" },
        peerDependenciesMeta: { vitest: { optional: true } },
      })
    ).toEqual({
      vitest: { range: "^3.0.5", optional: true },
      react: { range: "^19.0.0", optional: false },
    })
  })

  it("finds none in a package that asks for none", () => {
    expect(peersOf({})).toEqual({})
  })
})

describe("what one door needs", () => {
  const peers: Peers = {
    vitest: { range: "^3.0.5", optional: true },
    "@anthropic-ai/sdk": { range: "^0.115.0", optional: true },
    react: { range: "^19.0.0", optional: false },
  }

  const door = (types: string, runtime: string | undefined): PublishedEntry => ({
    specifier: "@jam-overture/loom/invented",
    types,
    runtime,
  })

  /**
   * The composition the generator performs, named once here as it is named once
   * there: the walk that says what a door loads, the one file that says what it
   * declares, and the rule that turns the two into a list a reader can act on.
   */
  const needsOf = (entry: PublishedEntry, read: ReadFile) =>
    requirementsFor(peers, doorReach(entry, read).packages, packagesNamedIn(entry.types, read))

  it("calls a package the JavaScript loads `loaded`", () => {
    const needs = needsOf(
      door("/dist/door.d.ts", "/dist/door.js"),
      files({ "/dist/door.js": `import "vitest";`, "/dist/door.d.ts": `export declare const a: number;` })
    )

    expect(needs).toEqual([{ package: "vitest", range: "^3.0.5", optional: true, reach: "loaded" }])
  })

  it("calls a package only the declarations name `declared`", () => {
    const needs = needsOf(
      door("/dist/door.d.ts", "/dist/door.js"),
      files({
        "/dist/door.js": `export const adapt = (client) => client;`,
        "/dist/door.d.ts": `import type Anthropic from "@anthropic-ai/sdk";`,
      })
    )

    expect(needs).toEqual([{ package: "@anthropic-ai/sdk", range: "^0.115.0", optional: true, reach: "declared" }])
  })

  it("makes the stronger claim about a package that is both", () => {
    const needs = needsOf(
      door("/dist/door.d.ts", "/dist/door.js"),
      files({
        "/dist/door.js": `import "react";`,
        "/dist/door.d.ts": `import type { ReactNode } from "react";`,
      })
    )

    expect(needs).toEqual([{ package: "react", range: "^19.0.0", optional: false, reach: "loaded" }])
  })

  it("says nothing about a package the host is not asked to bring", () => {
    const needs = needsOf(
      door("/dist/door.d.ts", "/dist/door.js"),
      files({ "/dist/door.js": `import "zod"; import "node:fs";`, "/dist/door.d.ts": `export {};` })
    )

    expect(needs).toEqual([])
  })

  it("lists what it finds in one order whatever order the imports are in", () => {
    const needs = needsOf(
      door("/dist/door.d.ts", "/dist/door.js"),
      files({ "/dist/door.js": `import "vitest"; import "react";`, "/dist/door.d.ts": `export {};` })
    )

    expect(needs.map((requirement) => requirement.package)).toEqual(["react", "vitest"])
  })

  it("leaves a package alone that only something the declarations point at names", () => {
    /**
     * The shallow half of the rule, stated as a test rather than as a comment.
     * A door's own declaration file naming a package is a fact about the door.
     * A file two steps down the type graph naming one is a fact about a type
     * chain, and the store's declarations reach `react` that way.
     */
    const needs = needsOf(
      door("/dist/door.d.ts", "/dist/door.js"),
      files({
        "/dist/door.js": `export const open = () => undefined;`,
        "/dist/door.d.ts": `import type { Suite } from "./deep.js";\nexport declare const open: () => Suite;`,
        "/dist/deep.js": `import "vitest";`,
      })
    )

    expect(needs).toEqual([])
  })

  it("reads the declarations of a door that publishes no implementation", () => {
    const needs = needsOf(
      door("/dist/door.d.ts", undefined),
      files({ "/dist/door.d.ts": `import type Anthropic from "@anthropic-ai/sdk";` })
    )

    expect(needs.map((requirement) => requirement.reach)).toEqual(["declared"])
  })
})
