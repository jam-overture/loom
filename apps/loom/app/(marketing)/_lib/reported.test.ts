import { isInteractiveWith, sequentialIdFactory, type LoomNode } from "@jam-overture/loom"
import { READER_SIGNAL_KINDS, readerSignalBatchSchema } from "@jam-overture/loom/signals"
import { describe, expect, it } from "vitest"

import { AS_BUILT_PAGE } from "./allowed"
import { examplePage } from "./example"
import { siteRegistry } from "./registry"
import { REPORT_CAPTION, REPORT_FIELDS, REPORT_LANGUAGE, THE_REPORT } from "./reported"

/**
 * The panel's text, parsed.
 *
 * Authored as lines and read back as a value, which `reported.ts` argues for at
 * length. Everything below is an assertion over this rather than over the
 * string, so a claim about the report is a claim about what a receiver would
 * see.
 */
const report = (): unknown => JSON.parse(THE_REPORT)

/** Every element of the page the band sits under, with its props. */
const exampleElements = (): readonly { readonly type: string; readonly props: Readonly<Record<string, unknown>> }[] => {
  const found = (node: LoomNode): readonly { readonly type: string; readonly props: Readonly<Record<string, unknown>> }[] =>
    node.kind === "text"
      ? []
      : [
          ...(node.kind === "element" ? [{ type: node.type, props: node.props }] : []),
          ...node.children.flatMap(found),
        ]

  return found(examplePage(sequentialIdFactory("ex")))
}

/** Every key anywhere in a parsed value, deduplicated and sorted. */
const keysIn = (value: unknown): readonly string[] => {
  const walk = (one: unknown): readonly string[] =>
    Array.isArray(one)
      ? one.flatMap(walk)
      : typeof one === "object" && one !== null
        ? Object.entries(one).flatMap(([key, held]) => [key, ...walk(held)])
        : []

  return [...new Set(walk(value))].sort()
}

describe("the report this site prints under what your page reports", () => {
  /**
   * The assertion the whole band rests on. The panel is validated by the same
   * schema the ingest endpoint validates a real delivery with, so what a reader
   * is shown is a report this product would **accept** rather than one that
   * merely looks like one.
   *
   * It has already paid for itself: the first draft of the panel called the
   * correlation key `viewKey`, which is the name of its *type* and not of the
   * field. The schema is `.strict()`, so this went red and named the key.
   */
  it("is a delivery this product would accept", () => {
    const parsed = readerSignalBatchSchema.safeParse(report())

    expect(parsed.success ? [] : parsed.error.issues.map((issue) => issue.message)).toEqual([])
  })

  /**
   * And the reader is checking something. A panel emptied by a bad edit would
   * otherwise fail the schema loudly, but a panel trimmed to one observation
   * would pass every assertion in this file while saying much less — so the
   * shape the band was built for is pinned.
   */
  it("is one visit, two parts and four observations", () => {
    const parsed = readerSignalBatchSchema.parse(report())

    expect(parsed.signals.length).toBe(4)
    expect(new Set(parsed.signals.map((signal) => signal.nodeId)).size).toBe(2)
    expect(parsed.view).toBeDefined()
  })

  /**
   * The copy says the report came from the page one band above it, and this is
   * the half of that a reader cannot check. The band renders `example.ts`'
   * coffee page out of the starter set; a report naming a part that page does
   * not have would be the site inventing data about its own example.
   */
  it("names only parts of the page shown above it", () => {
    const parsed = readerSignalBatchSchema.parse(report())
    const onThePage = new Set(exampleElements().map((element) => element.type))

    expect(parsed.signals.map((signal) => signal.type).filter((type) => !onThePage.has(type))).toEqual([])
  })

  /**
   * **No press, because that page has nothing to press.**
   *
   * `example.ts` carries no control deliberately and gives three reasons for
   * it. So a report from that page cannot honestly contain an `activated`, and
   * the claim is checked from both ends: the registry is asked whether any node
   * on that page renders a target, and the report is held to the answer. The
   * day the example grows a button, this fails and asks for a press to be added
   * to the panel rather than letting the two drift.
   */
  it("reports no press, and the page above has no target to press", () => {
    const targets = exampleElements().filter((element) => {
      const entry = siteRegistry.primitives.find((one) => one.type === element.type)

      return entry?.interactive !== undefined && isInteractiveWith(entry.interactive, element.props)
    })

    expect(targets.map((element) => element.type)).toEqual([])

    const parsed = readerSignalBatchSchema.parse(report())

    expect(parsed.signals.map((signal) => signal.kind).filter((kind) => kind !== "viewed" && kind !== "dwelled")).toEqual([])
  })

  /** Every kind it does name is one the runtime has, rather than one this lane invented. */
  it("names only kinds this product broadcasts", () => {
    const parsed = readerSignalBatchSchema.parse(report())
    const known: readonly string[] = READER_SIGNAL_KINDS

    expect(parsed.signals.map((signal) => signal.kind).filter((kind) => !known.includes(kind))).toEqual([])
  })

  /**
   * The band's closing claim, stated as data: *nothing in it says who was
   * reading, because there is no field for a person.*
   *
   * Pinned from both sides. A field that arrived upstream and named a reader
   * would make this red before it reached the page, and a field removed from
   * the list without being removed from the panel fails too — so the sentence
   * under the panel and the panel itself cannot say different things.
   */
  it("carries no field about the person reading", () => {
    expect(keysIn(report())).toEqual([...REPORT_FIELDS].sort())
  })

  it("says nothing a reader would read as a name, an address or a device", () => {
    for (const word of ["ip", "user", "email", "agent", "cookie", "session", "referrer"]) {
      expect({ word, in: keysIn(report()).includes(word) }).toEqual({ word, in: false })
    }
  })
})

/**
 * The budget this panel is kept to, which is the half that keeps the prose
 * exclusion from being a weakening.
 *
 * `SOURCE_PANEL` in `words.ts` stops counting the contents of a code panel
 * against the copy ledger, and its own note says that argument holds only while
 * **something** bounds each panel. `written.test.ts` is that something for the
 * two source panels; this is it for the one that prints data.
 *
 * Stated in lines and characters, the units a panel is read in. The numbers are
 * literals a little above today's measurement, with the same near-the-ceiling
 * guard `budget.test.ts` puts under its own, so a ceiling cannot be raised
 * quietly and then filled.
 *
 * **No line-length ceiling, and the difference from `written.test.ts` is the
 * point.** Those two panels say `wrap: false`, so a long line scrolls out of a
 * phone's sight and the ceiling is what bounds how far. This one wraps, which
 * `nodes.ts` wrote the prop for: a wrapped line of pretty-printed JSON loses
 * nothing a reader needed. What is bounded here is how much there is, not how
 * wide it is.
 */
describe("the budget this panel is kept to", () => {
  const LINES_IN_THE_PANEL = 16
  const CHARACTERS_IN_THE_PANEL = 700
  const A_CEILING_IS_BINDING_ABOVE = 0.6

  const lines = (): readonly string[] => THE_REPORT.split("\n")

  it("is a report a reader takes in at a glance", () => {
    expect(lines().length).toBeLessThanOrEqual(LINES_IN_THE_PANEL)
    expect(THE_REPORT.length).toBeLessThanOrEqual(CHARACTERS_IN_THE_PANEL)
  })

  it("every ceiling is a ceiling this panel is near", () => {
    const nearest: Readonly<Record<string, readonly [number, number]>> = {
      "the panel's lines": [lines().length, LINES_IN_THE_PANEL],
      "the panel's characters": [THE_REPORT.length, CHARACTERS_IN_THE_PANEL],
    }

    for (const [what, [measured, ceiling]] of Object.entries(nearest)) {
      expect(
        measured / ceiling,
        `${what}: ${measured} against a ceiling of ${ceiling} — either the ceiling is too high to mean anything, or the panel it was set for is gone`
      ).toBeGreaterThanOrEqual(A_CEILING_IS_BINDING_ABOVE)
    }
  })

  /**
   * One observation per line, which is why the panel is read at a glance and is
   * the one formatting decision a later run is most likely to undo by reaching
   * for a pretty-printer. `JSON.stringify(…, null, 2)` turns these four lines
   * into twenty-four.
   */
  it("prints one observation a line", () => {
    const observations = lines().filter((line) => line.includes('"kind"'))

    expect(observations.length).toBe(4)
  })

  /** The chrome of the panel, which is prose and is read as prose everywhere else. */
  it("is captioned and labelled", () => {
    expect(REPORT_CAPTION.length).toBeGreaterThan(0)
    expect(REPORT_LANGUAGE).toBe("json")
  })
})

/**
 * Every part of the built page, by name.
 *
 * `exampleElements` above reads the band's own nodes, which is what the type
 * assertions want and is useless for the names: the band mints its ids from
 * the page builder's factory, so they are `n_why…` and say nothing about the
 * page the report claims to come from. `allowed.ts` builds that page as a tree
 * of its own, from the same arrangement, and those are the names a report off
 * it would really carry.
 */
const partsByName = (): ReadonlyMap<string, string> => {
  const found = new Map<string, string>()
  const walk = (node: LoomNode): void => {
    if (node.kind === "element") found.set(node.id, node.type)
    for (const child of node.kind === "text" ? [] : node.children) walk(child)
  }
  walk(AS_BUILT_PAGE.root)

  return found
}

describe("the names in the report are the page's own", () => {
  /**
   * **The gap this closes, which is three assertions wide.** The rules below
   * hold the report to naming types the page renders, to carrying no field
   * about a person, and to reporting no press. All three passed while two of
   * the panel's four observations named a part that is not on the page, and
   * one of the two named the heading's *words* rather than any part at all.
   *
   * A name a stranger cannot check is still a name this site has to be right
   * about, because the band under this one edits the same parts and a reader
   * who reads both panels is entitled to find the same page in them.
   */
  it("names a part that is really on that page, and names it as that part", () => {
    const parts = partsByName()
    const batch = report() as {
      readonly signals: readonly { readonly nodeId: string; readonly type: string }[]
    }

    expect(
      batch.signals.map(({ nodeId, type }) => ({ nodeId, type, is: parts.get(nodeId) ?? "nothing" }))
    ).toEqual(batch.signals.map(({ nodeId, type }) => ({ nodeId, type, is: type })))
  })

  /** And the page it says it came from is that page. */
  it("is a report from the page the band above renders", () => {
    const batch = report() as { readonly treeId: string; readonly revision: number }

    expect(batch.treeId).toBe(AS_BUILT_PAGE.treeId)
    expect(batch.revision).toBe(AS_BUILT_PAGE.revision)
  })
})
