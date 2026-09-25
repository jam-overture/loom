import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { DispositionKind, StakeFactor, StakeFactorCode } from "@loom/runtime"

import { reasoningOf } from "@/app/(portal)/_lib/refusal"
import { NOTHING_WEIGHED, STAKE_FACTORS, WEIGHING } from "@/app/(portal)/_lib/vocabulary"

import { runtimeWordsIn } from "../_test/plain-language"

import { ChangeReasoning } from "./change-reasoning"

const factor = (code: StakeFactorCode, level: StakeFactor["level"] = "critical"): StakeFactor => ({
  code,
  level,
  detail: `${code} said this, at ${code === "unknown-primitive" ? "n_7" : "n_3"}`,
})

const reasoning = (factors: readonly StakeFactor[], kind: DispositionKind = "rejected") =>
  reasoningOf(kind, "stakes-at-refusal-floor", factors)

/**
 * The altitude, as a property of the DOM rather than of anybody's judgement.
 *
 * Two assertions do most of the work here and they are the pair: every clause is
 * outside the `<details>`, and every one of the runtime's own sentences is inside
 * it. Either alone is satisfiable by a component that shows nothing or by one
 * that shows everything at once, which are the two failures this whole unit
 * exists between.
 */
const disclosureOf = (container: HTMLElement): HTMLElement => {
  const details = container.querySelector("details")

  if (details === null) throw new Error("no disclosure rendered")

  return details as HTMLElement
}

const surfaceTextOf = (container: HTMLElement): string => {
  const clone = container.cloneNode(true) as HTMLElement

  clone.querySelectorAll("details").forEach((details) => details.remove())

  return clone.textContent ?? ""
}

describe("ChangeReasoning", () => {
  it("puts every clause a person reads on the surface", () => {
    const { container } = render(
      <ChangeReasoning
        reasoning={reasoning([factor("unknown-primitive"), factor("shallow-structural-change", "high")])}
      />
    )

    const surface = surfaceTextOf(container)

    expect(surface).toContain(STAKE_FACTORS["unknown-primitive"])
    expect(surface).toContain(STAKE_FACTORS["shallow-structural-change"])
  })

  it("keeps the runtime's own account of each one behind the disclosure, and only there", () => {
    const { container } = render(<ChangeReasoning reasoning={reasoning([factor("unknown-primitive")])} />)

    expect(surfaceTextOf(container)).not.toContain("n_7")
    expect(disclosureOf(container).textContent).toContain("n_7")
    expect(disclosureOf(container).textContent).toContain("unknown-primitive")
  })

  /**
   * The reason code is the one string a reader comparing this against
   * `/portal/rules` can match on, so it has to be there — and it is an identifier,
   * so it has to be down there rather than up here.
   */
  it("names the rule's own code in the record and not on the surface", () => {
    const { container } = render(<ChangeReasoning reasoning={reasoning([factor("large-removal")])} />)

    expect(disclosureOf(container).textContent).toContain("stakes-at-refusal-floor")
    expect(surfaceTextOf(container)).not.toContain("stakes-at-refusal-floor")
  })

  it("says nothing in the runtime's vocabulary on the surface, on any verdict", () => {
    const kinds: readonly DispositionKind[] = ["rejected", "requires-confirmation", "accepted"]

    for (const kind of kinds) {
      const { container } = render(
        <ChangeReasoning reasoning={reasoning([factor("invalid-props"), factor("broad-change", "medium")], kind)} />
      )

      expect(runtimeWordsIn(surfaceTextOf(container))).toEqual([])
    }
  })

  /**
   * One list, three headings. A component that picked its own heading would say
   * *why Loom wouldn't do it* over a change that had just been applied — which is
   * the reading that makes a green panel unreadable.
   */
  it("introduces the clauses by what was decided", () => {
    for (const kind of ["rejected", "requires-confirmation", "accepted"] as const) {
      const { container } = render(<ChangeReasoning reasoning={reasoning([factor("large-removal")], kind)} />)

      expect(surfaceTextOf(container)).toContain(WEIGHING[kind])
    }
  })

  it("orders them worst first, so the most serious is read first", () => {
    const { container } = render(
      <ChangeReasoning
        reasoning={reasoning([
          factor("nested-target", "low"),
          factor("unknown-primitive", "critical"),
          factor("broad-change", "medium"),
        ])}
      />
    )

    const items = [...container.querySelectorAll("li")].map((item) => item.textContent)

    expect(items).toEqual([
      STAKE_FACTORS["unknown-primitive"],
      STAKE_FACTORS["broad-change"],
      STAKE_FACTORS["nested-target"],
    ])
  })

  /**
   * The empty case, which is a real state rather than a defensive branch: the
   * confidence floor fires on what the AI said about itself rather than on
   * anything the change does, so a refusal with no factors at all is ordinary.
   */
  it("says so when nothing about the change itself counted against it", () => {
    const { container } = render(<ChangeReasoning reasoning={reasoning([])} />)

    expect(surfaceTextOf(container)).toContain(NOTHING_WEIGHED.rejected)
    expect(container.querySelectorAll("li")).toHaveLength(0)
  })

  it("still names the rule when nothing was weighed", () => {
    const { container } = render(<ChangeReasoning reasoning={reasoning([])} />)

    expect(disclosureOf(container).textContent).toContain("stakes-at-refusal-floor")
  })

  /**
   * One disclosure and not one per clause. Three controls to open in order to read
   * one account is the shape `TechnicalDetail`'s own note argues against, and it
   * was this component's first draft.
   */
  it("gives the whole record one disclosure, however many clauses there are", () => {
    const { container } = render(
      <ChangeReasoning
        reasoning={reasoning([
          factor("unknown-primitive"),
          factor("invalid-props"),
          factor("broad-change", "medium"),
        ])}
      />
    )

    expect(container.querySelectorAll("details")).toHaveLength(1)
  })

  it("labels each account with the code it belongs to, so the pairing survives", () => {
    render(
      <ChangeReasoning reasoning={reasoning([factor("unknown-primitive"), factor("invalid-props")])} />
    )

    expect(screen.getByText(/unknown-primitive · critical/)).toBeTruthy()
    expect(screen.getByText(/invalid-props · critical/)).toBeTruthy()
  })
})
