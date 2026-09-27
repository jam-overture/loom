import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { TREE_OPERATIONS, type ElementNode, type LoomNode } from "@jam-overture/loom"
import { catalogueOf } from "@jam-overture/loom/sdk"
import { describe, expect, it } from "vitest"

import { DECISIONS_AT_LEAST, FACTS } from "./copy"
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
 * **All three are now counted rather than typed**, as of 4 September: the
 * registry count was the last one, and it survived longest because its test
 * compared it with the registry and so never looked wrong — it only made every
 * primitives run come here and change a digit.
 *
 * What is asserted here changes with them. The assertions that matter are no
 * longer "the literal equals the count" — that is a tautology once the literal
 * is gone — but:
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
  /**
   * Against the **page**, not against `FACTS`.
   *
   * This read `expect(FACTS.primitives).toBe(String(catalogueOf(…).length))`
   * while the module held a literal, and that was a real comparison. Now that
   * the module counts the registry, the same line would compare a derivation
   * with itself and pass however the front door was built — which is the exact
   * failure this file's own doc comment warns about, and the reason the other
   * two facts are asserted where a visitor reads them.
   *
   * So the registry count is held against the number **on the published tree**,
   * with `FACTS` out of the path entirely. A band that started spelling its own
   * total fails here.
   */
  it("shows as many ready-made pieces as the registry it renders with holds", () => {
    expect(statLabelled("ready-made pieces to build with").props["value"]).toBe(
      String(catalogueOf(siteRegistry).length)
    )
  })

  /**
   * The coupling this change exists to break, guarded at the only place it can
   * be caught early.
   *
   * The test above compares the page with the registry, and it is the assertion
   * that matters — but it cannot catch a literal *coming back*. Somebody who
   * re-types today's count gets a passing suite, and the failure arrives days
   * later in a primitives run that has no idea why a marketing file is red. That
   * is the whole history of this number: ten bumps in eleven days, none of them
   * by the lane that caused one.
   *
   * So the module is read the way `recordsOnDisk` reads `decisions/` — this file
   * already holds claims against the repository rather than against imports —
   * and the one thing asserted is that the count is not spelled out. Any
   * derivation passes; only a quoted digit fails.
   */
  it("counts the registry rather than spelling the number, so a literal cannot come back", () => {
    const source = readFileSync(fileURLToPath(new URL("./copy.ts", import.meta.url)), "utf8")
    const assignment = /primitives:\s*(.+?),\s*$/m.exec(source)?.[1] ?? ""

    expect(assignment).not.toBe("")
    expect(assignment).not.toMatch(/^["'`]\d+["'`]$/)
    expect(assignment).toContain("REGISTERED_PRIMITIVES")
  })

  it("counts something rather than nothing, so a broken registry cannot read as a zero", () => {
    expect(Number(FACTS.primitives)).toBeGreaterThan(0)
    expect(FACTS.primitives).toMatch(/^\d+$/)
  })

  /**
   * The caption beside this number says *"Add something, remove something, move
   * something, change a setting. That is the whole list."* — a claim about the
   * runtime, so it is held against the runtime's own list rather than against a
   * copy of it kept in this route group.
   */
  it("names the four kinds of change its caption says are the whole list", () => {
    expect([...TREE_OPERATIONS].sort()).toEqual(["configure", "insert", "move", "remove"])
  })

  it("shows as many kinds of change as there are", () => {
    expect(statLabelled("kinds of change there are").props["value"]).toBe(
      String(TREE_OPERATIONS.length)
    )
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
