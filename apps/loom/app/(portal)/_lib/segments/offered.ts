import type { TreeId } from "@jam-overture/loom"
import type { AudienceId, AudienceOverlayReader, AudienceRule } from "@jam-overture/loom/store"
import type { ArrivalCounterHandle } from "@jam-overture/loom/signals"

/**
 * The segments a waiting change can be accepted for alone (0386 clause 3):
 * those the page's rules name **and** that have page views counted on the
 * page. A segment nobody has been sorted into would accept a change no reader
 * is served, which is a button that does nothing.
 */

/** Each segment the rules name, once, in the rules' order, that has page views counted. Pure. */
export const offeredOf = (
  rules: readonly AudienceRule[],
  counted: ReadonlySet<AudienceId>
): readonly AudienceId[] =>
  [...new Set(rules.map((rule) => rule.audienceId))].filter((audienceId) => counted.has(audienceId))

/**
 * The segments offered on one page. None where the rules could not be read,
 * and not a segment whose counters did not answer: offering a segment Loom
 * could not check is the one wrong answer, and *Accept* for everyone stands
 * either way.
 */
export const readOfferedSegments = async (
  given: {
    readonly rules: Pick<AudienceOverlayReader, "rules">
    readonly tallies: ArrivalCounterHandle
  },
  pageId: TreeId
): Promise<readonly AudienceId[]> => {
  const head = await given.rules.rules(pageId)

  if (!head.ok || head.value === undefined) return []

  const named = [...new Set(head.value.rules.map((rule) => rule.audienceId))]
  const read = await Promise.all(
    named.map(async (audience) => {
      const arrivals = await given.tallies.arrivals({ treeId: pageId, audience })

      return arrivals.ok && arrivals.value.begins !== undefined ? [audience] : []
    })
  )

  return offeredOf(head.value.rules, new Set(read.flat()))
}
