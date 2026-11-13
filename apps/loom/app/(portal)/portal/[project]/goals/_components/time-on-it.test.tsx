import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { TimeOnIt } from "./time-on-it"

describe("TimeOnIt", () => {
  it("says the time on screen and the plain verdict on it", () => {
    render(<TimeOnIt stay={{ kind: "read", spentMs: 1200, standing: "skimmed" }} />)

    expect(
      screen.getByText("Readers who reached it kept it on screen for 1.2 seconds on average.", {
        exact: false,
      })
    ).toBeTruthy()
    expect(screen.getByText("Too fast to have read it")).toBeTruthy()
  })

  it("draws no verdict it cannot claim", () => {
    const { container } = render(
      <TimeOnIt stay={{ kind: "read", spentMs: 3000, standing: "unknown" }} />
    )

    expect(container.textContent).toBe(
      "Readers who reached it kept it on screen for 3 seconds on average."
    )
  })

  it("says why there is no time rather than a nought", () => {
    const { container } = render(<TimeOnIt stay={{ kind: "silent", silence: "unread" }} />)

    expect(container.textContent).toBe(
      "No time on screen to show: nothing reported a view of this part on any page it stands on."
    )
  })

  it("says the counters did not answer", () => {
    const { container } = render(<TimeOnIt stay={undefined} />)

    expect(container.textContent).toBe("Time on screen could not be read just now.")
  })
})
