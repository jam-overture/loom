import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { PageHeading } from "./page-heading"

describe("a page's heading", () => {
  it("names the page, with its id beneath and the way back to Pages", () => {
    render(<PageHeading projectId="prj_a" pageId="t_home" name="Welcome" />)

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Welcome")
    expect(screen.getByText("t_home")).toBeDefined()
    expect(screen.getByRole("link").getAttribute("href")).toBe("/portal/prj_a/pages")
  })

  it("calls a page that named itself nothing untitled, never by its id alone", () => {
    render(<PageHeading projectId="prj_a" pageId="t_home" name={undefined} />)

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Untitled page")
    expect(screen.getByText("t_home")).toBeDefined()
  })
})
