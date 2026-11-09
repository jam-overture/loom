import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { NextLookLine } from "./next-look-line"

const NOW = Date.parse("2026-11-09T01:20:00Z")

describe("the line saying when Loom next looks", () => {
  it("says when, by the clock and from now, keeping the instant for a machine", () => {
    const at = Date.parse("2026-11-09T14:00:00Z")
    const { container } = render(
      <NextLookLine look={{ kind: "scheduled", at }} now={NOW} projectId="prj_a" />
    )

    expect(
      screen.getByText(/^Loom next looks at your pages on .*, in about 13 hours\.$/)
    ).toBeDefined()
    expect(screen.getByText("9 November 2026 at 14:00 UTC")).toBeDefined()
    expect(container.querySelector("time")?.getAttribute("dateTime")).toBe(
      "2026-11-09T14:00:00.000Z"
    )
    expect(screen.queryByRole("link")).toBeNull()
  })

  it("sends a project without a key to Settings", () => {
    render(<NextLookLine look={{ kind: "no-key" }} now={NOW} projectId="prj_a" />)

    expect(screen.getByText(/once this project has a model key/)).toBeDefined()
    expect(screen.getByRole("link", { name: "Settings" }).getAttribute("href")).toBe(
      "/portal/prj_a/settings"
    )
  })

  it("says a key that can no longer be read stops the look, and where to set it again", () => {
    render(<NextLookLine look={{ kind: "key-unreadable" }} now={NOW} projectId="prj_a" />)

    expect(screen.getByText(/model key can no longer be read/)).toBeDefined()
    expect(screen.getByRole("link", { name: "Settings" })).toBeDefined()
  })

  it("names what the deployment is missing when it starts no look at all", () => {
    render(<NextLookLine look={{ kind: "no-schedule" }} now={NOW} projectId="prj_a" />)

    expect(screen.getByText(/does not look at your pages by itself/)).toBeDefined()
    expect(screen.getByText("CRON_SECRET")).toBeDefined()
    expect(screen.queryByRole("link")).toBeNull()
  })
})
