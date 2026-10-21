import { LOOM_TREE_ATTRIBUTE } from "@jam-overture/loom/react"
import { DEFAULT_READER_SIGNAL_PATH } from "@jam-overture/loom/signals/broadcast"

import { INGEST_KEY_PARAMETER, type IngestKey } from "@/app/_lib/reader-signals/keys"

/**
 * What a project's *Connect your site* screen says, as functions of the facts
 * it says them about.
 *
 * The screen is the last of unit 4: registration mints the key
 * ([0298](../../../../../decisions/0298-a-projects-ingest-key-is-public-and-names-its-application-and-the-door-files-nothing-it-cannot-name.md)
 * clause 1), and this is where somebody is handed it in the form they will use
 * it in. Everything here is a string from a string, so what a customer pastes
 * is tested without a request, a session or a store — the page is the part
 * that cannot be.
 */

/**
 * Where a project's pages post, in full.
 *
 * **Absolute**, which is the one way this differs from the address this
 * deployment's own pages use. A customer's page is on the customer's origin,
 * and a relative path there would post to the customer's server, which has
 * never heard of the door. The origin is the deployment's, as the screen was
 * reached; the key is the project's.
 */
export const signalAddress = (origin: string, key: IngestKey): string =>
  `${origin.replace(/\/+$/u, "")}${DEFAULT_READER_SIGNAL_PATH}?${INGEST_KEY_PARAMETER}=${key}`

/**
 * The snippet a customer pastes into the page that renders their Loom tree.
 *
 * **Exactly the two calls this deployment's own site makes**, with the
 * address spelled out. `broadcastReaderSignals` watches the rendered tree and
 * `deliverReaderSignals` posts what it sees; the second already labels a batch
 * as plain text, so it reaches this deployment from any origin with nothing
 * further on either side. The guard is there because a broadcast needs the
 * root the renderer addresses, and a snippet that threw on a page with no
 * tree would break the customer's page to report that it was not measuring
 * it.
 *
 * No placeholder and no environment variable. The key is public (0298 clause
 * 2), so there is nothing to keep out of a repository, and a snippet that
 * worked only after somebody filled a blank in would be one step longer than
 * the job.
 */
export const snippetFor = (
  address: string
): string => `import { broadcastReaderSignals, deliverReaderSignals } from "@jam-overture/loom/signals/broadcast"

const page = document.querySelector("[${LOOM_TREE_ATTRIBUTE}]")

if (page !== null) {
  broadcastReaderSignals(page, {
    send: deliverReaderSignals({ url: "${address}" }),
  })
}`

/**
 * Where deliveries are taken from, in the words of the person who set it.
 *
 * The host is the project's own field (0298 clause 5), and the door holds a
 * delivery to it exactly — so this says *only*, and says why *anywhere*,
 * because a project with no host is one whose key works from any page that
 * copies it and its owner should be able to see that from here.
 */
export const acceptedFrom = (host: string | undefined): string =>
  host === undefined
    ? "Signals are taken from any site that sends this key, because this project names no site of its own."
    : `Signals are taken from ${host} and nowhere else — not a subdomain, not another port.`
