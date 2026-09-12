import { nodeIdSchema, treeIdSchema, type TreeId } from "../ids.js"
import { primitiveTypeSchema } from "../primitive-type.js"
import { DISCLOSED_ATTRIBUTE } from "../render/disclosed.js"
import {
  LOOM_NODE_ATTRIBUTE,
  LOOM_REVISION_ATTRIBUTE,
  LOOM_TREE_ATTRIBUTE,
  LOOM_TYPE_ATTRIBUTE,
} from "../render/editable.js"
import { err, ok, type Result } from "../result.js"

import { drain, emptyLedger, entered, hid, left, noted, showed, type SignalAddress } from "./ledger.js"
import {
  READER_SIGNAL_KINDS,
  type ReaderSignal,
  type ReaderSignalBatch,
  type ReaderSignalKind,
} from "./signal.js"

/**
 * Broadcasting reader signals from a rendered Loom page.
 *
 * The browser half of the seam. Point it at the root element of a page rendered
 * with `addressed: true` and it watches the nodes on that page, gathers what
 * readers do with them, and delivers a batch every few seconds — as a DOM event
 * anything on the page can listen for, and to a `send` function if the host
 * gives one.
 *
 * **Off unless a host calls it.** The library renders no script and starts no
 * observer on its own; a page that never calls this broadcasts nothing (0136).
 *
 * **Configured by the host, never by the tree.** Which kinds and which primitive
 * types are broadcast is an argument here, not a prop a proposal could set — a
 * model must not be able to switch measurement of readers on by writing a delta.
 *
 * **It reads the page, not the components.** Every fact it needs is already on
 * the markup: identity from the addressed attributes, what a reader can aim at
 * from the elements HTML gives targets, and a disclosure from the attribute the
 * disclose control stamps. No primitive is instrumented, so no primitive can
 * forget to be.
 */

/** The DOM event a batch is dispatched as, on the root element. It bubbles. */
export const READER_SIGNALS_EVENT = "loom:signals"

/**
 * What a reader can aim at, as HTML defines it. `summary` is left out on
 * purpose: opening a `details` is reported as `disclosed`, and reporting the same
 * click twice under two kinds would double-count the one thing a reader did.
 */
const TARGET_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  '[role="button"]',
  '[role="link"]',
].join(",")

/** Something that reports elements coming into and out of view. The browser's `IntersectionObserver` unless a host passes its own. */
export type VisibilityObserver = {
  readonly observe: (element: Element) => void
  readonly disconnect: () => void
}

export type VisibilityEntry = {
  readonly target: Element
  readonly visible: boolean
}

export type ObserveVisibility = (onChange: (entries: readonly VisibilityEntry[]) => void) => VisibilityObserver

/**
 * Which primitive types are worth which kind of signal.
 *
 * A page rarely wants the same list for all four. A rail wants time on screen for
 * its sections, activations for the links and buttons inside them, and
 * disclosures for its questions; one list for every kind makes it name all of
 * those types for all of those kinds and then throw away what it did not want —
 * paying to gather, batch and send signals in order to discard them.
 *
 * **A kind not named here is unrestricted, not off.** `kinds` is the switch for
 * whether a kind is broadcast at all, and this is the filter for which types it
 * covers; keeping the two axes separate means neither has to be read to
 * understand the other.
 */
export type ReaderSignalTypeFilter = Partial<Record<ReaderSignalKind, readonly string[]>>

export type ReaderSignalOptions = {
  /** Called with every batch. A throw or rejection here is contained and never reaches the page. */
  readonly send?: (batch: ReaderSignalBatch) => void | Promise<void>
  /** Which kinds to broadcast. Every kind when absent. */
  readonly kinds?: readonly ReaderSignalKind[]
  /**
   * Which primitive types to broadcast about. Every addressed type when absent.
   *
   * A plain list is that list for every kind. Keyed by kind, it is that list for
   * each kind named and no restriction on the rest.
   */
  readonly types?: readonly string[] | ReaderSignalTypeFilter
  /** How often a batch is delivered. Five seconds when absent. */
  readonly flushEveryMs?: number
  /**
   * How the broadcaster learns what is on screen. The browser's
   * `IntersectionObserver` when absent; a test passes its own.
   */
  readonly observeVisibility?: ObserveVisibility
  /** The clock. `Date.now` when absent. */
  readonly now?: () => number
}

export type ReaderSignalBroadcast = {
  /** Deliver whatever has been gathered, now. */
  readonly flush: () => void
  /** Deliver what is left and stop observing. Safe to call twice. */
  readonly stop: () => void
}

export type ReaderSignalBroadcastError = {
  /** The root carries no tree id or revision — the page was not rendered with `addressed: true`. */
  readonly code: "unaddressed"
  readonly detail: string
}

const DEFAULT_FLUSH_MS = 5000

/**
 * On screen means a reader could be reading it: at least half of the element is
 * visible, or it fills at least 30% of the viewport. The second clause is not
 * optional — the visible fraction of an element taller than the window can never
 * reach one half, so a long section judged by the first alone is never viewed.
 */
const isReadable = (entry: IntersectionObserverEntry): boolean => {
  if (!entry.isIntersecting) return false

  const viewport = entry.rootBounds?.height ?? globalThis.innerHeight ?? 0
  const fills = viewport > 0 && entry.intersectionRect.height / viewport >= 0.3

  return entry.intersectionRatio >= 0.5 || fills
}

const intersectionVisibility: ObserveVisibility = (onChange) => {
  const observer = new IntersectionObserver(
    (entries) => onChange(entries.map((entry) => ({ target: entry.target, visible: isReadable(entry) }))),
    { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] }
  )

  return { observe: (element) => observer.observe(element), disconnect: () => observer.disconnect() }
}

/**
 * Both spellings of `types`, as one lookup.
 *
 * A plain list is the keyed form with every kind given the same list, so the
 * rest of the module asks one question and never learns which spelling a host
 * used. `undefined` for a kind means unrestricted.
 */
const typesByKind = (
  types: ReaderSignalOptions["types"]
): Partial<Record<ReaderSignalKind, ReadonlySet<string>>> | undefined => {
  if (types === undefined) return undefined

  if (Array.isArray(types)) {
    const every = new Set(types as readonly string[])

    return Object.fromEntries(READER_SIGNAL_KINDS.map((kind) => [kind, every]))
  }

  return Object.fromEntries(
    READER_SIGNAL_KINDS.flatMap((kind) => {
      const allowed = (types as ReaderSignalTypeFilter)[kind]

      return allowed === undefined ? [] : [[kind, new Set(allowed)] as const]
    })
  )
}

/** The identity an element carries, or `undefined` when it carries none worth trusting. */
const addressOf = (element: Element): SignalAddress | undefined => {
  const nodeId = nodeIdSchema.safeParse(element.getAttribute(LOOM_NODE_ATTRIBUTE))
  const type = primitiveTypeSchema.safeParse(element.getAttribute(LOOM_TYPE_ATTRIBUTE))

  return nodeId.success && type.success ? { nodeId: nodeId.data, type: type.data } : undefined
}

const pageOf = (root: Element): Result<{ treeId: TreeId; revision: number }, ReaderSignalBroadcastError> => {
  const treeId = treeIdSchema.safeParse(root.getAttribute(LOOM_TREE_ATTRIBUTE))
  /**
   * Matched as digits before it is converted. `Number(null)` and `Number("")` are
   * both 0, so a page with no revision at all would otherwise pass as revision 0
   * and every signal from it would be filed under a revision it never had.
   */
  const written = root.getAttribute(LOOM_REVISION_ATTRIBUTE) ?? ""
  const revision = /^\d+$/.test(written) ? Number(written) : Number.NaN

  return treeId.success && Number.isSafeInteger(revision)
    ? ok({ treeId: treeId.data, revision })
    : err({
        code: "unaddressed",
        detail: `the root element carries no ${LOOM_TREE_ATTRIBUTE} and ${LOOM_REVISION_ATTRIBUTE}; render the page with addressed: true`,
      })
}

/** The nearest addressed element at or above `element`, without leaving the page. */
const nearestAddressed = (root: Element, element: Element): Element | undefined => {
  const found = element.closest(`[${LOOM_NODE_ATTRIBUTE}]`)
  return found !== null && root.contains(found) ? found : undefined
}

/** A sink observes; it does not get a vote (0042). Neither a throw nor a rejection reaches the page. */
const deliverSafely = (send: ReaderSignalOptions["send"], batch: ReaderSignalBatch): void => {
  if (send === undefined) return

  try {
    const pending = send(batch)
    if (pending instanceof Promise) pending.catch(() => undefined)
  } catch {
    // Contained by design.
  }
}

/**
 * Start broadcasting reader signals from the page under `root`.
 *
 * Returns an error rather than broadcasting nothing when the page is not
 * addressed, because a silent broadcaster on an unaddressed page is exactly the
 * misconfiguration nobody would notice.
 */
export const broadcastReaderSignals = (
  root: Element,
  options: ReaderSignalOptions = {}
): Result<ReaderSignalBroadcast, ReaderSignalBroadcastError> => {
  const page = pageOf(root)
  if (!page.ok) return page

  const now = options.now ?? Date.now
  const kinds = new Set<ReaderSignalKind>(options.kinds ?? READER_SIGNAL_KINDS)
  const types = typesByKind(options.types)
  const document = root.ownerDocument

  /**
   * The one rule about what may be broadcast, asked wherever a signal could
   * leave. Both axes are here rather than split across the two paths, because
   * `viewed` and `dwelled` are not produced where they are observed — the ledger
   * makes them — so a check at the observer is not a check on the signal.
   */
  const allows = (kind: ReaderSignalKind, type: string): boolean => {
    if (!kinds.has(kind)) return false
    const allowed = types?.[kind]

    return allowed === undefined || allowed.has(type)
  }

  /** Worth watching if any kind that reads visibility would report on this type. */
  const watchable = (address: SignalAddress): boolean =>
    allows("viewed", address.type) || allows("dwelled", address.type)

  let ledger = emptyLedger(document.visibilityState === "hidden")
  let stopped = false

  const record = (kind: ReaderSignalKind, signal: (address: SignalAddress) => ReaderSignal) =>
    (element: Element): void => {
      const target = nearestAddressed(root, element)
      const address = target === undefined ? undefined : addressOf(target)
      if (address === undefined || !allows(kind, address.type)) return
      ledger = noted(ledger, signal(address))
    }

  const flush = (): void => {
    const drained = drain(ledger, now())
    ledger = drained.ledger

    const signals = drained.signals.filter((signal) => allows(signal.kind, signal.type))
    if (signals.length === 0) return

    const batch: ReaderSignalBatch = {
      treeId: page.value.treeId,
      revision: page.value.revision,
      sentAt: now(),
      signals,
    }

    root.dispatchEvent(new CustomEvent(READER_SIGNALS_EVENT, { detail: batch, bubbles: true }))
    deliverSafely(options.send, batch)
  }

  const watchesTime = kinds.has("viewed") || kinds.has("dwelled")

  const visibility = watchesTime
    ? (options.observeVisibility ?? intersectionVisibility)((entries) => {
        for (const entry of entries) {
          const address = addressOf(entry.target)
          if (address === undefined) continue
          ledger = entry.visible ? entered(ledger, address, now()) : left(ledger, address.nodeId, now())
        }
      })
    : undefined

  if (visibility !== undefined) {
    const candidates = [root, ...Array.from(root.querySelectorAll(`[${LOOM_NODE_ATTRIBUTE}]`))]
    for (const element of candidates) {
      const address = addressOf(element)
      if (address !== undefined && watchable(address)) visibility.observe(element)
    }
  }

  const onActivated = record("activated", (address) => ({ kind: "activated", ...address, at: now() }))

  const onClick = (event: Event): void => {
    const control = event.target instanceof Element ? event.target.closest(TARGET_SELECTOR) : null
    if (control === null || !root.contains(control)) return
    /** A disclose control reports as `disclosed`, for the same reason `summary` is left out above. */
    if (control.hasAttribute(DISCLOSED_ATTRIBUTE)) return
    onActivated(control)
  }

  /**
   * The last state each `details` was seen in, so only a change is reported.
   *
   * A browser fires `toggle` for a `details` that was *authored* open, as the
   * page loads — nobody opened it. Snapshotting every one when broadcasting
   * starts, and reporting a toggle only when it disagrees with the snapshot, is
   * what keeps a page's own markup from reading as a reader's action. One added
   * to the page later has no snapshot, and its first toggle is taken at its word.
   */
  const lastOpen = new WeakMap<HTMLDetailsElement, boolean>(
    Array.from(root.querySelectorAll("details")).map((details) => [details, details.open])
  )

  const onToggle = (event: Event): void => {
    const details = event.target
    if (!(details instanceof HTMLDetailsElement)) return
    if (lastOpen.get(details) === details.open) return
    lastOpen.set(details, details.open)
    record("disclosed", (address) => ({ kind: "disclosed", ...address, open: details.open, at: now() }))(details)
  }

  const disclosures = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (!(mutation.target instanceof Element)) continue
      const open = mutation.target.getAttribute(DISCLOSED_ATTRIBUTE)
      const settled = open === "true" || open === "false"
      if (!settled || mutation.oldValue === null || mutation.oldValue === open) continue
      record("disclosed", (address) => ({ kind: "disclosed", ...address, open: open === "true", at: now() }))(
        mutation.target
      )
    }
  })

  const onVisibility = (): void => {
    if (document.visibilityState === "hidden") {
      ledger = hid(ledger, now())
      flush()
    } else {
      ledger = showed(ledger, now())
    }
  }

  const onPageHide = (): void => flush()

  root.addEventListener("click", onClick)
  root.addEventListener("toggle", onToggle, true)
  disclosures.observe(root, {
    attributes: true,
    attributeFilter: [DISCLOSED_ATTRIBUTE],
    attributeOldValue: true,
    subtree: true,
  })
  document.addEventListener("visibilitychange", onVisibility)
  document.defaultView?.addEventListener("pagehide", onPageHide)
  const timer = setInterval(flush, options.flushEveryMs ?? DEFAULT_FLUSH_MS)

  const stop = (): void => {
    if (stopped) return
    stopped = true
    flush()
    clearInterval(timer)
    visibility?.disconnect()
    disclosures.disconnect()
    root.removeEventListener("click", onClick)
    root.removeEventListener("toggle", onToggle, true)
    document.removeEventListener("visibilitychange", onVisibility)
    document.defaultView?.removeEventListener("pagehide", onPageHide)
  }

  return ok({ flush, stop })
}
