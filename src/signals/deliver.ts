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
 * A host whose pages are served from somewhere other than the deployment that
 * counts them names that deployment's full address instead, and
 * {@link BATCH_CONTENT_TYPE} is why that works without the deployment serving
 * CORS.
 *
 * It is a default and not a constant the receiver shares. The endpoint's
 * address is a deployment's choice — a host may serve it anywhere, and this is
 * what the host who does not care gets.
 */
export const DEFAULT_READER_SIGNAL_PATH = "/api/reader-signals"

/**
 * What a batch is labelled as on the wire: **plain text, which happens to be
 * JSON**.
 *
 * The label is the whole of what decides whether a delivery can leave a page
 * for another origin. A browser sends a cross-origin `POST` without asking
 * first only when its body is one of three CORS-safelisted types, and
 * `text/plain` is the one of them a JSON document fits. Labelled
 * `application/json` it is not safelisted: a `fetch` has to be preflighted by
 * an `OPTIONS` request the deployment must answer, and a beacon, which cannot
 * preflight at all, is refused by the browser before it is sent. The beacon
 * carries the last batch of every page view, so a label that cost it would
 * cost the batch that matters most, on every customer's site.
 *
 * Nothing receiving a batch reads the label. The door parses the body it is
 * given and refuses what does not parse, so a batch is exactly as checked under
 * this label as under the other one, and same-origin delivery is unchanged.
 */
export const BATCH_CONTENT_TYPE = "text/plain;charset=UTF-8"

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
 *
 * **`no-cors`, because nothing here reads the answer.** Across origins a
 * `cors` request still arrives — its label is safelisted, so nothing is
 * preflighted — but a deployment that sends no CORS headers makes the browser
 * reject the response, and every customer's console would carry an error per
 * batch for a reply this function was going to ignore. `no-cors` asks for an
 * opaque response, which is what ignoring one already was. It permits only
 * safelisted headers, and {@link BATCH_CONTENT_TYPE} is the only one sent.
 */
const fetchPost: PostBatch = (url, body) => {
  void globalThis
    .fetch(url, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: { "content-type": BATCH_CONTENT_TYPE },
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

      if (beacon !== null && beacon(url, new Blob([body], { type: BATCH_CONTENT_TYPE }))) return

      post(url, body)
    } catch {
      // A sink does not get a vote (0042).
    }
  }
}
