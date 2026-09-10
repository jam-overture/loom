import type { ReviewSet } from "./schedule"
import { compareSetLetters } from "./slugs"
import { lessonWorkedThrough, setProgress, type Progress } from "./progress"

/**
 * What is due today, computed rather than projected.
 *
 * `review-schedule.md` says *two days after lesson 09* and leaves the reader to
 * hold a calendar in their head; three of the sets say *one week after Part II*,
 * which means one week after the last lesson of six. Neither is hard arithmetic
 * and both are exactly the kind of arithmetic that does not get done, so the
 * schedule quietly becomes a document rather than a queue.
 *
 * The clock is a parameter here and not a call (0005). Today is decided at the
 * one boundary that has to know it, which is what makes every rule below a pure
 * function of a record and a date — and what makes them testable at all, since
 * a spacing schedule tested against the real clock is a test that passes on a
 * different day for a different reason.
 */

/**
 * Which lessons each part is made of, passed in rather than imported.
 *
 * The syllabus is read off a file, and this arithmetic runs in the reader's
 * browser: importing it here would pull `node:fs` into the bundle to answer a
 * question that is four numbers long. The surface hands the numbers over at the
 * boundary, which is the same shape as every other seam in this repository.
 */
export type PartLessons = Readonly<Record<string, readonly number[]>>

export type SetStatus =
  /** Its anchor has not been worked through, so it has no date yet. */
  | "unscheduled"
  | "upcoming"
  | "due"
  | "done"

/**
 * What the queue needs of a set: its name and when it comes round. The
 * questions stay on the server until the reader opens the set, so the page that
 * lists twenty-three of them ships twenty-three headings rather than a hundred
 * and fifty-nine questions.
 */
export type ScheduledSet = Pick<ReviewSet, "letter" | "slug" | "timing" | "anchor" | "delayDays">

export type QueueEntry = {
  readonly set: ScheduledSet
  readonly status: SetStatus
  readonly dueOn: string | undefined
  /** Zero unless due: days late, which is what decides the order of the queue. */
  readonly overdueBy: number
  /** Days until it is due, for the upcoming ones. */
  readonly inDays: number | undefined
}

const MS_PER_DAY = 86_400_000

const asUtc = (day: string): number => Date.parse(`${day}T00:00:00Z`)

export const addDays = (day: string, days: number): string => {
  const moved = new Date(asUtc(day) + days * MS_PER_DAY)

  return moved.toISOString().slice(0, 10)
}

export const daysBetween = (from: string, to: string): number =>
  Math.round((asUtc(to) - asUtc(from)) / MS_PER_DAY)

/**
 * When the thing a set waits on was finished.
 *
 * A part is finished when its last lesson is, and a part with an unwritten
 * lesson in it is not finished at all — which is why Set F is not due a month
 * after lesson 04 for a reader who has done Part I: it is, and Set M is not,
 * because Part II ends at lesson 10 and Part III does not end yet.
 */
export const anchorFinishedOn = (
  set: ScheduledSet,
  progress: Progress,
  parts: PartLessons
): string | undefined => {
  if (set.anchor.kind === "lesson") return lessonWorkedThrough(progress, set.anchor.lesson)

  const lessons = parts[set.anchor.part] ?? []
  if (lessons.length === 0) return undefined

  const days = lessons.map((number) => lessonWorkedThrough(progress, number))
  if (days.some((day) => day === undefined)) return undefined

  return days
    .filter((day): day is string => day !== undefined)
    .sort()
    .at(-1)
}

export const dueOn = (set: ScheduledSet, progress: Progress, parts: PartLessons): string | undefined => {
  const finished = anchorFinishedOn(set, progress, parts)

  return finished === undefined ? undefined : addDays(finished, set.delayDays)
}

const entryFor = (
  set: ScheduledSet,
  progress: Progress,
  parts: PartLessons,
  today: string
): QueueEntry => {
  const due = dueOn(set, progress, parts)
  const completed = setProgress(progress, set.slug).completedOn

  if (completed !== undefined) {
    return { set, status: "done", dueOn: due, overdueBy: 0, inDays: undefined }
  }

  if (due === undefined) {
    return { set, status: "unscheduled", dueOn: undefined, overdueBy: 0, inDays: undefined }
  }

  const days = daysBetween(due, today)

  return days >= 0
    ? { set, status: "due", dueOn: due, overdueBy: days, inDays: 0 }
    : { set, status: "upcoming", dueOn: due, overdueBy: 0, inDays: -days }
}

const RANK: Readonly<Record<SetStatus, number>> = { due: 0, upcoming: 1, unscheduled: 2, done: 3 }

/**
 * The queue, ordered the way it should be worked: the most overdue set first,
 * then the next one to arrive, then the ones waiting on a lesson, then what is
 * behind you. Sets keep their alphabetical order inside each band, which is
 * their order in the course.
 */
export const queueFor = (
  sets: readonly ScheduledSet[],
  progress: Progress,
  parts: PartLessons,
  today: string
): readonly QueueEntry[] =>
  [...sets]
    .map((set) => entryFor(set, progress, parts, today))
    .sort((a, b) => {
      if (RANK[a.status] !== RANK[b.status]) return RANK[a.status] - RANK[b.status]
      if (a.status === "due") return b.overdueBy - a.overdueBy
      if (a.status === "upcoming") return (a.inDays ?? 0) - (b.inDays ?? 0)

      return compareSetLetters(a.set.letter, b.set.letter)
    })

export const dueNow = (entries: readonly QueueEntry[]): readonly QueueEntry[] =>
  entries.filter((entry) => entry.status === "due")
