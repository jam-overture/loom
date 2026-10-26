import {
  collectionNoticeOf,
  type CollectedField,
  type CollectionNotice,
} from "@jam-overture/loom/signals"

/**
 * What a kind of reader signal carries, as the runtime says it.
 *
 * ## Why this is a producer and not a paragraph
 *
 * *What your readers do* named the fields each kind carries in a sentence
 * somebody typed, and by 26 October three of the five were wrong: `within`
 * landed on every delegated kind with 0167 on 17 September and the page went on
 * saying `activated` carries *at — when it happened* and nothing else, while
 * `disclosed` named `open` and left out both of the fields beside it.
 *
 * Nobody was careless. **A list of what a payload carries, typed into a page, is
 * wrong on the day the payload grows** — and nothing in a documentation suite
 * can see it happen, because the page still renders, the prose still reads well,
 * and the field that arrived is simply not mentioned.
 *
 * `collectionNoticeOf` (0313) is the runtime's answer to that, and it is keyed
 * by the schema's own fields through `keyof Required<…>`: a field added to a
 * batch without a sentence does not compile. This module is the docs side of it,
 * so the only way this page can be wrong about a signal's shape is for the
 * runtime to be wrong about it.
 *
 * ## What is not here yet
 *
 * The notice has four other halves — what travels with a delivery, what is never
 * collected, where readers are counted from, how long a delivery lives — and a
 * page printing all of them was written, measured and **left out of this
 * branch**, because the prose it needs crosses the search index's total cap
 * (`search/build.test.ts`, and the cap is 0157's *forbidden by the test's own
 * comment*). The finding of 26 October carries the measurements and the costed
 * shapes. What is here is the half that needed no new prose.
 *
 * Nothing here is a reading: no store, no clock, no counter.
 */

/**
 * The fields every collected kind carries under the same sentence.
 *
 * Matched on the sentence as well as the name, so two kinds that happened to
 * spell one field differently to a reader would keep their own rows rather than
 * being merged into a claim neither makes.
 *
 * Empty where there is only one kind, because *what every kind carries* is not a
 * useful division of one kind's fields.
 */
const sharedAcross = (collects: CollectionNotice["collects"]): readonly CollectedField[] => {
  const [first, ...rest] = collects

  if (first === undefined || rest.length === 0) return []

  return first.carries.filter((field) =>
    rest.every((kind) =>
      kind.carries.some((other) => other.field === field.field && other.says === field.says)
    )
  )
}

/**
 * Every kind the runtime has, with the fields it carries beyond the ones every
 * kind carries.
 *
 * What the vocabulary panel prints against each kind. It is of the **whole**
 * vocabulary rather than of any one deployment's configuration, because a reader
 * counting what a page may say should be counting the runtime's list —
 * `collectionNoticeOf()` with nothing in it is every kind, which is what
 * *whatever a deployment configures, this is the vocabulary* means as a call.
 */
export const beyondTheAddress = (): Readonly<Record<string, readonly CollectedField[]>> => {
  const notice = collectionNoticeOf()
  const shared = sharedAcross(notice.collects)

  return Object.fromEntries(
    notice.collects.map((kind) => [
      kind.kind,
      kind.carries.filter(
        (field) => !shared.some((one) => one.field === field.field && one.says === field.says)
      ),
    ])
  )
}
