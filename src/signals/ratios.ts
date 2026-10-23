import { everyMemberOf } from "../closed-set.js"

/**
 * A quotient of one window's figure against the other's, and the reason there
 * is not one.
 *
 * Three comparisons of two windows publish ratios: what a change did to the
 * share of readers who acted inside a part
 * ([`action-change.ts`](action-change.ts)), to whether readers had time for the
 * words in front of them ([`pace-change.ts`](pace-change.ts)), and to the rate
 * at which a funnel converts ([`funnel-change.ts`](funnel-change.ts)). Until
 * this module each of them spelled the rule itself, in three copies that
 * agreed — and two spellings of one rule that agree today is the fault this
 * subsystem has been bitten by twice (0218, 0235). A fourth comparison written
 * after them would have picked whichever copy it read last.
 *
 * ## The two states the one `null` was
 *
 * Every copy was this:
 *
 * ```ts
 * was === undefined || now === undefined || was === 0 ? null : now / was
 * ```
 *
 * and its `null` meant two things a caller could not tell apart. **Neither
 * side measured this** — a leaf, a part with no row, a part nobody reached, a
 * passage with no words — against **the earlier side measured nought**, which
 * is a measurement and the state a rise from nothing is read off. *Nobody acted
 * here and now four in ten do* and *nothing here can be compared* arrived as
 * one value, on six published fields.
 *
 * So the figure a comparison publishes is this pair rather than a bare number:
 * {@link Ratio.ratio} where there is a quotient, and {@link Ratio.absent}
 * naming which state it is in where there is not. Exactly one of the two is
 * ever non-null.
 *
 * ## Why the reason is published rather than left to be derived
 *
 * A surface holds both sides of every comparison, so it could in principle
 * work the reason out for itself. It would have to know, per field, which pair
 * of figures the quotient was taken over and what each side withholds and why
 * — `usesPerReader` is withheld at a *measured* nought on purpose (0242), so
 * the obvious derivation gets that field backwards. That knowledge is the
 * reading's, the reading has it in hand at the division, and a rule derived a
 * second time somewhere else is the fault above with a longer fuse.
 *
 * Pure, allocation-per-call and nothing else: no store, no clock, no DOM, and
 * no import that reaches a package, so a comparison that imports it stays
 * outside the broadcaster's import graph.
 */

/** Why there is no quotient. */
export type RatioAbsence =
  /**
   * One of the two windows did not measure this, so there is nothing to divide.
   *
   * The absence is the other side's as much as this one's: a part that was a
   * leaf and now bears an inside has a share now and never had one, and a
   * window with no page views has no figure of any kind. What each side
   * withholds and why is that reading's own rule, and this says only that one
   * of them did.
   */
  | "unmeasured"
  /**
   * Both windows measured it and the earlier one measured nought.
   *
   * A division by nought and not an absence of measurement, so the pair of
   * sides a comparison publishes beside this is worth reading: the later side
   * says whether the figure rose from nothing or stayed there, and the
   * movement of the two standings says it in words. *Nobody acted in this band
   * and four in ten do now* is this member with a later side above nought, and
   * it is the state a surface most wants to draw and could least afford to
   * read as *nothing to compare*.
   */
  | "from-nothing"

/** The closed set, for a surface accounting for every absent quotient. */
export const RATIO_ABSENCES: readonly RatioAbsence[] = everyMemberOf<RatioAbsence>()([
  "unmeasured",
  "from-nothing",
])

/** One line per absence, for a surface saying why a ratio is not there. */
export const describeRatioAbsence = (absence: RatioAbsence): string => {
  switch (absence) {
    case "unmeasured":
      return "one of the two windows did not measure this, so there is nothing to divide"
    case "from-nothing":
      return "the earlier window measured nought, so there is no quotient to take"
  }
}

/**
 * A quotient of the later window's figure by the earlier one's, or the reason
 * there is none.
 *
 * `ratio` and `absent` are exclusive: exactly one of them is non-null in every
 * value this module produces, which is the property that makes a surface
 * reading one of them safe to write.
 */
export type Ratio = {
  /** `now ÷ was`, or `null` where {@link absent} says why there is none. */
  readonly ratio: number | null
  /** Why there is no quotient, or `null` where there is one. */
  readonly absent: RatioAbsence | null
}

/**
 * The later window's figure over the earlier one's, with the absence named.
 *
 * `undefined` and `null` are both *this side has no such figure*, because the
 * readings this serves spell a withheld figure both ways — `undefined` on a
 * part of a reading, `null` on a side of a comparison — and a helper that made
 * a caller normalise first would be a fourth thing to get wrong.
 *
 * Nought on the earlier side is an absence rather than infinity, which is the
 * rule all three copies of this already had: a ratio is a figure a surface
 * divides and ranks by, and the thing that happened is told by the two sides
 * and by the movement between them.
 *
 * Nought on the **later** side is a quotient of nought and is published as one.
 * *Readers used this twice each and do not touch it now* is a measurement.
 */
export const ratioOf = (
  was: number | null | undefined,
  now: number | null | undefined
): Ratio => {
  if (was === null || was === undefined || now === null || now === undefined) {
    return { ratio: null, absent: "unmeasured" }
  }

  if (was === 0) return { ratio: null, absent: "from-nothing" }

  return { ratio: now / was, absent: null }
}
