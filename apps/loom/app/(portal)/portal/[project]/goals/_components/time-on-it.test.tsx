import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { GoalSkims } from "@/app/(portal)/_lib/goals/goal-stay"

import { TimeOnIt } from "./time-on-it"

const NOWHERE: GoalSkims = { counted: 2, skimmed: [] }
const nameOf = (treeId: string) => `/${treeId}`

describe("TimeOnIt", () => {
  it("says the time on screen and the plain verdict on it", () => {
    render(
      <TimeOnIt
        stay={{ kind: "read", spentMs: 1200, standing: "skimmed", skims: NOWHERE }}
        nameOf={nameOf}
      />
    )

    expect(
      screen.getByText("Readers who reached it kept it on screen for 1.2 seconds on average.", {
        exact: false,
      })
    ).toBeTruthy()
    expect(screen.getByText("Too fast to have read it")).toBeTruthy()
  })

  it("draws no verdict it cannot claim", () => {
    const { container } = render(
      <TimeOnIt
        stay={{ kind: "read", spentMs: 3000, standing: "unknown", skims: NOWHERE }}
        nameOf={nameOf}
      />
    )

    expect(container.textContent).toBe(
      "Readers who reached it kept it on screen for 3 seconds on average."
    )
  })

  it("says why there is no time rather than a nought", () => {
    const { container } = render(
      <TimeOnIt
        stay={{ kind: "silent", silence: "unread", skims: { counted: 0, skimmed: [] } }}
        nameOf={nameOf}
      />
    )

    expect(container.textContent).toBe(
      "No time on screen to show: nothing reported a view of this part on any page it stands on."
    )
  })

  it("names the page it is skimmed on beneath the pooled time", () => {
    const { container } = render(
      <TimeOnIt
        stay={{
          kind: "silent",
          silence: "unreadable",
          skims: { counted: 3, skimmed: [{ treeId: "pricing", shortMs: 90_000 }] },
        }}
        nameOf={nameOf}
      />
    )

    expect(container.textContent).toContain(
      "Skimmed on 1 of the 3 pages it is counted on: “/pricing”. Its readers there were short of 2 minutes between them."
    )
  })

  it("says the counters did not answer", () => {
    const { container } = render(<TimeOnIt stay={undefined} nameOf={nameOf} />)

    expect(container.textContent).toBe("Time on screen could not be read just now.")
  })
})
