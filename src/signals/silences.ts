import { everyMemberOf } from "../closed-set.js"

import type { ChangeSilence } from "./change.js"
import type { CopyChangeSilence } from "./copy-change.js"
import type { CopySilence } from "./copy.js"
import type { PaceChangeSilence } from "./pace-change.js"
import type { PaceSilence } from "./pace.js"
import type { ReachSilence } from "./reach.js"

/**
 * What two readings mean when they both say nothing, and whether they mean the
 * same thing.
 *
 * Every reading in this subsystem publishes a closed set of reasons a figure is
 * absent, and there are six of them. Each set's names are right in its own
 * sentence, and across the six they overlap in two ways that a surface drawing
 * two readings on one card has to resolve and nothing until now would resolve
 * for it.
 *
 * **Two names for one reason.** A window that held no page views is
 * `nothing-measured` to a before-and-after reading and `unmeasured` to a copy
 * reading. One condition, two spellings, and a card that printed both said the
 * same thing twice in two voices.
 *
 * **One name for two reasons, which is the half nobody had noticed.** A copy
 * reading's `unmeasured` is *the window's counters report no views of this
 * revision*. A reach reading's `unmeasured` is *there is no page-view row at
 * the door for this revision* — and a deployment can be in either one without
 * being in the other, because the two are read off different rows. The node
 * counters can be full of readers while the door row is missing, which is what
 * an upgraded deployment's first reading looks like. A surface that kept its
 * own table of synonyms would have mapped these two together, and it would have
 * been wrong in the direction that hides a fault.
 *
 * ## So the remedy is a mapping and not a renaming
 *
 * Renaming could not have worked, and the reason is the shape of what is
 * published here. A silence has **two** parts: the condition it reports, and
 * the thing that condition is true of. `nothing-measured` and `unmeasured` are
 * the same condition said of different subjects — a comparison names no side,
 * so *one of the two windows was empty* is a fact about the pair, while a copy
 * reading's is a fact about its one page. Two synonyms are not synonyms when
 * one of them is about twice as much, and a screen that collapsed them would
 * report the page in front of somebody as unmeasured when it was the other
 * side that was quiet.
 *
 * So each set keeps its names, nothing is superseded, and what is added is the
 * statement of which condition each name reports and what it is about. Where
 * two silences agree on both, one sentence serves; where they agree on the
 * condition alone, the same thing is true of a page and of one of its parts,
 * which is worth two sentences and never one.
 *
 * ## What the subject turned out to be
 *
 * It is a property of the **reading** and not of the silence: every reason a
 * copy reading gives is about its page, every reason a pace reading gives is
 * about one part, and every reason any of the three comparisons gives is about
 * the pair. That is why the subjects are published as one table over the
 * vocabularies rather than as a field on nine conditions, and it is the
 * strongest form the answer has — a surface that knows which reading it is
 * drawing already knows what its silences are about.
 *
 * Pure, and the arithmetic is a comparison of two string pairs. It reaches no
 * store, no clock and no DOM, and it adds nothing to the broadcaster's import
 * graph: the imports here are types only, so nothing in this module survives
 * into a browser bundle at all.
 */

/** What a silence is a fact about. */
export type SilenceSubject =
  /** One revision of one page, and the window of counters read against it. */
  | "page"
  /** One part of one revision. */
  | "part"
  /**
   * The two readings held against each other, naming neither side.
   *
   * The distinction that makes this worth having: *one of the two windows held
   * no page views* does not say which, so a card cannot draw it over the page
   * somebody is looking at. A reading of one page that says the same thing is
   * about the page on the screen.
   */
  | "comparison"

export const SILENCE_SUBJECTS: readonly SilenceSubject[] = everyMemberOf<SilenceSubject>()([
  "page",
  "part",
  "comparison",
])

/** One line per subject, for a surface naming what a reason is about. */
export const describeSilenceSubject = (subject: SilenceSubject): string => {
  switch (subject) {
    case "page":
      return "this version of the page, and the window read against it"
    case "part":
      return "one part of the page"
    case "comparison":
      return "the two readings together, neither side named"
  }
}

/**
 * Which reading published a silence.
 *
 * `reach` covers the funnel as well, because a funnel answer reuses
 * `ReachSilence` rather than restating it: the three reasons there is no
 * denominator are states of the deployment and not of the question asked, so
 * there is one vocabulary and not two.
 */
export type SilenceVocabulary =
  | "change"
  | "copy"
  | "copy-change"
  | "pace"
  | "pace-change"
  | "reach"

export const SILENCE_VOCABULARIES: readonly SilenceVocabulary[] =
  everyMemberOf<SilenceVocabulary>()([
    "change",
    "copy",
    "copy-change",
    "pace",
    "pace-change",
    "reach",
  ])

/**
 * What each reading's reasons are about.
 *
 * Published as a table over the vocabularies because that is what it is: the
 * subject is a property of the reading, uniform across its whole set, and a
 * caller holding a silence it has not yet mapped can read the subject off this
 * before it reads the condition.
 */
export const SUBJECT_OF_VOCABULARY: Readonly<Record<SilenceVocabulary, SilenceSubject>> =
  Object.freeze({
    change: "comparison",
    copy: "page",
    "copy-change": "comparison",
    pace: "part",
    "pace-change": "comparison",
    reach: "page",
  })

/**
 * The state of the world a silence reports, named once for the whole subsystem.
 *
 * Nine of them against twenty-two members across the six sets, which is the
 * overlap this module exists to state. None of them replaces a set's own name:
 * a reading still reports its own vocabulary, and this is what that vocabulary
 * means.
 *
 * **The sixth set needed no tenth condition**
 * ([0244](../../decisions/0244-a-pace-moved-because-the-words-moved-or-the-readers-did-and-a-counterfactual-says-which.md)),
 * which is the first evidence that these are the states of the world rather
 * than a list of the names the modules before it happened to use.
 */
export type SilenceCondition =
  /** The two readings are of different trees, so nothing in either is comparable. */
  | "two-pages"
  /**
   * Nothing reported a view of it.
   *
   * Of a page, the window's counters say no view of this revision happened. Of
   * a part, no view reported that part coming into view, which a window with
   * readers in it can say about any part they did not reach.
   */
  | "no-view-reported"
  /**
   * There is no page-view row at the door for this revision.
   *
   * Not the same state as nothing having been seen, and the pair is the reason
   * this mapping is published. The node counters can hold a window of readers
   * while this row is missing — a deployment whose intake predates the column,
   * one whose rows have expired, or a caller that fetched the rows for
   * something else — and the counters are then still a floor on how many
   * readers there were.
   */
  | "no-arrivals-counted"
  /**
   * The row is there and nothing in it says a page view ever began.
   *
   * Two deployments look like this, and which one it is turns on whether any
   * appearance has been counted: nobody has read this revision, or **the
   * senders are not marking their openings** and every rate on the screen has
   * no denominator while the counters look healthy. The reading publishes both
   * numbers, so the diagnosis is a subtraction a surface can make; the
   * condition is what the two have in common and no more.
   */
  | "no-openings-marked"
  /** Readers arrived and no rollup has folded a window of their reading yet. */
  | "no-window-folded"
  /** It says nothing that could have been read: no words, and nothing undeclared either. */
  | "says-nothing"
  /**
   * Some of its words are a floor, because a type in it declares no `copy`
   * (0122).
   *
   * A count of words survives this and a mean of them does not, which is why
   * the readings that hit it withhold a figure rather than a row.
   */
  | "words-a-floor"
  /**
   * It reports more readers than it has views, which no rollup produces.
   *
   * A reading assembled by hand, or by a sender that is not one. It is the
   * alarm a reading raises where a figure would otherwise stay plausible while
   * being about nothing.
   */
  | "readers-above-views"
  /** The change left no word of the page as it was, so there is no carried text to read. */
  | "nothing-carried"

export const SILENCE_CONDITIONS: readonly SilenceCondition[] = everyMemberOf<SilenceCondition>()([
  "two-pages",
  "no-view-reported",
  "no-arrivals-counted",
  "no-openings-marked",
  "no-window-folded",
  "says-nothing",
  "words-a-floor",
  "readers-above-views",
  "nothing-carried",
])

/**
 * One line per condition, written so that it reads after the subject it is
 * about rather than naming one itself.
 *
 * Each set's own `describe` is the sentence for one reading and stays the right
 * thing to print there. This is the sentence for the state, which is what a
 * surface needs when it is speaking about two readings at once.
 */
export const describeSilenceCondition = (condition: SilenceCondition): string => {
  switch (condition) {
    case "two-pages":
      return "the two readings are of different pages"
    case "no-view-reported":
      return "nothing reported a view of it"
    case "no-arrivals-counted":
      return "no page views have been counted at the door for it"
    case "no-openings-marked":
      return "nothing has said a page view began"
    case "no-window-folded":
      return "readers arrived and no window of their reading has been counted yet"
    case "says-nothing":
      return "it says nothing that could be read"
    case "words-a-floor":
      return "some of its words are a floor, because a type in it declares no copy"
    case "readers-above-views":
      return "it reports more readers than views, which no rollup produces"
    case "nothing-carried":
      return "the change left no word of the page as it was"
  }
}

/** What one reading's silence reports, and what it reports it of. */
export type SilenceMeaning = {
  readonly condition: SilenceCondition
  readonly subject: SilenceSubject
  /** The reading that published it, kept so that its own sentence can still be printed. */
  readonly vocabulary: SilenceVocabulary
}

const meaning = (vocabulary: SilenceVocabulary, condition: SilenceCondition): SilenceMeaning => ({
  condition,
  subject: SUBJECT_OF_VOCABULARY[vocabulary],
  vocabulary,
})

/** What a before-and-after reading's silence reports (0224). */
export const meaningOfChangeSilence = (silence: ChangeSilence): SilenceMeaning => {
  switch (silence) {
    case "different-trees":
      return meaning("change", "two-pages")
    case "nothing-measured":
      return meaning("change", "no-view-reported")
  }
}

/** What a copy reading's silence reports (0235). */
export const meaningOfCopySilence = (silence: CopySilence): SilenceMeaning => {
  switch (silence) {
    case "wordless":
      return meaning("copy", "says-nothing")
    case "unmeasured":
      return meaning("copy", "no-view-reported")
    case "floored":
      return meaning("copy", "words-a-floor")
    case "inconsistent":
      return meaning("copy", "readers-above-views")
  }
}

/** What a comparison of two windows' words reports (0239). */
export const meaningOfCopyChangeSilence = (silence: CopyChangeSilence): SilenceMeaning => {
  switch (silence) {
    case "different-trees":
      return meaning("copy-change", "two-pages")
    case "wordless":
      return meaning("copy-change", "says-nothing")
    case "nothing-measured":
      return meaning("copy-change", "no-view-reported")
    case "inconsistent":
      return meaning("copy-change", "readers-above-views")
    case "dissolved":
      return meaning("copy-change", "nothing-carried")
    case "floored":
      return meaning("copy-change", "words-a-floor")
  }
}

/** What a pace reading's silence reports, of one part (0230). */
export const meaningOfPaceSilence = (silence: PaceSilence): SilenceMeaning => {
  switch (silence) {
    case "unreached":
      return meaning("pace", "no-view-reported")
    case "unreadable":
      return meaning("pace", "words-a-floor")
    case "wordless":
      return meaning("pace", "says-nothing")
  }
}

/**
 * What a comparison of two windows' pace reports (0244).
 *
 * A comparison, so its subject is the pair and never the page on the screen —
 * which is the distinction this module exists for: `nothing-measured` here does
 * not say which of the two windows was empty.
 */
export const meaningOfPaceChangeSilence = (silence: PaceChangeSilence): SilenceMeaning => {
  switch (silence) {
    case "different-trees":
      return meaning("pace-change", "two-pages")
    case "wordless":
      return meaning("pace-change", "says-nothing")
    case "nothing-measured":
      return meaning("pace-change", "no-view-reported")
    case "dissolved":
      return meaning("pace-change", "nothing-carried")
  }
}

/**
 * What a share-of-readers silence reports, which is also a funnel's (0229).
 *
 * Its `unmeasured` is the one name in this subsystem that means something other
 * than what the same name means elsewhere, and this is where that is written
 * down: a missing row at the door, not a window without readers.
 */
export const meaningOfReachSilence = (silence: ReachSilence): SilenceMeaning => {
  switch (silence) {
    case "unmeasured":
      return meaning("reach", "no-arrivals-counted")
    case "unopened":
      return meaning("reach", "no-openings-marked")
    case "uncounted":
      return meaning("reach", "no-window-folded")
  }
}

/** How two readings' reasons for saying nothing stand to each other. */
export type SilenceRelation =
  /**
   * One condition about one subject: the two readings are silent for the same
   * reason about the same thing, and one sentence serves both.
   */
  | "one-state"
  /**
   * One condition about two subjects.
   *
   * The same thing is true of a page and of one of its parts, or of a pair of
   * readings and of one side of it. Worth two sentences and never one: the
   * narrower is not evidence for the wider, and the wider does not say which
   * side it is about.
   */
  | "one-reason"
  /** Two conditions, which a surface has to print separately or choose between. */
  | "unrelated"

export const SILENCE_RELATIONS: readonly SilenceRelation[] = everyMemberOf<SilenceRelation>()([
  "one-state",
  "one-reason",
  "unrelated",
])

/**
 * Hold two readings' reasons against each other.
 *
 * The vocabulary is deliberately not part of the comparison. Two readings that
 * report one state are reporting one state whether or not they spell it the
 * same, which is the whole of what this module is for.
 */
export const relateSilences = (one: SilenceMeaning, other: SilenceMeaning): SilenceRelation => {
  if (one.condition !== other.condition) return "unrelated"

  return one.subject === other.subject ? "one-state" : "one-reason"
}

/**
 * The states a card is actually in, out of the readings on it.
 *
 * Takes the silences as a surface holds them — one per reading, most of them
 * `null` on a healthy deployment — and gives back the distinct states, in the
 * order the readings were handed over. Nulls are dropped rather than refused,
 * because that is the shape of the call: a caller maps its readings' `silence`
 * fields and should not have to narrow them first.
 *
 * Two readings that report one state collapse to one entry, and the entry keeps
 * the **first** reading's vocabulary, so a surface that would rather print that
 * reading's own sentence still can. Two readings that report one condition
 * about different subjects stay as two, for the reason the relation gives.
 */
export const distinctSilences = (
  meanings: readonly (SilenceMeaning | null)[]
): readonly SilenceMeaning[] =>
  meanings.reduce<readonly SilenceMeaning[]>(
    (kept, next) =>
      next === null || kept.some((seen) => relateSilences(seen, next) === "one-state")
        ? kept
        : [...kept, next],
    []
  )
