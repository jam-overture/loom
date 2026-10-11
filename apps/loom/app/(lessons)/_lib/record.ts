import { calibrationOf, secondLookOf } from "./calibration"
import {
  EMPTY_SET_PROGRESS,
  readProgress,
  type Attempt,
  type Correction,
  type Explanation,
  type Prediction,
  type Progress,
  type SetProgress,
} from "./progress"

/**
 * The record, as something the reader can carry.
 *
 * `store.ts` keeps the study history in one `localStorage` key, and says why:
 * what somebody typed when they could not remember something is the most
 * unflattering data this project holds, so it is kept where nobody but them can
 * read it, with no account and nothing sent anywhere. That trade is right and
 * this module does not reopen it.
 *
 * What it does reopen is the consequence nobody had written down. A record that
 * exists in exactly one browser profile and nowhere else is **one clearance of
 * site data away from zero**, and the thing lost is not a preference — it is the
 * three-retrieval streak on every question the reader has ever missed, the date
 * every review set is scheduled from, and the confident-and-wrong count, which
 * is the one number this surface exists to keep and the only one that cannot be
 * reconstructed by working harder. It is also stuck: a course read on a laptop
 * and a train is one course, and two records that each think the other's
 * sittings never happened will each offer sets the reader has already done.
 *
 * The fix is not a table on a server. It is a file: the record goes out as JSON
 * the reader holds, and comes back in as a **replay** rather than a paste.
 *
 * Replay is the whole design. An import does not overwrite the record and does
 * not append to it blindly; it applies the incoming events under the same rules
 * the surface already applies when the events happen live —
 *
 * - a later attempt at a question replaces an earlier one, because `withAttempt`
 *   says a set you came back to is a set you did, not two;
 * - a correction is appended and never replaces, because two goes at a question
 *   a week apart are two retrievals and the count of them is the measurement;
 * - a lesson keeps the **earliest** day it was worked through, because that is
 *   when it happened, and every set's due date is derived from it.
 *
 * So merging two machines cannot invent history in either direction, and
 * importing the same file twice does nothing the second time — which matters
 * more than it sounds, because a correction counted twice would retire a
 * question the reader has retrieved once.
 */

export const RECORD_FORMAT = "loom.lessons.record"

export const RECORD_VERSION = 1

export type RecordFile = {
  readonly format: typeof RECORD_FORMAT
  readonly version: number
  readonly exportedOn: string
  readonly progress: Progress
}

export const packRecord = (progress: Progress, on: string): RecordFile => ({
  format: RECORD_FORMAT,
  version: RECORD_VERSION,
  exportedOn: on,
  progress,
})

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export const isEmptyRecord = (progress: Progress): boolean =>
  Object.keys(progress.lessons).length === 0 &&
  Object.keys(progress.sets).length === 0 &&
  Object.keys(progress.predictions).length === 0 &&
  Object.keys(progress.explanations).length === 0 &&
  progress.corrections.length === 0

/**
 * Whatever the reader handed over, as a record — or `undefined` when it is not
 * one at all.
 *
 * Two shapes are accepted, and the second is the point: a file this page wrote,
 * and a bare record. Before this existed the only way to get the history out of
 * a browser was to copy the `localStorage` value in devtools, and somebody who
 * did that a month ago should not be told their own record is not a record.
 *
 * Reading is total, like everything else that touches this data (0005 in
 * miniature): a file written by a newer version, or hand-edited, or truncated,
 * yields whatever part of it is still legible. The version is carried so a
 * future format can tell, and is deliberately not *checked* — refusing to read a
 * record because its number is unfamiliar would lose exactly the history this
 * module exists to preserve.
 */
export const unpackRecord = (value: unknown): Progress | undefined => {
  if (!isObject(value)) return undefined

  const progress = readProgress(value["format"] === RECORD_FORMAT ? value["progress"] : value)

  return isEmptyRecord(progress) ? undefined : progress
}

/** A day string sorts as a date, which is the only reason they are stored this way. */
const earlier = (left: string | undefined, right: string | undefined): string | undefined => {
  if (left === undefined) return right
  if (right === undefined) return left

  return left <= right ? left : right
}

/**
 * Whether the incoming version of something replaces the one already held.
 *
 * Later wins, and **a tie goes to the record being imported into**. Two
 * machines have no shared order of events, so the day is all there is to go on;
 * when even that is equal, the honest thing is to change nothing rather than to
 * silently prefer whichever file was opened second.
 */
const replaces = (held: { readonly on: string } | undefined, incoming: { readonly on: string }): boolean =>
  held === undefined || incoming.on > held.on

/**
 * One entry per question, later winning — which is `withAttempt`'s rule and
 * `withPrediction`'s rule, applied by date instead of by arrival. Both kinds are
 * merged by the same function because both are the same claim: *this is what I
 * had at that question, as of that day.*
 */
const mergeByQuestion = <T extends { readonly question: number; readonly on: string }>(
  held: readonly T[],
  incoming: readonly T[]
): readonly T[] => {
  const merged = [...held]

  for (const entry of incoming) {
    const at = merged.findIndex((each) => each.question === entry.question)

    if (at === -1) merged.push(entry)
    else if (replaces(merged[at], entry)) merged[at] = entry
  }

  return merged.sort((left, right) => left.question - right.question)
}

const mergeSet = (held: SetProgress, incoming: SetProgress): SetProgress => ({
  attempts: mergeByQuestion<Attempt>(held.attempts, incoming.attempts),
  /**
   * The earliest, for the same reason a lesson keeps its earliest day: a set the
   * reader sat down and did on the 3rd was done on the 3rd, and dating it from
   * the machine that heard about it later would push everything it anchors.
   */
  completedOn: earlier(held.completedOn, incoming.completedOn),
})

/**
 * A correction's identity, for the one job identity is needed for here: telling
 * a re-import of yesterday's file from a genuine second retrieval.
 *
 * Every field, because there is nothing else to go on — corrections carry no id,
 * and inventing one now would make every record written before today unreadable.
 * Two truly distinct retrievals of the same question, on the same day, at the
 * same confidence, graded the same, with character-identical answers, collapse
 * into one. That is the safe direction to be wrong in: an inflated streak
 * retires a question the reader has not earned, and this queue is the one part
 * of the course that is supposed to keep coming back.
 */
/**
 * A byte that can occur in none of the fields below, written as an escape.
 *
 * It was a literal NUL in the source until this run, which is the same string and
 * made this file **binary as far as `git` is concerned** — so every diff of the
 * module holding the merge rules came back as `Bin 13206 -> 14798 bytes`, and the
 * one file in this directory a reviewer most needs to read was the one that could
 * not be read. The separator itself is lesson 18's trick — `plan.ts` keys a data
 * request the same way and for the same reason, so that two different questions
 * cannot collide on one key. What changed is only how it is spelled.
 */
const SEPARATOR = "\u0000"

const correctionKey = (correction: Correction): string =>
  [
    correction.set,
    correction.question,
    correction.on,
    correction.confidence,
    correction.grade,
    correction.answer,
  ].join(SEPARATOR)

export const mergeRecords = (held: Progress, incoming: Progress): Progress => {
  const lessons: Record<string, string> = { ...held.lessons }

  for (const [lesson, on] of Object.entries(incoming.lessons)) {
    lessons[lesson] = earlier(lessons[lesson], on) ?? on
  }

  const sets: Record<string, SetProgress> = { ...held.sets }

  for (const [slug, record] of Object.entries(incoming.sets)) {
    sets[slug] = mergeSet(sets[slug] ?? EMPTY_SET_PROGRESS, record)
  }

  const predictions: Record<string, readonly Prediction[]> = { ...held.predictions }

  for (const [slug, written] of Object.entries(incoming.predictions)) {
    predictions[slug] = mergeByQuestion<Prediction>(predictions[slug] ?? [], written)
  }

  /**
   * Later wins, per question, which is `withExplanation`'s rule applied by date
   * instead of by arrival — and it is the right one here for a reason worth
   * saying, because the alternative is tempting. Two machines can hold two
   * explanations of lesson 09 written weeks apart, and appending both would look
   * like keeping more of the reader's work. It would in fact be keeping a
   * document and an older draft of it with nothing able to tell which is which,
   * in the one place on this surface that has no grade to sort them by.
   */
  const explanations: Record<string, readonly Explanation[]> = { ...held.explanations }

  for (const [slug, written] of Object.entries(incoming.explanations)) {
    explanations[slug] = mergeByQuestion<Explanation>(explanations[slug] ?? [], written)
  }

  const seen = new Set(held.corrections.map(correctionKey))
  const corrections = [...held.corrections]

  for (const correction of incoming.corrections) {
    const key = correctionKey(correction)

    if (seen.has(key)) continue

    seen.add(key)
    corrections.push(correction)
  }

  return {
    lessons,
    sets,
    predictions,
    explanations,
    /** Oldest first, which is what every reader of this list assumes. */
    corrections: [...corrections].sort((left, right) => left.on.localeCompare(right.on)),
  }
}

export type MergeCount = {
  /** Incoming entries that change the record — new, or replacing something older. */
  readonly added: number
  /** Incoming entries the record already holds. A second import is all of these. */
  readonly alreadyHeld: number
}

export type MergeReport = {
  readonly lessons: MergeCount
  readonly sets: MergeCount
  readonly attempts: MergeCount
  readonly predictions: MergeCount
  readonly explanations: MergeCount
  readonly corrections: MergeCount
  /** True when the import would change nothing at all. */
  readonly nothingNew: boolean
}

const count = (incoming: number, added: number): MergeCount => ({
  added,
  alreadyHeld: incoming - added,
})

/**
 * What an import would do, worked out before it does it.
 *
 * A reader about to merge two months of study history into another two months
 * deserves to know which way it is going to go, and the numbers are cheap: the
 * same win rules the merge uses, counted rather than applied.
 */
export const describeMerge = (held: Progress, incoming: Progress): MergeReport => {
  const lessonEntries = Object.entries(incoming.lessons)
  const lessonsAdded = lessonEntries.filter(([lesson, on]) => {
    const mine = held.lessons[lesson]

    return mine === undefined || on < mine
  }).length

  const setEntries = Object.entries(incoming.sets)
  const setsAdded = setEntries.filter(([slug]) => held.sets[slug] === undefined).length

  const attempts = setEntries.flatMap(([slug, record]) =>
    record.attempts.map(
      (attempt) =>
        [(held.sets[slug] ?? EMPTY_SET_PROGRESS).attempts.find(
          (each) => each.question === attempt.question
        ), attempt] as const
    )
  )
  const attemptsAdded = attempts.filter(([mine, attempt]) => replaces(mine, attempt)).length

  const predictions = Object.entries(incoming.predictions).flatMap(([slug, written]) =>
    written.map(
      (prediction) =>
        [(held.predictions[slug] ?? []).find((each) => each.question === prediction.question), prediction] as const
    )
  )
  const predictionsAdded = predictions.filter(([mine, prediction]) => replaces(mine, prediction)).length

  const explanations = Object.entries(incoming.explanations).flatMap(([slug, written]) =>
    written.map(
      (explanation) =>
        [(held.explanations[slug] ?? []).find((each) => each.question === explanation.question), explanation] as const
    )
  )
  const explanationsAdded = explanations.filter(([mine, explanation]) => replaces(mine, explanation)).length

  const mine = new Set(held.corrections.map(correctionKey))
  const correctionsAdded = new Set(
    incoming.corrections.map(correctionKey).filter((key) => !mine.has(key))
  ).size

  return {
    lessons: count(lessonEntries.length, lessonsAdded),
    sets: count(setEntries.length, setsAdded),
    attempts: count(attempts.length, attemptsAdded),
    predictions: count(predictions.length, predictionsAdded),
    explanations: count(explanations.length, explanationsAdded),
    corrections: count(incoming.corrections.length, correctionsAdded),
    nothingNew:
      lessonsAdded + attemptsAdded + predictionsAdded + explanationsAdded + correctionsAdded === 0,
  }
}

export type RecordSummary = {
  readonly lessons: number
  readonly sets: number
  readonly attempts: number
  readonly predictions: number
  readonly explanations: number
  readonly corrections: number
  /** Never goes down, and is why the file is worth keeping. */
  readonly confidentAndWrong: number
  /**
   * The rarer half of the same thing: sure, wrong, looked it up, came back sure,
   * and wrong again. Counted here because it is the one figure in the record
   * that takes a month to produce and cannot be reconstructed from anything
   * else in the file.
   */
  readonly sureAgainAndWrong: number
  readonly firstDay: string | undefined
  readonly lastDay: string | undefined
  /** Distinct days on which anything was recorded — the size of what is at stake. */
  readonly days: number
}

/**
 * What the record holds, in numbers and dates only.
 *
 * **Nothing here is an answer**, and that is a rule rather than an oversight.
 * This page is reachable from every other one, and a question the reader missed
 * is a question that is coming back — so a page that listed what they wrote
 * would be handing them the thing the corrections queue is about to ask for.
 * Counts and dates say how much there is to lose without saying any of it.
 */
export const summariseRecord = (progress: Progress): RecordSummary => {
  const attempts = Object.values(progress.sets).flatMap((record) => record.attempts)
  const predictions = Object.values(progress.predictions).flat()
  const explanations = Object.values(progress.explanations).flat()

  const days = [
    ...Object.values(progress.lessons),
    ...attempts.map((attempt) => attempt.on),
    ...predictions.map((prediction) => prediction.on),
    ...explanations.map((explanation) => explanation.on),
    ...progress.corrections.map((correction) => correction.on),
    ...Object.values(progress.sets)
      .map((record) => record.completedOn)
      .filter((on): on is string => on !== undefined),
  ].sort()

  return {
    lessons: Object.keys(progress.lessons).length,
    sets: Object.values(progress.sets).filter((record) => record.completedOn !== undefined).length,
    attempts: attempts.length,
    predictions: predictions.length,
    explanations: explanations.length,
    corrections: progress.corrections.length,
    confidentAndWrong: calibrationOf(progress).confidentAndWrong.length,
    sureAgainAndWrong: secondLookOf(progress).sureAndWrong.length,
    firstDay: days[0],
    lastDay: days[days.length - 1],
    days: new Set(days).size,
  }
}
