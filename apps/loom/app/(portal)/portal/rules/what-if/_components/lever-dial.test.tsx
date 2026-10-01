import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { defaultGatePolicy } from "@jam-overture/loom"

import { leversFor, WHAT_IF_PATH, type Addressed, type Lever } from "@/app/(portal)/_lib/levers"
import { runtimeWordsIn } from "@/app/(portal)/_test/plain-language"
import { surfaceOf } from "@/app/(portal)/_test/rendered"

import { LeverDial } from "./lever-dial"

const leversAt = (params: Addressed = {}): readonly Lever[] => leversFor(defaultGatePolicy, params)

const dial = (id: string, params: Addressed = {}) => {
  const levers = leversAt(params)
  const lever = levers.find((entry) => entry.id === id)
  if (lever === undefined) throw new Error(`no lever ${id}`)

  return render(<LeverDial lever={lever} levers={levers} />)
}

describe("one dial", () => {
  it("asks a question rather than naming a field", () => {
    const { container } = dial("sure-to-act")

    expect(surfaceOf(container)).toContain("How sure must Loom be")
    expect(surfaceOf(container)).not.toContain("minimumConfidence")
  })

  it("reads plainly", () => {
    const { container } = dial("allow-visitor")

    expect(runtimeWordsIn(surfaceOf(container))).toEqual([])
  })

  /**
   * A link to the screen you are already on is a promise that something will
   * happen. The position you are on is text, and it carries `aria-current` so
   * the answer is the same for a reader using a screen reader.
   */
  it("does not link to where the reader already is", () => {
    const { container } = dial("sure-to-act")
    const here = container.querySelector('[data-position="chosen"]')

    expect(here?.tagName).toBe("SPAN")
    expect(here?.getAttribute("aria-current")).toBe("true")
    expect(here?.closest("a")).toBeNull()
  })

  it("links every other position to an address carrying it", () => {
    const { container } = dial("sure-to-act")
    const links = Array.from(container.querySelectorAll("a"))

    expect(links.length).toBeGreaterThan(2)
    expect(links.every((link) => link.getAttribute("href")?.startsWith(WHAT_IF_PATH))).toBe(true)
    expect(links.some((link) => link.getAttribute("href")?.includes("sure-to-act=0.5"))).toBe(true)
  })

  /**
   * The deployment's own value keeps its mark however far the dial has been
   * dragged. A screen where the current setting becomes indistinguishable from
   * the hypotheticals the moment you touch it is one where a person loses the
   * thing they came in with — and getting back is the most likely next thing
   * they want.
   */
  it("keeps the deployment's own value marked after the dial has moved", () => {
    const { container } = dial("sure-to-act", { "sure-to-act": "0.5" })

    expect(container.querySelector('[data-position="yours"]')?.textContent).toContain("yours")
    expect(container.querySelector('[data-position="chosen"]')?.textContent).not.toContain("yours")
  })

  it("marks the one position that is both at once", () => {
    const { container } = dial("sure-to-act")

    expect(container.querySelector('[data-position="yours"]')).toBeNull()
    expect(container.querySelector('[data-position="chosen"]')?.textContent).toContain("yours")
  })

  /**
   * The sentence that keeps a question from reading as a setting. A screen full
   * of dials on a governance surface has to say, at the point of contact, that
   * nothing has been changed — and saying it under the dial that moved is the
   * only place a reader is certainly looking.
   */
  it("says nothing has changed, under the dial that moved and nowhere else", () => {
    expect(surfaceOf(dial("never", { never: "high" }).container)).toContain(
      "Nothing has changed on your site"
    )
    expect(surfaceOf(dial("never").container)).not.toContain("Nothing has changed on your site")
  })

  it("carries the other dials' positions in every link it offers", () => {
    const { container } = dial("sure-to-act", { never: "high" })
    const links = Array.from(container.querySelectorAll("a"))

    expect(links.every((link) => link.getAttribute("href")?.includes("never=high"))).toBe(true)
  })
})
