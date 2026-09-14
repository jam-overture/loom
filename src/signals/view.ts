import type { ViewKey } from "./signal.js"

/**
 * The one value in the reader-signal seam that correlates anything.
 *
 * A view key is minted in the browser when a broadcast starts, rides every
 * batch of that one page view, and is never seen again. It exists so a funnel
 * can be answered — *of the views that reached the pricing band, how many
 * pressed the button* — which per-node totals cannot answer and which is half
 * of what the portal is for ([0146](../../decisions/0146-a-reader-signal-stays-anonymous-and-a-funnel-is-correlated-inside-one-page-view.md)).
 *
 * Everything else about it is a refusal. It is not a cookie and is not written
 * to storage of any kind, so it does not survive a reload. It is not derived
 * from the reader, their device, their address or their clock — it is random
 * bytes and nothing else. It does not leave the aggregation step: rollup reads
 * it and the counters it produces do not carry it, so it expires with the raw
 * window.
 *
 * **The shape is strict for a reason that is not tidiness.** A free-form string
 * here is an identity backdoor: a host wanting a visitor id could put one in
 * this field and everything downstream would keep working. Thirty-two hex
 * characters of nothing hold no room for a hash of an address, an account id,
 * or a user agent, and a batch carrying one is refused at the parser rather
 * than stored and noticed later.
 *
 * This module is loaded by the broadcaster, so it imports no package and
 * touches no schema (0136). The schema built from the constants below lives in
 * `signal.ts`, which a browser never loads.
 */

/**
 * 128 bits, the same width a UUID spends on randomness.
 *
 * The number that matters is not the collision probability against all views
 * ever, but against the views inside one raw window on one deployment — the
 * only span in which two keys are ever compared. At 128 bits that is
 * unreachable, and the field costs 32 bytes on a batch that already carries
 * several signals.
 */
export const VIEW_KEY_BYTES = 16

export const VIEW_KEY_LENGTH = VIEW_KEY_BYTES * 2

export const viewKeyPattern = /^[0-9a-f]{32}$/

/**
 * Where the randomness comes from. A parameter so a test can mint a key it can
 * name, and for no other reason — a host has no business supplying this.
 */
export type RandomBytes = (count: number) => Uint8Array

/**
 * `crypto.getRandomValues` is present wherever the broadcaster can run: it
 * predates `IntersectionObserver`, which the broadcaster already requires, and
 * unlike `crypto.subtle` it does not need a secure context. There is no
 * `Math.random` fallback on purpose — a weak key is worse than no funnel,
 * because nothing downstream can tell which one it got.
 */
const cryptoRandomBytes: RandomBytes = (count) => globalThis.crypto.getRandomValues(new Uint8Array(count))

const hex = (byte: number): string => byte.toString(16).padStart(2, "0")

/**
 * A fresh view key. Called once per broadcast, never per batch — the whole
 * point is that the batches of one page view agree.
 */
export const mintViewKey = (random: RandomBytes = cryptoRandomBytes): ViewKey =>
  Array.from(random(VIEW_KEY_BYTES), hex).join("") as ViewKey
