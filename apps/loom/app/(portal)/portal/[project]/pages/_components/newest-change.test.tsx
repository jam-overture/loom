import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { NewestChange } from "./newest-change"

const HISTORY = "/portal/prj_a/pages/t_home/history"

describe("a page's newest change on the list of pages", () => {
  it("says how the change did and what it was, linking to the page's history", () => {
    render(
      <NewestChange
        newest={{
          outcome: { label: "Helped", tone: "good" },
          what: "Version 3: Removes the banner.",
        }}
        history={HISTORY}
      />
    )

    const link = screen.getByRole("link")

    expect(link.getAttribute("href")).toBe(HISTORY)
    expect(link.textContent).toBe("HelpedVersion 3: Removes the banner.")
  })

  it("names the goal the change served beside its verdict", () => {
    render(
      <NewestChange
        newest={{
          outcome: { label: "Helped", tone: "good" },
          what: "Version 3: Removes the banner.",
          goal: "Sign-ups",
        }}
        history={HISTORY}
      />
    )

    expect(screen.getByText("Goal: Sign-ups")).toBeDefined()
    expect(screen.getByRole("link").textContent).toBe(
      "HelpedGoal: Sign-upsVersion 3: Removes the banner."
    )
  })

  it("says a change raised before proposals named a goal names none", () => {
    render(
      <NewestChange
        newest={{
          outcome: { label: "Too early", tone: "plain" },
          what: "Version 2: Moves Start up.",
          goal: null,
        }}
        history={HISTORY}
      />
    )

    expect(screen.getByText("No goal named")).toBeDefined()
  })

  it("draws no goal chip where none is known, as for the site's own edit", () => {
    render(
      <NewestChange
        newest={{ outcome: { label: "Not a Loom change", tone: "plain" }, what: "Your site" }}
        history={HISTORY}
      />
    )

    expect(screen.queryByText(/^Goal:/)).toBeNull()
    expect(screen.queryByText("No goal named")).toBeNull()
  })

  it("draws a Hurt verdict in the refusing tone", () => {
    render(
      <NewestChange
        newest={{ outcome: { label: "Hurt", tone: "bad" }, what: "Version 2: Moves Start up." }}
        history={HISTORY}
      />
    )

    expect(screen.getByText("Hurt").className).toContain("text-refuse-ink")
  })

  it("says a page nothing has happened to has no change yet, and links nowhere", () => {
    render(<NewestChange newest={undefined} history={HISTORY} />)

    expect(screen.getByText("No change yet")).toBeDefined()
    expect(screen.queryByRole("link")).toBeNull()
  })
})
