import type { NodeId, TreeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"

import type { SignalAddress } from "./ledger.js"
import type { RevisionViews } from "./page-views.js"
import type { ReaderSignalBatch, ReaderSignalKind, ViewKey } from "./signal.js"

/**
 * Many views, folded into the durable artefact: per-node-per-revision counters,
 * and the funnel pairs a deployment asked about.
 *
 * Raw batches are a short-lived buffer and these are what outlives them
 * ([0146](../../decisions/0146-a-reader-signal-stays-anonymous-and-a-funnel-is-correlated-inside-one-page-view.md)).
 * A 6,000-node page with ten readers emits a batch every few seconds, so
 * keeping raw signals is keeping the largest table in the database to answer
 * questions that are all about totals.
 *
 * **This is where the view key is consumed and where it stops.** Rollup is the
 * only module that reads it, a tally carries no trace of it, and it is dropped
 * with the raw window. That is what makes a funnel answerable without making a
 * reader identifiable: the output says *of 40 views that reached the pricing
 * band, 9 pressed the button*, and there is nothing in it that could say which
 * nine.
 *
 * Pure. It is handed batches and returns counters; reading and writing them is
 * `journal.ts` and `tally.ts`.
 */

/**
 * One node at one revision, as every view of it added up.
 *
 * The counters divide into two kinds and the distinction is the whole reason
 * this is not just `fold.ts` over more input. `dwellMs`, `activations`, `opens`,
 * `closes` and `completions` are **occurrences** — they sum, and one
 * enthusiastic reader can be most of them. `views`, `reached` and `engaged` are
 * **views** — they count
 * distinct page views, so they are the ones a rate may be taken of, and they are
 * only available because a batch carries a view key.
 *
 * Every counter but one is about the node itself. `engaged` is about what
 * happened *under* it, and it is here because a region is never the thing a
 * reader aims at: a press lands on a button, and without it a band's row reports
 * time on screen beside four permanent zeroes.
 */
export type ReaderTally = {
  readonly treeId: TreeId
  readonly revision: number
  readonly nodeId: NodeId
  readonly type: PrimitiveType
  /** Distinct page views that produced any signal at all about this node. */
  readonly views: number
  /** Distinct page views in which it came into view. The denominator of a funnel. */
  readonly reached: number
  /**
   * Distinct page views in which a reader used something *inside* this node —
   * pressed a link or button, filled a field, opened or closed a disclosure.
   *
   * The counter regions are reported by, and the only one that needs a signal to
   * say more than which node it is about. A press is filed against the control,
   * and every control in the starter library is an addressed node of its own, so
   * `activations` on a band is nearly always zero and always will be: the band
   * is not the thing anybody pressed. This counts the views whose reader did
   * something under it, at any depth, from the ancestry a delegated signal
   * carries.
   *
   * **Strictly inside.** A button's own `engaged` is 0 while its `activations`
   * is 1; its band's is the other way round. The two never double-count the same
   * node, and a subtree total is the addition.
   *
   * **Zero from a sender that does not walk.** A batch whose delegated signals
   * carry no `within` — synthesised on a server, replayed from a fixture, sent
   * by a host that turned the walk off — adds nothing here, exactly as a batch
   * with no view key adds nothing to `views`.
   */
  readonly engaged: number
  readonly dwellMs: number
  readonly activations: number
  readonly opens: number
  readonly closes: number
  /**
   * Times a form inside this node was submitted and the browser let it go.
   *
   * The conversion counter, and the only one that is about a reader finishing
   * rather than a reader looking. It is an occurrence rather than a view count
   * for the same reason `activations` is: a reader who submits twice did two
   * things, and *how many views converted* is a `FunnelPair` ending in
   * `completed`, which is one row and already answerable.
   *
   * Filed against the node the form is — `loom.form` is addressed, so usually
   * the form itself — never the band above it. The band's number is `engaged`,
   * credited from the ancestry the signal carries (0167, 0211).
   */
  readonly completions: number
}

/** One end of a funnel: a node, and what a reader has to have done to it. */
export type FunnelEnd = {
  readonly nodeId: NodeId
  readonly kind: ReaderSignalKind
}

/**
 * A question a deployment names, phrased about the tree rather than about
 * anyone: *of the views that did X to node A, how many did Y to node B*.
 *
 * There is no path and no ordering beyond the two ends. That is a limit and it
 * is the point — a three-step funnel with an order is a route through a page
 * that one reader took, which is the thing 0146 refuses.
 *
 * **An end is the node the signal names, never a region it was inside.** A pair
 * asking for `activated` on a band answers zero, because a band is not pressed;
 * the question *how many of the views that reached this band used something in
 * it* is `reached` and `engaged` on the band's own tally, which is one row and
 * needs no pair to have been configured in advance.
 */
export type FunnelPair = {
  readonly from: FunnelEnd
  readonly to: FunnelEnd
}

export type FunnelAnswer = {
  readonly treeId: TreeId
  readonly revision: number
  readonly pair: FunnelPair
  /** Views that satisfied `from`. */
  readonly reached: number
  /** Views that satisfied both. Never greater than `reached`. */
  readonly converted: number
}

export type Rollup = {
  readonly tallies: readonly ReaderTally[]
  readonly funnels: readonly FunnelAnswer[]
  /** Distinct page views seen, across every tree and revision in the input. */
  readonly views: number
  /**
   * The same page views, per tree and revision — one appearance each, in this
   * window.
   *
   * Held apart from `views` because it is the number the durable page-view
   * counter keeps, and it is only worth keeping beside the exact count of page
   * views that *began*: the difference between the two is the straddle that
   * makes a distinct count added across windows generous, measured rather than
   * bounded (0147). A revision whose batches carried no view key is absent
   * rather than nought — there is nothing to compare, and a zero row would read
   * as *no readers* rather than as *nobody minted a key*.
   */
  readonly appearances: readonly RevisionViews[]
  /**
   * Batches that carried no view key.
   *
   * Their occurrences are counted like any other; their views are not, because
   * there is no honest number to add. Treating each uncorrelated batch as its
   * own view would inflate every denominator by however often a page happened
   * to flush, which is a number about the network rather than about readers.
   * Reported so a portal can say the rate is computed over fewer views than the
   * totals, instead of showing a rate that is quietly wrong.
   */
  readonly uncorrelated: number
  /**
   * Batches this fold refused as a repeat of one it had already folded.
   *
   * A sender may deliver the same batch twice — a host's retry queue draining
   * after an outage is the case `MAX_BATCHES_PER_DELIVERY` exists to allow, and
   * an edge network replaying a `POST` is the case nobody writes. What that
   * costs is **asymmetric and therefore invisible**: `views`, `reached`,
   * `engaged` and `appearances` are sets of view keys, so a repeat adds the key
   * it already holds and moves nothing, while `dwellMs`, `activations`, `opens`,
   * `closes` and `completions` are occurrences and double. Every rate this
   * subsystem publishes divides the second kind by the first, so a repeat does
   * not look like noise — it looks like a reader who was twice as interested,
   * and the cost of it is permanent (0158).
   *
   * So a batch identical to one already folded in this window is folded once and
   * counted here. **Only where it carries a view key**: without one, two
   * identical batches are as likely to be two readers in the same millisecond as
   * one batch arriving twice, and dropping a reader to avoid a repeat is the
   * worse of the two mistakes.
   *
   * Reported rather than silent, because the number is a fact about a
   * deployment's senders and not about its readers: a window with repeats in it
   * every run is a retry loop somebody should find.
   */
  readonly redelivered: number
}

export const EMPTY_ROLLUP: Rollup = {
  tallies: [],
  funnels: [],
  views: 0,
  appearances: [],
  uncorrelated: 0,
  redelivered: 0,
}

/**
 * Where a signal says it happened, or nothing when it does not say.
 *
 * Only the delegated kinds carry an ancestry, and only when the sender walked
 * for one. Absent means *nobody looked*, which is why it reads as no regions
 * rather than as a node with no ancestors.
 */
const withinOf = (signal: ReaderSignalBatch["signals"][number]): readonly SignalAddress[] =>
  (signal.kind === "activated" || signal.kind === "disclosed" || signal.kind === "completed") &&
  signal.within !== undefined
    ? signal.within
    : []

/**
 * What joins the parts of every composite key in this module.
 *
 * A byte no tree id, node id, kind or decimal number can contain, so no two
 * different tuples can spell one key. **Written as an escape and never as a
 * literal control byte**: a raw `NUL` in a source file makes the whole file
 * binary to every content search there is, which is how four of these sat in
 * this module unreadable by `grep` for a month.
 *
 * One constant rather than one per key, because four spellings of a separator
 * that agree today are four chances to disagree tomorrow — the fault the upsert
 * keys of the counter tables were moved into `counters.ts` to avoid.
 */
const SEP = "\u0000"

/** A tree and revision, as one string, because a tally is keyed by the pair. */
const revisionKey = (treeId: TreeId, revision: number): string => `${treeId}${SEP}${revision}`

/**
 * One signal, as every field that could tell it from another.
 *
 * Spelled out per kind rather than serialised, because `JSON.stringify` of a
 * parsed object is a key whose stability depends on property order — which is
 * the order the sender's JSON happened to use. Two deliveries of one batch would
 * then be two keys, and the repeat this is here to find would be folded twice.
 *
 * `within` is in it because a page changes under a reader: a client component
 * mounting or a boundary resolving moves a control into a band it was not in,
 * and the ancestry is read off the live DOM when the event happens. So two
 * presses on one node can differ in nothing but the band they were inside, and
 * each owes its band a credit. `rollup.test.ts` holds that case, so the clause
 * is checked rather than assumed.
 */
const signalKey = (signal: ReaderSignalBatch["signals"][number]): string => {
  const address = `${signal.kind}${SEP}${signal.nodeId}${SEP}${signal.type}`
  const within = withinOf(signal)
    .map((region) => `${region.nodeId}${SEP}${region.type}`)
    .join(SEP)

  if (signal.kind === "dwelled") return `${address}${SEP}${signal.ms}`
  if (signal.kind === "disclosed") {
    return `${address}${SEP}${signal.at}${SEP}${signal.open ? "open" : "shut"}${SEP}${within}`
  }

  return `${address}${SEP}${signal.at}${SEP}${within}`
}

/**
 * A whole batch, as what distinguishes it from every other batch of its page
 * view.
 *
 * The envelope and the contents both, and `sentAt` is the part that does the
 * work: within one page view the broadcaster flushes what the ledger holds and
 * clears it, so a second delivery of the *same* content at the *same* stamp is
 * something no page does — it is one batch that arrived twice. A real second
 * flush carries a later stamp, different contents, or both, and so a different
 * key.
 *
 * It is a key and not a digest. A 32-bit hash of this would collide on roughly
 * one window in a few million and lose a real batch when it did, which is a
 * worse failure than the one being prevented; the memory a window of full keys
 * costs is stated in {@link rollUp}.
 */
const batchKey = (batch: ReaderSignalBatch, view: ViewKey): string =>
  [
    batch.treeId,
    batch.revision,
    view,
    batch.sentAt,
    batch.audience ?? "",
    batch.first === true ? "first" : "",
    ...batch.signals.map(signalKey),
  ].join(SEP)

type Accumulating = {
  readonly treeId: TreeId
  readonly revision: number
  readonly nodeId: NodeId
  type: PrimitiveType
  dwellMs: number
  activations: number
  opens: number
  closes: number
  completions: number
  /** Distinct views, as sets, collapsed to counts when the rollup is finished. */
  readonly views: Set<ViewKey>
  readonly reached: Set<ViewKey>
  readonly engaged: Set<ViewKey>
}

const accumulatorFor = (
  into: Map<string, Accumulating>,
  batch: ReaderSignalBatch,
  nodeId: NodeId,
  type: PrimitiveType
): Accumulating => {
  const key = `${revisionKey(batch.treeId, batch.revision)}${SEP}${nodeId}`
  const existing = into.get(key)
  if (existing !== undefined) {
    /**
     * A node's type is taken from the most recent signal about it. It cannot
     * legitimately change within a revision, and if it somehow has, the later
     * reading is the less stale one — this is not a fault worth failing a
     * rollup over.
     */
    existing.type = type

    return existing
  }

  const fresh: Accumulating = {
    treeId: batch.treeId,
    revision: batch.revision,
    nodeId,
    type,
    dwellMs: 0,
    activations: 0,
    opens: 0,
    closes: 0,
    completions: 0,
    views: new Set(),
    reached: new Set(),
    engaged: new Set(),
  }
  into.set(key, fresh)

  return fresh
}

/**
 * Which views satisfied one end of a funnel, per revision.
 *
 * Held apart from the tallies because a funnel end names a *kind* — `activated`
 * on the button, `viewed` on the band — and a tally has already added the kinds
 * together. Keeping the per-kind view sets is what lets a deployment ask about
 * any pair without the rollup having to guess which pairs it will be asked
 * about before it has seen the batches.
 */
const endKey = (treeId: TreeId, revision: number, nodeId: NodeId, kind: ReaderSignalKind): string =>
  `${revisionKey(treeId, revision)}${SEP}${nodeId}${SEP}${kind}`

const tallyOf = (accumulating: Accumulating): ReaderTally => ({
  treeId: accumulating.treeId,
  revision: accumulating.revision,
  nodeId: accumulating.nodeId,
  type: accumulating.type,
  views: accumulating.views.size,
  reached: accumulating.reached.size,
  engaged: accumulating.engaged.size,
  dwellMs: accumulating.dwellMs,
  activations: accumulating.activations,
  opens: accumulating.opens,
  closes: accumulating.closes,
  completions: accumulating.completions,
})

const answerFor = (
  pair: FunnelPair,
  treeId: TreeId,
  revision: number,
  ends: ReadonlyMap<string, Set<ViewKey>>
): FunnelAnswer => {
  const from = ends.get(endKey(treeId, revision, pair.from.nodeId, pair.from.kind))
  const to = ends.get(endKey(treeId, revision, pair.to.nodeId, pair.to.kind))

  const reached = from?.size ?? 0
  const converted =
    from === undefined || to === undefined
      ? 0
      : [...from].reduce((count, view) => (to.has(view) ? count + 1 : count), 0)

  return { treeId, revision, pair, reached, converted }
}

export type RollupOptions = {
  /**
   * The funnels this deployment asked for. Absent means none: a pair is a
   * question somebody wrote down, and a rollup does not invent questions.
   */
  readonly pairs?: readonly FunnelPair[]
}

/**
 * Fold a window of stored batches into the counters that outlive them.
 *
 * Batches from different trees and revisions may be mixed, because a window
 * read from the journal is. They are kept apart: a signal about "the fourth
 * section" means nothing once a proposal has moved it, and adding two revisions
 * of a node together is exactly the mistake that makes *before versus after a
 * change* unreadable.
 *
 * **A batch delivered twice is folded once**, where it carries a view key, and
 * the repeats are reported as {@link Rollup.redelivered}. The guarantee is
 * exactly as wide as the window: two deliveries of one batch that land either
 * side of a collection boundary are two windows' input and are counted twice,
 * bounded by *(retry delay ÷ window length)* — the same shape of bound already
 * stated for the page views that straddle one (0147), and shrinking with the
 * same setting. The one-operation rule is untouched (0158): applying one
 * window's rollup twice still doubles it, because that is two runs rather than
 * two batches, and nothing here can see the other run.
 */
export const rollUp = (
  batches: readonly ReaderSignalBatch[],
  options: RollupOptions = {}
): Rollup => {
  const accumulators = new Map<string, Accumulating>()
  const ends = new Map<string, Set<ViewKey>>()
  /**
   * Every revision the window touched, and the page views that touched it.
   *
   * One map rather than two, because the funnels need the revisions and the
   * page-view counter needs the views of each — and a second map keyed the same
   * way is a second chance to key it differently.
   */
  const revisions = new Map<
    string,
    { readonly treeId: TreeId; readonly revision: number; readonly views: Set<ViewKey> }
  >()
  const views = new Set<ViewKey>()
  /**
   * The batches this fold has already taken, so a repeat is not taken again.
   *
   * A window of 5,000 batches of a few signals each holds a few hundred
   * kilobytes of keys, against the per-node view sets a 6,000-node page already
   * puts beside them; `MAX_COLLECTION_SCAN` batches of ten signals is the worst
   * case and is a few megabytes. It is a `Set` of strings and one lookup per
   * batch, so the fold stays linear in the signals it was handed (rule 4).
   */
  const taken = new Set<string>()
  let uncorrelated = 0
  let redelivered = 0

  for (const batch of batches) {
    const { view } = batch
    if (view === undefined) uncorrelated += 1
    else views.add(view)

    /**
     * Before anything is counted, and only where there is a view key to make
     * the judgement safe. Nothing above this point can move twice — `views` is
     * a set and the key is already in it — so the refusal changes no figure a
     * repeat could not already have changed.
     */
    if (view !== undefined) {
      const identity = batchKey(batch, view)
      if (taken.has(identity)) {
        redelivered += 1
        continue
      }
      taken.add(identity)
    }

    const key = revisionKey(batch.treeId, batch.revision)
    const touched = revisions.get(key)
    const seen = touched ?? {
      treeId: batch.treeId,
      revision: batch.revision,
      views: new Set<ViewKey>(),
    }
    if (touched === undefined) revisions.set(key, seen)
    if (view !== undefined) seen.views.add(view)

    for (const signal of batch.signals) {
      const into = accumulatorFor(accumulators, batch, signal.nodeId, signal.type)

      if (signal.kind === "dwelled") into.dwellMs += signal.ms
      if (signal.kind === "activated") into.activations += 1
      if (signal.kind === "disclosed") {
        if (signal.open) into.opens += 1
        else into.closes += 1
      }
      if (signal.kind === "completed") into.completions += 1

      if (view === undefined) continue

      into.views.add(view)
      if (signal.kind === "viewed") into.reached.add(view)

      /**
       * The regions the thing a reader used was inside, credited with this view.
       *
       * `views` is deliberately not credited: it means *this node produced a
       * signal*, and a press on a button two levels down is a signal about the
       * button. A region that nothing else reports on gets a row here with
       * `engaged` and nothing else, which is the honest reading — somebody used
       * something in it and no one measured whether it was ever on screen.
       */
      for (const region of withinOf(signal)) {
        accumulatorFor(accumulators, batch, region.nodeId, region.type).engaged.add(view)
      }

      const reaching = endKey(batch.treeId, batch.revision, signal.nodeId, signal.kind)
      const end = ends.get(reaching)
      if (end === undefined) ends.set(reaching, new Set([view]))
      else end.add(view)
    }
  }

  const pairs = options.pairs ?? []
  const funnels = [...revisions.values()].flatMap(({ treeId, revision }) =>
    pairs.map((pair) => answerFor(pair, treeId, revision, ends))
  )

  return {
    tallies: [...accumulators.values()].map(tallyOf),
    funnels,
    views: views.size,
    appearances: [...revisions.values()]
      .filter(({ views: seen }) => seen.size > 0)
      .map(({ treeId, revision, views: seen }) => ({ treeId, revision, views: seen.size })),
    uncorrelated,
    redelivered,
  }
}
