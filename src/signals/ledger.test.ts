import { describe, expect, it } from "vitest"

import { nodeIdSchema } from "../ids.js"
import { primitiveTypeSchema } from "../primitive-type.js"

import { createSignalLedger, type SignalAddress } from "./ledger.js"
import type { ReaderSignal } from "./signal.js"

const address = (id: string, type = "loom.section"): SignalAddress => ({
  nodeId: nodeIdSchema.parse(id),
  type: primitiveTypeSchema.parse(type),
})

const goggles = address("n_4")

const dwellOf = (signals: readonly ReaderSignal[]): readonly number[] =>
  signals.flatMap((signal) => (signal.kind === "dwelled" ? [signal.ms] : []))

describe("the signal ledger", () => {
  it("reports a node viewed once, however often it comes back", () => {
    const ledger = createSignalLedger()
    ledger.entered(goggles, 0)
    ledger.left(goggles.nodeId, 1000)
    ledger.entered(goggles, 2000)

    expect(ledger.drain(3000).filter((signal) => signal.kind === "viewed")).toHaveLength(1)
  })

  it("adds up every stretch on screen", () => {
    const ledger = createSignalLedger()
    ledger.entered(goggles, 0)
    ledger.left(goggles.nodeId, 1000)
    ledger.entered(goggles, 5000)
    ledger.left(goggles.nodeId, 7500)

    expect(dwellOf(ledger.drain(9000))).toEqual([3500])
  })

  it("counts a node that stays on screen once per millisecond across batches, never twice", () => {
    const ledger = createSignalLedger()
    ledger.entered(goggles, 0)

    const first = ledger.drain(4000)
    const second = ledger.drain(6500)

    expect(dwellOf(first)).toEqual([4000])
    expect(dwellOf(second)).toEqual([2500])
    expect(second.some((signal) => signal.kind === "viewed")).toBe(false)
  })

  it("stops counting while the page is hidden, and resumes from when it is shown", () => {
    const ledger = createSignalLedger()
    ledger.entered(goggles, 0)
    ledger.hid(1000)
    ledger.showed(60_000)

    expect(dwellOf(ledger.drain(61_000))).toEqual([2000])
  })

  it("does not count a node that came on screen while the page was hidden until it is shown", () => {
    const ledger = createSignalLedger(true)
    ledger.entered(goggles, 0)
    ledger.showed(10_000)

    expect(dwellOf(ledger.drain(10_500))).toEqual([500])
  })

  it("does not call a node viewed while nobody can see the page, and does once someone can", () => {
    const ledger = createSignalLedger(true)
    ledger.entered(goggles, 0)

    expect(ledger.drain(5000)).toEqual([])

    ledger.showed(8000)
    expect(ledger.drain(8000)).toEqual([{ kind: "viewed", ...goggles, at: 8000 }])
  })

  /**
   * The direction nothing closed a stretch from.
   *
   * `left` is called by the visibility observer and by the removal half of the
   * arrivals observer, **and both of those fire in a background tab** — a client
   * navigation, a list that empties, a Suspense boundary that swaps. Every other
   * hidden-tab case here closes its stretch with `hid` or `drain`, so the one
   * line that makes this right (`hid` setting `since` to null) could be deleted
   * with the whole suite green: measured at 11,000 ms for a node a reader had in
   * front of them for 3 (`Loom docs`, 2 October).
   */
  it("credits nothing to a node that leaves the page while the tab is in the background", () => {
    const ledger = createSignalLedger()
    ledger.entered(goggles, 0)
    ledger.hid(3000)
    ledger.left(goggles.nodeId, 8000)

    expect(dwellOf(ledger.drain(9000))).toEqual([3000])
  })

  /**
   * And the backstop for the same line, which is `drain`'s own `if (!hidden)`.
   * Delivering while the tab is hidden must not reopen the stretches `hid`
   * closed, or the node is accruing again with nobody looking — invisible until
   * something closes it, which is the case above.
   */
  it("does not restart a hidden node's time by delivering a batch while the tab is still hidden", () => {
    const ledger = createSignalLedger()
    ledger.entered(goggles, 0)
    ledger.hid(3000)

    expect(dwellOf(ledger.drain(4000))).toEqual([3000])

    ledger.left(goggles.nodeId, 9000)

    expect(dwellOf(ledger.drain(10_000))).toEqual([])
  })

  it("has nothing to say about a node that was never on screen", () => {
    expect(createSignalLedger().drain(5000)).toEqual([])
  })

  it("returns what it was told a reader did, in order, and then forgets it", () => {
    const ledger = createSignalLedger()
    const first: ReaderSignal = { kind: "activated", ...address("n_7", "loom.link"), at: 1 }
    const second: ReaderSignal = { kind: "disclosed", ...address("n_8", "loom.faq"), open: true, at: 2 }
    ledger.noted(first)
    ledger.noted(second)

    expect(ledger.drain(3)).toEqual([first, second])
    expect(ledger.drain(4)).toEqual([])
  })

  it("costs the same per node on a large page as on a small one", () => {
    const scroll = (count: number): number => {
      const ledger = createSignalLedger()
      const nodes = Array.from({ length: count }, (_unused, index) => address(`n_${index.toString(36)}`))
      const started = performance.now()
      nodes.forEach((node, index) => {
        ledger.entered(node, index)
        const behind = nodes[index - 20]
        if (behind !== undefined) ledger.left(behind.nodeId, index)
        if (index % 250 === 0) ledger.drain(index)
      })
      ledger.drain(count)
      return (performance.now() - started) / count
    }

    scroll(2_000)
    const small = scroll(2_000)
    const large = scroll(32_000)

    /**
     * Linear work gives a ratio near 1; the bound is loose so a busy machine does
     * not fail it. The copying ledger this replaced grew with the square of the
     * page, which at sixteen times the nodes is far past it.
     */
    expect(large / small).toBeLessThan(4)
  })
})

/**
 * Every short sequence of what a reader's tab can do to the ledger, against a
 * model of the same thing that shares none of its code.
 *
 * The cases above are the ones somebody thought of. This is the other kind of
 * guard: the alphabet is the whole of the ledger's surface, every ordering of it
 * up to five events is run, and each is held to two facts that have to be true
 * of all of them —
 *
 * - **time credited is time the node was on screen in a tab somebody was
 *   looking at**, and never a millisecond more, and
 * - **a node is viewed once, at a moment it was on screen and the page was
 *   visible**, or not at all.
 *
 * The model is a timeline rather than a second ledger: events land one second
 * apart, and the second between two of them is credited if the node was on
 * screen and the page visible across it and a drain came at or after its end.
 * Nothing after the last drain is ever reported, because what a drain has not
 * taken is still inside the ledger.
 *
 * It is written this way because the two hidden-tab cases above were found by
 * another lane mutating a line and watching every test stay green. A sweep is
 * what notices the next line of that kind without anybody guessing which one it
 * is.
 */

const STEP_MS = 1000

type Move =
  | { readonly act: "enter"; readonly node: "a" | "b" }
  | { readonly act: "leave"; readonly node: "a" | "b" }
  | { readonly act: "hide" }
  | { readonly act: "show" }
  | { readonly act: "drain" }

const MOVES: readonly Move[] = [
  { act: "enter", node: "a" },
  { act: "leave", node: "a" },
  { act: "enter", node: "b" },
  { act: "leave", node: "b" },
  { act: "hide" },
  { act: "show" },
  { act: "drain" },
]

const PARTS = { a: address("n_a"), b: address("n_b") } as const

/** A failing sequence has to be readable, or the sweep reports that something is wrong and not what. */
const nameOf = (move: Move): string => (move.act === "enter" || move.act === "leave" ? `${move.act} ${move.node}` : move.act)

const sequencesOf = (length: number): readonly (readonly Move[])[] =>
  length === 0
    ? [[]]
    : sequencesOf(length - 1).flatMap((prefix) => MOVES.map((move) => [...prefix, move]))

/** What the ledger says, totalled per node across every drain in the sequence. */
const ledgerReading = (moves: readonly Move[]) => {
  const ledger = createSignalLedger()
  const dwelled = new Map<string, number>()
  const viewed: { readonly nodeId: string; readonly at: number }[] = []

  moves.forEach((move, index) => {
    const at = index * STEP_MS

    if (move.act === "enter") ledger.entered(PARTS[move.node], at)
    else if (move.act === "leave") ledger.left(PARTS[move.node].nodeId, at)
    else if (move.act === "hide") ledger.hid(at)
    else if (move.act === "show") ledger.showed(at)
    else
      for (const signal of ledger.drain(at)) {
        if (signal.kind === "dwelled") dwelled.set(signal.nodeId, (dwelled.get(signal.nodeId) ?? 0) + signal.ms)
        if (signal.kind === "viewed") viewed.push({ nodeId: signal.nodeId, at: signal.at })
      }
  })

  return { dwelled, viewed }
}

/** What a timeline of the same sequence says, computed without a ledger. */
const modelReading = (moves: readonly Move[]) => {
  const lastDrain = moves.reduce((last, move, index) => (move.act === "drain" ? index : last), -1)

  const onScreen = new Set<string>()
  let visible = true

  const dwelled = new Map<string, number>()
  /** Whether the node was on screen in a visible tab just after each event. */
  const watched: Record<string, readonly boolean[]> = { a: [], b: [] }

  moves.forEach((move, index) => {
    if (move.act === "enter") onScreen.add(move.node)
    else if (move.act === "leave") onScreen.delete(move.node)
    else if (move.act === "hide") visible = false
    else if (move.act === "show") visible = true

    for (const node of ["a", "b"] as const) {
      watched[node] = [...(watched[node] ?? []), visible && onScreen.has(node)]

      const reported = index + 1 <= lastDrain
      if (visible && onScreen.has(node) && reported)
        dwelled.set(PARTS[node].nodeId, (dwelled.get(PARTS[node].nodeId) ?? 0) + STEP_MS)
    }
  })

  return { dwelled, watched }
}

describe("every short sequence of what a tab can do", () => {
  const sequences = sequencesOf(5)

  it("runs the whole alphabet, so the sweep is not quietly empty", () => {
    expect(sequences).toHaveLength(MOVES.length ** 5)
  })

  it("has something to compare, so a sweep of nothing cannot pass by agreeing with itself", () => {
    const credited = sequences.filter((moves) => modelReading(moves).dwelled.size > 0)

    expect(credited.length).toBeGreaterThan(sequences.length / 10)
  })

  it("never credits a reader with time the page was not in front of them", () => {
    const wrong = sequences.filter((moves) => {
      const ledger = ledgerReading(moves)
      const model = modelReading(moves)

      return (["a", "b"] as const).some(
        (node) => (ledger.dwelled.get(PARTS[node].nodeId) ?? 0) !== (model.dwelled.get(PARTS[node].nodeId) ?? 0)
      )
    })

    expect(wrong.map((moves) => moves.map(nameOf).join(" · "))).toEqual([])
  })

  it("views a node at most once, and only at a moment it was on screen and the page was visible", () => {
    const wrong = sequences.filter((moves) => {
      const { viewed } = ledgerReading(moves)
      const { watched } = modelReading(moves)

      const twice = (["a", "b"] as const).some(
        (node) => viewed.filter((signal) => signal.nodeId === PARTS[node].nodeId).length > 1
      )

      return (
        twice ||
        viewed.some((signal) => {
          const node = signal.nodeId === PARTS.a.nodeId ? "a" : "b"
          return (watched[node] ?? [])[signal.at / STEP_MS] !== true
        })
      )
    })

    expect(wrong.map((moves) => moves.map(nameOf).join(" · "))).toEqual([])
  })
})
