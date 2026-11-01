import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { TREE_OPERATIONS, type ElementNode, type LoomNode } from "@jam-overture/loom"

import { manifest } from "../../../../../tools/package/manifest"
import { catalogueOf } from "@jam-overture/loom/sdk"
import { describe, expect, it } from "vitest"

import {
  DECISIONS_AT_LEAST,
  DECISIONS_FLOOR_FRACTION,
  FACTS,
  INSTALL_COMMAND,
  PACKAGES,
} from "./copy"
import { DECISION_RECORDS } from "./docs-pages"
import { pathsLinkedFrom } from "./naming"
import { siteRegistry } from "./registry"
import { treeFor } from "./render"
import { DEFAULT_THEME, HOME, NPM_PACKAGE_URL } from "./site"

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
  elementsOf(treeFor(HOME, { theme: DEFAULT_THEME }).root).filter(
    (element) => element.type === "loom.stat"
  )

const statLabelled = (label: string): ElementNode => {
  const found = statsOfHome().find((stat) => stat.props["label"] === label)

  if (found === undefined) {
    throw new Error(`loom: the front door has no stat labeled "${label}"`)
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
    expect(statLabelled("kinds of change Loom allows").props["value"]).toBe(
      String(TREE_OPERATIONS.length)
    )
  })

  it("never claims more decision records than there are", () => {
    expect(recordsOnDisk().length).toBeGreaterThanOrEqual(DECISIONS_AT_LEAST)
  })

  /**
   * The other side of the same claim, and the one that was missing.
   *
   * The rule above passes more comfortably the further behind the floor falls,
   * so it cannot report the failure it is nearest to: `100+` beside a
   * repository holding 277 records, under a band promising every number is
   * checked. A floor that is never checked for staleness is a number nobody
   * reads again.
   *
   * The bound is loose on purpose. `DECISIONS_FLOOR_FRACTION` says why, and the
   * short version is that every tightening of it is paid for by some other
   * lane's run going red over a digit — which is the 19 August finding, and the
   * thing the floor exists to avoid. So it fires about once per 180 records and
   * says exactly what to type when it does.
   */
  it("never lets the floor fall so far behind that the number stops meaning anything", () => {
    const onDisk = recordsOnDisk().length
    const atLeast = Math.floor(onDisk * DECISIONS_FLOOR_FRACTION)

    expect(
      DECISIONS_AT_LEAST,
      `the front door says "${FACTS.decisions}" and there are ${onDisk} records — raise DECISIONS_AT_LEAST in copy.ts to a round number at or above ${atLeast}`
    ).toBeGreaterThanOrEqual(atLeast)
  })

  /**
   * The press under the number, held to the page that states the number
   * exactly.
   *
   * *Read the decisions* pointed at `decisions/` on GitHub until 19 October — a
   * directory listing of filenames, off this site, one press from a band about
   * what the project writes down. `(docs)` serves the readable index of the
   * same records, so the control stays inside the application (0067) and the
   * reader who wants to know how many there are gets the count rather than a
   * scroll.
   *
   * Asserted against the **published tree**, like the three numbers above: a
   * band that quietly went back to an off-site address would still satisfy
   * `docs-pages.test.ts`, whose sweep only sees the `/docs/` links that are
   * there.
   */
  it("sends a reader from the record count to the page that states it exactly", () => {
    const front = treeFor(HOME, { theme: DEFAULT_THEME })

    expect([...pathsLinkedFrom(front.root, ORIGIN)]).toContain(DECISION_RECORDS.path)
  })

  it("shows the record count as a floor, so adding a record cannot turn this lane red", () => {
    expect(FACTS.decisions).toBe(`${DECISIONS_AT_LEAST}+`)
    expect(statLabelled("decisions written down").props["value"]).toBe(FACTS.decisions)
  })

  it("checks every number the front door shows, so a fourth cannot arrive unchecked", () => {
    expect(statsOfHome().map((stat) => stat.props["label"])).toEqual([
      "ready-made pieces to build with",
      "decisions written down",
      "kinds of change Loom allows",
    ])
  })
})

/**
 * The ask, held against the two manifests the repository publishes from.
 *
 * The install band is the only place on this site where being out of date is
 * not a wording problem: a reader who pastes a line naming a package that does
 * not exist gets an error instead of a library, and nothing on the page or in
 * this lane's own tests would have said so. The names are not typed twice for
 * the reason none of the numbers above are — they are read off the manifests
 * `pnpm publish` uses, so a rename, or a third package becoming required, is
 * red here on the run that does it.
 *
 * It asserts the set rather than the order, because which name comes first in
 * an `npm install` is this lane's call and npm's behavior does not depend on
 * it.
 */
describe("what the site tells a stranger to install", () => {
  const nameOf = (manifest: string): string =>
    JSON.parse(readFileSync(fileURLToPath(new URL(manifest, import.meta.url)), "utf8")).name

  /**
   * The runtime's name is read off its manifest; the library's is read off the
   * **module that authors** its manifest.
   *
   * This read `packages/primitives/package.json` until 12 October, which is
   * gitignored — `.gitignore:23` ignores every package manifest under
   * `packages/` — and assembled by
   * `pnpm package:primitives`. So it passed on a machine that had run the
   * packaging step at some point and failed on every fresh clone, with an
   * `ENOENT` that names a path rather than the reason — and `pnpm verify` does
   * not run that step, so `main` was red for anybody who had not.
   *
   * `tools/package/manifest.ts` is where the name is actually written, and its
   * own comment says it exists to be *"data rather than a file somebody edits
   * by hand"*. Reading it is what this test meant: still not typed twice, still
   * red on the run that renames the package, and no longer dependent on what
   * else the machine has done.
   *
   * `license` and `version` are parameters of that manifest and nothing here
   * asks about either, so both arguments are placeholders rather than claims.
   */
  const published = (): readonly string[] => [
    nameOf("../../../../../package.json"),
    String(manifest({ license: "UNSET", version: "UNSET" }).name),
  ]

  it("names the packages this repository actually publishes", () => {
    expect([...PACKAGES].sort()).toEqual([...published()].sort())
  })

  /**
   * The half of an off-site address that can go wrong without anybody
   * noticing. Whether `npmjs.com` serves the page is a person's check
   * (`routes.test.ts` says why); whether the page it names is *this project's
   * package* is a string this repository already states, so it is held here.
   */
  it("points at the package it publishes, not at a name that used to be ours", () => {
    expect(NPM_PACKAGE_URL).toBe(`https://www.npmjs.com/package/${nameOf("../../../../../package.json")}`)
  })

  it("asks for both of them in one command a reader can paste", () => {
    for (const name of published()) {
      expect(INSTALL_COMMAND).toContain(` ${name}`)
    }

    expect(INSTALL_COMMAND.startsWith("npm install ")).toBe(true)
  })
})
