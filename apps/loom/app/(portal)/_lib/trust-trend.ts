import {
  canonicalChecksOf,
  checksContinuityOf,
  rulesetContinuityOf,
  type WriteCheck,
} from "@jam-overture/loom"
import type { CalibrationReport, RecordedTelemetry } from "@jam-overture/loom/telemetry"

import { GAP_TOLERANCE } from "./calibration-view"
import type { OutcomeTone } from "./vocabulary"
import { plainDay } from "./when"

/**
 * Whether the AI is getting better at judging itself, or worse.
 *
 * `/portal/trust` answers *is a 0.9 actually a 0.9* over the newest page of the
 * journal, and it has given the same answer every day since it was built, because
 * the window it reads only rolls when two hundred more records arrive. A verdict
 * that cannot change is a verdict nobody needs to come back for — and the one
 * thing a person actually wants from a track record is whether it is improving.
 *
 * So this reads one page further back and compares. Nothing new is measured:
 * `calibrationOf` is run over the stretch before this one, by the same fold, and
 * the two reports are set beside each other. One extra bounded read, the same
 * shape as the first.
 *
 * ## The thing this gets right that a dashboard would get wrong
 *
 * **The measure is `|gap|`, not the survival rate.** A page proud of itself would
 * draw the pass rate going up and call it better. It is not better: a model that
 * claimed 0.9 and saw 95% survive is *worse* calibrated than one that claimed 0.9
 * and saw 90% survive, because calibration is agreement between the claim and the
 * outcome and nothing else (0007). Survival is also not a property of the model —
 * it is what the Gate and the people here between them allowed, so it moves when
 * a host tightens a floor and the model has not changed at all.
 *
 * That is why a pass rate moving in the opposite sense to the calibration gets a
 * sentence of its own rather than being averaged into the verdict, and why a
 * window judged under different rules is refused a comparison instead of given a
 * misattributed one.
 *
 * ## What "judged under the same rules" turned out not to cover
 *
 * A fingerprint proves which **rules** were consulted. It cannot reach the two
 * seams a composition root hands the write path, because they are functions and
 * a policy is a serialisable value (0179, 0208) — so a deployment that wires a
 * registry in on Tuesday produces judgments whose fingerprint is byte-identical
 * to Monday's and whose outcomes are not. Either seam can turn a change that
 * would have gone through into one that was turned down, which is precisely the
 * movement this section attributes. So the condition is now *one ruleset and one
 * write path*, and 0248's `checkSets` is the second half of it.
 *
 * The condition also stopped being a boolean. *Your rules changed* is an
 * accusation, and a stretch whose judgments recorded nothing is not that — it is
 * a stretch from before the record carried the field, which no amount of looking
 * through a configuration will fix. The four refusals below say which of the two
 * they are, because the reader's next move is the whole difference between them.
 *
 * ## What a page of the journal is not
 *
 * It is not a week. It is two hundred records, so two pages are two stretches of
 * unequal wall-clock time, and the section never says "last week". It says *the
 * stretch of the record before this one* and prints the dates each one covers, so
 * a reader can see for themselves that one covers three days and the other
 * covers a month.
 *
 * 0031 holds here as everywhere on this screen: this computes and returns, and
 * nothing in the runtime reads it. A reader who concludes from a worsening trend
 * that a floor should move is making that decision themselves.
 */

/**
 * One stretch of the record, reduced to what a comparison needs.
 *
 * A `CalibrationReport` plus the records it was folded from, with the parts that
 * cannot be compared already dropped. Carried as its own type so the reading
 * below is a pure function over two of them — the same reason `calibration-view`
 * exists at all.
 */
export type TrendSpan = {
  readonly judged: number
  readonly gap: number | null
  readonly observedRate: number | null
  readonly meanConfidence: number | null
  /** Records belonging to an ask that began before this stretch, counted in nothing. */
  readonly unattributed: number
  /** Every distinct ruleset that judged a claim in this stretch, sorted. */
  readonly rulesets: readonly string[]
  /** Judged claims whose disposition named no ruleset at all. */
  readonly unfingerprinted: number
  /**
   * Every distinct set of optional write-path checks a judgment in this stretch
   * was made under, each in canonical order and the whole list sorted.
   *
   * The rest of the sentence `rulesets` begins. A fingerprint proves which
   * *rules* judged these claims and cannot reach the two seams a composition
   * root hands over separately, either of which can turn a change that would
   * have gone on into one that was turned down — so a stretch shown to be one
   * ruleset is not thereby shown to be one write path, and a survival rate that
   * moved the week somebody wired a registry in is explained by the wiring.
   *
   * Sorted here as well as per segment, because this is a union taken across
   * segments and the order the segments arrived in must not reach the screen.
   */
  readonly checkSets: readonly (readonly WriteCheck[])[]
  /** Judged claims whose disposition named no set of checks at all. */
  readonly unrecordedChecks: number
  /**
   * When the stretch begins and ends, taken from `recordedAt` and never from
   * `occurredAt`.
   *
   * `occurredAt` is what the host said happened and a host with a skewed clock
   * or a replayed batch is describing its own timeline; `recordedAt` is stamped
   * on arrival and is the only one the journal vouches for. A page is a slice of
   * the journal's own order, so a span printed off the dodgeable field could
   * contradict the very ordering that produced the two stretches — which is the
   * kind of plausible wrong number this whole screen exists to refuse.
   */
  readonly from?: string
  readonly to?: string
}

/**
 * What is behind the stretch on the screen: another one, nothing, or a read that
 * did not come back.
 *
 * Three cases and not two, because *the record does not go back further* and *we
 * could not find out* are different sentences and only one of them is worth
 * coming back for. Collapsing them would be the failure this screen's own empty
 * state exists to avoid — a page of zeroes looking like an AI that never claimed
 * anything.
 */
export type Earlier = TrendSpan | "none" | "unreadable"

export const spanOf = (
  report: CalibrationReport,
  records: readonly RecordedTelemetry[]
): TrendSpan => {
  const rulesets = Array.from(
    new Set(report.byPolicy.flatMap((segment) => segment.fingerprints))
  ).sort()

  /*
   * Distinct by canonical spelling, so one write path running across three
   * segments is one entry rather than three. `canonicalChecksOf` before the key
   * is taken because a union is only as canonical as the thing that built it,
   * and the sort is on that same key so the list is stable whatever order the
   * segments came in.
   */
  const checkSets = Array.from(
    new Map(
      report.byPolicy
        .flatMap((segment) => segment.checkSets)
        .map((checks) => canonicalChecksOf(checks))
        .map((checks) => [checks.join(","), checks] as const)
    )
  )
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, checks]) => checks)

  /** A page is always ascending by `seq`, whichever end it was taken from. */
  const from = records.at(0)?.recordedAt
  const to = records.at(-1)?.recordedAt

  return {
    judged: report.overall.judged,
    gap: report.overall.gap,
    observedRate: report.overall.observedRate,
    meanConfidence: report.overall.meanConfidence,
    unattributed: report.unattributed,
    rulesets,
    unfingerprinted: report.byPolicy.reduce(
      (total, segment) => total + segment.unfingerprinted,
      0
    ),
    checkSets,
    unrecordedChecks: report.byPolicy.reduce(
      (total, segment) => total + segment.unrecordedChecks,
      0
    ),
    ...(from === undefined ? {} : { from }),
    ...(to === undefined ? {} : { to }),
  }
}

/**
 * How many answered claims a stretch needs before it may be compared to another.
 *
 * Derived rather than chosen. One claim flipping moves a stretch's observed rate
 * by `1 / judged`; below this many, that single flip moves it by more than the
 * whole band the verdict is drawn at, so a comparison at that band would be
 * reporting the sample size and calling it the model. Ten, as the tolerance
 * stands — and it follows the tolerance if that ever moves.
 */
export const COMPARABLE_MINIMUM = Math.ceil(1 / GAP_TOLERANCE)

/**
 * What two stretches show about one of the things that judged them: that it held
 * still, that it moved, or that nothing here can say.
 *
 * `PolicyCalibration` already makes the argument one level down — a rate is not
 * a property of the model alone, so pooling two gates produces a number that
 * moved for a reason the report cannot name. Two stretches are two pools, and
 * the same argument applies across time rather than across names.
 *
 * **Three states and not two, and the third is the one a dashboard would drop.**
 * A stretch whose judgments recorded nothing about the rules they ran on is not
 * a stretch whose rules changed — it is a stretch from before the record carried
 * them — and the reader's next move is the whole difference. *Your rules
 * changed* sends somebody into their own configuration to find an edit they
 * never made, and nothing they do there will fix it. This screen said exactly
 * that until today, for every stretch straddling the upgrade that added the
 * field.
 *
 * `held` stays as strict as it was: one recorded answer on each side, the same
 * one, and nothing unrecorded. Anything short of that is `unproven` rather than
 * `held`, because a comparison that treated "probably the same" as "the same"
 * would attribute a host's own edit to the model.
 */
export type Steadiness = "held" | "moved" | "unproven"

/** Whether the rules that judged the two stretches are shown to be one ruleset. */
const rulesSteadiness = (now: TrendSpan, earlier: TrendSpan): Steadiness => {
  const sides = [rulesetContinuityOf(now.rulesets), rulesetContinuityOf(earlier.rulesets)]
  const across = rulesetContinuityOf([...now.rulesets, ...earlier.rulesets])

  if (sides.includes("changed") || across === "changed") return "moved"
  if (now.unfingerprinted > 0 || earlier.unfingerprinted > 0) return "unproven"

  /*
   * `incomparable` lands here rather than in `moved`: two policies with
   * different sets of knobs are two Loom versions, and whether the values were
   * also edited cannot be read from a digest — which is `readRuleset`'s reading
   * of the same state, spelled the same way.
   */
  return sides.every((continuity) => continuity === "single") && across === "single"
    ? "held"
    : "unproven"
}

/**
 * The same question about the other half of what judged them: whether one write
 * path did.
 *
 * Deliberately the same shape as the rules above, so that the two conditions
 * cannot drift into disagreeing about what "shown to have held still" means.
 * The one asymmetry is in the runtime rather than here: a check list is made of
 * Loom's own names, so two lists always compare directly and `checksContinuityOf`
 * has no `incomparable` to map.
 */
const checksSteadiness = (now: TrendSpan, earlier: TrendSpan): Steadiness => {
  const sides = [checksContinuityOf(now.checkSets), checksContinuityOf(earlier.checkSets)]
  const across = checksContinuityOf([...now.checkSets, ...earlier.checkSets])

  if (sides.includes("changed") || across === "changed") return "moved"
  if (now.unrecordedChecks > 0 || earlier.unrecordedChecks > 0) return "unproven"

  return sides.every((continuity) => continuity === "single") && across === "single"
    ? "held"
    : "unproven"
}

export type TrendKind =
  | "no-earlier-record"
  | "unreadable"
  | "too-few-to-compare"
  | "rules-changed"
  | "rules-unproven"
  | "checks-changed"
  | "checks-unproven"
  | "steady"
  | "closer"
  | "further"

export type TrendReading = {
  readonly kind: TrendKind
  readonly tone: OutcomeTone
  /** What a person reads first. Never a statistic. */
  readonly label: string
  /** What it means for them, in one sentence. */
  readonly meaning: string
  /** What to do about it. Every screen answers this. */
  readonly next: string
  /**
   * The sentence that stops the reading above being read wrongly, when there is
   * one. Shown unasked rather than put behind the disclosure: a caveat a reader
   * has to open something to find is a caveat that arrives after the conclusion.
   */
  readonly aside?: string
}

/**
 * How the pass rate moved, when that is not what the verdict above says.
 *
 * Drawn only on the combinations a person would otherwise read backwards. A
 * rising pass rate reads as good news, so the cases worth a sentence are the ones
 * where it rose and the judgement did not improve, where it fell and the
 * judgement did, and where it moved while the judgement held still — that last
 * one being the quietly interesting case, because a gap that stayed put while the
 * rate moved means the AI's claims moved with it.
 *
 * Silent where the two agree. A sentence drawn on every view saying the same
 * thing as the verdict above it is a sentence nobody reads on the day it differs.
 */
const readPassRate = (
  now: TrendSpan,
  earlier: TrendSpan,
  kind: "steady" | "closer" | "further"
): string | undefined => {
  if (now.observedRate === null || earlier.observedRate === null) return undefined

  const moved = now.observedRate - earlier.observedRate
  if (Math.abs(moved) <= GAP_TOLERANCE) return undefined

  const rose = moved > 0
  if (rose && kind === "closer") return undefined
  if (!rose && kind === "further") return undefined

  const direction = rose
    ? "More changes went through than in the stretch before"
    : "Fewer changes went through than in the stretch before"

  if (kind === "steady") {
    return `${direction}, and the AI's accuracy about itself did not move — so it claimed ${rose ? "more" : "less"} in step. What changed is how often changes are going through, not how well the AI reads itself.`
  }

  if (kind === "further") {
    return `${direction}. That is not the reading above and it is not an improvement: how often a change goes through is what your rules and the people here allow, and over this stretch the AI read itself less accurately than before.`
  }

  return `${direction}, and the AI still judged itself better than before — it was saying so in advance rather than being caught out.`
}

/**
 * The sentence for the half that is not being reported, when it did not hold
 * still either.
 *
 * Only one of the two can be the headline, so the other one goes in the
 * `aside` — unasked rather than behind a disclosure, because a reader who fixes
 * the cause they were told about and comes back to find the comparison still
 * refused has been sent on an errand twice.
 */
const SECOND_CAUSE: Readonly<Record<"rules" | "checks", Readonly<Record<"moved" | "unproven", string>>>> =
  {
    rules: {
      moved:
        "Your own rules moved between these two stretches as well, so there are two reasons this is not a reading about the AI.",
      unproven:
        "Nor can these two stretches be shown to have run on one set of rules, so that side would have to hold still too.",
    },
    checks: {
      moved:
        "What Loom was checking before it let a change on moved as well — that is your deployment’s wiring rather than your rules.",
      unproven:
        "What Loom was checking before it let a change on is not recorded across all of these either, so that side cannot be shown to have held still.",
    },
  }

const secondCause = (
  which: "rules" | "checks",
  steadiness: Steadiness
): string | undefined => (steadiness === "held" ? undefined : SECOND_CAUSE[which][steadiness])

/**
 * Why no comparison is drawn, when something that judged these claims did not
 * hold still between the two stretches.
 *
 * The rules come first when both are at fault, because they are the half a
 * person wrote and can look at. The checks are their deployment's wiring, which
 * is a different place to go and a sentence they should not have to read past
 * the one they can act on.
 *
 * All four readings keep the two stretches' own numbers on the screen — the
 * disclosure below this is drawn whatever the verdict. Nothing is withheld; what
 * is withheld is the *attribution*, which is the one thing here that would be an
 * invention.
 */
const refuseComparison = (rules: Steadiness, checks: Steadiness): TrendReading => {
  if (rules === "moved") {
    const aside = secondCause("checks", checks)

    return {
      kind: "rules-changed",
      tone: "uninterpreted",
      label: "Your rules changed in between, so this isn't about the AI",
      meaning:
        "Whether a change goes through is what your rules and the people here allow, not something the AI decides. These two stretches were judged under different rules, so anything that moved between them may be your own edit rather than the AI.",
      next: "Compare them again once a stretch of the record has run under the rules you have now. The two readings are below either way.",
      ...(aside === undefined ? {} : { aside }),
    }
  }

  if (rules === "unproven") {
    const aside = secondCause("checks", checks)

    return {
      kind: "rules-unproven",
      tone: "inapplicable",
      label: "We can't show your rules held still in between",
      meaning:
        "Whether a change goes through is what your rules and the people here allow, not something the AI decides. Some of these judgments did not record which rules they ran on, so nothing here can rule out that a movement is your own edit rather than the AI.",
      next: "Nothing to do, and nothing is wrong: this is not a change you have to find. The comparison starts working once a stretch of the record has run that recorded it. The two readings are below either way.",
      ...(aside === undefined ? {} : { aside }),
    }
  }

  if (checks === "moved") {
    return {
      kind: "checks-changed",
      tone: "uninterpreted",
      label: "What Loom was checking changed in between, so this isn't about the AI",
      meaning:
        "Your rules did hold still. But your deployment can also hand Loom checks it runs before a change goes on, and any of them can turn a change that would have gone through into one that was turned down — so a different set of them across these two stretches means anything that moved may be that wiring rather than the AI.",
      next: "Compare them again once a stretch of the record has run with the checks you have now. Which ones were in place is below.",
    }
  }

  return {
    kind: "checks-unproven",
    tone: "inapplicable",
    label: "We can't show Loom was checking the same things in between",
    meaning:
      "Your rules held still across both stretches. What Loom was checking before it let a change on is not recorded for all of these judgments, though, and either of those checks can turn a change that would have gone through into one that was turned down — so a movement could still be that wiring rather than the AI.",
    next: "Nothing to do, and nothing is wrong: this is not a change you have to find. The comparison starts working once a stretch of the record has run that recorded it. The two readings are below either way.",
  }
}

export const readTrend = (now: TrendSpan, earlier: Earlier): TrendReading => {
  if (earlier === "none") {
    return {
      kind: "no-earlier-record",
      tone: "inapplicable",
      label: "This is as far back as the record goes",
      meaning:
        "There is no earlier stretch to set this against, so nothing here can say whether the AI is getting better or worse.",
      next: "Nothing to do. This section fills in once the record is long enough to have a before.",
    }
  }

  if (earlier === "unreadable") {
    return {
      kind: "unreadable",
      tone: "inapplicable",
      label: "We couldn't look further back",
      meaning:
        "The verdict above is good — it is this stretch of the record. The read that would have fetched the stretch before it didn't come back, so there is no comparison rather than a guess at one.",
      next: "Try again in a moment. Nothing above this depends on it.",
    }
  }

  if (
    now.gap === null ||
    earlier.gap === null ||
    now.judged < COMPARABLE_MINIMUM ||
    earlier.judged < COMPARABLE_MINIMUM
  ) {
    const thin =
      earlier.judged < now.judged ? "the stretch before this one" : "this stretch of the record"

    return {
      kind: "too-few-to-compare",
      tone: "inapplicable",
      label: "Too few answers to say yet",
      meaning: `A comparison needs at least ${COMPARABLE_MINIMUM} answered changes on each side, and ${thin} has fewer. Below that, one change going the other way moves the figure further than the whole thing being measured.`,
      next: "Nothing to do. Keep answering changes and this will start saying something.",
    }
  }

  const rules = rulesSteadiness(now, earlier)
  const checks = checksSteadiness(now, earlier)

  if (rules !== "held" || checks !== "held") return refuseComparison(rules, checks)

  const sharpened = Math.abs(earlier.gap) - Math.abs(now.gap)

  if (Math.abs(sharpened) <= GAP_TOLERANCE) {
    const aside = readPassRate(now, earlier, "steady")

    return {
      kind: "steady",
      tone: "inapplicable",
      label: "About the same as before",
      meaning:
        "The AI reads itself about as accurately as it did over the stretch before this one. Nothing has drifted either way.",
      next: "Nothing to do. The verdict above is the one that matters, and it has held.",
      ...(aside === undefined ? {} : { aside }),
    }
  }

  if (sharpened > 0) {
    const aside = readPassRate(now, earlier, "closer")

    return {
      kind: "closer",
      tone: "applied",
      label: "The AI has got better at judging itself",
      meaning:
        "Over this stretch of the record, what it claimed and what happened sat closer together than they did before. Its confidence is worth more than it was.",
      next: "Nothing to do. If it keeps going this way, the rules you wrote to catch it being over-sure are doing less work than they were.",
      ...(aside === undefined ? {} : { aside }),
    }
  }

  const aside = readPassRate(now, earlier, "further")

  return {
    kind: "further",
    tone: "rejected",
    label: "The AI has got worse at judging itself",
    meaning:
      "What it claimed and what happened have drifted further apart than they were over the stretch before this one. A number from it means less than it used to.",
    next: "Read what a change would do before you accept it, and look at what it keeps being wrong about below.",
    ...(aside === undefined ? {} : { aside }),
  }
}

/**
 * The days a stretch covers, for a reader who should not have to take "a page of
 * the journal" on trust.
 *
 * `undefined` when the stretch carries no timestamps, which is the one honest
 * answer: a span printed with one end missing invites the reader to supply the
 * other. A stretch whose records all arrived on one day says that day once
 * rather than saying it twice with a dash in between.
 */
export const plainSpan = (span: TrendSpan): string | undefined => {
  if (span.from === undefined || span.to === undefined) return undefined

  const from = plainDay(span.from)
  const to = plainDay(span.to)

  return from === to ? from : `${from} to ${to}`
}
