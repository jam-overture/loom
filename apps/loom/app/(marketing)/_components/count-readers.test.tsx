import type { ReaderSignalBatch } from "@loom/runtime/signals"
import { render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { CONTROL_TYPES } from "@/app/(marketing)/_lib/readers/asked"
import { renderTree, treeFor } from "@/app/(marketing)/_lib/render"
import { HOME } from "@/app/(marketing)/_lib/site"

import { COUNTING_ATTRIBUTE, CountReaders } from "./count-readers"

/**
 * The broadcaster, on this site's own front door, driven the way a reader
 * drives it.
 *
 * Everything else about this unit is a boolean and can be tested as one. This
 * cannot: the failure it is exposed to is a broadcaster that started against
 * the wrong element, or against a page with no addresses on it, and both look
 * exactly like a site nobody is visiting — no batch, no error, no difference.
 * So this renders the real front door, presses the things a reader presses, and
 * reads the batches back.
 *
 * **`IntersectionObserver` is stubbed rather than driven**, which is the
 * arrangement `(docs)` reached for the same reason: jsdom has none, and without
 * one the broadcaster's constructor throws before it reaches anything worth
 * testing. The stub observes nothing, so `viewed` and `dwelled` cannot appear
 * here — the runtime's own `broadcast.test.ts` covers those by passing its own
 * observer. What is left is exactly what this file is for: the two kinds that
 * are delegated from the root, and therefore prove this component handed the
 * broadcaster the right element.
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
  document.documentElement.removeAttribute(COUNTING_ATTRIBUTE)
})

const page = () => treeFor(HOME, { origin: "https://loom.test", theme: "editorial" })

/**
 * The front door as a browser gets it, with the component that counts it beside
 * it — which is the arrangement `layout.tsx` produces: the tree, and one thing
 * that draws nothing.
 */
const site = (options: { readonly addressed: boolean; readonly send: (batch: ReaderSignalBatch) => void }) => {
  const rendered = renderTree(page(), options.addressed)

  return render(
    <>
      {rendered.element}
      <CountReaders send={options.send} />
    </>
  )
}

/**
 * A press, without jsdom trying to follow the link.
 *
 * jsdom answers a click on a real anchor by warning that it cannot navigate.
 * Stopping the default is what a browser's own history would do here, and the
 * broadcaster's listener has already run by then.
 */
const press = (element: Element) => {
  const swallow = (event: Event) => event.preventDefault()

  element.addEventListener("click", swallow)
  element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
  element.removeEventListener("click", swallow)
}

const batches = () => {
  const seen: ReaderSignalBatch[] = []

  return { seen, send: (batch: ReaderSignalBatch) => void seen.push(batch) }
}

describe("counting the readers of this site", () => {
  it("starts a broadcaster on the tree the document contains, and says so on the document", () => {
    const { send } = batches()

    site({ addressed: true, send })

    expect(document.documentElement.getAttribute(COUNTING_ATTRIBUTE)).toBe("broadcasting")
  })

  /**
   * The misconfiguration the runtime refuses to be silent about, and the one
   * this component exists to make visible: a page rendered without its
   * addresses has nothing for a signal to name.
   *
   * It cannot happen through `renderSitePage`, which reads one answer for both
   * halves. It is asserted anyway, because *cannot happen* is a property of
   * today's wiring and this is the only place it would be noticed.
   */
  it("says the page is unaddressed rather than broadcasting into nothing", () => {
    const { seen, send } = batches()

    const { unmount } = site({ addressed: false, send })

    expect(document.documentElement.getAttribute(COUNTING_ATTRIBUTE)).toBe("unaddressed")

    unmount()
    expect(seen).toEqual([])
  })

  it("leaves no mark on a page it has stopped counting", () => {
    const { send } = batches()

    site({ addressed: true, send }).unmount()

    expect(document.documentElement.hasAttribute(COUNTING_ATTRIBUTE)).toBe(false)
  })

  it("sends nothing at all about a reader who did nothing", () => {
    const { seen, send } = batches()

    site({ addressed: true, send }).unmount()

    expect(seen).toEqual([])
  })

  /**
   * The batch a press produces, filed under the page it happened on.
   *
   * The delivery is the one `stop()` makes, which is also the last one a real
   * page view makes — the broadcaster flushes what it is holding when the page
   * goes away.
   */
  it("reports a press, under the tree and the revision of the page it happened on", () => {
    const { seen, send } = batches()

    const tree = page()
    const { container, unmount } = site({ addressed: true, send })

    const control = container.querySelector('[data-loom-type="loom.action"]')
    expect(control).not.toBeNull()

    press(control as Element)
    unmount()

    expect(seen).toHaveLength(1)
    expect(seen[0]?.treeId).toBe(tree.treeId)
    expect(seen[0]?.revision).toBe(tree.revision)
    expect(seen[0]?.view).toMatch(/^[0-9a-f]+$/)
    expect(seen[0]?.signals.map((signal) => signal.kind)).toEqual(["activated"])
  })

  /**
   * **What a press is filed against, measured rather than assumed.**
   *
   * The broadcaster names the nearest addressed element to what was pressed,
   * and this site's buttons and links are addressed nodes of their own — so a
   * press inside a band is reported as *this button*, never as *that band*.
   * That is the fact `asked.ts` records and `/what-readers-do` had to stop
   * promising the other thing, and it is asserted here because it is the sort
   * of claim a page can go on making long after the machinery stopped agreeing
   * with it.
   */
  it("names the control that was pressed, and not the band it sits in", () => {
    const { seen, send } = batches()

    const { container, unmount } = site({ addressed: true, send })

    const control = container.querySelector('[data-loom-type="loom.action"]')
    press(control as Element)
    unmount()

    const types = seen.flatMap((batch) => batch.signals.map((signal) => signal.type))

    expect(types).toEqual(["loom.action"])
    expect(types.every((type) => (CONTROL_TYPES as readonly string[]).includes(type))).toBe(true)
  })

  /**
   * A type this site does not ask about is not merely unreported — it is
   * dropped where it happens, which is what makes `asked.ts` a promise rather
   * than a filter on a report somebody could take off later.
   */
  it("reports nothing about a press on something that is not a control", () => {
    const { seen, send } = batches()

    const { container, unmount } = site({ addressed: true, send })

    const heading = container.querySelector('[data-loom-type="loom.heading"]')
    expect(heading).not.toBeNull()

    press(heading as Element)
    unmount()

    expect(seen).toEqual([])
  })
})
