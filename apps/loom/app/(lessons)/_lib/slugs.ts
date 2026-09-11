/**
 * What a key in the reader's record means.
 *
 * The record is a flat map from slug to what happened under it, and until now
 * two different files decided independently what a slug looked like: the review
 * index minted `set-d` from a letter, and the lesson route minted
 * `lesson-04-self-check` from a number and a section name in a private helper
 * nobody else could see. That was fine while only one of them was ever read
 * back. It stopped being fine the moment the corrections queue started reading
 * *both* — because it read them by iterating the map, which means it had been
 * reading them all along without knowing which was which.
 *
 * So the shape lives here, once, and the two things worth asking about a slug
 * are the two functions below: how to make one, and what one you have been
 * handed is.
 */

/**
 * The lesson sections whose questions are answered, graded and therefore
 * missable.
 *
 * `try-it` is deliberately not among them. A Try it fence takes a *prediction*
 * and nothing ever grades it — there is no attempt recorded under that slug, so
 * there is no miss to bring back. The transcript that appears afterwards is the
 * feedback, and it arrives once.
 */
export const RECALL_PARTS = ["warm-up", "predict", "self-check"] as const

export type RecallPart = (typeof RECALL_PARTS)[number]

/** What a section of a lesson is called, where the reader's record is concerned. */
export const lessonSlug = (lesson: number, part: string): string =>
  `lesson-${String(lesson).padStart(2, "0")}-${part}`

const LESSON_SLUG = /^lesson-(\d{2})-(.+)$/

const isRecallPart = (value: string): value is RecallPart =>
  RECALL_PARTS.some((part) => part === value)

/**
 * The lesson and section a slug names, or `undefined` for everything else —
 * which in practice means a review set, and in theory means a key written by a
 * version of this surface that no longer exists.
 *
 * Undefined rather than a thrown error for the reason `readProgress` is total:
 * this reads the reader's own study history, and a history with one unfamiliar
 * key in it is not a reason to refuse to show them the rest of it.
 */
export const lessonSlugParts = (
  slug: string
): { readonly lesson: number; readonly part: RecallPart } | undefined => {
  const found = LESSON_SLUG.exec(slug)

  if (found?.[1] === undefined || found[2] === undefined) return undefined
  if (!isRecallPart(found[2])) return undefined

  return { lesson: Number(found[1]), part: found[2] }
}
