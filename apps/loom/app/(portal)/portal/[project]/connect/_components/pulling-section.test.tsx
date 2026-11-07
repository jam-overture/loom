import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { PullingSection } from "./pulling-section"

const COMMAND = 'curl --fail-with-body "https://loom.test/api/pages/live"'

describe("whether the site pulls, on Connect your site", () => {
  it("heads the section with the plain answer and keeps the request one click away", () => {
    render(
      <PullingSection pulling={{ kind: "never" }} keeping={{ kind: "keeps" }} command={COMMAND} />
    )

    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
      "Your site is not pulling yet"
    )
    expect(screen.getByText("What your site's server asks for").closest("details")).not.toBeNull()
    expect(screen.getByText(COMMAND).closest("details")).not.toBeNull()
  })

  it("shows this deployment's own site no request, because it never pulls", () => {
    render(
      <PullingSection
        pulling={{ kind: "own-site" }}
        keeping={{ kind: "keeps" }}
        command={COMMAND}
      />
    )

    expect(screen.queryByText(COMMAND)).toBeNull()
    expect(screen.queryByText("What your site's server asks for")).toBeNull()
  })

  it("heads the section with a site that pulls and is not keeping its newest pages", () => {
    render(
      <PullingSection
        pulling={{ kind: "pulling", first: 0, last: 1_000, quiet: false }}
        keeping={{ kind: "not-kept", since: 0 }}
        command={COMMAND}
      />
    )

    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
      "Your site pulls, and is not keeping its newest pages"
    )
  })
})
