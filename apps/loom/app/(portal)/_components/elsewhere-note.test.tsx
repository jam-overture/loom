import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { TreeId } from "@jam-overture/loom"

import { elsewhereFrom, screenName } from "@/app/(portal)/_lib/screen-names"

import { ElsewhereNote } from "./elsewhere-note"

const TREE = "t_seed1" as TreeId

describe("ElsewhereNote", () => {
  it("reads as one sentence ending in the neighbour's name", () => {
    const { container } = render(<ElsewhereNote from="/portal/activity" />)

    expect(container.textContent).toBe(
      `${elsewhereFrom("/portal/activity").clause} ${screenName("/portal/history")} →`
    )
  })

  /**
   * The name is the link. A separate "see also" would let the link's wording
   * drift from the name in the rail, which is the defect this whole component
   * exists to close.
   */
  it("makes the name the thing a reader clicks", () => {
    render(<ElsewhereNote from="/portal/history" />)

    const link = screen.getByRole("link")

    expect(link.textContent).toBe(`${screenName("/portal/activity")} →`)
    expect(link.getAttribute("href")).toBe("/portal/activity")
  })

  /**
   * A reader on one page's history who is told the requests are elsewhere wants
   * *that page's* requests. Dropping the scope on the way across answers a
   * question they did not ask.
   */
  it("carries the page the reader is already looking at", () => {
    render(<ElsewhereNote from="/portal/history" treeId={TREE} />)

    expect(screen.getByRole("link").getAttribute("href")).toBe("/portal/activity?tree=t_seed1")
  })

  /** The front door takes no scope, so an offered one is dropped rather than faked. */
  it("does not hand a filter to a screen that does not read one", () => {
    render(<ElsewhereNote from="/portal/history" />)

    expect(screen.getByRole("link").getAttribute("href")).toBe("/portal/activity")
  })

  it("sends the front door's reader to everything ever asked for", () => {
    render(<ElsewhereNote from="/portal" />)

    expect(screen.getByRole("link").getAttribute("href")).toBe("/portal/activity")
  })
})
