import { describe, expect, it } from "vitest"

import { ARRIVAL_ROUTE } from "../arrival/route"

import { fencesOnPage, pagesWithFences } from "./extract"
import {
  importsBinding,
  LENT_NAMES,
  lentFaults,
  lentNamesOn,
  lentWithoutFault,
  reExportsIn,
  type LentName,
} from "./lent"
import type { Fence } from "./model"

/**
 * **A name the page calls is a name the page shows you how to get.**
 *
 * `lent.ts` says what went wrong and why a check that compiled every block
 * could not see it. This holds the site to the remedy, and the first `it` below
 * is the one that was red: eleven names on five pages, `gatePolicySchema` among
 * them — the name the arrival route promises a reader will have typed by the
 * end of its last stop.
 */

const CANNOT_CARRY_AN_IMPORT: readonly Fence["kind"][] = ["object-body", "function-body"]

const lent = (over: Partial<LentName> = {}): LentName => ({
  section: "the-runtime",
  page: "what-the-gate-decides",
  name: "gatePolicySchema",
  specifier: "@jam-overture/loom",
  isType: false,
  calledAt: 1,
  demandedAt: 1,
  shownAt: undefined,
  ...over,
})

describe("what a page lends a reader", () => {
  it("has something to check, so this file cannot pass by having nothing to say", () => {
    expect(pagesWithFences().length).toBeGreaterThan(10)
    expect(LENT_NAMES.length).toBeGreaterThan(0)
  })

  it("shows the import for every runtime name a block invites a reader to copy", () => {
    expect(lentFaults(LENT_NAMES)).toEqual([])
  })

  /*
   * The excuse is a fact about the fences, not a sentence in the context file.
   * This is the same shape `arrival/route.ts` gives the pages the route walks
   * past: every one is either a stop or named with a reason something checks.
   */
  it("lends a runtime name only where no block could have carried the import", () => {
    lentWithoutFault(LENT_NAMES).forEach((name) => {
      const callers = fencesOnPage(name.section, name.page).filter((fence) =>
        new RegExp(`\\b${name.name}\\b`).test(fence.code)
      )

      expect(callers.length, `${name.page} lends ${name.name} to nothing`).toBeGreaterThan(0)

      callers.forEach((fence) => {
        expect(
          CANNOT_CARRY_AN_IMPORT,
          `${name.page} lends ${name.name} to a ${fence.kind} block at line ${fence.line}, which could import it`
        ).toContain(fence.kind)
      })
    })
  })

  it("lends nothing no block on its page uses", () => {
    LENT_NAMES.forEach((name) => {
      expect(name.calledAt, `${name.page} lends ${name.name} and no block uses it`).not.toBeUndefined()
    })
  })

  /*
   * The one the defect was found through, and the one worth keeping pointed at
   * the route: a step promises a reader they will have typed a name, so the
   * page it sends them to has to show them the import that makes typing it
   * work. Stated over the route rather than over the lent names, because what
   * makes it matter is the promise and not the mechanism that broke it.
   */
  it("shows the import for every name the arrival route promises a reader will type", () => {
    ARRIVAL_ROUTE.forEach((step) => {
      const [section = "", page = ""] = step.href.replace("/docs/", "").split("/")
      const fences = fencesOnPage(section, page)

      const calls = fences.findIndex(
        (fence) =>
          new RegExp(`\\b${step.checkpoint}\\b`).test(fence.code) &&
          !importsBinding(step.checkpoint, fence.code, fence.language)
      )

      if (calls === -1) return

      const shows = fences.findIndex((fence) => importsBinding(step.checkpoint, fence.code, fence.language))

      expect(
        shows >= 0 && shows <= calls,
        `${step.href} calls ${step.checkpoint} in the block at line ${fences[calls]?.line} and never shows the import`
      ).toBe(true)
    })
  })
})

describe("reading what a context file re-exports", () => {
  const read = (source: string) => reExportsIn(source, "a-page.ts")

  it("reads a named re-export and the door it comes from", () => {
    expect(read('export { renderLoomTree } from "@jam-overture/loom/react"')).toEqual([
      { name: "renderLoomTree", specifier: "@jam-overture/loom/react", isType: false },
    ])
  })

  it("reads a type-only re-export as one, whichever side the keyword is on", () => {
    expect(read('export type { EditIntent } from "@jam-overture/loom"')[0]?.isType).toBe(true)
    expect(read('export { type EditIntent } from "@jam-overture/loom"')[0]?.isType).toBe(true)
  })

  it("takes the name a reader would write, which is the one after `as`", () => {
    expect(read('export { buildElement as build } from "@jam-overture/loom"')[0]?.name).toBe("build")
  })

  it("is not a declaration and not a local export", () => {
    expect(read("export declare const db: Db")).toEqual([])
    expect(read("const db = 1\nexport { db }")).toEqual([])
  })
})

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

describe("the sentence a fault says", () => {
  it("says what a reader would see for a value", () => {
    expect(lentFaults([lent()])[0]).toContain('you get "gatePolicySchema is not defined"')
  })

  it("says what a reader would see for a type, which is a different thing", () => {
    const fault = lentFaults([lent({ name: "LoomTree", isType: true })])[0] ?? ""

    expect(fault).toContain("import type { LoomTree }")
    expect(fault).toContain("does not compile")
    expect(fault).not.toContain("is not defined")
  })

  it("names the block the reader is standing in front of", () => {
    expect(lentFaults([lent({ demandedAt: 3 })])[0]).toContain("block 3")
  })

  it("is silent where the page shows the import first", () => {
    expect(lentFaults([lent({ demandedAt: 2, shownAt: 1 })])).toEqual([])
  })

  it("is silent where no block that could carry an import uses the name", () => {
    expect(lentFaults([lent({ demandedAt: undefined, calledAt: 2 })])).toEqual([])
  })
})

describe("reading one page", () => {
  it("finds nothing lent to a page with no context file", () => {
    expect(lentNamesOn("getting-started", "installation")).toEqual([])
  })

  it("resolves the three the site still lends, each against its own page", () => {
    const names = lentWithoutFault(LENT_NAMES)

    expect(names.map((name) => name.name).sort()).toEqual(
      [...new Set(names.map((name) => name.name))].sort()
    )
    names.forEach((name) => {
      expect(lentNamesOn(name.section, name.page).map((entry) => entry.name)).toContain(name.name)
    })
  })
})
