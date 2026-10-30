import { describe, expect, it } from "vitest"

import { importLineFor, importsBinding, importsIn, namesBoundByImportsIn } from "./imports"

/**
 * **An import is what it binds, not what it says.**
 *
 * The rules with a wrong answer, held against code written to exercise them.
 * The one that would do real damage is the last in the first block: a name
 * mentioned in a string read as an import would mark a reader as having been
 * shown a door they were never shown, which is the direction both callers care
 * about.
 */

describe("whether a block shows an import", () => {
  const shows = (name: string, code: string) => importsBinding(name, code, "ts")

  it("sees a named import", () => {
    expect(shows("createTree", 'import { createTree } from "@jam-overture/loom"')).toBe(true)
  })

  it("matches what the line binds rather than what it says", () => {
    expect(shows("make", 'import { createTree as make } from "@jam-overture/loom"')).toBe(true)
    expect(shows("createTree", 'import { createTree as make } from "@jam-overture/loom"')).toBe(false)
  })

  it("sees a default and a namespace import", () => {
    expect(shows("Anthropic", 'import Anthropic from "@anthropic-ai/sdk"')).toBe(true)
    expect(shows("loom", 'import * as loom from "@jam-overture/loom"')).toBe(true)
  })

  it("sees a type-only import, because a type a reader pastes has to resolve too", () => {
    expect(shows("LoomTree", 'import type { LoomTree } from "@jam-overture/loom"')).toBe(true)
  })

  it("is not fooled by the name appearing in the code", () => {
    expect(shows("createTree", "const tree = createTree(ids)")).toBe(false)
    expect(shows("createTree", 'const name = "createTree"')).toBe(false)
  })

  it("reads a tsx block as tsx", () => {
    expect(importsBinding("Stat", 'import { Stat } from "./stat"\n\nconst a = <Stat x={1} />', "tsx")).toBe(true)
  })
})

describe("the doors a block opens", () => {
  const doors = (code: string) => importsIn(code, "ts")

  it("gives each name the door it came through, as the block writes it", () => {
    expect(doors('import { createTree, buildElement } from "@jam-overture/loom"')).toEqual([
      { name: "createTree", specifier: "@jam-overture/loom", isType: false, form: "named" },
      { name: "buildElement", specifier: "@jam-overture/loom", isType: false, form: "named" },
    ])
  })

  it("reads a type-only import as one, whichever side the keyword is on", () => {
    expect(doors('import type { LoomTree } from "@jam-overture/loom"')[0]?.isType).toBe(true)
    expect(doors('import { type LoomTree } from "@jam-overture/loom"')[0]?.isType).toBe(true)
  })

  it("names a default import whatever the block called it", () => {
    expect(doors('import postgres from "postgres"')).toEqual([
      { name: "postgres", specifier: "postgres", isType: false, form: "default" },
    ])
  })

  it("reads a default and its named siblings off one line", () => {
    expect(doors('import React, { useState } from "react"').map((door) => door.name)).toEqual([
      "React",
      "useState",
    ])
  })

  /*
   * A side-effect import binds nothing, so it is not a door a reader can call
   * anything through — and a block that opens with one is not thereby excused
   * from showing the imports it actually uses.
   */
  it("finds nothing in an import that binds nothing", () => {
    expect(doors('import "./globals.css"')).toEqual([])
  })

  it("is the names, and nothing a block declares for itself", () => {
    expect(namesBoundByImportsIn('import { createTree } from "@jam-overture/loom"\nconst tree = createTree()', "ts")).toEqual(
      new Set(["createTree"])
    )
  })
})

describe("the line that would bind a name", () => {
  const line = (code: string) => importLineFor(importsIn(code, "ts")[0]!)

  it("writes a named import back as a named import", () => {
    expect(line('import { createTree } from "@jam-overture/loom"')).toBe(
      'import { createTree } from "@jam-overture/loom"'
    )
  })

  /*
   * The one a sentence gets wrong by assuming. `import { postgres } from
   * "postgres"` is not a line that works, and a check printing it would be
   * telling a reader to write something broken.
   */
  it("writes a default import back without braces", () => {
    expect(line('import postgres from "postgres"')).toBe('import postgres from "postgres"')
  })

  it("writes a namespace import back with its star", () => {
    expect(line('import * as loom from "@jam-overture/loom"')).toBe(
      'import * as loom from "@jam-overture/loom"'
    )
  })

  it("keeps the type keyword, because a type a reader pastes has to resolve too", () => {
    expect(line('import type { LoomTree } from "@jam-overture/loom"')).toBe(
      'import type { LoomTree } from "@jam-overture/loom"'
    )
  })

  it("takes the name after `as`, which is the name the reader would call", () => {
    expect(line('import { createTree as make } from "@jam-overture/loom"')).toBe(
      'import { make } from "@jam-overture/loom"'
    )
  })
})
