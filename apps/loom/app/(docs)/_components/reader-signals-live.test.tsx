import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { ReaderSignalsLive } from "./reader-signals-live"

/**
 * The live block, driven the way a reader drives it.
 *
 * Every other claim on *What your readers do* is checked by a producer running
 * on a server. This one cannot be: the block's whole subject is a browser, and
 * the failure it is exposed to is the one nothing else on the page would notice
 * — a broadcaster that started, observed the wrong root, and reported nothing
 * for the rest of the page's life looks exactly like a reader who did nothing.
 *
 * So these press the things the page tells a reader to press, and read the
 * batches back out of the component's own list.
 *
 * **`IntersectionObserver` is stubbed rather than driven.** jsdom has none, and
 * without it the broadcaster's constructor throws before it reaches anything
 * worth testing. The stub observes nothing, which means `viewed` and `dwelled`
 * cannot appear here — those two are the ones the runtime's own
 * `broadcast.test.ts` covers by passing its own `observeVisibility`. What is
 * left is exactly what this file is for: the two kinds that are delegated from
 * the root and therefore depend on this component having handed the broadcaster
 * the right element.
 */

class NoObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): [] {
    return []
  }
}

const globals = globalThis as unknown as { IntersectionObserver?: unknown }
let restore: unknown

beforeEach(() => {
  restore = globals.IntersectionObserver
  globals.IntersectionObserver = NoObserver
})

afterEach(() => {
  globals.IntersectionObserver = restore
})

/** Deliver whatever has been gathered, without waiting out the batch timer. */
const deliver = () => fireEvent.click(screen.getByRole("button", { name: "deliver now" }))

/**
 * A press, without jsdom trying to follow the link.
 *
 * The two things this file presses are an `a[href]` and a `details`, because
 * those are the two things a *reader* presses — and jsdom answers a click on a
 * real anchor by warning that it cannot navigate. Stopping the default is what a
 * browser's own history would do here; the broadcaster's listener has already
 * run by then, which is the whole point.
 */
const press = (element: Element) => {
  const swallow = (event: Event) => event.preventDefault()

  element.addEventListener("click", swallow)
  fireEvent.click(element)
  element.removeEventListener("click", swallow)
}

describe("the live broadcast block", () => {
  it("starts a broadcaster on the tree it rendered", async () => {
    render(<ReaderSignalsLive />)

    await waitFor(() => expect(screen.getByText("broadcasting · live")).toBeDefined())
    expect(screen.queryByText(/The broadcaster refused to start/)).toBeNull()
  })

  it("says nothing until a reader does something", () => {
    render(<ReaderSignalsLive />)

    expect(screen.getByText(/Nothing delivered yet/)).toBeDefined()
  })

  /**
   * The page tells a reader to press the call to action and promises the batch
   * will name it. This is that promise, kept or not.
   */
  it("reports an activation on the call to action the page points at", async () => {
    const { container } = render(<ReaderSignalsLive />)

    const action = container.querySelector('[data-loom-type="loom.action"]')
    expect(action, "the example tree has no loom.action to press").not.toBeNull()

    press(action as Element)
    deliver()

    await waitFor(() => {
      expect(screen.getByText("activated", { exact: false })).toBeDefined()
      expect(screen.getByText(/loom\.action/)).toBeDefined()
    })
  })

  it("reports a disclosure when a question is opened", async () => {
    const { container } = render(<ReaderSignalsLive />)

    const question = container.querySelector('details[data-loom-type="loom.faq"]')
    expect(question, "the example tree has no loom.faq to open").not.toBeNull()

    const details = question as HTMLDetailsElement
    details.open = true
    fireEvent(details, new Event("toggle", { bubbles: false }))
    deliver()

    await waitFor(() => {
      expect(screen.getByText(/disclosed/)).toBeDefined()
      expect(screen.getByText(/opened/)).toBeDefined()
    })
  })

  /**
   * The configuration is the point of the block: it asks for `activated` about
   * links and calls to action, and says nothing about prose. A broadcaster
   * reporting everything would still pass the two tests above.
   */
  it("says nothing about a type it was not asked about", async () => {
    const { container } = render(<ReaderSignalsLive />)

    const prose = container.querySelector('[data-loom-type="loom.prose"]')
    expect(prose, "the example tree has no loom.prose to press").not.toBeNull()

    press(prose as Element)
    deliver()

    await waitFor(() => expect(screen.getByText(/Nothing delivered yet/)).toBeDefined())
  })

  /** The batch a reader is shown names the tree and the revision it came from. */
  it("shows the tree and revision every batch carries", async () => {
    const { container } = render(<ReaderSignalsLive />)

    press(container.querySelector('[data-loom-type="loom.action"]') as Element)
    deliver()

    await waitFor(() =>
      expect(screen.getByText(/delivery 1 · t_readersignals\d+ · revision 0/)).toBeDefined()
    )
  })
})
