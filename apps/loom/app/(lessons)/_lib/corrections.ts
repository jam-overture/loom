import { CONFIDENT } from "./calibration"
import {
  correctionsFor,
  type Attempt,
  type Confidence,
  type Correction,
  type Grade,
  type Progress,
} from "./progress"
import { addDays, daysBetween } from "./queue"
import { lessonSlugParts } from "./slugs"

/**
 * The questions you got wrong, coming back.
 *
 * `review-schedule.md` has said since the first lesson what to do about a miss,
 * and it is the most specific instruction in the whole document:
 *
 * > If you miss something: **do not reread the lesson.** Look up only the
 * > specific point, then re-answer that question from memory a day later.
 *
 * Nothing implemented it. The surface counts the misses, prints them, calls them
 * the real study plan, tells the reader to re-answer them from memory — and then
 * offers them nothing to re-answer. The set they were in is marked done and will
 * not come round again; the question is a line of text in a summary, and looking
 * at it is not retrieving it. That gap is where the most valuable questions in
 * the course go to die, and it is the one *Make It Stick* is least equivocal
 * about: **successive relearning** — the same item retrieved again, after a gap,
 * more than once — is what separates knowing a thing in the session from knowing
 * it in six months.
 *
 * Everything here is arithmetic over what the reader has already recorded. There
 * is no new judgement in it and deliberately no new question: a correction is
 * one of the schedule's own questions, asked again, closed book, rated first.
 *
 * The clock is a parameter and not a call (0005), for the same reason the set
 * queue's is: a spacing rule tested against the real clock is a test that passes
 * tomorrow for a different reason than it passed today.
 */

/**
 * How long a corrected question waits, per clean retrieval so far.
 *
 * The first gap is the schedule's own sentence — *a day later* — and the two
 * after it are the cadence the schedule already uses for everything else, a week
 * and a month. Three clean retrievals spread across a month retires a question;
 * one miss at any point sends it back to the beginning.
 *
 * The exact intervals matter less than the fact that there are three of them and
 * that they are separated. Expanding and equal gaps come out close in the
 * literature; a single re-test the same afternoon does not, and is the version
 * this replaces.
 */
export const CORRECTION_GAPS: readonly number[] = [1, 7, 30]

/**
 * How many corrections one sitting offers.
 *
 * The same argument the set queue makes about a backlog, in miniature. A reader
 * who has done a dozen sets and is honest about their grading can easily have
 * thirty questions outstanding, and thirty questions handed over at once is
 * massed practice wearing the costume of catching up. Five mixed questions is
 * about ten minutes.
 */
export const SITTING = 5

/**
 * Which recorded misses come back, and it is not all of them.
 *
 * Every question in the course that gets graded lands in the same record under
 * a slug — a review set, a lesson's Warm-up, its Self-check, and the
 * predictions it grades at Reflect. Three of those four are unambiguous: the
 * reader met the material, was asked for it later, and could not produce it.
 * That is a retrieval failure, and a retrieval failure is exactly what this
 * queue exists to keep bringing back.
 *
 * **Predict is different in kind, and only sometimes.** A Predict question is
 * asked before the explanation and is written to be got wrong — the course says
 * so in its own README, and calls being wrong the mechanism rather than a waste
 * of time. A reader who rates a prediction 2, misses it, and is handed it back
 * the next day has been told off for doing the exercise correctly. Nothing was
 * forgotten there; they said they did not know, and they did not know, and
 * their calibration was perfect. Feeding those into the queue would also bury
 * the real misses under them, because a lesson generates three by design and a
 * Self-check generates none if the lesson worked.
 *
 * A prediction rated **4 or 5** and missed is the opposite, and is arguably the
 * most valuable single thing this surface records. It is not a gap — it is a
 * belief about how the system works, held confidently, that turned out to be
 * false. Those do not go away by being contradicted once, which is the whole
 * reason `wasConfident` orders this queue in the first place. So the same
 * threshold decides entry as decides precedence: if you were sure, it comes
 * back.
 */
export const comesBack = (slug: string, attempt: Attempt): boolean => {
  if (attempt.grade === "got-it") return false

  return lessonSlugParts(slug)?.part === "predict" ? attempt.confidence >= CONFIDENT : true
}

/** How a question is addressed across this surface: its slug and its number. */
export const keyOf = (set: string, question: number): string => `${set}#${question}`

export type CorrectionStatus = "due" | "upcoming" | "retired"

export type PendingCorrection = {
  /** Set slug, e.g. `set-d`. */
  readonly set: string
  readonly question: number
  /**
   * The confidence given in the sitting where this was missed — not the most
   * recent one. This is the number that makes the question worth returning to,
   * and it does not get to improve just because the reader has calmed down.
   */
  readonly confidence: Confidence
  readonly grade: Grade
  readonly missedOn: string
  /** Clean retrievals since the miss, 0–3. */
  readonly done: number
  readonly dueOn: string
  readonly status: CorrectionStatus
  /** Zero unless due: days late, which decides the order within a band. */
  readonly overdueBy: number
  /** Days until it comes round, for the ones that have not. */
  readonly inDays: number | undefined
}

/**
 * Whether the reader was sure. Kept here rather than inlined because it is the
 * same threshold the calibration panel counts by, and two different answers to
 * "confident" across one surface would be worse than either.
 */
export const wasConfident = (correction: PendingCorrection): boolean =>
  correction.confidence >= CONFIDENT

/**
 * Corrections that count towards this miss: the ones recorded on or after the
 * day it happened.
 *
 * A reader who redoes a whole set overwrites the old attempt, so a question can
 * be missed again long after it was retired. The corrections that retired it are
 * still in the record — nothing here deletes anything — but they answered an
 * older miss, and counting them would retire the new one on the strength of a
 * retrieval from three months ago.
 */
const since = (all: readonly Correction[], missedOn: string): readonly Correction[] =>
  [...all].filter((correction) => correction.on >= missedOn).sort((a, b) => a.on.localeCompare(b.on))

/**
 * Clean retrievals in a row, counted from the most recent backwards.
 *
 * Backwards because a miss resets: got it, got it, missed leaves the reader
 * where they started, not two thirds of the way through. "Partly" resets too,
 * and that is a judgement worth stating — a half-remembered answer is the exact
 * thing the fluency illusion feels like from the inside, and it is what the
 * reader will grade themselves when they are being generous.
 */
const streakOf = (corrections: readonly Correction[]): number => {
  let clean = 0

  for (const correction of [...corrections].reverse()) {
    if (correction.grade !== "got-it") break
    clean += 1
  }

  return clean
}

const pendingFor = (
  set: string,
  question: number,
  confidence: Confidence,
  grade: Grade,
  missedOn: string,
  progress: Progress,
  today: string
): PendingCorrection => {
  const counted = since(correctionsFor(progress, set, question), missedOn)
  const done = Math.min(streakOf(counted), CORRECTION_GAPS.length)
  const gap = CORRECTION_GAPS[done]
  const last = counted.at(-1)?.on ?? missedOn

  if (gap === undefined) {
    return {
      set,
      question,
      confidence,
      grade,
      missedOn,
      done,
      dueOn: last,
      status: "retired",
      overdueBy: 0,
      inDays: undefined,
    }
  }

  const dueOn = addDays(last, gap)
  const days = daysBetween(dueOn, today)

  return days >= 0
    ? { set, question, confidence, grade, missedOn, done, dueOn, status: "due", overdueBy: days, inDays: 0 }
    : {
        set,
        question,
        confidence,
        grade,
        missedOn,
        done,
        dueOn,
        status: "upcoming",
        overdueBy: 0,
        inDays: -days,
      }
}

/**
 * The order to work them in: what you were sure about and wrong about, first.
 *
 * That pair is what the schedule calls the real study plan, and it is first here
 * for the reason it is watched everywhere else — being unsure and wrong gets
 * fixed on contact, and being sure and wrong is what stops you checking. After
 * that, a clean miss before a partial one, and the most overdue before the rest.
 */
const RANK: Readonly<Record<Grade, number>> = { missed: 0, partly: 1, "got-it": 2 }

const order = (a: PendingCorrection, b: PendingCorrection): number => {
  if (wasConfident(a) !== wasConfident(b)) return wasConfident(a) ? -1 : 1
  if (RANK[a.grade] !== RANK[b.grade]) return RANK[a.grade] - RANK[b.grade]
  if (a.overdueBy !== b.overdueBy) return b.overdueBy - a.overdueBy
  if (a.set !== b.set) return a.set.localeCompare(b.set)

  return a.question - b.question
}

/**
 * The same walk, with the retired ones still in it.
 *
 * `correctionQueue` drops them because a retired question is not work, and for
 * every caller that hands the reader something to do that is the right list.
 * But an empty queue has more than one cause, and *this* is the list that says
 * which: a reader who has retired eleven questions and a reader who has never
 * been asked one both get nothing from the function above, and the difference
 * between them is the difference between a queue that has finished and a queue
 * that has never started.
 *
 * Retired entries carry `dueOn` as the day of their last clean retrieval rather
 * than a future date, and sort to the end of a mixed list, and neither matters
 * to anybody yet — the only thing read off them is that there are some.
 */
export const everyCorrection = (progress: Progress, today: string): readonly PendingCorrection[] =>
  Object.entries(progress.sets)
    .flatMap(([set, record]) =>
      record.attempts
        .filter((attempt) => comesBack(set, attempt))
        .map((attempt) =>
          pendingFor(set, attempt.question, attempt.confidence, attempt.grade, attempt.on, progress, today)
        )
    )
    .sort(order)

/**
 * Every question the reader has missed and not yet retired, with when it next
 * comes round.
 *
 * A question leaves this list one of two ways: three clean retrievals across a
 * month, or a later go at the whole set in which it was got. Nothing else
 * removes one, and in particular reading the lesson again does not.
 *
 * Every slug in the record is walked, which is a review set and a lesson's own
 * graded sections alike. That was always true of this function and used not to
 * be true of anything downstream of it, which is the bug this is the fix for:
 * the panel counted lesson misses and the sitting could not render them, so a
 * reader who had missed a Self-check question and nothing else was told three
 * questions were waiting and shown none.
 */
export const correctionQueue = (progress: Progress, today: string): readonly PendingCorrection[] =>
  everyCorrection(progress, today).filter((correction) => correction.status !== "retired")

/**
 * The queue, minus questions the course no longer contains.
 *
 * Sets and lessons get edited: a question can be reworded, renumbered or
 * removed between the sitting that recorded the miss and the day it comes back,
 * and a record kept in the reader's browser has no way of hearing about it.
 * What is left is a key pointing at nothing.
 *
 * This exists as a function rather than as a line in the sitting because it has
 * to happen in *two* places — the sitting and the panel that advertises it —
 * and the one time those two disagreed about what the queue contained, the
 * panel spent a week promising work the page then refused to hand over.
 */
export const knownOnly = (
  queue: readonly PendingCorrection[],
  keys: ReadonlySet<string>
): readonly PendingCorrection[] =>
  queue.filter((correction) => keys.has(keyOf(correction.set, correction.question)))

/**
 * Why there is nothing to re-answer, for a reader who has been told there is
 * nothing to re-answer.
 *
 * *Nothing has come back* was one sentence over several situations, and it
 * named two of them in a disjunction — *either you have not missed anything
 * yet, or everything you missed has been got three times running.* An **or** in
 * a sentence about the reader's own record is the author saying they did not
 * look, and the record was sitting right there: it knows which. This is lesson
 * 24's rule turned on the page that reports it, and the second time this
 * surface has needed it — the review queue's *no set is due today* was the
 * first, one floor up.
 *
 * The four readings are four different things to do next, which is the test
 * that says they are four rather than one:
 *
 * | reading | what the reader should do |
 * | --- | --- |
 * | `unanswered` | work a set or a lesson — this queue is downstream of both |
 * | `unmissed` | nothing; the queue is empty because you have been right |
 * | `held-back` | nothing, and know that a guess you called a guess is not a debt |
 * | `retired` | nothing, and this is what the queue finishing looks like |
 *
 * `held-back` is the one worth having. A reader who missed three Predict
 * questions and rated them 2 has three misses in the record and an empty
 * corrections queue, and being told *you have not missed anything* by a page
 * that can see all three reads as the page being broken. It is not: `comesBack`
 * declines them on purpose, because a prediction you knew you were guessing at
 * is the exercise working rather than a gap. Saying so is cheaper than having
 * the reader work it out, and it teaches the rule.
 *
 * The storage reading is deliberately **not** a fifth arm. Whether the record
 * could be read at all is a fact about the browser rather than about the
 * course, it is settled before this function is reached, and folding it in
 * would put the one question this module cannot answer inside the value that
 * claims to answer them.
 */
export type QuietQueue =
  /** No question the course still holds has been graded here. */
  | { readonly kind: "unanswered" }
  /** Questions have been answered and none of them was missed. */
  | { readonly kind: "unmissed"; readonly answered: number }
  /** Misses the queue declines to return: predictions the reader was unsure of. */
  | { readonly kind: "held-back"; readonly count: number }
  /** Misses that have been got three times running. */
  | { readonly kind: "retired"; readonly count: number }

/**
 * Every graded attempt whose question the course still contains, with the slug
 * it was recorded under.
 *
 * Filtered by the same keys as the queue, and that is the whole reason it is a
 * function rather than a `reduce` over `progress.sets`. A miss on a question
 * that has since been renumbered is dropped from the queue — it has to be,
 * because nothing can render it — and a count of "questions you have answered"
 * that still included it would have the page reasoning about a history it
 * cannot point at. Every number on this page counts the same things or none of
 * them mean anything.
 */
const gradedIn = (
  progress: Progress,
  keys: ReadonlySet<string>
): readonly (readonly [string, Attempt])[] =>
  Object.entries(progress.sets).flatMap(([set, record]) =>
    record.attempts
      .filter((attempt) => keys.has(keyOf(set, attempt.question)))
      .map((attempt) => [set, attempt] as const)
  )

export const whyNothingComesBack = (
  progress: Progress,
  keys: ReadonlySet<string>,
  today: string
): QuietQueue => {
  const retired = knownOnly(everyCorrection(progress, today), keys).filter(
    (correction) => correction.status === "retired"
  ).length

  if (retired > 0) return { kind: "retired", count: retired }

  const graded = gradedIn(progress, keys)

  /**
   * Counted from the record rather than from a `PendingCorrection`, because
   * these never become one: `comesBack` refuses them at the door, which is
   * exactly why the reader cannot see for themselves why they are not here.
   */
  const heldBack = graded.filter(
    ([set, attempt]) => attempt.grade !== "got-it" && !comesBack(set, attempt)
  ).length

  if (heldBack > 0) return { kind: "held-back", count: heldBack }

  return graded.length > 0 ? { kind: "unmissed", answered: graded.length } : { kind: "unanswered" }
}

export const dueCorrections = (
  queue: readonly PendingCorrection[]
): readonly PendingCorrection[] => queue.filter((correction) => correction.status === "due")

/**
 * Today's corrections sitting: the five that most want answering, out of
 * however many are due.
 *
 * `take` is how many the caller still has room for, and it exists because a
 * sitting shrinks as it is worked. A question answered a minute ago is no longer
 * due — its next gap has started — so recomputing the top five from what is left
 * would hand out a sixth, and a seventh, and quietly turn a ten-minute sitting
 * into the whole backlog.
 */
export const correctionSitting = (
  queue: readonly PendingCorrection[],
  take: number = SITTING
): readonly PendingCorrection[] => dueCorrections(queue).slice(0, Math.max(take, 0))

/** The next one to come round, for a queue with nothing due today. */
export const nextCorrection = (
  queue: readonly PendingCorrection[]
): PendingCorrection | undefined =>
  [...queue]
    .filter((correction) => correction.status === "upcoming")
    .sort((a, b) => (a.inDays ?? 0) - (b.inDays ?? 0))[0]
