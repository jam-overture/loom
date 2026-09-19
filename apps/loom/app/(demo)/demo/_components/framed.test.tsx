import { render, screen } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { afterEach, describe, expect, it } from "vitest"

import { DOCS, HOME } from "@/app/(marketing)/_lib/site"

import { DemoBar } from "./demo-bar"
import { ReadTheDocs } from "./read-the-docs"
import { Wordmark } from "./wordmark"

/**
 * The demonstration's two doors out, and what they do when there is nowhere to
 * go.
 *
 * One file for both because they are one claim rather than two components: the
 * whole surface contains exactly two links that leave it — the bar's wordmark
 * and the foot of the rail — and the thing being asserted is a property of the
 * *pair*. A test file per component would let one of them be fixed and the
 * other left, which is the shape of defect this lane has now filed twice.
 *
 * ## The frame is real
 *
 * `window.top` is replaced with the window of an actual nested browsing
 * context rather than with a sentinel object. It costs one line and it buys
 * the thing a sentinel cannot: the predicate is compared against a genuine
 * `Window` it has never seen before, which is what it will be handed in a
 * browser, rather than against a value written to make it answer.
 */
const restorers: (() => void)[] = []

afterEach(() => {
  while (restorers.length > 0) restorers.pop()?.()
})

/** Puts this document inside another one, for the length of a test. */
const insideSomebodyElsesPage = (): void => {
  const host = document.createElement("iframe")
  document.body.append(host)

  const above = host.contentWindow
  if (above === null) throw new Error("the frame was given no window to stand in for a host")

  const was = Object.getOwnPropertyDescriptor(window, "top")
  Object.defineProperty(window, "top", { configurable: true, get: () => above })

  restorers.push(() => {
    if (was === undefined) delete (window as { top?: unknown }).top
    else Object.defineProperty(window, "top", was)

    host.remove()
  })
}

describe("the wordmark", () => {
  it("is the way home when the demonstration is at its own address", () => {
    render(<Wordmark />)

    expect(screen.getByRole("link", { name: /back to the front page/i }).getAttribute("href")).toBe(
      HOME.path
    )
  })

  /**
   * The measured defect: the destination is the page the visitor is already
   * looking at, so the click renders the front door inside the front door's
   * own embed.
   */
  it("is not a link when the demonstration is inside somebody else's page", () => {
    insideSomebodyElsesPage()
    render(<Wordmark />)

    expect(screen.queryByRole("link")).toBeNull()
  })

  it("still says whose page this is, because that was never the link's job", () => {
    insideSomebodyElsesPage()
    const { container } = render(<Wordmark />)

    expect(container.textContent).toContain("Loom")
  })

  /**
   * Pixel-identical is the whole claim of a silent withdrawal: the bar must not
   * visibly rearrange itself because a host framed it. Asserted as the mark's
   * own markup rather than as a screenshot, which is the part a test can hold.
   */
  it("looks exactly the same either way — only the door is gone", () => {
    const top = render(<Wordmark />).container.firstElementChild?.innerHTML

    insideSomebodyElsesPage()
    const boxed = render(<Wordmark />).container.firstElementChild?.innerHTML

    expect(boxed).toBe(top)
    expect(boxed).toBeTruthy()
  })
})

describe("the way to the docs", () => {
  it("is offered when the demonstration is at its own address", () => {
    render(<ReadTheDocs />)

    expect(screen.getByRole("link").getAttribute("href")).toBe(DOCS.path)
  })

  /**
   * Withdrawn rather than retargeted. The sandbox permits no navigation but the
   * frame's own, so `_top` and `_blank` are both silently dead and an ordinary
   * href loads the documentation site into the box.
   */
  it("is withdrawn when the demonstration is inside somebody else's page", () => {
    insideSomebodyElsesPage()
    const { container } = render(<ReadTheDocs />)

    expect(screen.queryByRole("link")).toBeNull()
    expect(container.textContent).toBe("")
  })
})

/**
 * The wiring, which is the half a component test usually cannot reach.
 *
 * `Wordmark` can be perfect and the bar can inline a link beside it, and every
 * assertion above still passes. This lane has filed that shape twice — once for
 * `actions.ts` and once for `page.tsx` — and here it costs one render to close,
 * because the bar is an ordinary component rather than a server boundary.
 */
describe("the bar the wordmark sits in", () => {
  it("has no door out at all when the demonstration is inside somebody else's page", () => {
    insideSomebodyElsesPage()
    render(<DemoBar revision={3} policyId="demo" />)

    expect(screen.queryByRole("link")).toBeNull()
  })

  it("still carries the instrument panel there — the revision is the proof the page is real", () => {
    insideSomebodyElsesPage()
    const { container } = render(<DemoBar revision={3} policyId="demo" />)

    expect(container.textContent).toContain("3")
    expect(container.textContent).toContain("Someone else’s page")
  })
})

/**
 * The half a browser test cannot see, and the reason the hook reads the way it
 * does.
 *
 * The demonstration's HTML is rendered where there is no window, so the server
 * cannot know whether the response is about to be put in a box. Both doors must
 * therefore be in the markup that ships, and the withdrawal must happen after
 * hydration — otherwise a framed visitor hydrates against markup that disagrees
 * with the tree React is about to build, and React discards the whole subtree.
 */
describe("what the server sends", () => {
  it("carries both doors even when the window it will land in is framed", () => {
    insideSomebodyElsesPage()

    expect(renderToString(<Wordmark />)).toContain(`href="${HOME.path}"`)
    expect(renderToString(<ReadTheDocs />)).toContain(`href="${DOCS.path}"`)
  })
})
