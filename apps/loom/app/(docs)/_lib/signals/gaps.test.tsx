import {
  DISCLOSED_ATTRIBUTE,
  LOOM_NODE_ATTRIBUTE,
  LOOM_REVISION_ATTRIBUTE,
  LOOM_TREE_ATTRIBUTE,
  LOOM_TYPE_ATTRIBUTE,
} from "@jam-overture/loom/react"
import { READER_SIGNAL_KINDS, type ReaderSignalBatch, type ReaderSignalKind } from "@jam-overture/loom/signals"
import {
  broadcastReaderSignals,
  type ObserveVisibility,
  type ReaderSignalBroadcast,
  type ReaderSignalOptions,
  type VisibilityEntry,
} from "@jam-overture/loom/signals/broadcast"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { produceKinds } from "./page"

/**
 * The *does not mean* line on every row of the vocabulary, made to happen.
 *
 * Each of those sentences is a claim about what a browser cannot see, and a
 * claim of that shape is the easiest thing on this site to get wrong, because
 * **nothing about a page disagrees with it.** A sentence saying `completed`
 * misses a form posted with `fetch` renders identically whether or not that is
 * true, and a reader who believes it builds a report on it.
 *
 * So each one is reproduced here against the real broadcaster, imported from the
 * entry point the page tells a reader to import it from, driven in a document.
 * The gap the sentence names is produced, and the signals are read back out of
 * the batches — so a release that closed one of these gaps, or opened a
 * different one, turns this file red beside the sentence that has stopped being
 * true.
 *
 * **It is not a second copy of `broadcast.test.ts`.** That file tests the
 * broadcaster, and does it more thoroughly than this one ever should. What is
 * here is the *join*: `DEMONSTRATED` quotes a clause out of each page sentence
 * and the test beside it makes that clause happen, so neither the prose nor the
 * demonstration can drift without taking the other with it. The runtime lane
 * owns whether the behaviour is right; this lane owns whether the page says so.
 *
 * `.test.tsx` because this half of the suite is the one with a DOM in it — the
 * same reason `addressing.test.tsx` lives beside `markup.ts`.
 */

/**
 * The page, addressed, with a form on it.
 *
 * Written by hand rather than rendered from the example at the top of *What your
 * readers do*, for the reason that example's own row states: **there is no form
 * in it**, and `page.test.ts` holds it to that. A tree with no form cannot
 * produce the one signal this file most needs to produce, so the subject here is
 * a page of the same shape with the missing part added.
 *
 * The attribute names come from the renderer's own constants, so a page whose
 * identity moved takes this down rather than leaving it driving markup nothing
 * writes any more.
 */
const PAGE = `
  <main ${LOOM_NODE_ATTRIBUTE}="n_1" ${LOOM_TYPE_ATTRIBUTE}="loom.page" ${LOOM_TREE_ATTRIBUTE}="t_gaps" ${LOOM_REVISION_ATTRIBUTE}="7">
    <section ${LOOM_NODE_ATTRIBUTE}="n_2" ${LOOM_TYPE_ATTRIBUTE}="loom.section">
      <a id="link" ${LOOM_NODE_ATTRIBUTE}="n_3" ${LOOM_TYPE_ATTRIBUTE}="loom.link" href="/kit">Shop the kit</a>
      <div ${LOOM_NODE_ATTRIBUTE}="n_4" ${LOOM_TYPE_ATTRIBUTE}="loom.faq" ${DISCLOSED_ATTRIBUTE}="false">
        <p>How long does a frame take?</p>
      </div>
      <form id="signup" ${LOOM_NODE_ATTRIBUTE}="n_5" ${LOOM_TYPE_ATTRIBUTE}="loom.form">
        <input name="email" />
        <button id="join" type="submit">Join</button>
      </form>
      <button id="inert" type="button" ${LOOM_NODE_ATTRIBUTE}="n_6" ${LOOM_TYPE_ATTRIBUTE}="loom.action">Nothing happens</button>
    </section>
  </main>
`

/**
 * The clause of each page sentence this file reproduces.
 *
 * Typed as a `Record` over the runtime's own union, so **a sixth kind is a
 * compile error here** rather than a row that quietly ships with an
 * undemonstrated caveat. The test at the foot of the file catches the other
 * direction, where the union widened and this table was annotated looser.
 *
 * Each value is a substring of the row's `doesNotMean`, asserted to still be one
 * — a rewritten sentence either keeps the clause or is told which test is about
 * a sentence that no longer exists.
 */
const DEMONSTRATED: Readonly<Record<ReaderSignalKind, string>> = {
  viewed: "a node sitting on screen in a tab nobody is looking at is not counted at all",
  dwelled: "A tab nobody has in front of them accrues nothing",
  activated: "a control whose handler cancelled it",
  disclosed: "your own code changing it",
  completed: "a form posted with fetch",
}

let root: HTMLElement
let clock: number
let broadcast: ReaderSignalBroadcast | undefined
let reportVisibility: (entries: readonly VisibilityEntry[]) => void

const fakeVisibility: ObserveVisibility = (onChange) => {
  reportVisibility = onChange
  return { observe: () => undefined, disconnect: () => undefined }
}

/** A microtask: when a `MutationObserver` delivers, and when a submit's verdict is read. */
const settle = () => Promise.resolve()

/** An addressed element of this page, by the node id it carries. */
const nodeOf = (nodeId: string): Element => {
  const element = root.querySelector(`[${LOOM_NODE_ATTRIBUTE}="${nodeId}"]`)
  if (element === null) throw new Error(`loom: this file's page has no ${nodeId}`)
  return element
}

const byId = (id: string): HTMLElement => {
  const element = document.getElementById(id)
  if (element === null) throw new Error(`loom: this file's page has no #${id}`)
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

const signalsIn = (batches: readonly ReaderSignalBatch[]) => batches.flatMap((batch) => batch.signals)

const kindsIn = (batches: readonly ReaderSignalBatch[]) =>
  signalsIn(batches).map((signal) => `${signal.kind}:${signal.nodeId}`)

/** The sentence the page prints for a kind, read off the producer rather than retyped. */
const sentenceFor = (kind: ReaderSignalKind): string => {
  const row = produceKinds().find((one) => one.kind === kind)
  if (row === undefined) throw new Error(`loom: the vocabulary block has no row for "${kind}"`)
  return row.doesNotMean
}

/** What the page promises about this kind, and that it still promises it. */
const quoted = (kind: ReaderSignalKind): void => {
  expect(sentenceFor(kind), `the page's "${kind}" caveat no longer says what this test demonstrates`).toContain(
    DEMONSTRATED[kind]
  )
}

const hide = () => {
  Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true })
  document.dispatchEvent(new Event("visibilitychange"))
}

const show = () => {
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true })
  document.dispatchEvent(new Event("visibilitychange"))
}

const submit = (form: HTMLFormElement): boolean =>
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))

beforeEach(() => {
  document.body.innerHTML = PAGE
  root = document.querySelector("main") as HTMLElement
  clock = 1_000
  show()
})

afterEach(() => {
  broadcast?.stop()
  broadcast = undefined
  show()
})

describe("completed does not mean a submission was counted", () => {
  /**
   * The baseline, and it is not decoration: a test showing the cancelled submit
   * reports nothing is satisfied by a broadcaster that reports nothing ever. The
   * pair is the claim.
   */
  it("reports a form the page let go", async () => {
    const batches = start({ kinds: ["completed"] })

    submit(byId("signup") as HTMLFormElement)
    await settle()
    broadcast?.flush()

    expect(kindsIn(batches)).toEqual(["completed:n_5"])
  })

  it("reports nothing for a submission the page cancelled, which is most forms", async () => {
    quoted("completed")

    const form = byId("signup") as HTMLFormElement
    form.addEventListener("submit", (event) => event.preventDefault())

    const batches = start({ kinds: ["completed"] })

    submit(form)
    await settle()
    broadcast?.flush()

    expect(kindsIn(batches)).toEqual([])
  })

  /**
   * The other half of the same sentence, and the half no page could check: the
   * broadcaster has no idea what the endpoint said, so a submission a server
   * refused is a `completed` like any other. Demonstrated by the only evidence
   * available — the signal is reported before anything could have replied.
   */
  it("reports it without waiting to hear what anything made of it", async () => {
    expect(sentenceFor("completed")).toContain("never the reply")

    const form = byId("signup") as HTMLFormElement
    const batches = start({ kinds: ["completed"] })

    submit(form)
    await settle()
    broadcast?.flush()

    const completed = signalsIn(batches)[0]

    expect(completed?.kind).toBe("completed")
    expect(completed?.kind === "completed" ? completed.at : undefined).toBe(clock)
  })
})

describe("activated does not mean the press did anything", () => {
  it("reports a press whose handler cancelled it", () => {
    quoted("activated")

    byId("link").addEventListener("click", (event) => event.preventDefault())

    const batches = start({ kinds: ["activated"] })

    byId("link").click()
    broadcast?.flush()

    expect(kindsIn(batches)).toEqual(["activated:n_3"])
  })

  /**
   * A press that did nothing at all is the same signal, which is the sentence's
   * actual reach: `#inert` has no handler, no destination and no form around it —
   * it is a reader pressing something that does nothing, reported exactly like a
   * reader pressing something that works.
   */
  it("reports a press on a control with nothing behind it", () => {
    const batches = start({ kinds: ["activated"] })

    byId("inert").click()
    broadcast?.flush()

    expect(kindsIn(batches)).toEqual(["activated:n_6"])
  })
})

describe("disclosed does not mean a reader opened it", () => {
  it("reports a region the page's own code opened, with no reader in the room", async () => {
    quoted("disclosed")

    const batches = start({ kinds: ["disclosed", "activated"] })

    nodeOf("n_4").setAttribute(DISCLOSED_ATTRIBUTE, "true")
    await settle()
    broadcast?.flush()

    expect(kindsIn(batches)).toEqual(["disclosed:n_4"])

    const disclosed = signalsIn(batches)[0]

    expect(disclosed?.kind === "disclosed" ? disclosed.open : undefined).toBe(true)
  })
})

describe("viewed does not mean anybody read it", () => {
  it("counts a reader who scrolled straight past exactly like one who stopped", () => {
    quoted("viewed")

    const batches = start({ kinds: ["viewed"] })
    const skimmed = nodeOf("n_2")
    const read = nodeOf("n_4")

    reportVisibility([
      { target: skimmed, visible: true },
      { target: read, visible: true },
    ])

    /** One of them is gone in a millisecond. The other is still there half a minute later. */
    clock += 1
    reportVisibility([{ target: skimmed, visible: false }])
    clock += 30_000
    broadcast?.flush()

    const viewed = signalsIn(batches).filter((signal) => signal.kind === "viewed")

    expect(viewed.map((signal) => signal.nodeId)).toEqual(["n_2", "n_4"])

    /** Identical but for which node, which is the sentence: there is no "how much" in a `viewed`. */
    expect(viewed.map(({ nodeId, ...rest }) => ({ ...rest, nodeId: "—" }))).toEqual([
      { kind: "viewed", type: "loom.section", at: 1_000, nodeId: "—" },
      { kind: "viewed", type: "loom.faq", at: 1_000, nodeId: "—" },
    ])
  })

  it("counts nothing for a node on screen in a tab nobody is looking at", () => {
    hide()

    const batches = start({ kinds: ["viewed"] })

    reportVisibility([{ target: nodeOf("n_2"), visible: true }])
    broadcast?.flush()

    expect(kindsIn(batches)).toEqual([])

    show()
    broadcast?.flush()

    expect(kindsIn(batches)).toEqual(["viewed:n_2"])
  })
})

describe("dwelled does not mean time spent reading", () => {
  it("accrues nothing while the tab is behind another one", () => {
    quoted("dwelled")

    const batches = start({ kinds: ["dwelled"] })
    const began = clock

    reportVisibility([{ target: nodeOf("n_2"), visible: true }])

    /** Four seconds of somebody looking at it. */
    clock += 4_000
    hide()

    /** Four seconds of the page sitting in a tab behind something else. */
    clock += 4_000

    /**
     * A delivery in the middle of that, which is the part worth driving: hiding
     * the tab flushes once, and the stretch has to stay closed for every
     * delivery after it rather than only for the one that closed it. A ledger
     * that re-opened the stretch on a drain would credit the whole background
     * stretch here and nothing else in this file would notice.
     */
    broadcast?.flush()

    clock += 2_000
    show()

    /** One more second of somebody looking at it. */
    clock += 1_000
    broadcast?.flush()

    /**
     * Summed across batches on purpose. Hiding the tab flushes what is owed, so
     * the stretches arrive in two deliveries — and a receiver adding up a
     * node's `dwelled` across a page view is exactly what the page tells it to
     * do.
     */
    const counted = signalsIn(batches)
      .filter((signal) => signal.kind === "dwelled")
      .reduce((total, signal) => total + (signal.kind === "dwelled" ? signal.ms : 0), 0)

    expect(counted, "nothing was reported for a node that was on screen").toBeGreaterThan(0)
    expect(clock - began).toBe(11_000)
    expect(counted).toBe(5_000)
  })

  /**
   * The same claim, for a node that goes away while the tab is in the background.
   *
   * Written after a mutation run, because it is the one way the sentence could
   * have been false and nothing would have said so: the stretch a hidden tab
   * opens is closed by hiding, and the thing that reads it back is whatever
   * happens next. A node scrolling out of view, or being removed by a change
   * that landed in a background tab, closes its stretch from the other end — and
   * a ledger that left the stretch open at the moment of hiding would credit the
   * whole background stretch to it there, while every test in this file and in
   * the runtime's own ledger suite stayed green.
   *
   * That hole is real on `main` and is filed. This is the half of it this lane
   * can hold: the page says a background tab accrues nothing, so the page's own
   * suite drives the case where it would.
   */
  it("accrues nothing for a node that leaves the page while the tab is behind another", () => {
    const batches = start({ kinds: ["dwelled"] })

    reportVisibility([{ target: nodeOf("n_2"), visible: true }])

    clock += 3_000
    hide()

    /** Five seconds of background, and then the node is gone. */
    clock += 5_000
    reportVisibility([{ target: nodeOf("n_2"), visible: false }])
    broadcast?.flush()

    const counted = signalsIn(batches)
      .filter((signal) => signal.kind === "dwelled")
      .reduce((total, signal) => total + (signal.kind === "dwelled" ? signal.ms : 0), 0)

    expect(counted).toBe(3_000)
  })
})

describe("the line itself", () => {
  /**
   * The floor, and the reason this file is not derived from its own subject: a
   * sweep over whatever `DEMONSTRATED` happens to hold cannot see the table
   * shrink, and a sweep over `produceKinds()` cannot see this file stop testing.
   * Asserting the two lists are the same list sees both.
   */
  it("reproduces a gap for every kind the runtime has", () => {
    expect(Object.keys(DEMONSTRATED).sort()).toEqual([...READER_SIGNAL_KINDS].sort())
  })

  /**
   * Required rather than partial, which is the whole shape of the change. The
   * old table held one sentence for one kind and the rest of the rows said only
   * what their names meant — so this is the assertion that a kind cannot ship a
   * row without the half a name cannot carry.
   */
  it("gives every live kind a sentence long enough to be one", () => {
    for (const row of produceKinds()) {
      expect(row.doesNotMean, `"${row.kind}" has no caveat`).toMatch(/\S/)
      expect(row.doesNotMean.length, `"${row.kind}"'s caveat is a fragment`).toBeGreaterThan(60)
      expect(row.doesNotMean, `"${row.kind}"'s caveat does not say what it is not`).toContain("does not mean")
    }
  })

  /**
   * The gap is a different statement from the meaning, and a row that repeated
   * itself would pass everything above. Cheap, and it is the way a sentence
   * written in a hurry fails.
   */
  it("says something other than what the kind does mean", () => {
    for (const row of produceKinds()) {
      expect(row.doesNotMean).not.toContain(row.means)
      expect(row.doesNotMean).not.toBe(row.plainly)
    }
  })
})
