import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { runtimeWordsIn } from "@/app/(portal)/_test/plain-language"
import type { CheckupReach } from "@/app/(portal)/_lib/checkup-reach"

import { CheckupInvitation } from "./checkup-invitation"

const reach = (over: Partial<CheckupReach> = {}): CheckupReach => ({
  listed: 4,
  checkable: 4,
  unvouchable: 0,
  unreadable: 0,
  changes: 12,
  complete: true,
  ...over,
})

const disclosureOf = (container: HTMLElement): HTMLDetailsElement => {
  const details = container.querySelector("details")

  expect(details).toBeTruthy()

  return details as HTMLDetailsElement
}

describe("the invitation to check everything", () => {
  /**
   * The whole reason the component exists: the front door had no mention of the
   * one screen in the portal that answers whether the pages being served are the
   * pages the record produces, so nobody opened it.
   */
  it("gives the front door one press that leads to the deployment-wide check", () => {
    render(<CheckupInvitation reach={reach()} />)

    const press = screen.getByRole("link", { name: /Check every page/u })

    expect(press.getAttribute("href")).toBe("/portal/checkup/everything")
  })

  it("asks the question a person has rather than naming the mechanism", () => {
    render(<CheckupInvitation reach={reach()} />)

    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
      "Is everything still accounted for?"
    )
  })

  /**
   * The press is offered in every state, including the one where nothing can be
   * checked — because the sweep is the only screen that names *which* pages it
   * cannot speak for, which makes it the one thing worth pressing there.
   */
  it("still offers the press where nothing can be checked", () => {
    render(<CheckupInvitation reach={reach({ checkable: 0, unvouchable: 4, changes: 0 })} />)

    expect(screen.getByRole("link", { name: /Check every page/u })).toBeTruthy()
  })

  /**
   * Not a `StateNotice`, and the assertion is here rather than in a comment.
   *
   * Every one of that component's tones is an *answer*; this is a question
   * nobody has asked yet. A `settled` box would be reassurance from a check that
   * has not run, which is the confident empty state in its purest form and the
   * thing this whole surface is being rebuilt against.
   */
  it("does not dress an unasked question as a result", () => {
    const { container } = render(<CheckupInvitation reach={reach()} />)

    expect(container.querySelector(".bg-applied")).toBeNull()
    expect(container.querySelector(".border-refuse-edge")).toBeNull()
  })

  /**
   * Nothing on this screen knows when a checkup last ran, because nothing stores
   * a checkup result — the check reads and writes nothing, deliberately. A
   * front door that printed a freshness is the one claim this component must
   * never make, and it is exactly the claim the interface it is modelled on does
   * make.
   */
  it("never claims the check has run", () => {
    const { container } = render(<CheckupInvitation reach={reach()} />)

    const surface = container.textContent ?? ""

    for (const claim of ["just now", "ago", "Last checked", "up to date", "All good"])
      expect(surface, claim).not.toContain(claim)
  })

  it("says what one press would cost, in the number it is made of", () => {
    render(<CheckupInvitation reach={reach({ checkable: 4, changes: 37 })} />)

    expect(screen.getByText(/replays 37 changes across 4 pages/u)).toBeTruthy()
  })

  /**
   * The gap worth the component, on the surface rather than in the disclosure. A
   * page with no starting shape on record is absent from every verdict the portal
   * can give, and a reader who is not told reads the press's promise as covering
   * it.
   */
  it("names the pages a checkup cannot speak for before the press, not after it", () => {
    const { container } = render(
      <CheckupInvitation reach={reach({ checkable: 1, unvouchable: 3, changes: 4 })} />
    )

    const surface = container.textContent ?? ""

    expect(surface).toContain("neither passing nor failing")
    expect(surface.indexOf("neither passing nor failing")).toBeLessThan(
      surface.indexOf("Check every page")
    )
  })

  it("says nothing about a gap that is not real", () => {
    const { container } = render(<CheckupInvitation reach={reach()} />)

    expect(container.querySelector("ul")).toBeNull()
  })

  /**
   * One click, never further, and never *nothing*. The runtime's own account of
   * the same join — the seed, the fold, the snapshot, the summed revisions — is
   * behind the disclosure and on the screen, which is the pair that makes
   * "nothing is ever removed" a property rather than a claim.
   */
  it("keeps the runtime's account one click down rather than dropping it", () => {
    const { container } = render(<CheckupInvitation reach={reach({ unreadable: 1 })} />)

    const details = disclosureOf(container)

    expect(details.open).toBe(false)
    expect(details.textContent).toContain("seed")
    expect(details.textContent).toContain("auditSnapshot")
    expect(details.textContent).toContain("0028")
  })

  /**
   * The rule, from both ends on one render: every sentence shown unasked is free
   * of the runtime's vocabulary, and the disclosure beside it is full of it.
   */
  it("says nothing unasked that a reader has to already know", () => {
    const { container } = render(
      <CheckupInvitation reach={reach({ checkable: 1, unvouchable: 2, unreadable: 1, changes: 3, complete: false })} />
    )

    const details = disclosureOf(container)
    const unasked = (container.textContent ?? "").replace(details.textContent ?? "", "")

    expect(runtimeWordsIn(unasked), unasked).toEqual([])
    expect(runtimeWordsIn(details.textContent ?? "").length).toBeGreaterThan(0)
  })
})
