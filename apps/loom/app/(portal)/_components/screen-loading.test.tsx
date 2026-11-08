import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ScreenLoading } from "./screen-loading"

describe("ScreenLoading", () => {
  it("tells a screen reader the screen is loading, and marks the area busy", () => {
    const { container } = render(<ScreenLoading />)

    expect(screen.getByRole("status").textContent).toContain("Loading")
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })
})

/**
 * The fix for links that looked dead (8 November): a navigation shows this the
 * moment it starts, inside the layouts already on screen. A segment that loses
 * its `loading.tsx` goes back to showing nothing until the whole next screen
 * has arrived.
 */
describe("the portal's loading boundaries", () => {
  const at = (relative: string): boolean =>
    existsSync(fileURLToPath(new URL(relative, import.meta.url)))

  it.each(["../portal/loading.tsx", "../portal/[project]/loading.tsx"])("%s exists", (path) => {
    expect(at(path)).toBe(true)
  })
})
