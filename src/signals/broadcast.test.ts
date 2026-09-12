// @vitest-environment jsdom

import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { renderLoomTree } from "../render/render.js"
import { sampleTree } from "../testing/fixtures.js"
import { testPrimitiveResolver } from "../testing/primitives.js"

import {
  broadcastReaderSignals,
  READER_SIGNALS_EVENT,
  type ObserveVisibility,
  type ReaderSignalBroadcast,
  type ReaderSignalOptions,
  type VisibilityEntry,
} from "./broadcast.js"
import { parseReaderSignalBatch, type ReaderSignalBatch } from "./signal.js"

/**
 * The broadcaster against a real DOM.
 *
 * The markup is written by hand for most of these, because the contract being
 * tested is the attributes — a page rendered by anything that stamps them is a
 * page this can read. One test renders a tree through the seam to prove the two
 * halves agree on what those attributes are.
 */

const PAGE = `
  <main data-loom-node="n_1" data-loom-type="loom.page" data-loom-tree="t_1" data-loom-revision="4">
    <section data-loom-node="n_2" data-loom-type="loom.section">
      <article data-loom-node="n_3" data-loom-type="loom.card">
        <a href="/kit"><span id="link-text">Shop the kit</span></a>
      </article>
      <details data-loom-node="n_4" data-loom-type="loom.faq">
        <summary><span>Is a 3L jacket warmer?</span></summary>
        <p>No.</p>
      </details>
      <nav data-loom-node="n_5" data-loom-type="loom.nav">
        <button id="menu" data-loom-disclosed="false" aria-expanded="false">Menu</button>
      </nav>
    </section>
  </main>
`

let root: HTMLElement
let clock: number
let broadcast: ReaderSignalBroadcast | undefined
let reportVisibility: (entries: readonly VisibilityEntry[]) => void

const fakeVisibility: ObserveVisibility = (onChange) => {
  reportVisibility = onChange
  return { observe: () => undefined, disconnect: () => undefined }
}

const byId = (nodeId: string): Element => {
  const element =
    root.getAttribute("data-loom-node") === nodeId ? root : root.querySelector(`[data-loom-node="${nodeId}"]`)
  if (element === null) throw new Error(`no ${nodeId}`)
  return element
}

const start = (options: ReaderSignalOptions = {}): ReaderSignalBatch[] => {
  const batches: ReaderSignalBatch[] = []
  const started = broadcastReaderSignals(root, {
    observeVisibility: fakeVisibility,
    now: () => clock,
    send: (batch) => void batches.push(batch),
    ...options,
  })
  if (!started.ok) throw new Error(started.error.detail)
  broadcast = started.value
  return batches
}

const kindsIn = (batches: readonly ReaderSignalBatch[]) =>
  batches.flatMap((batch) => batch.signals.map((signal) => `${signal.kind}:${signal.nodeId}`))

beforeEach(() => {
  document.body.innerHTML = PAGE
  root = document.querySelector("main") as HTMLElement
  clock = 1_000
})

afterEach(() => {
  broadcast?.stop()
  broadcast = undefined
  document.body.innerHTML = ""
})

describe("broadcastReaderSignals", () => {
  it("refuses a page that was not rendered addressed, rather than broadcasting nothing", () => {
    root.removeAttribute("data-loom-revision")

    const started = broadcastReaderSignals(root, { observeVisibility: fakeVisibility })

    if (started.ok) started.value.stop()
    expect(started.ok).toBe(false)
    if (!started.ok) expect(started.error.code).toBe("unaddressed")
  })

  it("names the nearest node when a reader activates a target inside it", () => {
    const batches = start()

    ;(document.getElementById("link-text") as HTMLElement).click()
    broadcast?.flush()

    expect(kindsIn(batches)).toEqual(["activated:n_3"])
  })

  it("files every batch under the tree and the revision the page was rendered from", () => {
    const batches = start()

    ;(document.getElementById("link-text") as HTMLElement).click()
    broadcast?.flush()

    expect(batches[0]).toMatchObject({ treeId: "t_1", revision: 4 })
    expect(parseReaderSignalBatch(batches[0]).ok).toBe(true)
  })

  it("reports a details element opening as disclosed, and not also as a click", () => {
    const batches = start()
    const details = byId("n_4") as HTMLDetailsElement

    ;(details.querySelector("span") as HTMLElement).click()
    details.open = true
    details.dispatchEvent(new Event("toggle"))
    broadcast?.flush()

    expect(batches.flatMap((batch) => batch.signals)).toEqual([
      { kind: "disclosed", nodeId: "n_4", type: "loom.faq", open: true, at: 1_000 },
    ])
  })

  it("reports the disclose control through the attribute it stamps, and not also as a click", async () => {
    const batches = start()
    const menu = document.getElementById("menu") as HTMLElement

    menu.click()
    menu.setAttribute("data-loom-disclosed", "true")
    await Promise.resolve()
    broadcast?.flush()

    expect(kindsIn(batches)).toEqual(["disclosed:n_5"])
  })

  it("reports viewed once and the time on screen, stopping while the tab is hidden", () => {
    const batches = start()

    reportVisibility([{ target: byId("n_2"), visible: true }])
    clock = 4_000
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true })
    document.dispatchEvent(new Event("visibilitychange"))
    clock = 90_000
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true })
    document.dispatchEvent(new Event("visibilitychange"))
    clock = 91_000
    broadcast?.flush()

    const signals = batches.flatMap((batch) => batch.signals)
    expect(signals.filter((signal) => signal.kind === "viewed")).toHaveLength(1)
    expect(signals.flatMap((signal) => (signal.kind === "dwelled" ? [signal.ms] : []))).toEqual([3_000, 1_000])
  })

  it("broadcasts only the kinds and the primitive types the host asked for", () => {
    const batches = start({ kinds: ["activated"], types: ["loom.nav"] })

    ;(document.getElementById("link-text") as HTMLElement).click()
    reportVisibility?.([{ target: byId("n_2"), visible: true }])
    broadcast?.flush()

    expect(batches).toEqual([])
  })

  it("dispatches each batch as a DOM event anything on the page can read", () => {
    const started = broadcastReaderSignals(root, { observeVisibility: fakeVisibility, now: () => clock })
    if (started.ok) broadcast = started.value
    const heard: unknown[] = []
    document.addEventListener(READER_SIGNALS_EVENT, (event) => heard.push((event as CustomEvent).detail))

    ;(document.getElementById("link-text") as HTMLElement).click()
    broadcast?.flush()

    expect(heard).toHaveLength(1)
    expect(parseReaderSignalBatch(heard[0]).ok).toBe(true)
  })

  it("contains a send that throws or rejects — a sink observes, it does not break the page", () => {
    start({
      send: () => {
        throw new Error("analytics is down")
      },
    })

    ;(document.getElementById("link-text") as HTMLElement).click()

    expect(() => broadcast?.flush()).not.toThrow()
  })

  it("delivers on its own timer, and what is left when it stops", () => {
    vi.useFakeTimers()
    try {
      const batches = start({ flushEveryMs: 2_000 })

      ;(document.getElementById("link-text") as HTMLElement).click()
      vi.advanceTimersByTime(2_000)
      expect(batches).toHaveLength(1)

      ;(document.getElementById("link-text") as HTMLElement).click()
      broadcast?.stop()
      expect(batches).toHaveLength(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it("reads a page the render seam addressed", () => {
    const { tree } = sampleTree()
    document.body.innerHTML = renderToStaticMarkup(
      renderLoomTree(tree, { resolver: testPrimitiveResolver, addressed: true }).element
    )
    root = document.body.firstElementChild as HTMLElement

    const started = broadcastReaderSignals(root, { observeVisibility: fakeVisibility })

    expect(started.ok).toBe(true)
    if (started.ok) started.value.stop()
  })
})
