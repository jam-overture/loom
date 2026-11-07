import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { Outcome } from "@/app/(portal)/_lib/page-history"

import { VersionCard } from "./version-card"

const HELPED: Outcome = {
  label: "Helped",
  tone: "good",
  lines: ["Readers did it more often after the change."],
  detail: ["z = 3.10, p = 0.002"],
}

const SITE: Outcome = {
  label: "Not a Loom change",
  tone: "plain",
  lines: ["Loom judges only the changes it made, so this one gets no verdict."],
}

describe("a version on a page's History", () => {
  it("leads a Loom change with its verdict and goal, and links to its timeline", () => {
    render(
      <ul>
        <VersionCard
          heading="Version 3: Removes the banner."
          lines={[]}
          origin="Loom change, accepted by ana@example.com · live 1 October 2026"
          goal="Start pressed"
          outcome={HELPED}
          timeline="/portal/prj_a/review/accepted/p_1"
          dashed={false}
        />
      </ul>
    )

    expect(screen.getByText("Helped")).toBeDefined()
    expect(screen.getByText("Goal: Start pressed")).toBeDefined()
    expect(screen.getByRole("link", { name: "Follow it from Accept" }).getAttribute("href")).toBe(
      "/portal/prj_a/review/accepted/p_1"
    )
    expect(screen.getByText("How the verdict was reached")).toBeDefined()
  })

  it("draws the site's own edit with no goal chip, no timeline and no test", () => {
    render(
      <ul>
        <VersionCard
          heading="Your site published a newer version of this page"
          lines={[]}
          origin="Your site's own edit · published 1 October 2026"
          outcome={SITE}
          dashed={false}
        />
      </ul>
    )

    expect(screen.getByText("Not a Loom change")).toBeDefined()
    expect(screen.queryByText(/^Goal:/u)).toBeNull()
    expect(screen.queryByRole("link")).toBeNull()
    expect(screen.queryByText("How the verdict was reached")).toBeNull()
  })

  it("dashes a change not live yet", () => {
    render(
      <ul>
        <VersionCard
          heading="Version 4: Removes the banner."
          lines={[]}
          origin="Loom change · accepted 4 October 2026"
          goal={null}
          outcome={{ label: "Waiting for your site to pull", tone: "plain", lines: [] }}
          timeline="/portal/prj_a/review/accepted/p_2"
          dashed
        />
      </ul>
    )

    expect(screen.getByRole("listitem").className).toContain("border-dashed")
    expect(screen.getByText("No goal named")).toBeDefined()
  })
})
