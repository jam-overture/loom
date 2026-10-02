// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { broadcastReaderSignals, type ReaderSignalBroadcast } from "./broadcast.js"
import { READABLE_VIEWPORT_FRACTION, READABLE_VISIBLE_FRACTION } from "./readable.js"
import type { ReaderSignalBatch } from "./signal.js"

/**
 * What *on screen* means, driven through the observer the broadcaster builds for
 * itself rather than through the injected double every other test uses.
 *
 * Every other test in this directory hands `broadcastReaderSignals` an
 * `observeVisibility` that reports a boolean, which is the right seam for
 * everything above this rule and leaves the rule itself unexercised: nothing in
 * `src/` ever reached `isReadable`, so the clause that carries elements taller
 * than the window was held by one app test reporting a ratio of 1 — which
 * satisfies both clauses and so distinguishes neither.
 *
 * So the browser's side is the double here. Each case is stated as the fraction
 * it is on either side of, taken from the published constants rather than typed,
 * because a test that typed 0.5 would go green against a rule that had changed
 * and a page quoting the constant would then be wrong.
 */

type Reading = {
  readonly ratio: number
  /** The height of the part of the element that is showing. */
  readonly visibleHeight: number
  /** The height of the window, or `undefined` for an observer that reports no root. */
  readonly viewportHeight?: number
  readonly intersecting?: boolean
}

type Callback = (entries: readonly IntersectionObserverEntry[]) => void

/**
 * The browser's half of the seam.
 *
 * A class because `IntersectionObserver` is reached with `new` and because this
 * one remembers what it was asked to watch — the two conditions the repository's
 * standard puts on one.
 */
class StubObserver {
  static latest: StubObserver | undefined

  readonly watched: Element[] = []

  constructor(
    private readonly callback: Callback,
    readonly options: IntersectionObserverInit | undefined
  ) {
    StubObserver.latest = this
  }

  observe(element: Element): void {
    this.watched.push(element)
  }

  unobserve(): void {}

  disconnect(): void {}

  takeRecords(): readonly IntersectionObserverEntry[] {
    return []
  }

  report(readings: ReadonlyMap<Element, Reading>): void {
    this.callback(
      [...readings].map(([target, reading]) => ({
        target,
        isIntersecting: reading.intersecting ?? true,
        intersectionRatio: reading.ratio,
        intersectionRect: { height: reading.visibleHeight },
        rootBounds: reading.viewportHeight === undefined ? null : { height: reading.viewportHeight },
      })) as unknown as readonly IntersectionObserverEntry[]
    )
  }
}

const PAGE = `
  <main data-loom-node="n_1" data-loom-type="loom.page" data-loom-tree="t_1" data-loom-revision="2">
    <section data-loom-node="n_2" data-loom-type="loom.section">A band</section>
  </main>
`

const globals = globalThis as unknown as { IntersectionObserver?: unknown; innerHeight?: number }

let restore: unknown
let root: HTMLElement
let broadcast: ReaderSignalBroadcast | undefined

beforeEach(() => {
  document.body.innerHTML = PAGE
  root = document.querySelector("main") as HTMLElement
  restore = globals.IntersectionObserver
  globals.IntersectionObserver = StubObserver
  StubObserver.latest = undefined
})

afterEach(() => {
  broadcast?.stop()
  broadcast = undefined
  globals.IntersectionObserver = restore
  document.body.innerHTML = ""
})

/** The kinds a band reports when the window says this much of it is showing. */
const seenWith = (reading: Reading): readonly string[] => {
  const batches: ReaderSignalBatch[] = []
  const started = broadcastReaderSignals(root, { now: () => 1_000, send: (batch) => void batches.push(batch) })
  if (!started.ok) throw new Error(started.error.detail)
  broadcast = started.value

  const observer = StubObserver.latest
  if (observer === undefined) throw new Error("the broadcaster built no observer")

  const band = root.querySelector('[data-loom-node="n_2"]') as Element
  observer.report(new Map([[band, reading]]))
  broadcast.flush()

  return batches.flatMap((batch) => batch.signals.map((signal) => `${signal.kind}:${signal.nodeId}`))
}

/** A hair either side of a fraction, small enough that no case straddles two of them. */
const JUST = 0.01

describe("what on screen means", () => {
  it("counts an element the moment the visible fraction is reached", () => {
    expect(seenWith({ ratio: READABLE_VISIBLE_FRACTION, visibleHeight: 100, viewportHeight: 800 })).toEqual([
      "viewed:n_2",
    ])
  })

  it("counts nothing for an element just short of it that fills little of the window", () => {
    expect(seenWith({ ratio: READABLE_VISIBLE_FRACTION - JUST, visibleHeight: 100, viewportHeight: 800 })).toEqual([])
  })

  it("counts an element too tall to ever reach the visible fraction, once it fills the viewport fraction", () => {
    const viewportHeight = 800

    expect(
      seenWith({
        ratio: 0.2,
        visibleHeight: viewportHeight * READABLE_VIEWPORT_FRACTION,
        viewportHeight,
      })
    ).toEqual(["viewed:n_2"])
  })

  it("counts nothing for a tall element just short of filling the viewport fraction", () => {
    const viewportHeight = 800

    expect(
      seenWith({
        ratio: 0.2,
        visibleHeight: viewportHeight * (READABLE_VIEWPORT_FRACTION - JUST),
        viewportHeight,
      })
    ).toEqual([])
  })

  it("counts nothing for an element the window says is not intersecting at all, whatever else it says", () => {
    expect(seenWith({ ratio: 1, visibleHeight: 800, viewportHeight: 800, intersecting: false })).toEqual([])
  })

  it("falls back to the window's own height when the observer reports no root", () => {
    globals.innerHeight = 1_000

    expect(seenWith({ ratio: 0.2, visibleHeight: 1_000 * READABLE_VIEWPORT_FRACTION })).toEqual(["viewed:n_2"])
  })

  /**
   * A window of no height divides by zero, and `Infinity >= 0.3` is true — so
   * without the guard a page measured before layout reports everything on it as
   * read by everybody.
   */
  it("counts nothing when the window has no height to fill", () => {
    expect(
      seenWith({ ratio: READABLE_VISIBLE_FRACTION - JUST, visibleHeight: 400, viewportHeight: 0 })
    ).toEqual([])
  })

  /**
   * The one assertion here that is about the numbers rather than the rule, and it
   * is deliberately a tautology: 0215 makes these two a published promise, so
   * moving either is a breaking change to what every stored counter meant and to
   * a sentence on a page that quotes them. This is where a silent edit stops.
   */
  it("publishes the two numbers a page may quote, and they are these", () => {
    expect({ visible: READABLE_VISIBLE_FRACTION, viewport: READABLE_VIEWPORT_FRACTION }).toEqual({
      visible: 0.5,
      viewport: 0.3,
    })
  })

  it("asks the browser to report the fraction it judges by, so the boundary is a threshold it is woken for", () => {
    seenWith({ ratio: 1, visibleHeight: 800, viewportHeight: 800 })

    expect(StubObserver.latest?.options?.threshold).toContain(READABLE_VISIBLE_FRACTION)
  })
})
