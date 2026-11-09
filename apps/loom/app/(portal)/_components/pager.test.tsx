import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Pager } from "./pager"

describe("Pager", () => {
  it("says what the page shows and links both ways", () => {
    render(
      <Pager
        span="51–100 of 312 · 05:41 to 06:12 UTC today"
        newer="/list"
        older="/list?before=p_9"
      />
    )

    expect(screen.getByText("51–100 of 312 · 05:41 to 06:12 UTC today")).toBeTruthy()
    expect(screen.getByRole("link", { name: "Newer" }).getAttribute("href")).toBe("/list")
    expect(screen.getByRole("link", { name: "Older" }).getAttribute("href")).toBe(
      "/list?before=p_9"
    )
  })

  it("greys a way that leads nowhere rather than dropping it", () => {
    render(<Pager span={undefined} newer={undefined} older={undefined} />)

    expect(screen.getByText("Newer").getAttribute("aria-disabled")).toBe("true")
    expect(screen.getByText("Older").getAttribute("aria-disabled")).toBe("true")
    expect(screen.queryAllByRole("link")).toHaveLength(0)
  })
})
