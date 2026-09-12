import type { NodeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"

import type { ReaderSignal } from "./signal.js"

/**
 * The bookkeeping behind a broadcast, with no browser in it.
 *
 * Everything the broadcaster observes arrives here as a plain call with a
 * timestamp — this node came on screen, that one left, the tab was hidden — and
 * everything it sends leaves as the signals `drain` returns. Keeping the
 * arithmetic out of the DOM code is what lets the one part that can be wrong in
 * a subtle way (time counted twice, or counted while nobody was looking) be
 * tested exactly.
 *
 * **Its state is held inside the ledger and changed in place.** A ledger that
 * returned a fresh copy on every call was the first version, and it cost the
 * square of the page: every node seen for the first time copied the set of every
 * node seen before it, so scrolling a 6,000-node page took twelve times as long
 * as a 1,000-node one rather than six. A ledger is one broadcaster's private
 * accumulator, reached by nothing else, which is the same shape
 * `collectTelemetry` holds its buffer in — the state is contained, and every
 * call is constant time.
 */

export type SignalAddress = {
  readonly nodeId: NodeId
  readonly type: PrimitiveType
}

export type SignalLedger = {
  /** A node came into view. The first time it is seen while the page is visible, it is also `viewed`. */
  readonly entered: (address: SignalAddress, now: number) => void
  readonly left: (nodeId: NodeId, now: number) => void
  /** Something a reader did, queued as it happened. */
  readonly noted: (signal: ReaderSignal) => void
  /** The page stopped being looked at. Open stretches close; the nodes stay on screen. */
  readonly hid: (now: number) => void
  /** The page is looked at again. What is on screen starts counting, and is viewed if it never was. */
  readonly showed: (now: number) => void
  /**
   * Everything owed since the last drain. Open stretches are cut at `now` and
   * restarted from it, so a node that stays on screen across many batches is
   * counted once per millisecond, in whichever batch that millisecond fell.
   * Sub-millisecond remainders are dropped: a `dwelled` must be a whole number.
   */
  readonly drain: (now: number) => readonly ReaderSignal[]
}

type OnScreen = {
  readonly address: SignalAddress
  /** When the current stretch started, or `null` while the page is hidden. */
  since: number | null
}

export const createSignalLedger = (hiddenAtStart = false): SignalLedger => {
  const onScreen = new Map<NodeId, OnScreen>()
  const seen = new Set<NodeId>()
  const dwell = new Map<NodeId, { readonly address: SignalAddress; ms: number }>()
  let queued: ReaderSignal[] = []
  let hidden = hiddenAtStart

  const accrue = (entry: OnScreen, now: number): void => {
    if (entry.since === null || now <= entry.since) return

    const total = dwell.get(entry.address.nodeId)
    if (total === undefined) dwell.set(entry.address.nodeId, { address: entry.address, ms: now - entry.since })
    else total.ms += now - entry.since
  }

  /** Only ever while visible: a node on screen in a tab nobody is looking at has not been viewed. */
  const sighted = (address: SignalAddress, now: number): void => {
    if (seen.has(address.nodeId)) return
    seen.add(address.nodeId)
    queued.push({ kind: "viewed", ...address, at: now })
  }

  return {
    entered: (address, now) => {
      if (onScreen.has(address.nodeId)) return
      onScreen.set(address.nodeId, { address, since: hidden ? null : now })
      if (!hidden) sighted(address, now)
    },

    left: (nodeId, now) => {
      const entry = onScreen.get(nodeId)
      if (entry === undefined) return
      accrue(entry, now)
      onScreen.delete(nodeId)
    },

    noted: (signal) => {
      queued.push(signal)
    },

    hid: (now) => {
      if (hidden) return
      hidden = true
      for (const entry of onScreen.values()) {
        accrue(entry, now)
        entry.since = null
      }
    },

    showed: (now) => {
      if (!hidden) return
      hidden = false
      for (const entry of onScreen.values()) {
        entry.since = now
        sighted(entry.address, now)
      }
    },

    drain: (now) => {
      if (queued.length === 0 && dwell.size === 0 && (hidden || onScreen.size === 0)) return []

      if (!hidden) {
        for (const entry of onScreen.values()) {
          accrue(entry, now)
          entry.since = now
        }
      }

      const dwelled: ReaderSignal[] = []
      for (const { address, ms } of dwell.values()) {
        const whole = Math.floor(ms)
        if (whole > 0) dwelled.push({ kind: "dwelled", ...address, ms: whole })
      }

      const signals = queued.length === 0 ? dwelled : [...queued, ...dwelled]
      queued = []
      dwell.clear()

      return signals
    },
  }
}
