import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { TurnedDownLine } from "./turned-down-line"

describe("the line leading to what was turned down", () => {
  it("counts them and links to the list", () => {
    render(<TurnedDownLine count={{ count: 3, more: false }} projectId="prj_a" />)

    expect(screen.getByText(/^Turned down recently: 3/)).toBeDefined()
    expect(screen.getByRole("link", { name: "see them" }).getAttribute("href")).toBe(
      "/portal/prj_a/review/turned-down"
    )
  })

  it("says a count that stopped at the limit is not exact", () => {
    render(<TurnedDownLine count={{ count: 500, more: true }} projectId="prj_a" />)

    expect(screen.getByText(/^Turned down recently: 500 or more/)).toBeDefined()
  })

  it("says none, with nothing to open, when nothing was turned down", () => {
    render(<TurnedDownLine count={{ count: 0, more: false }} projectId="prj_a" />)

    expect(screen.getByText("Turned down recently: none")).toBeDefined()
    expect(screen.queryByRole("link")).toBeNull()
  })
})
