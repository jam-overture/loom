import { render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ProjectRail } from "./project-rail"

const location = vi.hoisted(() => ({ pathname: "/portal/prj_shop/signals" }))

vi.mock("next/navigation", () => ({ usePathname: () => location.pathname }))

const answering = (body: unknown) =>
  vi.fn(() => Promise.resolve(new Response(JSON.stringify(body))))

describe("ProjectRail", () => {
  beforeEach(() => {
    location.pathname = "/portal/prj_shop/signals"
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("lists the project's screens in words, with the one the person is on marked", async () => {
    vi.stubGlobal("fetch", answering({ waiting: null }))
    location.pathname = "/portal/prj_shop/pages/t_home"

    render(<ProjectRail projectId="prj_shop" />)

    const rail = screen.getByRole("navigation", { name: "This project" })
    const links = within(rail).getAllByRole("link")

    expect(links.map((link) => link.textContent)).toEqual([
      "Signals",
      "For review",
      "Pages",
      "Goals",
      "Segments",
      "Connect your site",
      "Settings",
    ])
    expect(within(rail).getByRole("link", { current: "page" }).textContent).toBe("Pages")
    await waitFor(() => expect(fetch).toHaveBeenCalled())
  })

  it("says how many changes wait beside For review", async () => {
    vi.stubGlobal("fetch", answering({ waiting: 3 }))

    render(<ProjectRail projectId="prj_shop" />)

    const review = screen.getByRole("link", { name: /For review/u })

    await waitFor(() => expect(review.textContent).toBe("For review3 waiting"))
    expect(fetch).toHaveBeenCalledWith(
      "/portal/prj_shop/review/waiting",
      expect.objectContaining({ cache: "no-store" })
    )
  })

  it("draws no count when nothing waits, or when what waits could not be read", async () => {
    for (const body of [{ waiting: 0 }, { waiting: null }, "<!doctype html>"]) {
      vi.stubGlobal("fetch", answering(body))

      const { unmount } = render(<ProjectRail projectId="prj_shop" />)

      await waitFor(() => expect(fetch).toHaveBeenCalled())
      expect(screen.getByRole("link", { name: /For review/u }).textContent).toBe("For review")
      unmount()
    }
  })

  it("asks again when the person moves to another of the project's screens", async () => {
    vi.stubGlobal("fetch", answering({ waiting: 1 }))

    const { rerender } = render(<ProjectRail projectId="prj_shop" />)

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))

    location.pathname = "/portal/prj_shop/goals"
    rerender(<ProjectRail projectId="prj_shop" />)

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
  })
})
