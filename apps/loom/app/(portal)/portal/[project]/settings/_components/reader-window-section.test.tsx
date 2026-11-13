import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { err, ok } from "@jam-overture/loom"

import { ReaderWindowSection } from "./reader-window-section"

vi.mock("../actions", () => ({ saveReaderWindowAction: vi.fn() }))

const SET_AT = Date.UTC(2026, 10, 13, 21, 30)

describe("How long a reader keeps a page", () => {
  it("offers an owner the four windows, starting on the one the project has", () => {
    render(
      <ReaderWindowSection
        projectId="prj_a"
        owner
        changeable
        kept={ok({ window: "1d", setAt: SET_AT })}
      />
    )

    expect(screen.getAllByRole("radio").map((radio) => radio.getAttribute("value"))).toEqual([
      "off",
      "1h",
      "1d",
      "7d",
    ])
    expect((screen.getByRole("radio", { name: "1 day" }) as HTMLInputElement).checked).toBe(true)
  })

  it("starts on Off where nobody has chosen", () => {
    render(<ReaderWindowSection projectId="prj_a" owner changeable kept={ok(null)} />)

    expect((screen.getByRole("radio", { name: "Off" }) as HTMLInputElement).checked).toBe(true)
    expect(screen.queryByText(/privacy notice/)).toBeNull()
  })

  it("says it is not in effect yet, and what it puts on readers' devices", () => {
    render(<ReaderWindowSection projectId="prj_a" owner changeable kept={ok(null)} />)

    expect(screen.getByText(/^Not in effect yet\./)).toBeTruthy()
    expect(screen.getByText(/puts one cookie on your readers' devices/)).toBeTruthy()
  })

  it("gives a sentence for the privacy notice once a window sets the cookie", () => {
    render(
      <ReaderWindowSection
        projectId="prj_a"
        owner
        changeable
        kept={ok({ window: "7d", setAt: SET_AT })}
      />
    )

    expect(screen.getByText(/for up to seven days after your first visit/)).toBeTruthy()
  })

  it("tells anybody else the window and that only an owner changes it", () => {
    render(
      <ReaderWindowSection
        projectId="prj_a"
        owner={false}
        changeable={false}
        kept={ok({ window: "1h", setAt: SET_AT })}
      />
    )

    expect(screen.queryAllByRole("radio")).toHaveLength(0)
    expect(screen.getByText(/first saw for an hour/)).toBeTruthy()
    expect(screen.getByText("Only an owner can change it.")).toBeTruthy()
  })

  it("offers no choice when the store did not answer, so saving cannot undo a window nobody read", () => {
    render(
      <ReaderWindowSection
        projectId="prj_a"
        owner
        changeable
        kept={err({ detail: "relation loom_reader_windows does not exist" })}
      />
    )

    expect(screen.queryAllByRole("radio")).toHaveLength(0)
    expect(screen.getByText(/The store did not say/)).toBeTruthy()
  })
})
