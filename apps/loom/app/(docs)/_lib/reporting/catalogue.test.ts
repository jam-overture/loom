import { describe, expect, it } from "vitest"

import {
  diagnosticsFor,
  produceRenderDiagnostics,
  renderDiagnosticCodes,
  type ReportedDiagnostic,
} from "./catalogue"
import { RENDER_DIAGNOSTIC_ORDER, type DiagnosticAudience } from "./codes"

/**
 * Produced once. Twenty-four renders is cheap and resolving four of them is
 * async, so the suite pays for them in one place rather than per assertion.
 */
const reported: readonly ReportedDiagnostic[] = await produceRenderDiagnostics()

const byCode = (code: string): ReportedDiagnostic => {
  const found = reported.find((entry) => entry.code === code)

  if (found === undefined) throw new Error(`no reported diagnostic for ${code}`)

  return found
}

describe("the diagnostics every render can report", () => {
  /**
   * The one assertion that is about completeness rather than about any row.
   *
   * `RECIPES` is a `Record` keyed by the union, so the compiler already refuses
   * a missing recipe. What it cannot see is the reading order, which is a list —
   * so a twenty-fifth diagnostic would compile with a recipe and never be
   * printed. This is that gap closed.
   */
  it("reads every code the runtime's union declares, once", () => {
    expect(new Set(RENDER_DIAGNOSTIC_ORDER).size).toBe(RENDER_DIAGNOSTIC_ORDER.length)
    expect([...RENDER_DIAGNOSTIC_ORDER].sort()).toEqual([...renderDiagnosticCodes()].sort())
    expect(reported.map((entry) => entry.code)).toEqual(RENDER_DIAGNOSTIC_ORDER)
  })

  it("produces each one by rendering something that causes it", () => {
    for (const entry of reported) {
      expect(entry.line, entry.code).not.toBe("")
    }
  })

  /**
   * The sentence is the runtime's own, which is the whole claim of the page, and
   * the cheapest way to hold it is that it names the thing it is about. A
   * paraphrase typed in this file would pass the assertion above and fail this
   * one for the codes that carry a name.
   */
  it("prints the runtime's sentence, which names the node it happened at", () => {
    for (const entry of reported) {
      expect(entry.line, entry.code).toMatch(/node |an excerpt|this render/)
    }
  })

  it("splits into the three audiences, and every row has one", () => {
    const tree = diagnosticsFor(reported, "tree")
    const wiring = diagnosticsFor(reported, "wiring")
    const component = diagnosticsFor(reported, "component")

    expect(tree.length + wiring.length + component.length).toBe(reported.length)
    expect(tree.length).toBeGreaterThan(0)
    expect(wiring.length).toBeGreaterThan(0)
    expect(component.length).toBeGreaterThan(0)
  })

  /**
   * Reading order is audience order, and a page that grouped by audience while
   * printing in another order would put a heading over rows that are not under
   * it. Held here rather than in the component, because the order is this
   * file's claim.
   */
  it("keeps each audience's rows together", () => {
    const audiences = reported.map((entry) => entry.audience)
    const firstAt = (audience: DiagnosticAudience): number => audiences.indexOf(audience)
    const lastAt = (audience: DiagnosticAudience): number => audiences.lastIndexOf(audience)

    for (const audience of ["tree", "wiring", "component"] as const) {
      expect(lastAt(audience) - firstAt(audience), audience).toBe(
        audiences.filter((each) => each === audience).length - 1
      )
    }
  })
})

describe("the rows a reader is most likely to arrive on", () => {
  /**
   * The four the site has named since *Rendering a tree* was written. They are
   * asserted individually because they are the four whose sentence that page
   * quotes, and a renamed code there would otherwise only show up as a missing
   * row in a list of twenty-four.
   */
  it("names the unregistered primitive and the subtree it omitted", () => {
    expect(byCode("unknown-primitive").line).toContain("no primitive is registered for")
    expect(byCode("unknown-primitive").line).toContain("subtree were omitted")
  })

  it("names the schema the props failed and the issue that failed it", () => {
    expect(byCode("invalid-props").line).toContain("does not satisfy the props declared by")
    expect(byCode("invalid-props").line).toContain("level")
  })

  it("says the props went unchecked rather than that they were refused", () => {
    expect(byCode("props-undeclared").line).toContain("rendered with unchecked props")
  })

  it("says the tree rendered unstyled when the theme could not be resolved", () => {
    expect(byCode("theme-unresolved").line).toContain("rendered unstyled")
  })

  /**
   * The one a reader loses words to, and the only row whose cost is content
   * rather than appearance. Worth an assertion of its own for that reason.
   */
  it("says the dropped region took everything under it", () => {
    expect(byCode("slot-unplaced").line).toContain("sidebar")
    expect(byCode("slot-unplaced").line).toContain("everything under it was dropped")
  })

  it("counts the rows a primitive was given against the rows it drew", () => {
    expect(byCode("data-unshown").line).toMatch(/was answered 2 rows/)
    expect(byCode("data-unshown").line).toContain("showed 1 of them")
  })

  it("tells the absent resolution apart from one built for another tree", () => {
    expect(byCode("data-unresolved").line).toContain("was given no resolution")
    expect(byCode("submit-unresolved").line).toContain("was given no resolution")
  })

  it("names the dictionary key that left a control unnamed", () => {
    expect(byCode("behaviour-unnamed").line).toContain("copied")
    expect(byCode("behaviour-unnamed").line).toContain("the control was left out")
  })

  it("says an excerpt of a node that is gone rendered nothing", () => {
    expect(byCode("excerpt-absent").line).toContain("nothing was rendered")
  })
})
