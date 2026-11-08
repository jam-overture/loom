import { ok } from "@jam-overture/loom"
import type { ApplicationId } from "@jam-overture/loom/store"

import type { NewestAnswer, PullSpan, SitePullStore } from "./pulls"

type Answer = PullSpan & { readonly kept: boolean }

const widened = (held: Answer | undefined, at: number, kept: boolean): Answer =>
  held === undefined
    ? { first: at, last: at, kept }
    : {
        first: Math.min(held.first, at),
        last: Math.max(held.last, at),
        kept: held.kept || kept,
      }

const joined = (spans: readonly PullSpan[]): PullSpan | null =>
  spans.reduce<PullSpan | null>(
    (sum, span) =>
      sum === null
        ? { first: span.first, last: span.last }
        : { first: Math.min(sum.first, span.first), last: Math.max(sum.last, span.last) },
    null
  )

/** The answer first taken latest; on a tie the tag that sorts last, as the Postgres store breaks it. */
const newestOf = (answers: ReadonlyMap<string, Answer>): NewestAnswer | null => {
  const [newest] = [...answers.entries()].sort(
    ([leftTag, left], [rightTag, right]) =>
      right.first - left.first || rightTag.localeCompare(leftTag)
  )

  return newest === undefined
    ? null
    : {
        first: newest[1].first,
        last: newest[1].last,
        kept: newest[1].kept,
        anyKept: [...answers.values()].some((answer) => answer.kept),
      }
}

/** The pulls in the process: the reference implementation. */
export const memorySitePullStore = (): SitePullStore => {
  const held = new Map<ApplicationId, ReadonlyMap<string, Answer>>()

  return {
    record: ({ application, tag, at, kept }) => {
      const tags = held.get(application) ?? new Map<string, Answer>()

      held.set(application, new Map([...tags, [tag, widened(tags.get(tag), at, kept)]]))

      return Promise.resolve(ok(undefined))
    },

    span: (application) =>
      Promise.resolve(ok(joined([...(held.get(application)?.values() ?? [])]))),

    firstTakenSince: (application, since) =>
      Promise.resolve(
        ok(
          [...(held.get(application)?.values() ?? [])]
            .map((span) => span.first)
            .filter((first) => first >= since)
            .sort((left, right) => left - right)
        )
      ),

    newest: (application) => Promise.resolve(ok(newestOf(held.get(application) ?? new Map()))),
  }
}
