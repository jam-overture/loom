import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { LessonReader } from "../../_components/lesson-reader"
import * as style from "../../_components/style"
import { section } from "../../_lib/lesson"
import { lessonDocument, lessonFront, lessonParts, TRY_IT } from "../../_lib/parts"
import { runExercises } from "../../_lib/run"
import { WRITTEN_LESSONS } from "../../_lib/syllabus"

/**
 * One lesson, at an address.
 *
 * Everything a reader reads here is rendered on the server as trees of
 * registered primitives, and handed to the reader component, which decides when
 * each piece may be seen. That is the same split the review sets use and it is
 * the whole architecture of this surface: the words are content and go through
 * Loom; *when you are allowed to read them* is machinery and does not.
 *
 * The document is not rewritten. One thing is moved: the `## Answers` section
 * is cut in two and each half is placed beside the questions it answers, where
 * it is locked. A printed answer forty paragraphs below its question is not
 * protected by the distance — it is protected by nothing, and the reader who
 * scrolls past Self-check to reach the exercise answers has read the Self-check
 * questions on the way.
 *
 * **Three things are not on this page at all**, which is a stronger statement
 * than that they are locked and is why `_lib/held.ts` exists: the transcripts
 * under the Try it fences, and the two halves of the printed answers. They are
 * built by `lessonParts` and served from their own addresses, and what this page
 * hands the reader is the URL. A gate that decides what to *render* decides it
 * about content the page is already carrying, and this page was carrying all
 * three — in the flight payload, under a lock that only ever governed the
 * screen.
 */

const pad = (number: number): string => String(number).padStart(2, "0")

type Params = Promise<{ readonly lesson: string }>

export const dynamicParams = false

export const generateStaticParams = () => WRITTEN_LESSONS.map((entry) => ({ lesson: pad(entry.number) }))

export const generateMetadata = async ({ params }: { readonly params: Params }): Promise<Metadata> => {
  const { lesson } = await params
  const found = lessonDocument(lesson)

  return found === undefined
    ? {}
    : { title: `${pad(found.number)} — ${found.title}`, description: found.title }
}

const LessonPage = async ({ params }: { readonly params: Params }) => {
  const { lesson: slug } = await params
  const document = lessonDocument(slug)

  if (document === undefined) notFound()

  const { run } = await runExercises(section(document, TRY_IT)?.blocks ?? [])
  const { parts } = lessonParts(document, run)

  return (
    <main style={style.column(6)}>
      {lessonFront(document)}

      <LessonReader lesson={document.number} parts={parts} />
    </main>
  )
}

export default LessonPage
