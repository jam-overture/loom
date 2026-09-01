import { readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { catalogueOf } from "@loom/runtime/sdk"
import type { ElementNode, LoomNode } from "@loom/runtime"
import { describe, expect, it } from "vitest"

import { DECISIONS_AT_LEAST, DELTA_OPERATIONS, FACTS } from "./copy"
import { siteRegistry } from "./registry"
import { treeFor } from "./render"
import { DEFAULT_THEME, HOME } from "./site"

/**
 * The numbers on the page, held against the thing they are about.
 *
 * A marketing site claiming "37 primitives" is worth nothing if the number is
 * something someone typed once. Until 27 August that was answered by typing the
 * number and asserting it, which made the claim true and made this file
 * something **three other lanes were structurally required to edit**: a run that
 * registered a primitive or wrote a decision record left the marketing site red
 * and had to come and change a digit to get `pnpm verify` green. That happened
 * six times in seven days across three lanes, and it is the 19 August finding.
 *
 * So two of the three are now counted rather than typed, and what is asserted
 * here changes with them. The assertions that matter are no longer "the literal
 * equals the count" — that is a tautology once the literal is gone — but:
 *
 * - **the page shows the counted number**, so nothing types one back into a
 *   page tree;
 * - **the claims beside the numbers are still true**, which is the thing a
 *   count moving on its own could quietly break;
 * - **the one number that cannot be counted is never overstated.**
 */

const ORIGIN = "https://loom.example"

const elementsOf = (node: LoomNode): readonly ElementNode[] => [
  ...(node.kind === "element" ? [node] : []),
  ...(node.kind === "text" ? [] : node.children.flatMap(elementsOf)),
]

/** Every `loom.stat` on the front door as published, in the order it is offered. */
const statsOfHome = (): readonly ElementNode[] =>
  elementsOf(treeFor(HOME, { origin: ORIGIN, theme: DEFAULT_THEME }).root).filter(
    (element) => element.type === "loom.stat"
  )

const statLabelled = (label: string): ElementNode => {
  const found = statsOfHome().find((stat) => stat.props["label"] === label)

  if (found === undefined) {
    throw new Error(`loom: the front door has no stat labelled "${label}"`)
  }

  return found
}

const recordsOnDisk = (): readonly string[] => {
  const decisions = fileURLToPath(new URL("../../../../../decisions", import.meta.url))

  return readdirSync(decisions).filter((entry) => entry.endsWith(".md") && entry !== "README.md")
}

describe("what the site says about the repository", () => {
  it("shows as many ready-made pieces as the registry it renders with holds", () => {
    expect(FACTS.primitives).toBe(String(catalogueOf(siteRegistry).length))
    expect(statLabelled("ready-made pieces to build with").props["value"]).toBe(FACTS.primitives)
  })

  it("counts something rather than nothing, so a broken registry cannot read as a zero", () => {
    expect(Number(FACTS.primitives)).toBeGreaterThan(0)
    expect(FACTS.primitives).toMatch(/^\d+$/)
  })

  it("names the four kinds of change its caption says are the whole list", () => {
    expect([...DELTA_OPERATIONS].sort()).toEqual(["configure", "insert", "move", "remove"])
  })

  it("shows as many kinds of change as there are", () => {
    expect(FACTS.operations).toBe(String(DELTA_OPERATIONS.length))
    expect(statLabelled("kinds of change there are").props["value"]).toBe(FACTS.operations)
  })

  it("never claims more decision records than there are", () => {
    expect(recordsOnDisk().length).toBeGreaterThanOrEqual(DECISIONS_AT_LEAST)
  })

  it("shows the record count as a floor, so adding a record cannot turn this lane red", () => {
    expect(FACTS.decisions).toBe(`${DECISIONS_AT_LEAST}+`)
    expect(statLabelled("decisions written down").props["value"]).toBe(FACTS.decisions)
  })

  it("checks every number the front door shows, so a fourth cannot arrive unchecked", () => {
    expect(statsOfHome().map((stat) => stat.props["label"])).toEqual([
      "ready-made pieces to build with",
      "decisions written down",
      "kinds of change there are",
    ])
  })
})
