import { NAMESPACED_ID_PATTERN, NODE_ID_PATTERN, TREE_ID_PATTERN } from "../grammar.js"
import type { NodeId, TreeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import { DISCLOSED_ATTRIBUTE } from "../render/disclosed.js"
import {
  LOOM_NODE_ATTRIBUTE,
  LOOM_REVISION_ATTRIBUTE,
  LOOM_TREE_ATTRIBUTE,
  LOOM_TYPE_ATTRIBUTE,
} from "../render/editable.js"
import { err, ok, type Result } from "../result.js"

import { createSignalLedger, type SignalAddress } from "./ledger.js"
import { READER_SIGNAL_KINDS } from "./kinds.js"
import type { ReaderSignal, ReaderSignalBatch, ReaderSignalKind } from "./signal.js"
import { mintViewKey, type RandomBytes } from "./view.js"

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
 *
 * **A press says which regions it was in.** A reader aims at a button, and a
 * button is an addressed node of its own, so the node an `activated` names is
 * the control rather than the band. The addressed elements above it go on the
 * signal as `within`, read off the walk this was already doing — because which
 * region a node sat in is a fact about the page at the moment of the press, and
 * nothing downstream can recover it afterwards. A `completed` carries the same
 * walk, for the same reason and more sharply: *which band converted* is the
 * question a deployment opens the portal to ask.
 *
 * **A completion is a form the browser let go.** Nothing else on the page is a
 * finish a reader can be said to have reached, and nothing else is observable
 * without asking the network how it went (0209).
 *
 * **It keeps up with a page that changes.** Nodes that arrive after it started
 * are watched and nodes that leave stop counting, so a band behind a Suspense
 * boundary, a list that grows, and every region a proposal has just changed are
 * measured like the rest. What it does *not* follow is the page becoming a
 * different page: the tree and revision are read once, off the root, and every
 * batch is filed under them. **A new root, or a new revision in the same root,
 * is a new broadcast** — `stop()` the old one and start another, or a
 * client-side navigation files its signals under the revision it left.
 */

/** The DOM event a batch is dispatched as, on the root element. It bubbles. */
/**
 * The delivery helper travels with this entry point rather than getting one of
 * its own.
 *
 * `deliver.ts` imports nothing at runtime, so it costs the same bytes reached
 * from here as it would through a door of its own — and a host who is starting
 * a broadcaster in a browser bundle is exactly the host who needs a `send`. One
 * import line for the two things that are always used together.
 */
export {
  DEFAULT_READER_SIGNAL_PATH,
  deliverReaderSignals,
  type DeliverOptions,
  type PostBatch,
  type SendBeacon,
} from "./deliver.js"

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

/** The primitive types to report on: one list for every kind, or a list per kind (0136). */
export type ReaderSignalTypes =
  | readonly string[]
  | { readonly [Kind in ReaderSignalKind]?: readonly string[] }

/**
 * The host's `kinds` and `types`, as one question: is this kind of signal about
 * this type of primitive wanted?
 */
const selectionOf = (
  kinds: readonly ReaderSignalKind[] | undefined,
  types: ReaderSignalTypes | undefined
): ((kind: ReaderSignalKind, type: string) => boolean) => {
  const enabled = new Set<ReaderSignalKind>(kinds ?? READER_SIGNAL_KINDS)

  const allowed = new Map<ReaderSignalKind, ReadonlySet<string>>(
    types === undefined
      ? []
      : Array.isArray(types)
        ? READER_SIGNAL_KINDS.map((kind) => [kind, new Set(types)])
        : READER_SIGNAL_KINDS.flatMap((kind) => {
            const listed = (types as Exclude<ReaderSignalTypes, readonly string[]>)[kind]
            return listed === undefined ? [] : [[kind, new Set(listed)] as const]
          })
  )

  return (kind, type) => enabled.has(kind) && (allowed.get(kind)?.has(type) ?? true)
}

export type ReaderSignalOptions = {
  /** Called with every batch. A throw or rejection here is contained and never reaches the page. */
  readonly send?: (batch: ReaderSignalBatch) => void | Promise<void>
  /** Which kinds to broadcast. Every kind when absent. */
  readonly kinds?: readonly ReaderSignalKind[]
  /**
   * Which primitive types to broadcast about. Every addressed type when absent.
   *
   * A list applies to every kind. An object sets it per kind — time on screen
   * for sections, activations for links — and a kind it does not name is
   * reported for every type, exactly as if `types` were absent for that kind.
   * Whether a kind is reported at all is still `kinds`.
   */
  readonly types?: ReaderSignalTypes
  /** How often a batch is delivered. Five seconds when absent. */
  readonly flushEveryMs?: number
  /**
   * How the broadcaster learns what is on screen. The browser's
   * `IntersectionObserver` when absent; a test passes its own.
   */
  readonly observeVisibility?: ObserveVisibility
  /**
   * Whether a delegated signal carries the addressed nodes it happened inside.
   * On when absent.
   *
   * `activated` and `disclosed` are filed against the control a reader aimed
   * at, which is an addressed node of its own — so without the ancestry a
   * deployment can report which button was pressed and never which region it
   * was in. Off is for a host that reports on controls only and would rather
   * not carry the walk in every batch.
   */
  readonly within?: boolean
  /** The clock. `Date.now` when absent. */
  readonly now?: () => number
  /**
   * Where the view key's randomness comes from. The browser's
   * `crypto.getRandomValues` when absent; a test passes its own so it can name
   * the key it expects.
   */
  readonly random?: RandomBytes
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
 * Recognisers built from the id grammar rather than the schemas, so the
 * broadcaster ships no schema library to the browser. The check is the same
 * pattern the schemas apply; the brand is a claim that pattern earns.
 */
const isNodeId = (value: string | null): value is NodeId => value !== null && NODE_ID_PATTERN.test(value)
const isTreeId = (value: string | null): value is TreeId => value !== null && TREE_ID_PATTERN.test(value)
const isPrimitiveType = (value: string | null): value is PrimitiveType =>
  value !== null && NAMESPACED_ID_PATTERN.test(value)

/** The identity an element carries, or `undefined` when it carries none worth trusting. */
const addressOf = (element: Element): SignalAddress | undefined => {
  const nodeId = element.getAttribute(LOOM_NODE_ATTRIBUTE)
  const type = element.getAttribute(LOOM_TYPE_ATTRIBUTE)

  return isNodeId(nodeId) && isPrimitiveType(type) ? { nodeId, type } : undefined
}

const pageOf = (root: Element): Result<{ treeId: TreeId; revision: number }, ReaderSignalBroadcastError> => {
  const treeId = root.getAttribute(LOOM_TREE_ATTRIBUTE)
  /**
   * Matched as digits before it is converted. `Number(null)` and `Number("")` are
   * both 0, so a page with no revision at all would otherwise pass as revision 0
   * and every signal from it would be filed under a revision it never had.
   */
  const written = root.getAttribute(LOOM_REVISION_ATTRIBUTE) ?? ""
  const revision = /^\d+$/.test(written) ? Number(written) : Number.NaN

  return isTreeId(treeId) && Number.isSafeInteger(revision)
    ? ok({ treeId, revision })
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

/**
 * The addressed elements above `element`, nearest first, stopping at the root.
 *
 * The same walk `nearestAddressed` already does, continued instead of stopped —
 * so a press knows the card, the band and the page it was in rather than only
 * the button, and nothing has to consult the tree afterwards to find out. The
 * root itself is included when it is addressed, because a page whose root is a
 * node is a region like any other.
 *
 * An element the walk cannot read an address off is skipped rather than ending
 * the ancestry: `LOOM_NODE_ATTRIBUTE` without a readable type is markup this
 * broadcaster does not trust, not a ceiling on what is above it.
 */
const ancestryOf = (root: Element, element: Element): readonly SignalAddress[] => {
  const found: SignalAddress[] = []

  for (
    let above = element.parentElement;
    above !== null && root.contains(above);
    above = above.parentElement
  ) {
    const address = addressOf(above)
    if (address !== undefined) found.push(address)
    if (above === root) break
  }

  return found
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
 *
 * Nodes added under `root` afterwards are picked up and nodes removed stop
 * counting. The tree and revision are not: they are read once, here, and a page
 * that becomes a different page — a client-side navigation, a re-render at a new
 * revision into the same root — needs `stop()` and a new broadcast, or its
 * signals are filed under the revision it left.
 */
export const broadcastReaderSignals = (
  root: Element,
  options: ReaderSignalOptions = {}
): Result<ReaderSignalBroadcast, ReaderSignalBroadcastError> => {
  const page = pageOf(root)
  if (!page.ok) return page

  const now = options.now ?? Date.now
  const wants = selectionOf(options.kinds, options.types)
  const document = root.ownerDocument

  /**
   * Minted once, here, and carried by every batch this broadcast sends — which
   * is what makes the batches of one page view correlatable and two page views
   * not (0146). A new broadcast is a new view, including the second one a
   * client-side navigation needs, so the key cannot outlive the page it
   * describes even by accident.
   */
  const view = mintViewKey(options.random)


  const ledger = createSignalLedger(document.visibilityState === "hidden")
  let stopped = false

  const walks = options.within ?? true

  /**
   * What a delegated signal says about where it happened, as the fragment its
   * factory spreads.
   *
   * An empty object rather than `within: []` when the host turned the walk off,
   * because an empty ancestry is a claim — *this node has no addressed
   * ancestor* — and a broadcaster that was told not to look has not made it.
   */
  const ancestry = (target: Element): { readonly within?: readonly SignalAddress[] } =>
    walks ? { within: ancestryOf(root, target) } : {}

  const record = (
    kind: ReaderSignalKind,
    signal: (address: SignalAddress, within: { readonly within?: readonly SignalAddress[] }) => ReaderSignal
  ) =>
    (element: Element): void => {
      const target = nearestAddressed(root, element)
      if (target === undefined) return

      const address = addressOf(target)
      if (address === undefined || !wants(kind, address.type)) return

      ledger.noted(signal(address, ancestry(target)))
    }

  const flush = (): void => {
    const drained = ledger.drain(now())

    /**
     * Viewed and dwelled are gathered together, because one observer serves both,
     * and are selected here — so a host asking only for time on screen gets no
     * `viewed`, and a type watched for one kind reports nothing for the other.
     */
    const signals = drained.filter((signal) => wants(signal.kind, signal.type))
    if (signals.length === 0) return

    const batch: ReaderSignalBatch = {
      treeId: page.value.treeId,
      revision: page.value.revision,
      sentAt: now(),
      view,
      signals,
    }

    root.dispatchEvent(new CustomEvent(READER_SIGNALS_EVENT, { detail: batch, bubbles: true }))
    deliverSafely(options.send, batch)
  }

  const watched = (type: string): boolean => wants("viewed", type) || wants("dwelled", type)

  /**
   * Each observed element's address, read once when observing starts. The
   * observer calls back at every threshold an element crosses — eleven times on
   * the way into view — and reading two attributes and testing two patterns on
   * each of those is work whose answer cannot have changed.
   */
  const addresses = new WeakMap<Element, SignalAddress>()

  const enabled = options.kinds ?? READER_SIGNAL_KINDS
  const watchesTime = enabled.includes("viewed") || enabled.includes("dwelled")

  const visibility = watchesTime
    ? (options.observeVisibility ?? intersectionVisibility)((entries) => {
        const at = now()
        for (const entry of entries) {
          const address = addresses.get(entry.target)
          if (address === undefined) continue
          if (entry.visible) ledger.entered(address, at)
          else ledger.left(address.nodeId, at)
        }
      })
    : undefined

  /** An element and every addressed element under it, which is what a subtree arriving or leaving amounts to. */
  const addressedWithin = (element: Element): readonly Element[] => [
    element,
    ...Array.from(element.querySelectorAll(`[${LOOM_NODE_ATTRIBUTE}]`)),
  ]

  /** Hand an element to the visibility observer, if time on screen is wanted for what it is. */
  const watchForTime = (element: Element): void => {
    if (visibility === undefined) return
    const address = addressOf(element)
    if (address === undefined || !watched(address.type)) return
    addresses.set(element, address)
    visibility.observe(element)
  }

  /**
   * A node left the page, so the stretch it was in the middle of ends here.
   *
   * Closed on the mutation rather than left to the visibility observer: a
   * removed element may never be reported as having gone out of view, and a
   * stretch that is never closed is time a reader is credited with forever.
   */
  const departed = (element: Element, at: number): void => {
    const address = addresses.get(element)
    if (address !== undefined) ledger.left(address.nodeId, at)
  }

  for (const element of addressedWithin(root)) watchForTime(element)

  /**
   * What the page grows and sheds after the broadcast started.
   *
   * `activated` and `disclosed` reach a node that did not exist yet on their
   * own, because both are delegated from the root and read the nearest addressed
   * element at the moment they happen. Time on screen is the one kind that needs
   * each element handed to an observer, so a broadcaster that looked once
   * reported nothing about anything rendered afterwards — a band behind a
   * Suspense boundary, a region a client component mounts, a list that grows,
   * **and every region a proposal has just changed.**
   *
   * That last one is why this is not a nicety. *Before versus after a change* is
   * the measurement Loom exists to make, and it was the one measurement that did
   * not work: an applied change renders after the broadcaster started, so every
   * adapted region was invisible to `viewed` and `dwelled` while the rest of the
   * page was counted normally. Numbers that understate only the changed bands
   * are worse than no numbers, because they look like data.
   *
   * Only built when time is being watched at all: the other kinds need no help.
   */
  const arrivals =
    visibility === undefined
      ? undefined
      : new MutationObserver((mutations) => {
          const at = now()
          for (const mutation of mutations) {
            for (const added of Array.from(mutation.addedNodes)) {
              if (added instanceof Element) for (const element of addressedWithin(added)) watchForTime(element)
            }
            for (const gone of Array.from(mutation.removedNodes)) {
              if (gone instanceof Element) for (const element of addressedWithin(gone)) departed(element, at)
            }
          }
        })

  const onActivated = record("activated", (address, within) => ({
    kind: "activated",
    ...address,
    at: now(),
    ...within,
  }))

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
    record("disclosed", (address, within) => ({
      kind: "disclosed",
      ...address,
      open: details.open,
      at: now(),
      ...within,
    }))(details)
  }

  /**
   * A form inside the page was submitted, which is the one completion a page
   * can witness on its own.
   *
   * **Captured rather than delegated**, like `toggle` and unlike `click`: a
   * handler inside the page may call `stopPropagation`, and a submission the
   * broadcaster never heard is a conversion nobody counted. The press on the
   * submit control is a separate fact and is still reported as `activated`
   * against the control — two kinds about two nodes, not one action counted
   * twice.
   *
   * **`preventDefault` is read once the dispatch is over, never during it.**
   * Any listener may cancel a submit, and whether this one runs before or after
   * theirs is registration order — React attaches its own at a root container
   * which may be this very element. A microtask queued here runs after dispatch
   * has finished, so what it reads is the final answer rather than whichever
   * one happened to be true halfway through. The instant is taken at the event,
   * not in the microtask, because the event is when the reader finished.
   */
  const onSubmit = (event: Event): void => {
    const form = event.target
    if (!(form instanceof HTMLFormElement) || !root.contains(form)) return

    const at = now()

    queueMicrotask(() => {
      if (stopped || event.defaultPrevented) return
      record("completed", (address, within) => ({ kind: "completed", ...address, at, ...within }))(form)
    })
  }

  const disclosures = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (!(mutation.target instanceof Element)) continue
      const open = mutation.target.getAttribute(DISCLOSED_ATTRIBUTE)
      const settled = open === "true" || open === "false"
      if (!settled || mutation.oldValue === null || mutation.oldValue === open) continue
      record("disclosed", (address, within) => ({
        kind: "disclosed",
        ...address,
        open: open === "true",
        at: now(),
        ...within,
      }))(mutation.target)
    }
  })

  /**
   * The batch timer runs only while the page is visible. A hidden page gathers
   * nothing — the ledger has stopped counting — so a timer ticking in a
   * background tab would wake the page every few seconds to find that out.
   */
  const flushEveryMs = options.flushEveryMs ?? DEFAULT_FLUSH_MS
  let timer: ReturnType<typeof setInterval> | undefined

  const startTimer = (): void => {
    if (timer === undefined) timer = setInterval(flush, flushEveryMs)
  }

  const stopTimer = (): void => {
    if (timer !== undefined) clearInterval(timer)
    timer = undefined
  }

  const onVisibility = (): void => {
    if (document.visibilityState === "hidden") {
      ledger.hid(now())
      flush()
      stopTimer()
    } else {
      ledger.showed(now())
      startTimer()
    }
  }

  const onPageHide = (): void => flush()

  root.addEventListener("click", onClick)
  root.addEventListener("toggle", onToggle, true)
  root.addEventListener("submit", onSubmit, true)
  disclosures.observe(root, {
    attributes: true,
    attributeFilter: [DISCLOSED_ATTRIBUTE],
    attributeOldValue: true,
    subtree: true,
  })
  arrivals?.observe(root, { childList: true, subtree: true })
  document.addEventListener("visibilitychange", onVisibility)
  document.defaultView?.addEventListener("pagehide", onPageHide)
  if (document.visibilityState !== "hidden") startTimer()

  const stop = (): void => {
    if (stopped) return
    stopped = true
    flush()
    stopTimer()
    visibility?.disconnect()
    disclosures.disconnect()
    arrivals?.disconnect()
    root.removeEventListener("click", onClick)
    root.removeEventListener("toggle", onToggle, true)
    root.removeEventListener("submit", onSubmit, true)
    document.removeEventListener("visibilitychange", onVisibility)
    document.defaultView?.removeEventListener("pagehide", onPageHide)
  }

  return ok({ flush, stop })
}
