import type { Metadata } from "next"

import { LessonLog } from "../_components/lesson-log"
import { DueSummary } from "../_components/queue"
import { lessonPointer } from "../_lib/links"
import { heading, prose, renderFragment } from "../_lib/loom"
import { PART_LESSONS, SYLLABUS } from "../_lib/syllabus"
import { REVIEW_SETS } from "../_lib/schedule"
import * as style from "../_components/style"

/**
 * The front of the course: the syllabus, and the one thing the reader has to
 * tell it.
 *
 * Marking a lesson worked through is not bookkeeping for its own sake — it is
 * the input the whole spacing schedule is a function of. Without it the review
 * sets have no dates, and a schedule with no dates is the document this surface
 * exists to stop it being.
 */

export const metadata: Metadata = {
  title: "The course",
  description:
    "A course on Loom, built on retrieval practice, spacing and calibration rather than rereading.",
}

const SETS = REVIEW_SETS.map(({ letter, slug, timing, anchor, delayDays }) => ({
  letter,
  slug,
  timing,
  anchor,
  delayDays,
}))

const intro = renderFragment(
  (ids) => [
    heading(ids, 1, "Lessons"),
    prose(
      ids,
      "A course on Loom — the ideas, not the API surface. The decision records say what was decided and the reports say what happened on a day; neither is written to teach.",
      { size: "lead" }
    ),
    prose(
      ids,
      "It will feel harder than it should, on purpose. You answer before anything is explained, you recall closed-book rather than recognise, and you rate your confidence before you find out whether you were right. Rereading a clear explanation is the most popular way to study and one of the least effective: it produces the feeling of knowing without the knowing.",
      { tone: "muted" }
    ),
  ],
  "lessons-intro"
)

const logIntro = renderFragment(
  (ids) => [
    heading(ids, 2, "The syllabus"),
    prose(
      ids,
      "Tell it when you worked through each lesson. Every review set is scheduled from that date and from nothing else, so a lesson you finished last week schedules its review for two days after last week, not for today.",
      { tone: "muted" }
    ),
  ],
  "lessons-log-intro"
)

const LessonsIndex = () => (
  <main style={style.column(5)}>
    {intro}
    <DueSummary sets={SETS} parts={PART_LESSONS} />
    {logIntro}

    {SYLLABUS.map((part) => {
      const written = part.lessons
        .map((entry) => lessonPointer(entry.number))
        .filter((pointer) => pointer !== undefined)
      const unwritten = part.lessons.filter((entry) => entry.file === undefined)

      return (
        <section key={part.name}>
          {renderFragment(
            (ids) => [heading(ids, 3, `Part ${part.name} — ${part.title}`)],
            `part-${part.name}`
          )}

          {written.length > 0 ? <LessonLog lessons={written} /> : undefined}

          {unwritten.length > 0
            ? renderFragment(
                (ids) => [
                  prose(
                    ids,
                    `Not written yet: ${unwritten
                      .map((entry) => `${String(entry.number).padStart(2, "0")} ${entry.title}`)
                      .join(", ")}.`,
                    { size: "small", tone: "muted" }
                  ),
                ],
                `part-${part.name}-unwritten`
              )
            : undefined}
        </section>
      )
    })}
  </main>
)

export default LessonsIndex
