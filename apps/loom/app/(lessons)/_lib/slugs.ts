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
 * So the shape lives here, once, and the three things worth asking about a slug
 * are the functions below: how to make one, what one you have been handed is,
 * and what to call it in front of the reader.
 */

/** What a review set is called, where the reader's record and the URL are concerned. */
export const setSlug = (letter: string): string => `set-${letter.toLowerCase()}`

/**
 * The order the sets are worked in, which stops being alphabetical at `AA`.
 *
 * Twenty-six sets used the whole alphabet, and the twenty-seventh is `AA` —
 * two letters rather than a number, so that no existing set is renamed and no
 * reader's history is orphaned by a slug that moved.
 *
 * `"AA".localeCompare("B")` is negative: a dictionary puts `AA` first and a
 * course does not. For as long as the letters are minted by counting, the
 * course's order is length first and then alphabet, which is what this is. It
 * lives beside the slug because it is the same fact about the same string, and
 * because the queue that sorts by it runs in the reader's browser and must not
 * import the parser to find out.
 */
export const compareSetLetters = (a: string, b: string): number =>
  a.length === b.length ? a.localeCompare(b) : a.length - b.length

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

/**
 * Where an `Explain it back` answer is filed — and it is a constant here rather
 * than a fourth member of the list above, which is the whole point of writing it
 * down in this file.
 *
 * `RECALL_PARTS` is the set of sections whose questions can be **missed**: they
 * are answered, checked against something and graded, so a miss is a fact and
 * the corrections queue can bring it back. An explanation is none of those. There
 * is no answer to check it against, no grade, and therefore no miss — so it must
 * not enter the queue, and the way it does not is by never being a `RecallPart`.
 * `lessonSlugParts` returns `undefined` for this slug, which is the same thing
 * the queue already does with a key it does not recognise.
 *
 * `try-it` is excluded for a neighbouring but different reason: it holds
 * predictions, which are answered and never graded. Three kinds of thing the
 * reader writes, two of them out of the queue, for two reasons that are worth
 * keeping apart.
 */
export const ELABORATION_PART = "explain-it-back"

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

const PART_NAMES: Readonly<Record<RecallPart, string>> = {
  "warm-up": "Warm-up",
  predict: "Predict",
  "self-check": "Self-check",
}

/**
 * What to call a question in front of the reader, from its slug and number.
 *
 * Two panels print a question's address — the calibration list and the second
 * look — and both run in the browser, so neither can reach the labels the
 * corrections sitting uses, which are read off the lesson files on the server.
 * The calibration list had its own one-liner,
 * `set.replace("set-", "set ").toUpperCase()`, written when a review set was the
 * only kind of slug there was. It renders a lesson's own question as
 * `LESSON-04-SELF-CHECK`, and has been able to receive one since the lessons'
 * own sections started being graded.
 *
 * Naming the source is safe **here and nowhere else on this surface**: these are
 * questions the reader has already answered and graded, so there is nothing left
 * to give away. A sitting still refuses to say where a question is from until it
 * has been attempted, which is the rule this is deliberately not an exception to
 * — it is a different moment.
 */
export const questionLabel = (slug: string, question: number): string => {
  const parts = lessonSlugParts(slug)

  if (parts !== undefined) {
    return `Lesson ${String(parts.lesson).padStart(2, "0")} ${PART_NAMES[parts.part]} q${question}`
  }

  return slug.startsWith("set-")
    ? `Set ${slug.slice("set-".length).toUpperCase()} q${question}`
    : `${slug} q${question}`
}
