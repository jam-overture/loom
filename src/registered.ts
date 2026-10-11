/**
 * Naming what a deployment registered, to somebody who named something else.
 *
 * Three seams refuse an unknown id the same way — a palette, a data source, a
 * submission endpoint — and each answers by listing what it does have, so that
 * whoever reads the log can see what they should have written. The instinct is
 * right and the list is the wrong shape for it: its length is the deployment's
 * to set rather than the runtime's, so a host with a palette per brand turns one
 * diagnostic into a paragraph, in every log line and every panel that prints it.
 *
 * What this bounds is the sentence and nothing else. A refusal still carries
 * every id it knows where a caller can read it, and a registry still publishes
 * its whole catalogue, so the names past the cap are a lookup away rather than
 * gone. The sentence has the narrower job: put the id the reader probably meant
 * in front of them, and say how many it is standing in for.
 */

/**
 * How many names a refusal puts in front of a reader.
 *
 * Five, against a measurement: the twenty-four render diagnostics printed side
 * by side came to a median of 144 characters, and the unresolved-theme sentence
 * came to 284 — of which 172 were this list at twenty-one palettes. Five ids of
 * ordinary length is about fifty, which keeps the clause the smaller half of a
 * sentence it used to be the larger half of.
 */
export const NEAREST_REGISTERED = 5

/** One row of the matrix, from the row above it and the character it is for. */
const nextRow = (
  fromCharacter: string,
  to: readonly string[],
  previous: readonly number[],
  rowIndex: number
): readonly number[] =>
  to.reduce<readonly number[]>(
    (current, toCharacter, column) =>
      current.concat(
        Math.min(
          (previous[column] ?? 0) + (fromCharacter === toCharacter ? 0 : 1),
          (previous[column + 1] ?? 0) + 1,
          (current[column] ?? 0) + 1
        )
      ),
    [rowIndex + 1]
  )

/**
 * How many single-character edits turn one id into the other.
 *
 * Two rows rather than a whole matrix, because the only thing ever asked of the
 * result is its size, and the row being built is the only one the next row
 * needs.
 */
const editDistance = (from: string, to: string): number => {
  if (from === to) return 0

  const target = [...to]
  const last = [...from].reduce<readonly number[]>(
    (previous, fromCharacter, rowIndex) => nextRow(fromCharacter, target, previous, rowIndex),
    Array.from({ length: target.length + 1 }, (_, index) => index)
  )

  return last[target.length] ?? 0
}

/**
 * Whether one id is written inside the other, which outranks distance.
 *
 * The two mistakes that actually happen are not the same shape. A misspelling
 * is a short edit — `sunsset` for `sunset` — and distance finds it. A half-typed
 * name is a long one: `cat` is fifteen edits from `catalogue.services` and nine
 * from `crm.contacts`, so distance on its own answers a truncation with the
 * wrong part of the registry. Containment is checked first for that case alone.
 */
const written = (sought: string, candidate: string): number =>
  sought.length > 0 && (candidate.includes(sought) || sought.includes(candidate)) ? 0 : 1

/**
 * The registered ids closest to the one that was asked for, nearest first.
 *
 * Ranking is what makes a capped list worth reading: the reason to print the
 * registry at all is that the right answer is almost always one of a short
 * list, and the first five in registration order bear no relation to what
 * somebody meant to type.
 *
 * It ranks strings and claims no more than that. Nothing in `sunset` says it
 * and `ember` are both warm, so nothing here will offer `ember`; a seam that
 * wants meaning has to rank on something other than spelling.
 */
export const nearestRegistered = (
  wanted: string,
  available: readonly string[],
  limit: number = NEAREST_REGISTERED
): readonly string[] => {
  const sought = wanted.toLowerCase()
  const kept = Math.max(0, limit)

  /** Nothing to be near. Registration order is the only non-arbitrary answer. */
  if (sought.length === 0) return available.slice(0, kept)

  return available
    .map((id, index) => {
      const candidate = id.toLowerCase()

      return {
        id,
        index,
        written: written(sought, candidate),
        distance: editDistance(sought, candidate),
      }
    })
    .sort(
      (left, right) =>
        left.written - right.written ||
        left.distance - right.distance ||
        left.index - right.index
    )
    .slice(0, kept)
    .map((ranked) => ranked.id)
}

/**
 * The clause a refusal ends on: what to write instead of what was written.
 *
 * Three forms, and which one appears is a fact about the deployment. An empty
 * registry says so in a word. A registry that fits is printed whole. One that
 * does not is printed to the cap and then says what it is standing in for —
 * `(nearest 5 of 21)` rather than a trailing count alone, because five ids with
 * no explanation read as the first five somebody registered, which would send a
 * reader looking in the wrong place.
 *
 * **Fitting is one more than the cap**, and that is not an off-by-one. Hiding a
 * single id costs more than showing it: `(nearest 5 of 6)` is seventeen
 * characters to withhold a name that would have cost about twelve. Measured on
 * a real case — the six sources a lesson registers — eliding one saved a single
 * character. The cap is there to bound the clause, so it gives way where it
 * would not.
 *
 * **A list printed whole keeps the order it was registered in**, and only a
 * capped one is ranked. Ranking is how the few are *chosen*; where nothing is
 * being chosen it buys nothing and costs the host its own order, and it would
 * make the same registry print in a different order for every id somebody
 * mistyped — output that cannot be compared between two refusals.
 */
export const describeRegistered = (wanted: string, available: readonly string[]): string => {
  if (available.length === 0) return "none"
  if (available.length <= NEAREST_REGISTERED + 1) return available.join(", ")

  const nearest = nearestRegistered(wanted, available)

  return `${nearest.join(", ")} (nearest ${nearest.length} of ${available.length})`
}
