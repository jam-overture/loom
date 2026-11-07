import { ok } from "@jam-overture/loom"
import type { ApplicationId } from "@jam-overture/loom/store"

import type { PullSpan, SitePullStore } from "./pulls"

const widened = (held: PullSpan | undefined, at: number): PullSpan =>
  held === undefined
    ? { first: at, last: at }
    : { first: Math.min(held.first, at), last: Math.max(held.last, at) }

const joined = (spans: readonly PullSpan[]): PullSpan | null =>
  spans.reduce<PullSpan | null>(
    (sum, span) =>
      sum === null
        ? span
        : { first: Math.min(sum.first, span.first), last: Math.max(sum.last, span.last) },
    null
  )

/** The pulls in the process: the reference implementation. */
export const memorySitePullStore = (): SitePullStore => {
  const held = new Map<ApplicationId, ReadonlyMap<string, PullSpan>>()

  return {
    record: ({ application, tag, at }) => {
      const tags = held.get(application) ?? new Map<string, PullSpan>()

      held.set(application, new Map([...tags, [tag, widened(tags.get(tag), at)]]))

      return Promise.resolve(ok(undefined))
    },

    span: (application) =>
      Promise.resolve(ok(joined([...(held.get(application)?.values() ?? [])]))),
  }
}
