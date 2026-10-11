import {
  CONFIDENCES,
  type Attempt,
  type Confidence,
  type Grade,
  type Progress,
} from "./progress"

/**
 * The gap between what the reader thought they knew and what they knew.
 *
 * *Make It Stick*'s claim about calibration is not that people know less than
 * they think. It is narrower and more useful: **the answers you are confident
 * and wrong about are the ones that quietly break your model later**, because
 * confidence is what stops you checking. Ignorance you are aware of gets fixed
 * on contact.
 *
 * That is unmeasurable on paper — it needs a rating recorded before the reveal
 * and a judgement recorded after, kept together, which is the one thing a
 * printed schedule cannot do. Everything here is arithmetic over pairs of those.
 */

export type ConfidenceBand = {
  readonly confidence: Confidence
  readonly attempts: number
  readonly right: number
}

export type Miss = {
  readonly set: string
  readonly question: number
  readonly confidence: Confidence
  readonly on: string
}

export type Calibration = {
  readonly attempts: number
  readonly right: number
  readonly bands: readonly ConfidenceBand[]
  /** Rated 4 or 5 and not got: the list the schedule calls the real study plan. */
  readonly confidentAndWrong: readonly Miss[]
}

export const CONFIDENT = 4

const attemptsIn = (progress: Progress): readonly (readonly [string, Attempt])[] =>
  Object.entries(progress.sets).flatMap(([slug, record]) =>
    record.attempts.map((attempt) => [slug, attempt] as const)
  )

export const calibrationOf = (progress: Progress): Calibration => {
  const all = attemptsIn(progress)

  const bands = CONFIDENCES.map((confidence) => {
    const rated = all.filter(([, attempt]) => attempt.confidence === confidence)

    return {
      confidence,
      attempts: rated.length,
      right: rated.filter(([, attempt]) => attempt.grade === "got-it").length,
    }
  })

  const confidentAndWrong = all
    .filter(([, attempt]) => attempt.confidence >= CONFIDENT && attempt.grade !== "got-it")
    .map(([set, attempt]) => ({
      set,
      question: attempt.question,
      confidence: attempt.confidence,
      on: attempt.on,
    }))
    .sort((a, b) => (a.on === b.on ? a.set.localeCompare(b.set) : b.on.localeCompare(a.on)))

  return {
    attempts: all.length,
    right: all.filter(([, attempt]) => attempt.grade === "got-it").length,
    bands,
    confidentAndWrong,
  }
}

/**
 * One sitting's version of the same thing, for the page shown at the end of a
 * set — where it is still worth something, because the questions are fresh.
 */
export const sittingMisses = (slug: string, attempts: readonly Attempt[]): readonly Miss[] =>
  attempts
    .filter((attempt) => attempt.confidence >= CONFIDENT && attempt.grade !== "got-it")
    .map((attempt) => ({
      set: slug,
      question: attempt.question,
      confidence: attempt.confidence,
      on: attempt.on,
    }))

/**
 * The same arithmetic over the questions that came back, kept apart from the
 * questions that were asked once.
 *
 * Every correction in the record carries exactly the pair above: a confidence
 * rated before anything was revealed, and a grade recorded after. That is the
 * measurement this module exists to make, and until now nothing read it — a
 * reader who worked the corrections queue honestly for a month generated the
 * rarest ratings in the course and `Your calibration` had not heard of one of
 * them. The panel's own sentence said as much without meaning to: *across every
 * set you have done.*
 *
 * **Why this is a second reading and not a larger first one.** The obvious fix
 * is to fold corrections into `bands` and raise the denominator. It is wrong,
 * and the reason is the one [lesson
 * 35](../../../../../lessons/35-instruments.md) declines to count a proportion
 * for: a figure whose denominator spans two populations, with nothing in the
 * figure saying which, compares things that are not comparable and reads as
 * though it does not. The two populations here are not alike. A first attempt is
 * rated cold; a correction is rated **after the reader has looked up
 * the specific point**, because that is `review-schedule.md`'s instruction after
 * a miss and the only thing it says to do. So the second population is easier by
 * construction, and pooling them would make a reader who does the hardest thing
 * this course asks watch their calibration improve for a reason that has nothing
 * to do with their calibration. Two numbers that mean different things, side by
 * side and labelled, is the honest shape; one number is the flattering one.
 *
 * What the second reading measures, then, is not *did you know it* — you had just
 * looked it up — but **did the lookup take, and did you know whether it had**.
 * Those are different questions and the second is the one with teeth.
 */
export type Relapse = {
  readonly set: string
  readonly question: number
  /** The rating given on the way back. The first one is not reused. */
  readonly confidence: Confidence
  readonly grade: Grade
  readonly on: string
  /**
   * Whether the miss this re-answers was itself rated 4 or 5.
   *
   * Read off whatever attempt the record now holds, which is a limit worth
   * stating rather than hiding: a later go at the whole set replaces an attempt
   * (`withAttempt`), so a correction can outlive the miss it answers and this
   * field then describes the newer sitting. Nothing better is available — a
   * correction carries no pointer to the attempt that produced it — and the
   * alternative of guessing is worse than a field that is occasionally about
   * the wrong sitting and says which one it read.
   */
  readonly sureBefore: boolean
}

export type SecondLook = {
  /**
   * Re-answers recorded. Deliberately not called attempts: the name is the only
   * thing stopping this being added to `attempts` by somebody in a hurry.
   */
  readonly reanswers: number
  readonly right: number
  readonly bands: readonly ConfidenceBand[]
  /** Rated 4 or 5 on the way back, and still not got. */
  readonly sureAndWrong: readonly Relapse[]
  /**
   * Of those, the ones whose original miss was also confident — a belief that
   * has now survived being contradicted once.
   *
   * This is the single rarest thing in the record and the one the corrections
   * queue handles correctly in silence: a miss at any point sends the question
   * back to the start, so the ladder already treats it as the serious case. What
   * nothing did was **say so**. Being sure, being wrong, going and reading the
   * answer, coming back a day later still sure, and still being wrong is not a
   * gap in what the reader knows; it is a model of the system that is actively
   * wrong and has already shrugged off the evidence once.
   */
  readonly twice: number
}

const missed = (progress: Progress, set: string, question: number): Attempt | undefined =>
  (progress.sets[set]?.attempts ?? []).find((attempt) => attempt.question === question)

const relapsesIn = (progress: Progress): readonly Relapse[] =>
  progress.corrections.map((correction) => ({
    set: correction.set,
    question: correction.question,
    confidence: correction.confidence,
    grade: correction.grade,
    on: correction.on,
    sureBefore: (missed(progress, correction.set, correction.question)?.confidence ?? 0) >= CONFIDENT,
  }))

/**
 * The order to read them in: the beliefs that survived contradiction first,
 * then the most recent.
 *
 * `confidentAndWrong` sorts by date alone, because every entry in it is the same
 * kind of thing. Here they are not: a relapse whose original miss was also
 * confident is a different event from one the reader was unsure about the first
 * time, and putting the two in date order would bury the rarer one under
 * whatever happened yesterday.
 */
const worst = (a: Relapse, b: Relapse): number => {
  if (a.sureBefore !== b.sureBefore) return a.sureBefore ? -1 : 1
  if (a.on !== b.on) return b.on.localeCompare(a.on)

  return a.set === b.set ? a.question - b.question : a.set.localeCompare(b.set)
}

export const secondLookOf = (progress: Progress): SecondLook => {
  const all = relapsesIn(progress)

  const bands = CONFIDENCES.map((confidence) => {
    const rated = all.filter((relapse) => relapse.confidence === confidence)

    return {
      confidence,
      attempts: rated.length,
      right: rated.filter((relapse) => relapse.grade === "got-it").length,
    }
  })

  const sureAndWrong = all
    .filter((relapse) => relapse.confidence >= CONFIDENT && relapse.grade !== "got-it")
    .sort(worst)

  return {
    reanswers: all.length,
    right: all.filter((relapse) => relapse.grade === "got-it").length,
    bands,
    sureAndWrong,
    twice: sureAndWrong.filter((relapse) => relapse.sureBefore).length,
  }
}
