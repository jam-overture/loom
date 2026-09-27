import type { ReaderSignalBatch } from "@jam-overture/loom/signals"
import { render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { BAND_TYPES, CONTROL_TYPES } from "@/app/(marketing)/_lib/readers/asked"
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
 * **`IntersectionObserver` is stubbed**, which is the arrangement `(docs)`
 * reached for the same reason: jsdom has none, and without one the
 * broadcaster's constructor throws before it reaches anything worth testing.
 * There are two stubs and they answer different questions. `NoObserver` watches
 * nothing, so the kinds that are delegated from the root — a press, an opening —
 * are the only thing that can happen, which is what proves this component
 * handed the broadcaster the right element. `RevealsWhatItWatches` hands back
 * everything it was given, which is what proves this component asked for the
 * bands rather than for the page.
 *
 * Neither is a substitute for the real thing, and neither pretends to be: what
 * a browser does with a half-visible section is the runtime's own
 * `broadcast.test.ts`, and what this deployment does with a real reader was
 * measured in Chromium against `next start` and is in the report.
 */

class NoObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): [] {
    return []
  }
}

/**
 * An observer that hands back everything it was given as *on screen*, on
 * demand.
 *
 * jsdom lays nothing out, so nothing is ever visible and the two kinds that
 * depend on visibility cannot happen by themselves. This is the smallest stub
 * that makes them happen: it keeps what the broadcaster asked it to watch, and
 * `reveal` reports all of it as read.
 *
 * **It is here because of the one mutation the first eight tests missed.** With
 * no `types` at all, the broadcaster reports every kind about every addressed
 * primitive — and nothing above notices, because every control this site has is
 * one it asks about, and `viewed` never fired. What the broadcaster *observes*
 * is decided by `types`, so an observer that says what it was handed is exactly
 * the instrument that can tell the difference between *the bands* and
 * *everything on the page*.
 */
class RevealsWhatItWatches {
  static last: RevealsWhatItWatches | undefined

  private readonly watched: Element[] = []

  constructor(private readonly report: (entries: readonly unknown[]) => void) {
    RevealsWhatItWatches.last = this
  }

  observe(element: Element): void {
    this.watched.push(element)
  }

  unobserve(): void {}

  disconnect(): void {}

  takeRecords(): [] {
    return []
  }

  /** Everything this was asked to watch, reported as more than half on screen. */
  reveal(): void {
    this.report(
      this.watched.map((target) => ({
        target,
        isIntersecting: true,
        intersectionRatio: 1,
        intersectionRect: { height: 200 },
        rootBounds: { height: 800 },
      }))
    )
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

const ORIGIN = "https://loom.test"

const page = () => treeFor(HOME, { origin: ORIGIN, theme: "editorial" })

/**
 * The front door as a browser gets it, with the component that counts it beside
 * it — which is the arrangement `layout.tsx` produces: the tree, and one thing
 * that draws nothing.
 */
const site = (options: { readonly addressed: boolean; readonly send: (batch: ReaderSignalBatch) => void }) => {
  const rendered = renderTree(page(), { addressed: options.addressed, origin: ORIGIN })

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
  /**
   * What this site asks to be told about, held to the promise rather than to
   * the filter: the bands are reported as read, and the dozens of addressed
   * nodes inside them are not reported at all.
   *
   * It is the same claim `asked.ts` makes in prose — *asking both of everything
   * would bury the reading that matters* — and the only assertion here that
   * fails when the component stops narrowing what it asks for.
   */
  it("hears about the bands coming into view, and about nothing inside them", () => {
    const { seen, send } = batches()

    globals.IntersectionObserver = RevealsWhatItWatches
    const { unmount } = site({ addressed: true, send })

    RevealsWhatItWatches.last?.reveal()
    unmount()

    const bands: readonly string[] = BAND_TYPES
    const types = [
      ...new Set(seen.flatMap((batch) => batch.signals.map((signal) => signal.type as string))),
    ].sort()

    expect(types.length).toBeGreaterThan(0)
    expect(types).toContain("loom.section")
    /** Named in the failure rather than counted, so a red test says what leaked. */
    expect(types.filter((type) => !bands.includes(type))).toEqual([])
  })

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
