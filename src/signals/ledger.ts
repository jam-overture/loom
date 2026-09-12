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
 */

export type SignalAddress = {
  readonly nodeId: NodeId
  readonly type: PrimitiveType
}

type OnScreen = {
  readonly address: SignalAddress
  /** When the current stretch started, or `null` while the page is hidden. */
  readonly since: number | null
}

export type SignalLedger = {
  readonly onScreen: ReadonlyMap<NodeId, OnScreen>
  readonly seen: ReadonlySet<NodeId>
  readonly dwell: ReadonlyMap<NodeId, { readonly address: SignalAddress; readonly ms: number }>
  readonly queued: readonly ReaderSignal[]
  readonly hidden: boolean
}

export const emptyLedger = (hidden = false): SignalLedger => ({
  onScreen: new Map(),
  seen: new Set(),
  dwell: new Map(),
  queued: [],
  hidden,
})

const withEntry = <K, V>(map: ReadonlyMap<K, V>, key: K, value: V): ReadonlyMap<K, V> =>
  new Map(map).set(key, value)

const withoutEntry = <K, V>(map: ReadonlyMap<K, V>, key: K): ReadonlyMap<K, V> => {
  const next = new Map(map)
  next.delete(key)
  return next
}

/** Close one stretch of time on screen into the dwell total. */
const accrue = (ledger: SignalLedger, entry: OnScreen, now: number): SignalLedger => {
  if (entry.since === null || now <= entry.since) return ledger

  const current = ledger.dwell.get(entry.address.nodeId)?.ms ?? 0

  return {
    ...ledger,
    dwell: withEntry(ledger.dwell, entry.address.nodeId, {
      address: entry.address,
      ms: current + (now - entry.since),
    }),
  }
}

/**
 * A node is seen for the first time: `viewed`, once for the life of the page.
 *
 * Only ever called while the page is visible. A node that is on screen in a tab
 * nobody is looking at has not been viewed — a page opened in the background
 * would otherwise report its whole first screen as read.
 */
const sighted = (ledger: SignalLedger, address: SignalAddress, now: number): SignalLedger =>
  ledger.seen.has(address.nodeId)
    ? ledger
    : {
        ...ledger,
        seen: new Set(ledger.seen).add(address.nodeId),
        queued: [...ledger.queued, { kind: "viewed", ...address, at: now }],
      }

/** A node came into view. Returning after the first time is dwell and nothing else. */
export const entered = (ledger: SignalLedger, address: SignalAddress, now: number): SignalLedger => {
  if (ledger.onScreen.has(address.nodeId)) return ledger

  const placed = {
    ...ledger,
    onScreen: withEntry(ledger.onScreen, address.nodeId, { address, since: ledger.hidden ? null : now }),
  }

  return ledger.hidden ? placed : sighted(placed, address, now)
}

export const left = (ledger: SignalLedger, nodeId: NodeId, now: number): SignalLedger => {
  const entry = ledger.onScreen.get(nodeId)
  if (entry === undefined) return ledger

  return { ...accrue(ledger, entry, now), onScreen: withoutEntry(ledger.onScreen, nodeId) }
}

/** Something a reader did, queued as it happened. */
export const noted = (ledger: SignalLedger, signal: ReaderSignal): SignalLedger => ({
  ...ledger,
  queued: [...ledger.queued, signal],
})

/**
 * The page stopped being looked at. Every open stretch closes now, and the nodes
 * stay on screen — they did not move, nobody is reading them.
 */
export const hid = (ledger: SignalLedger, now: number): SignalLedger => {
  if (ledger.hidden) return ledger

  const closed = [...ledger.onScreen.values()].reduce((next, entry) => accrue(next, entry, now), ledger)

  return {
    ...closed,
    hidden: true,
    onScreen: new Map([...ledger.onScreen].map(([id, entry]) => [id, { ...entry, since: null }])),
  }
}

/** The page is being looked at again. Whatever is on screen starts counting, and is viewed if it never was. */
export const showed = (ledger: SignalLedger, now: number): SignalLedger => {
  if (!ledger.hidden) return ledger

  const resumed: SignalLedger = {
    ...ledger,
    hidden: false,
    onScreen: new Map([...ledger.onScreen].map(([id, entry]) => [id, { ...entry, since: now }])),
  }

  return [...resumed.onScreen.values()].reduce((next, entry) => sighted(next, entry.address, now), resumed)
}

/**
 * Everything owed since the last drain, and the ledger that is left.
 *
 * Open stretches are cut at `now` and restarted from it, so a node that stays on
 * screen across many batches is counted once per millisecond, in whichever batch
 * that millisecond fell. Sub-millisecond remainders are dropped rather than
 * carried: a `dwelled` must be a positive whole number, and a fraction nobody
 * could perceive is not worth a rule for carrying it.
 */
export const drain = (
  ledger: SignalLedger,
  now: number
): { readonly signals: readonly ReaderSignal[]; readonly ledger: SignalLedger } => {
  const closed = [...ledger.onScreen.values()].reduce((next, entry) => accrue(next, entry, now), ledger)

  const dwelled: ReaderSignal[] = [...closed.dwell.values()]
    .map(({ address, ms }) => ({ kind: "dwelled" as const, ...address, ms: Math.floor(ms) }))
    .filter((signal) => signal.ms > 0)

  return {
    signals: [...closed.queued, ...dwelled],
    ledger: {
      ...closed,
      dwell: new Map(),
      queued: [],
      onScreen: new Map(
        [...closed.onScreen].map(([id, entry]) => [id, { ...entry, since: closed.hidden ? null : now }])
      ),
    },
  }
}
