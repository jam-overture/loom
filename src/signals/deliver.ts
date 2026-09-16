import type { ReaderSignalBatch } from "./signal.js"

/**
 * Getting a batch off the page.
 *
 * `broadcastReaderSignals` takes a `send` and does not care what it does, which
 * is right — a sink observes and does not get a vote (0042), and a broadcaster
 * that knew about URLs would be a broadcaster a test had to stub a network for.
 * What that leaves is every host writing the same fifteen lines, and the two
 * that exist in this repository are both written for a page that draws the
 * batch rather than posts it. This is the `send` for the ordinary case.
 *
 * **It imports nothing at runtime.** The batch arrives as a type, which is
 * erased, so this module costs a browser bundle its own bytes and no schema —
 * the same property `view.ts` has and for the same reason (0136).
 *
 * **`sendBeacon` first, `fetch` second, and neither ever throws.** A beacon
 * survives the page being closed, which is exactly when the last batch of a
 * page view is sent and exactly when a `fetch` is cancelled. It can also refuse
 * — the browser caps what it will hold in flight — and a refusal is reported by
 * a `false` return rather than an exception, which is easy to write past. When
 * it refuses, the batch is worth one `fetch` with `keepalive`, which is the
 * same guarantee by another road.
 */

/**
 * Where a delivery goes when the host has no opinion.
 *
 * A path rather than a URL, and relative, so it is same-origin by construction.
 * That is not only tidiness: `sendBeacon` cannot preflight, so a cross-origin
 * beacon carrying `application/json` is refused by the browser before it is
 * sent. A deployment that wants to collect signals on another origin has to
 * serve CORS from it and will find out here.
 *
 * It is a default and not a constant the receiver shares. The endpoint's
 * address is a deployment's choice — a host may serve it anywhere, and this is
 * what the host who does not care gets.
 */
export const DEFAULT_READER_SIGNAL_PATH = "/api/reader-signals"

/** `navigator.sendBeacon`, narrowed to what this uses. `false` means it would not take it. */
export type SendBeacon = (url: string, body: Blob) => boolean

/** The fallback. Called only when a beacon was unavailable or refused the batch. */
export type PostBatch = (url: string, body: string) => void

export type DeliverOptions = {
  /** Where to post. {@link DEFAULT_READER_SIGNAL_PATH} when absent. */
  readonly url?: string
  /** The browser's, when absent. A test passes its own. */
  readonly beacon?: SendBeacon | null
  /** `fetch` with `keepalive`, when absent. */
  readonly post?: PostBatch
}

const browserBeacon = (): SendBeacon | null => {
  const sender = globalThis.navigator

  return typeof sender?.sendBeacon === "function" ? (url, body) => sender.sendBeacon(url, body) : null
}

/**
 * `keepalive` is what makes this survive the page it was sent from. Rejections
 * are swallowed here rather than left to the broadcaster's containment, so that
 * a host calling this directly gets the same promise the broadcaster does.
 */
const fetchPost: PostBatch = (url, body) => {
  void globalThis
    .fetch(url, {
      method: "POST",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body,
    })
    .catch(() => undefined)
}

/**
 * A `send` for `broadcastReaderSignals` that posts each batch.
 *
 * ```ts
 * broadcastReaderSignals(root, { send: deliverReaderSignals() })
 * ```
 *
 * Nothing about the response is read, and nothing about it could be useful: the
 * page has no retry to attempt and no reader to tell. A refused batch is a
 * counter that will not be incremented, which is the correct failure for a
 * sink — the alternative is a page whose behaviour depends on whether anybody
 * is measuring it.
 */
export const deliverReaderSignals = (
  options: DeliverOptions = {}
): ((batch: ReaderSignalBatch) => void) => {
  const url = options.url ?? DEFAULT_READER_SIGNAL_PATH
  const post = options.post ?? fetchPost

  return (batch) => {
    const body = JSON.stringify(batch)

    try {
      const beacon = options.beacon === undefined ? browserBeacon() : options.beacon

      if (beacon !== null && beacon(url, new Blob([body], { type: "application/json" }))) return

      post(url, body)
    } catch {
      // A sink does not get a vote (0042).
    }
  }
}
