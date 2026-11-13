import { fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { FeatureSearch } from "./feature-search"

const location = vi.hoisted(() => ({ pathname: "/portal/prj_shop/signals" }))
const push = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({
  usePathname: () => location.pathname,
  useRouter: () => ({ push }),
}))

const box = () => screen.getByRole("combobox", { name: "Search the portal" })
const type = (query: string) => fireEvent.change(box(), { target: { value: query } })
const press = (key: string) => fireEvent.keyDown(box(), { key })
const answers = () =>
  within(screen.getByRole("listbox", { name: "Found in the portal" }))
    .queryAllByRole("option")
    .map((option) => [
      within(option).getByRole("link").getAttribute("href"),
      option.getAttribute("aria-selected"),
    ])

describe("FeatureSearch", () => {
  beforeEach(() => {
    location.pathname = "/portal/prj_shop/signals"
    push.mockClear()
  })

  it("opens nothing until something is typed", () => {
    render(<FeatureSearch />)

    expect(box().getAttribute("aria-expanded")).toBe("false")
    expect(screen.queryByRole("listbox")).toBeNull()
  })

  it("lists the features that answer, as links into the project in the address", () => {
    render(<FeatureSearch />)
    type("anthropic")

    expect(box().getAttribute("aria-expanded")).toBe("true")
    expect(answers()).toEqual([["/portal/prj_shop/settings#model-key", "false"]])
    expect(screen.getByText("Model key")).toBeTruthy()
    expect(screen.getByText("· on Settings")).toBeTruthy()
  })

  it("draws only the answers to what is typed now, where two answers share a screen", () => {
    render(<FeatureSearch />)
    type("signals")
    expect(answers().map(([href]) => href)).toContain("/portal/prj_shop/signals")

    type("api key")
    expect(answers()).toEqual([["/portal/prj_shop/settings#model-key", "false"]])
  })

  it("moves through the answers with the arrow keys and opens the marked one with Enter", () => {
    render(<FeatureSearch />)
    type("goal")

    press("ArrowDown")
    press("ArrowDown")
    expect(answers()).toEqual([
      ["/portal/prj_shop/goals", "false"],
      ["/portal/prj_shop/goals?goal=new", "true"],
      ["/portal/prj_shop/signals/pages", "false"],
    ])
    expect(box().getAttribute("aria-activedescendant")).toBe(
      screen.getAllByRole("option")[1]?.getAttribute("id")
    )

    press("Enter")
    expect(push).toHaveBeenCalledWith("/portal/prj_shop/goals?goal=new")
  })

  it("opens the best answer with Enter when none is marked", () => {
    render(<FeatureSearch />)
    type("turned down")
    press("Enter")

    expect(push).toHaveBeenCalledWith("/portal/prj_shop/review/turned-down")
  })

  it("empties with Escape", () => {
    render(<FeatureSearch />)
    type("goal")
    press("Escape")

    expect((box() as HTMLInputElement).value).toBe("")
    expect(screen.queryByRole("listbox")).toBeNull()
  })

  it("says where to look for data when no feature goes by the words typed", () => {
    render(<FeatureSearch />)
    type("checkout button")
    press("Enter")

    expect(answers()).toEqual([])
    expect(screen.getByText(/use the Find on that screen/u)).toBeTruthy()
    expect(push).not.toHaveBeenCalled()
  })

  it("outside a project, counts a project's features rather than linking nowhere", () => {
    location.pathname = "/portal"
    render(<FeatureSearch />)
    type("goal")

    expect(answers()).toEqual([])
    expect(screen.getByText(/3 more answers are inside a project/u)).toBeTruthy()
  })

  it("is reached with / from anywhere a person is not typing", () => {
    render(
      <>
        <FeatureSearch />
        <textarea aria-label="notes" />
      </>
    )

    fireEvent.keyDown(document.body, { key: "/" })
    expect(document.activeElement).toBe(box())

    const notes = screen.getByRole("textbox", { name: "notes" })
    notes.focus()
    fireEvent.keyDown(notes, { key: "/" })
    expect(document.activeElement).toBe(notes)
  })

  it("on a phone is the word Search until pressed, then the box, until closed", () => {
    render(<FeatureSearch />)
    const field = box().parentElement!

    expect(field.className).toMatch(/^hidden /u)

    fireEvent.click(screen.getByRole("button", { name: "Search" }))
    expect(field.className).toMatch(/^bg-surface-topbar fixed/u)
    expect(document.activeElement).toBe(box())

    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    expect(field.className).toMatch(/^hidden /u)
  })
})
