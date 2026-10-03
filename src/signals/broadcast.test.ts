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
let observed: Element[]

const fakeVisibility: ObserveVisibility = (onChange) => {
  reportVisibility = onChange
  return { observe: (element) => void observed.push(element), disconnect: () => undefined }
}

/** A microtask, which is when a `MutationObserver` delivers what it saw. */
const settle = () => Promise.resolve()

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
  observed = []
})

/**
 * A band the page did not have when the broadcast started — what a Suspense
 * boundary resolving, a client component mounting, or an applied proposal all
 * leave behind.
 */
const appendBand = (nodeId: string, type = "loom.section"): Element => {
  const band = document.createElement("section")
  band.setAttribute("data-loom-node", nodeId)
  band.setAttribute("data-loom-type", type)
  band.innerHTML = `<a href="/late"><span id="${nodeId}-link">Later</span></a>`
  root.append(band)
  return band
}

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
      {
        kind: "disclosed",
        nodeId: "n_4",
        type: "loom.faq",
        open: true,
        at: 1_000,
        within: [
          { nodeId: "n_2", type: "loom.section" },
          { nodeId: "n_1", type: "loom.page" },
        ],
      },
    ])
  })

  it("does not report a details the page authored open as a reader opening it", () => {
    const details = byId("n_4") as HTMLDetailsElement
    details.open = true
    const batches = start()

    details.dispatchEvent(new Event("toggle"))
    broadcast?.flush()
    expect(batches).toEqual([])

    details.open = false
    details.dispatchEvent(new Event("toggle"))
    broadcast?.flush()
    expect(batches.flatMap((batch) => batch.signals)).toMatchObject([{ kind: "disclosed", open: false }])
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

  it("reads a plain types list as that list for every kind", () => {
    const batches = start({ types: ["loom.card"] })
    const details = byId("n_4") as HTMLDetailsElement

    reportVisibility([
      { target: byId("n_2"), visible: true },
      { target: byId("n_3"), visible: true },
    ])
    clock = 2_000
    ;(document.getElementById("link-text") as HTMLElement).click()
    details.open = true
    details.dispatchEvent(new Event("toggle"))
    broadcast?.flush()

    expect(kindsIn(batches).sort()).toEqual(["activated:n_3", "dwelled:n_3", "viewed:n_3"])
  })

  /**
   * Written after #278 pointed out what the test this replaces could not see: it
   * paired one kind with a `types` list that excluded everything, so no signal
   * ever reached the point where its kind is read, and it would have passed with
   * the kind filter deleted. Here every signal the page could make is in range
   * of `types`, and one time-based kind is asked for so the observer is really
   * running — so only `kinds` can be what leaves `viewed` and `disclosed` out.
   */
  it("broadcasts only the kinds the host asked for, when the types would allow them all", () => {
    const batches = start({ kinds: ["activated", "dwelled"] })
    const details = byId("n_4") as HTMLDetailsElement

    reportVisibility([{ target: byId("n_2"), visible: true }])
    clock = 2_000
    ;(document.getElementById("link-text") as HTMLElement).click()
    details.open = true
    details.dispatchEvent(new Event("toggle"))
    broadcast?.flush()

    expect(kindsIn(batches).sort()).toEqual(["activated:n_3", "dwelled:n_2"])
  })

  it("takes types per kind — time on screen for sections, activations for cards", () => {
    const batches = start({
      types: { viewed: ["loom.section"], dwelled: ["loom.section"], activated: ["loom.card"] },
    })

    reportVisibility([
      { target: byId("n_2"), visible: true },
      { target: byId("n_3"), visible: true },
    ])
    clock = 3_000
    ;(document.getElementById("link-text") as HTMLElement).click()
    broadcast?.flush()

    expect(kindsIn(batches).sort()).toEqual(["activated:n_3", "dwelled:n_2", "viewed:n_2"])
  })

  it("reports every type for a kind the per-kind types do not name", () => {
    const batches = start({ types: { activated: ["loom.nav"] } })
    const details = byId("n_4") as HTMLDetailsElement

    ;(document.getElementById("link-text") as HTMLElement).click()
    details.open = true
    details.dispatchEvent(new Event("toggle"))
    broadcast?.flush()

    expect(kindsIn(batches)).toEqual(["disclosed:n_4"])
  })

  it("counts no time on screen when the host asked only for viewed", () => {
    const batches = start({ kinds: ["viewed"] })

    reportVisibility([{ target: byId("n_2"), visible: true }])
    clock = 5_000
    broadcast?.flush()

    expect(kindsIn(batches)).toEqual(["viewed:n_2"])
  })

  it("sends no viewed when the host asked only for time on screen", () => {
    const batches = start({ kinds: ["dwelled"] })

    reportVisibility([{ target: byId("n_2"), visible: true }])
    clock = 2_500
    broadcast?.flush()

    expect(kindsIn(batches)).toEqual(["dwelled:n_2"])
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

  it("keeps no timer running while the page is hidden, and starts one when it is shown", () => {
    vi.useFakeTimers()
    try {
      Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true })
      start({ flushEveryMs: 1_000 })
      expect(vi.getTimerCount()).toBe(0)

      Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true })
      document.dispatchEvent(new Event("visibilitychange"))
      expect(vi.getTimerCount()).toBe(1)

      Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true })
      document.dispatchEvent(new Event("visibilitychange"))
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true })
      vi.useRealTimers()
    }
  })

  describe("the view key", () => {
    it("puts one on every batch, so a funnel can be correlated inside a page view", () => {
      const batches = start()

      ;(document.getElementById("link-text") as HTMLElement).click()
      broadcast?.flush()
      ;(document.getElementById("link-text") as HTMLElement).click()
      broadcast?.flush()

      expect(batches).toHaveLength(2)
      expect(batches[0]?.view).toBe(batches[1]?.view)
      expect(batches[0]?.view).toMatch(/^[0-9a-f]{32}$/)
    })

    /**
     * The property that keeps it from being identity: a second broadcast is a
     * second view, so nothing correlates across a reload or a client-side
     * navigation (0146).
     */
    it("gives a second broadcast of the same page a different key", () => {
      const first = start()
      ;(document.getElementById("link-text") as HTMLElement).click()
      broadcast?.flush()
      broadcast?.stop()

      const second = start()
      ;(document.getElementById("link-text") as HTMLElement).click()
      broadcast?.flush()

      expect(first[0]?.view).not.toBe(second[0]?.view)
    })

    it("mints exactly one key per broadcast, however many batches it sends", () => {
      let minted = 0
      start({
        random: (count) => {
          minted += 1

          return new Uint8Array(count).fill(minted)
        },
      })

      ;(document.getElementById("link-text") as HTMLElement).click()
      broadcast?.flush()
      ;(document.getElementById("link-text") as HTMLElement).click()
      broadcast?.flush()

      expect(minted).toBe(1)
    })

    it("sends a batch the parser accepts, key and all", () => {
      const batches = start()

      ;(document.getElementById("link-text") as HTMLElement).click()
      broadcast?.flush()

      expect(parseReaderSignalBatch(JSON.parse(JSON.stringify(batches[0]))).ok).toBe(true)
    })
  })

  it("watches a band that arrived after it started — the case every applied change is", async () => {
    const batches = start()
    const late = appendBand("n_9")

    await settle()
    expect(observed).toContain(late)

    reportVisibility([{ target: late, visible: true }])
    clock = 6_000
    broadcast?.flush()

    expect(kindsIn(batches).sort()).toEqual(["dwelled:n_9", "viewed:n_9"])
  })

  it("watches the addressed nodes inside a subtree that arrives whole", async () => {
    const batches = start()
    const wrapper = document.createElement("div")
    wrapper.innerHTML =
      '<section data-loom-node="n_10" data-loom-type="loom.section"><article data-loom-node="n_11" data-loom-type="loom.card"></article></section>'
    root.append(wrapper)

    await settle()
    reportVisibility([{ target: byId("n_10"), visible: true }, { target: byId("n_11"), visible: true }])
    broadcast?.flush()

    expect(kindsIn(batches).sort()).toEqual(["viewed:n_10", "viewed:n_11"])
  })

  /**
   * A removed element may never be reported as having gone out of view, so the
   * stretch it was in the middle of has to be closed on the mutation. Left to
   * the visibility observer it stays open, and every later batch credits a
   * reader with time on a node that is not on the page.
   */
  it("stops counting time for a node that leaves the page, at the moment it leaves", async () => {
    const batches = start()

    reportVisibility([{ target: byId("n_2"), visible: true }])
    clock = 4_000
    byId("n_2").remove()
    await settle()
    broadcast?.flush()

    clock = 20_000
    broadcast?.flush()

    expect(batches.flatMap((batch) => batch.signals)).toEqual([
      { kind: "viewed", nodeId: "n_2", type: "loom.section", at: 1_000 },
      { kind: "dwelled", nodeId: "n_2", type: "loom.section", ms: 3_000 },
    ])
  })

  /**
   * The same closing, from the one direction the ledger's own suite could not
   * reach until today: **a background tab**. A `MutationObserver` delivers in a
   * hidden tab, so a client navigation while a reader is somewhere else removes
   * the nodes and closes their stretches with nobody looking — and the time the
   * tab spent hidden has to stay off the counter. Filed by `Loom docs` on
   * 2 October, who measured 11 seconds credited for 3 seconds of reading against
   * a one-line mutation that the whole suite passed.
   */
  it("credits no time to a node the page sheds while the tab is in the background", async () => {
    const batches = start()

    reportVisibility([{ target: byId("n_2"), visible: true }])

    clock = 4_000
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true })
    document.dispatchEvent(new Event("visibilitychange"))

    clock = 304_000
    byId("n_2").remove()
    await settle()
    broadcast?.flush()

    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true })

    expect(batches.flatMap((batch) => batch.signals)).toEqual([
      { kind: "viewed", nodeId: "n_2", type: "loom.section", at: 1_000 },
      { kind: "dwelled", nodeId: "n_2", type: "loom.section", ms: 3_000 },
    ])
  })

  it("reports a node that is taken out and put back as viewed once, not twice", async () => {
    const batches = start()
    const band = appendBand("n_9")

    await settle()
    reportVisibility([{ target: band, visible: true }])
    band.remove()
    await settle()
    root.append(band)
    await settle()
    reportVisibility([{ target: band, visible: true }])
    broadcast?.flush()

    expect(kindsIn(batches)).toEqual(["viewed:n_9"])
  })

  it("watches nothing structurally when the host asked for no time on screen", async () => {
    const batches = start({ kinds: ["activated"] })
    appendBand("n_9")

    await settle()
    expect(observed).toEqual([])

    ;(document.getElementById("n_9-link") as HTMLElement).click()
    broadcast?.flush()

    expect(kindsIn(batches)).toEqual(["activated:n_9"])
  })

  /**
   * The half of a press that no consumer can reconstruct afterwards. A rollup
   * reading a batch a week later has the node and the revision; which region the
   * node was in is a fact about the page at the moment of the press, and only
   * the browser that saw it can say.
   */
  describe("the regions a signal happened inside", () => {
    const withinOf = (batches: readonly ReaderSignalBatch[]) =>
      batches.flatMap((batch) => batch.signals).flatMap((signal) => ("within" in signal ? [signal.within] : []))

    it("names every addressed ancestor, nearest first, up to and including the root", () => {
      const batches = start()

      ;(document.getElementById("link-text") as HTMLElement).click()
      broadcast?.flush()

      expect(withinOf(batches)).toEqual([
        [
          { nodeId: "n_2", type: "loom.section" },
          { nodeId: "n_1", type: "loom.page" },
        ],
      ])
    })

    /**
     * Off is a different answer from *nothing above it*, so the field is absent
     * rather than empty — a consumer that saw `[]` would read a press at the top
     * of the page.
     */
    it("says nothing at all when the host turned the walk off", () => {
      const batches = start({ within: false })

      ;(document.getElementById("link-text") as HTMLElement).click()
      broadcast?.flush()

      const [signal] = batches.flatMap((batch) => batch.signals)
      expect(signal).not.toHaveProperty("within")
      expect(parseReaderSignalBatch(batches[0]).ok).toBe(true)
    })

    it("reports an empty ancestry for a press in the root itself, which is a claim and not a shrug", () => {
      root.querySelector("#link-text")?.closest("section")?.replaceWith(
        Object.assign(document.createElement("a"), { href: "/kit", id: "bare" })
      )
      const batches = start()

      ;(document.getElementById("bare") as HTMLElement).click()
      broadcast?.flush()

      expect(withinOf(batches)).toEqual([[]])
    })

    /**
     * `types` says which signals are sent. It does not narrow what a signal that
     * is sent may say about where it was — a host asking only about cards still
     * learns which section the card was in, because that is the question the
     * ancestry exists to answer.
     */
    it("is not filtered by the types the host asked for", () => {
      const batches = start({ types: { activated: ["loom.card"] } })

      ;(document.getElementById("link-text") as HTMLElement).click()
      broadcast?.flush()

      expect(kindsIn(batches)).toEqual(["activated:n_3"])
      expect(withinOf(batches)).toEqual([
        [
          { nodeId: "n_2", type: "loom.section" },
          { nodeId: "n_1", type: "loom.page" },
        ],
      ])
    })

    /** An element carrying a node id with no readable type is markup to distrust, not a ceiling. */
    it("steps over an ancestor whose address cannot be read", () => {
      byId("n_2").removeAttribute("data-loom-type")
      const batches = start()

      ;(document.getElementById("link-text") as HTMLElement).click()
      broadcast?.flush()

      expect(withinOf(batches)).toEqual([[{ nodeId: "n_1", type: "loom.page" }]])
    })

    /**
     * The band this press is in is the node the signal is already filed against,
     * so the ancestry above it is what is left to say. It is the case that shows
     * the two are different questions: the walk starts above the node, never at
     * it, and a region is never credited with what happened to itself.
     */
    it("walks for a band that arrived after the broadcast started", async () => {
      const batches = start()
      appendBand("n_9")
      await settle()

      ;(document.getElementById("n_9-link") as HTMLElement).click()
      broadcast?.flush()

      expect(kindsIn(batches)).toEqual(["activated:n_9"])
      expect(withinOf(batches)).toEqual([[{ nodeId: "n_1", type: "loom.page" }]])
    })

    it("walks for a disclosure the same way it walks for a press", () => {
      const batches = start()
      const menu = document.getElementById("menu") as HTMLElement

      menu.setAttribute("data-loom-disclosed", "true")

      return Promise.resolve().then(() => {
        broadcast?.flush()

        expect(withinOf(batches)).toEqual([
          [
            { nodeId: "n_2", type: "loom.section" },
            { nodeId: "n_1", type: "loom.page" },
          ],
        ])
      })
    })
  })

  /**
   * The fifth kind, which is the only one about a reader finishing rather than
   * a reader looking (0211).
   *
   * The form is put in by each test rather than into `PAGE`, because almost
   * every test above counts the signals a page produces and a form sitting in
   * the markup would change all of them.
   */
  describe("a form the browser let go", () => {
    const addForm = (nodeId: string, into: Element = byId("n_2")): HTMLFormElement => {
      into.insertAdjacentHTML(
        "beforeend",
        `<form data-loom-node="${nodeId}" data-loom-type="loom.form" id="${nodeId}-form">
           <input name="email" />
           <button id="${nodeId}-send" type="submit">Send</button>
         </form>`
      )

      return document.getElementById(`${nodeId}-form`) as HTMLFormElement
    }

    /** What a browser dispatches when a form's constraints are satisfied. */
    const submit = (form: HTMLFormElement): boolean =>
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))

    const withinOf = (batches: readonly ReaderSignalBatch[]) =>
      batches.flatMap((batch) => batch.signals).flatMap((signal) => ("within" in signal ? [signal.within] : []))

    it("reports it as completed, against the form's own node", async () => {
      const form = addForm("n_6")
      const batches = start()

      submit(form)
      await settle()
      broadcast?.flush()

      expect(kindsIn(batches)).toEqual(["completed:n_6"])
    })

    it("names the bands the form was the end of, so a deployment can ask which one converted", async () => {
      const form = addForm("n_6")
      const batches = start()

      submit(form)
      await settle()
      broadcast?.flush()

      expect(withinOf(batches)).toEqual([
        [
          { nodeId: "n_2", type: "loom.section" },
          { nodeId: "n_1", type: "loom.page" },
        ],
      ])
    })

    /**
     * A page that posts with `fetch` cancels the native submit, and from the
     * page's side a cancelled submit and a failed one are the same event. The
     * broadcaster reports what it can attest and nothing else.
     */
    it("says nothing when a handler on the page cancelled it", async () => {
      const form = addForm("n_6")
      form.addEventListener("submit", (event) => event.preventDefault())
      const batches = start()

      submit(form)
      await settle()
      broadcast?.flush()

      expect(kindsIn(batches)).toEqual([])
    })

    /**
     * `preventDefault` may be called by a listener registered after this one —
     * React attaches its own at a root container that can be this very element
     * — so the answer is read once the dispatch is over rather than during it.
     * Registering the broadcaster first is what makes this test the one that
     * fails if the microtask is ever removed.
     */
    it("reads the cancellation even when it is called after the broadcaster heard the event", async () => {
      const form = addForm("n_6")
      const batches = start()
      root.addEventListener("submit", (event) => event.preventDefault())

      submit(form)
      await settle()
      broadcast?.flush()

      expect(kindsIn(batches)).toEqual([])
    })

    /** Captured at the root, so a handler inside the page cannot make a conversion invisible. */
    it("hears a submit that something inside the page stopped from bubbling", async () => {
      const form = addForm("n_6")
      form.addEventListener("submit", (event) => event.stopPropagation())
      const batches = start()

      submit(form)
      await settle()
      broadcast?.flush()

      expect(kindsIn(batches)).toEqual(["completed:n_6"])
    })

    /**
     * The double-count this kind invites. Pressing the control is an activation
     * of the control and the submission is a completion of the form; they are
     * two facts about two nodes, and the thing that would be wrong is one
     * action producing two completions.
     *
     * The submit button here is **not** an addressed node, which is the sharper
     * version: the press is filed against the form as well, so both signals
     * name `n_6`. One `completed` is still one `completed`.
     *
     * Driven by pressing the control rather than by dispatching the event, so
     * the one click goes through the whole path a reader's would — the click
     * listener and the implicit submission the press causes.
     */
    it("counts one completion for one submission, though the press is also an activation", async () => {
      addForm("n_6")
      const batches = start()

      ;(document.getElementById("n_6-send") as HTMLElement).click()
      await settle()
      broadcast?.flush()

      expect(kindsIn(batches)).toEqual(["activated:n_6", "completed:n_6"])
    })

    it("reports nothing for a submission after the broadcast stopped", async () => {
      const form = addForm("n_6")
      const batches = start()

      broadcast?.stop()
      submit(form)
      await settle()

      expect(kindsIn(batches)).toEqual([])
    })

    it("is not reported at all when the host did not ask for the kind", async () => {
      const form = addForm("n_6")
      const batches = start({ kinds: ["activated"] })

      submit(form)
      await settle()
      broadcast?.flush()

      expect(kindsIn(batches)).toEqual([])
    })

    it("is reported only for the primitive types the host named", async () => {
      const form = addForm("n_6")
      const batches = start({ kinds: ["completed"], types: { completed: ["loom.contact-form"] } })

      submit(form)
      await settle()
      broadcast?.flush()

      expect(kindsIn(batches)).toEqual([])
    })

    /**
     * A form outside the page this broadcast is pointed at is not this page's
     * conversion, and the capture listener is on the root rather than the
     * document, so it should never hear one.
     */
    it("ignores a form that is not inside the root", async () => {
      document.body.insertAdjacentHTML(
        "beforeend",
        `<form data-loom-node="n_9" data-loom-type="loom.form" id="outside-form"></form>`
      )
      const batches = start()

      submit(document.getElementById("outside-form") as HTMLFormElement)
      await settle()
      broadcast?.flush()

      expect(kindsIn(batches)).toEqual([])
    })

    it("sends a batch the parser accepts, ancestry and all", async () => {
      const form = addForm("n_6")
      const batches = start()

      submit(form)
      await settle()
      broadcast?.flush()

      expect(batches.map((batch) => parseReaderSignalBatch(batch).ok)).toEqual([true])
    })
  })

  /**
   * The flag an intake counts arrivals by. One delivery of a page view carries
   * it, which is what makes *a reader from here* a number that does not grow
   * with how long they stayed.
   */
  describe("the opening delivery", () => {
    it("marks the first batch of a page view and no other", () => {
      const batches = start()

      ;(byId("n_3").querySelector("span") as HTMLElement).click()
      broadcast?.flush()
      ;(byId("n_3").querySelector("span") as HTMLElement).click()
      broadcast?.flush()

      expect(batches.map((batch) => batch.first)).toEqual([true, undefined])
    })

    /**
     * A page that gathered nothing sends nothing, so the opening is the first
     * batch that actually goes rather than the first time the timer fired.
     */
    it("marks the first batch that was sent, not the first flush", () => {
      const batches = start()

      broadcast?.flush()
      ;(byId("n_3").querySelector("span") as HTMLElement).click()
      broadcast?.flush()

      expect(batches.map((batch) => batch.first)).toEqual([true])
    })

    it("names the page view it opened, which is what the parser insists on", () => {
      const batches = start()

      ;(byId("n_3").querySelector("span") as HTMLElement).click()
      broadcast?.flush()

      expect(batches[0]?.view).toMatch(/^[0-9a-f]{32}$/)
      expect(parseReaderSignalBatch(batches[0]).ok).toBe(true)
    })

    /**
     * A client-side navigation stops one broadcast and starts another, which is
     * a second page view and so a second arrival — the same rule the view key
     * follows.
     */
    it("opens again for a second broadcast, because that is a second page view", () => {
      const first = start()
      ;(byId("n_3").querySelector("span") as HTMLElement).click()
      broadcast?.flush()
      broadcast?.stop()

      const second = start()
      ;(byId("n_3").querySelector("span") as HTMLElement).click()
      broadcast?.flush()

      expect(first[0]?.first).toBe(true)
      expect(second[0]?.first).toBe(true)
      expect(second[0]?.view).not.toBe(first[0]?.view)
    })
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
