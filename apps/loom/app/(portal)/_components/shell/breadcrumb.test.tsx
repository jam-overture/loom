import { render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { Breadcrumb } from "./breadcrumb"

const location = vi.hoisted(() => ({ pathname: "/portal/prj_shop/signals" }))

vi.mock("next/navigation", () => ({ usePathname: () => location.pathname }))

const answering = (body: unknown) =>
  vi.fn(() => Promise.resolve(new Response(JSON.stringify(body))))

const crumbs = () =>
  within(screen.getByRole("navigation", { name: "Where you are" }))
    .getAllByRole("link")
    .map((link) => [link.textContent, link.getAttribute("href")])

describe("Breadcrumb", () => {
  beforeEach(() => {
    location.pathname = "/portal/prj_shop/signals"
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("names the projects, then the project the screen is about", async () => {
    vi.stubGlobal("fetch", answering({ name: "Shop" }))

    render(<Breadcrumb />)

    await waitFor(() =>
      expect(crumbs()).toEqual([
        ["Projects", "/portal"],
        ["Shop", "/portal/prj_shop/signals"],
      ])
    )
    expect(fetch).toHaveBeenCalledWith(
      "/portal/prj_shop/name",
      expect.objectContaining({ cache: "no-store" })
    )
  })

  it("draws the project's id where its name could not be read, never a guess", async () => {
    for (const body of [{ name: null }, "<!doctype html>"]) {
      vi.stubGlobal("fetch", answering(body))

      const { unmount } = render(<Breadcrumb />)

      await waitFor(() => expect(crumbs()[1]).toEqual(["prj_shop", "/portal/prj_shop/signals"]))
      unmount()
    }
  })

  it("draws the project's id where the read itself failed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("offline")))
    )

    render(<Breadcrumb />)

    await waitFor(() => expect(crumbs()[1]?.[0]).toBe("prj_shop"))
  })

  it("draws no project crumb while the name is being asked", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => undefined))
    )

    render(<Breadcrumb />)

    expect(crumbs()).toEqual([["Projects", "/portal"]])
  })

  it("asks nothing and names only the projects outside a project", () => {
    vi.stubGlobal("fetch", answering({ name: "Shop" }))
    location.pathname = "/portal"

    render(<Breadcrumb />)

    expect(crumbs()).toEqual([["Projects", "/portal"]])
    expect(fetch).not.toHaveBeenCalled()
  })

  it("never labels one project with another's name", async () => {
    vi.stubGlobal("fetch", answering({ name: "Shop" }))

    const { rerender } = render(<Breadcrumb />)

    await waitFor(() => expect(crumbs()[1]?.[0]).toBe("Shop"))

    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => undefined))
    )
    location.pathname = "/portal/prj_blog/signals"
    rerender(<Breadcrumb />)

    expect(crumbs()).toEqual([["Projects", "/portal"]])
  })
})
