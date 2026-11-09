import { ok } from "@jam-overture/loom"
import type { ApplicationId } from "@jam-overture/loom/store"

import type { NewestAnswer, PullSpan, SitePullStore, TakenAnswer } from "./pulls"

const widened = (held: TakenAnswer | undefined, at: number, kept: boolean): TakenAnswer =>
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
const newestOf = (answers: ReadonlyMap<string, TakenAnswer>): NewestAnswer | null => {
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
  const held = new Map<ApplicationId, ReadonlyMap<string, TakenAnswer>>()

  return {
    record: ({ application, tag, at, kept }) => {
      const tags = held.get(application) ?? new Map<string, TakenAnswer>()

      held.set(application, new Map([...tags, [tag, widened(tags.get(tag), at, kept)]]))

      return Promise.resolve(ok(undefined))
    },

    span: (application) =>
      Promise.resolve(ok(joined([...(held.get(application)?.values() ?? [])]))),

    takenSince: (application, since) => {
      const answers = [...(held.get(application)?.values() ?? [])]

      return Promise.resolve(
        ok({
          answers: answers
            .filter((answer) => answer.first >= since)
            .sort((left, right) => left.first - right.first),
          namesBack: answers.some((answer) => answer.kept),
        })
      )
    },

    newest: (application) => Promise.resolve(ok(newestOf(held.get(application) ?? new Map()))),
  }
}
