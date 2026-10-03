import { cursorPosition, pageEnds } from "../paging.js"
import { ok } from "../result.js"
import { systemClock, type Clock } from "../runtime/events.js"

import {
  clampReaderSignalLimit,
  type ForgetOutcome,
  type ReaderSignalJournal,
  type ReaderSignalPage,
  type ReaderSignalReadRequest,
  type ReceivedBatch,
} from "./journal.js"
import type { RevisionViews, StoredPageViews } from "./page-views.js"
import type { ReaderRegionCount, ReaderRegionStore, StoredRegionCount } from "./region.js"
import type { FunnelAnswer, FunnelPair, ReaderTally } from "./rollup.js"
import type { ReaderSignalBatch } from "./signal.js"
import type { ReaderTallyStore, StoredFunnel, StoredTally, TallyReadRequest } from "./tally.js"

/**
 * The buffer and the counters, in the process.
 *
 * Like the memory journal and the memory store, these are the reference
 * implementations rather than test doubles: the contract suite is written
 * against what they do, and Postgres is checked against the same suite.
 *
 * The clock is a parameter for the reason it is one everywhere else — a
 * `receivedAt` read off the wall clock makes every retention test a race
 * against real time.
 */

export const memoryReaderSignalJournal = (clock: Clock = systemClock): ReaderSignalJournal => {
  let batches: ReceivedBatch[] = []
  let nextSeq = 1

  /**
   * The opening marker is dropped rather than buffered.
   *
   * It says *a page view began with this delivery*, which is a fact the door
   * uses and rollup has no question about — and a buffer is for what rollup
   * reads. Postgres drops it by storing the columns it knows, so dropping it
   * here is what keeps the two implementations the same buffer rather than two
   * that happen to pass the same tests.
   */
  const positioned = ({ first: _opening, ...batch }: ReaderSignalBatch): ReceivedBatch => ({
    ...batch,
    seq: nextSeq++,
    receivedAt: clock.now(),
  })

  return {
    receive: (received) => {
      batches.push(...received.map(positioned))

      return Promise.resolve(ok(undefined))
    },

    read: (request?: ReaderSignalReadRequest) => {
      const limit = clampReaderSignalLimit(request?.limit)
      const from = cursorPosition(request?.cursor)
      const direction = request?.direction ?? "newer"

      const matching = batches.filter(
        (batch) =>
          (request?.treeId === undefined || batch.treeId === request.treeId) &&
          (from === undefined || (direction === "older" ? batch.seq < from : batch.seq > from))
      )

      /** A slice rather than a reverse: a page's order never depends on which end it came from. */
      const page = direction === "older" ? matching.slice(-limit) : matching.slice(0, limit)

      return Promise.resolve(
        ok<ReaderSignalPage>({
          batches: page,
          ...pageEnds(page.map((batch) => batch.seq), direction, {
            beyond: matching.length > page.length,
            resumed: from !== undefined,
          }),
        })
      )
    },

    /** `nextSeq` is not rewound, so a cursor held across a prune never resumes inside what it has seen. */
    forget: ({ before }) => {
      const kept = batches.filter((batch) => batch.seq >= before)
      const removed = batches.length - kept.length
      batches = kept

      return Promise.resolve(ok<ForgetOutcome>({ removed }))
    },
  }
}

/** A revision, which is the two columns every counter in this file shares. */
const revisionKey = (row: { readonly treeId: string; readonly revision: number }): string =>
  `${row.treeId} ${row.revision}`

const tallyKey = (tally: ReaderTally): string => `${revisionKey(tally)} ${tally.nodeId}`

const endOf = (end: FunnelPair["from"]): string => `${end.nodeId}:${end.kind}`

const funnelKey = (answer: FunnelAnswer): string =>
  `${answer.treeId} ${answer.revision} ${endOf(answer.pair.from)} ${endOf(answer.pair.to)}`

const matches = (
  row: { readonly treeId: string; readonly revision: number },
  request: TallyReadRequest | undefined
): boolean =>
  (request?.treeId === undefined || row.treeId === request.treeId) &&
  (request?.revision === undefined || row.revision === request.revision)

export const memoryReaderTallyStore = (): ReaderTallyStore => {
  const tallies = new Map<string, StoredTally>()
  const funnels = new Map<string, StoredFunnel>()
  const pageViews = new Map<string, StoredPageViews>()

  /**
   * One row written from two sides, so the add is spelled once and told which
   * column it is moving.
   *
   * A row created by either side starts the other column at nought, which is
   * what it is: openings a rollup has not reached yet, or a window of batches
   * whose opening went to an instance that has since gone away.
   */
  const addPageViews = (
    counts: readonly RevisionViews[],
    counted: "opened" | "appearances",
    at: string
  ): void => {
    for (const count of counts) {
      const key = revisionKey(count)
      const existing = pageViews.get(key)

      pageViews.set(key, {
        treeId: count.treeId,
        revision: count.revision,
        opened: (existing?.opened ?? 0) + (counted === "opened" ? count.views : 0),
        appearances: (existing?.appearances ?? 0) + (counted === "appearances" ? count.views : 0),
        updatedAt: at,
      })
    }
  }

  const addTally = (tally: ReaderTally, at: string): void => {
    const key = tallyKey(tally)
    const existing = tallies.get(key)

    tallies.set(key, {
      ...tally,
      views: (existing?.views ?? 0) + tally.views,
      reached: (existing?.reached ?? 0) + tally.reached,
      engaged: (existing?.engaged ?? 0) + tally.engaged,
      dwellMs: (existing?.dwellMs ?? 0) + tally.dwellMs,
      activations: (existing?.activations ?? 0) + tally.activations,
      opens: (existing?.opens ?? 0) + tally.opens,
      closes: (existing?.closes ?? 0) + tally.closes,
      completions: (existing?.completions ?? 0) + tally.completions,
      updatedAt: at,
    })
  }

  const addFunnel = (answer: FunnelAnswer, at: string): void => {
    const key = funnelKey(answer)
    const existing = funnels.get(key)

    funnels.set(key, {
      ...answer,
      reached: (existing?.reached ?? 0) + answer.reached,
      converted: (existing?.converted ?? 0) + answer.converted,
      updatedAt: at,
    })
  }

  return {
    apply: (rollup, at) => {
      for (const tally of rollup.tallies) addTally(tally, at)
      for (const answer of rollup.funnels) addFunnel(answer, at)
      addPageViews(rollup.appearances ?? [], "appearances", at)

      return Promise.resolve(ok(undefined))
    },

    opened: (openings, at) => {
      addPageViews(openings, "opened", at)

      return Promise.resolve(ok(undefined))
    },

    tallies: (request?: TallyReadRequest) =>
      Promise.resolve(ok([...tallies.values()].filter((row) => matches(row, request)))),

    funnels: (request?: TallyReadRequest) =>
      Promise.resolve(ok([...funnels.values()].filter((row) => matches(row, request)))),

    pageViews: (request?: TallyReadRequest) =>
      Promise.resolve(ok([...pageViews.values()].filter((row) => matches(row, request)))),
  }
}

const regionKey = (count: ReaderRegionCount): string => `${revisionKey(count)} ${count.region}`

/**
 * Where readers were, in the process.
 *
 * Additive like the tallies, and for a sharper reason: every call is one
 * delivery's worth of arrivals, so a store that replaced would report the last
 * reader rather than the readership.
 */
export const memoryReaderRegionStore = (): ReaderRegionStore => {
  const regions = new Map<string, StoredRegionCount>()

  return {
    count: (counts, at) => {
      for (const count of counts) {
        const key = regionKey(count)
        const existing = regions.get(key)

        regions.set(key, { ...count, views: (existing?.views ?? 0) + count.views, updatedAt: at })
      }

      return Promise.resolve(ok(undefined))
    },

    regions: (request?: TallyReadRequest) =>
      Promise.resolve(ok([...regions.values()].filter((row) => matches(row, request)))),
  }
}
