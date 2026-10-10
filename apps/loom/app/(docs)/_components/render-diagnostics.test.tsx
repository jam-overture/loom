import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { produceRenderDiagnostics } from "@/app/(docs)/_lib/reporting/catalogue"
import { DIAGNOSTIC_AUDIENCES, RENDER_DIAGNOSTIC_ORDER } from "@/app/(docs)/_lib/reporting/codes"

import { NamedDiagnostics, RenderDiagnostics } from "./render-diagnostics"

/**
 * What the block owes a reader once the diagnostics are real.
 *
 * The twenty-four renders are checked beside the code that produces them. What
 * is checked here is the failure a generated block is prone to and nothing else
 * on this site would notice: printing some of what it was handed. A code
 * silently dropped is a fault a reader has no page about, which is the exact
 * state this whole page was written to end.
 *
 * It is the shape of this lane's 2 October finding, applied on purpose: a
 * produced block whose producer is tested and whose printing nothing looked at.
 */

const all = async () => {
  render(await RenderDiagnostics())
}

describe("every diagnostic, as a reader meets them", () => {
  it("shows one card per code, in reading order", async () => {
    await all()

    const cards = document.querySelectorAll("[data-diagnostic]")

    expect([...cards].map((card) => card.getAttribute("data-diagnostic"))).toEqual(
      RENDER_DIAGNOSTIC_ORDER
    )
  })

  it("prints the runtime's own sentence on every one of them", async () => {
    const reported = await produceRenderDiagnostics()

    await all()

    for (const entry of reported) {
      const said = document.querySelector(`[data-said="${entry.code}"]`)

      expect(said?.textContent, `nothing was printed for ${entry.code}`).toBe(entry.line)
    }
  })

  it("gives each one a name a reader could repeat", async () => {
    const reported = await produceRenderDiagnostics()

    await all()

    for (const entry of reported) {
      expect(screen.getByText(entry.title)).toBeDefined()
    }
  })

  /**
   * The grouping is the page's one claim that is not the runtime's, so it is
   * the one most worth holding: three headings, each over the rows that belong
   * under it, and no row outside all three.
   */
  it("draws all three groups, and loses no row between them", async () => {
    await all()

    const groups = document.querySelectorAll("[data-audience-group]")

    expect(groups.length).toBe(DIAGNOSTIC_AUDIENCES.length)

    const grouped = [...groups].flatMap((group) => [...group.querySelectorAll("[data-diagnostic]")])

    expect(grouped.length).toBe(RENDER_DIAGNOSTIC_ORDER.length)

    for (const group of DIAGNOSTIC_AUDIENCES) {
      expect(screen.getByText(group.title), group.audience).toBeDefined()
    }
  })

  it("says how many it drew, so a dropped group is visible in the markup", async () => {
    await all()

    expect(
      document.querySelector("[data-render-diagnostics]")?.getAttribute("data-render-diagnostics")
    ).toBe(String(RENDER_DIAGNOSTIC_ORDER.length))
  })
})

describe("the few an introducing page names", () => {
  it("draws exactly the codes it was given, in the order it gave them", async () => {
    render(await NamedDiagnostics({ codes: ["theme-unresolved", "unknown-primitive"] }))

    const cards = document.querySelectorAll("[data-diagnostic]")

    expect([...cards].map((card) => card.getAttribute("data-diagnostic"))).toEqual([
      "theme-unresolved",
      "unknown-primitive",
    ])
  })

  /**
   * The reason the component throws rather than filtering. A page that names a
   * retired code should stop the build; printing the rows that are left is the
   * page becoming quietly wrong, which is what the catalogue exists to prevent.
   */
  it("refuses a code the catalogue does not have", async () => {
    await expect(
      NamedDiagnostics({ codes: ["theme-unmounted" as never] })
    ).rejects.toThrow(/no such code/)
  })
})
