/**
 * What this subsystem calls a word, in one place.
 *
 * Two readings now cost the same page — the time its words take
 * (`pace.ts`) and how much of what it says got read (`copy.ts`) — and a word
 * is the unit both of them divide by. Two spellings of one rule that agree
 * today is a thing this subsystem has already been bitten by once, in the
 * counter keys the two stores wrote; the remedy there was to publish the rule
 * once and have both sides import it, and this is the same remedy before the
 * same bite.
 */

/**
 * Words in a run of strings.
 *
 * Whitespace-separated, which is the same rule `sdk/copy.ts` uses to decide a
 * blank value is not a word, and the same one a person counting a paragraph
 * would use. It is wrong for a language that does not put spaces between words,
 * and the handle for that is the costing rate rather than this function: a rate
 * expressed in whatever this calls a word stays internally consistent, and a
 * share of a page's words is unaffected because the same rule is applied to the
 * numerator and the denominator.
 */
export const countWords = (values: readonly string[]): number =>
  values.reduce((count, value) => count + (value.match(/\S+/g)?.length ?? 0), 0)
