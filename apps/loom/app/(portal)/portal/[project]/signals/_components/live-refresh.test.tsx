import { render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { LiveRefresh } from "./live-refresh"

const refresh = vi.fn()

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }))

const lookedAt = (state: DocumentVisibilityState) =>
  vi.spyOn(document, "visibilityState", "get").mockReturnValue(state)

describe("a live screen", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    refresh.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("reads itself again on every tick while it is looked at", () => {
    lookedAt("visible")
    render(<LiveRefresh everyMs={5_000} />)

    vi.advanceTimersByTime(4_999)
    expect(refresh).not.toHaveBeenCalled()

    vi.advanceTimersByTime(10_001)
    expect(refresh).toHaveBeenCalledTimes(3)
  })

  it("asks for nothing while its tab is hidden", () => {
    lookedAt("hidden")
    render(<LiveRefresh everyMs={5_000} />)

    vi.advanceTimersByTime(20_000)
    expect(refresh).not.toHaveBeenCalled()
  })

  it("stops once it is gone from the screen", () => {
    lookedAt("visible")
    const { unmount } = render(<LiveRefresh everyMs={5_000} />)

    unmount()
    vi.advanceTimersByTime(20_000)
    expect(refresh).not.toHaveBeenCalled()
  })
})
