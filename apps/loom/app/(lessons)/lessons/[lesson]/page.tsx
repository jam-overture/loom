import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { LessonReader, type LessonPart, type PromptQuestion } from "../../_components/lesson-reader"
import * as style from "../../_components/style"
import { blockNodes } from "../../_lib/blocks"
import { lessonPointers } from "../../_lib/links"
import { heading, prose, renderFragment } from "../../_lib/loom"
import { promptSet, readLesson, section, splitAnswers, type LessonDocument, type Prompt } from "../../_lib/lesson"
import type { Block } from "../../_lib/markdown"
import { WRITTEN_LESSONS, lesson as syllabusLesson } from "../../_lib/syllabus"

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
 */

const pad = (number: number): string => String(number).padStart(2, "0")

type Params = Promise<{ readonly lesson: string }>

export const dynamicParams = false

export const generateStaticParams = () => WRITTEN_LESSONS.map((entry) => ({ lesson: pad(entry.number) }))

const documentFor = (slug: string): LessonDocument | undefined => {
  if (!/^\d{2}$/.test(slug)) return undefined

  const entry = syllabusLesson(Number(slug))

  return entry?.file === undefined ? undefined : readLesson(entry.file)
}

export const generateMetadata = async ({ params }: { readonly params: Params }): Promise<Metadata> => {
  const { lesson } = await params
  const found = documentFor(lesson)

  return found === undefined
    ? {}
    : { title: `${pad(found.number)} — ${found.title}`, description: found.title }
}

const fragment = (blocks: readonly Block[], key: string) =>
  blocks.length === 0 ? undefined : renderFragment((ids) => blockNodes(ids, blocks), key)

/**
 * A section's heading is content, not furniture, so it is composed like the
 * paragraph under it — including for the two headings this page invents, which
 * name the halves of `## Answers` where they now stand.
 */
const sectionHeading = (text: string, key: string) =>
  renderFragment((ids) => [heading(ids, 2, text, { balance: true })], key)

const slugFor = (lesson: number, part: string): string => `lesson-${pad(lesson)}-${part}`

const questionsOf = (
  prompts: readonly Prompt[],
  key: string,
  checkIn: (prompt: Prompt) => readonly number[]
): readonly PromptQuestion[] =>
  prompts.map((prompt) => ({
    number: prompt.number,
    body: renderFragment((ids) => [prose(ids, prompt.text)], `${key}q${prompt.number}`),
    checkIn: lessonPointers(checkIn(prompt)),
  }))

/**
 * The five sections a screen treats differently. Everything else in a lesson is
 * prose and is rendered as written, in the order it was written.
 */
const WARM_UP = "Warm-up"
const PREDICT = "Predict"
const TRY_IT = "Try it"
const SELF_CHECK = "Self-check"
const REFLECT = "Reflect"
const ANSWERS = "Answers"

const partsOf = (document: LessonDocument): readonly LessonPart[] => {
  const key = `l${pad(document.number)}`
  const parts: LessonPart[] = []

  const answers = section(document, ANSWERS)
  const split = answers === undefined ? undefined : splitAnswers(answers.blocks)

  const predictPrompts = promptSet(section(document, PREDICT)?.blocks ?? [])
  const predictQuestions = questionsOf(predictPrompts?.prompts ?? [], `${key}pq`, () => [])
  const selfCheckCount = promptSet(section(document, SELF_CHECK)?.blocks ?? [])?.prompts.length ?? 0

  for (const each of document.sections) {
    /** Cut in two and moved up to the questions each half answers. */
    if (each.title === ANSWERS) continue

    const title = each.title
    const id = `${key}-${title.toLowerCase().replace(/[^a-z]+/g, "-")}`
    const set = promptSet(each.blocks)

    if (title === WARM_UP && set !== undefined) {
      parts.push({
        kind: "recall",
        id,
        heading: sectionHeading(title, `${id}-h`),
        slug: slugFor(document.number, "warm-up"),
        intro: fragment(set.intro, `${key}wi`),
        outro: fragment(set.outro, `${key}wo`),
        questions: questionsOf(set.prompts, `${key}w`, (prompt) => prompt.refs),
      })
      continue
    }

    if (title === PREDICT && set !== undefined) {
      parts.push({
        kind: "predict",
        id,
        heading: sectionHeading(title, `${id}-h`),
        slug: slugFor(document.number, "predict"),
        intro: fragment(set.intro, `${key}pi`),
        outro: fragment(set.outro, `${key}po`),
        questions: predictQuestions,
      })
      continue
    }

    if (title === SELF_CHECK && set !== undefined) {
      parts.push({
        kind: "recall",
        id,
        heading: sectionHeading(title, `${id}-h`),
        slug: slugFor(document.number, "self-check"),
        intro: fragment(set.intro, `${key}si`),
        outro: fragment(set.outro, `${key}so`),
        /**
         * Where to check is this lesson and whatever the question reaches back
         * into — never the printed answer, which sits below this and is locked
         * until every question here has been attempted.
         */
        questions: questionsOf(set.prompts, `${key}s`, (prompt) => [document.number, ...prompt.refs]),
      })

      if (split !== undefined && split.selfCheck.length > 0) {
        parts.push({
          kind: "answers",
          id: `${id}-answers`,
          heading: sectionHeading("The Self-check answers", `${id}-ah`),
          node: fragment(split.selfCheck, `${key}sa`),
          gate: { kind: "attempted", slug: slugFor(document.number, "self-check"), count: selfCheckCount, of: "Self-check" },
        })
      }

      continue
    }

    if (title === REFLECT) {
      parts.push({
        kind: "reflect",
        id,
        heading: sectionHeading(title, `${id}-h`),
        node: fragment(each.blocks, `${key}r`),
        slug: slugFor(document.number, "predict"),
        questions: predictQuestions,
      })
      continue
    }

    parts.push({
      kind: "prose",
      id,
      node: renderFragment(
        (ids) => [heading(ids, 2, title, { balance: true }), ...blockNodes(ids, each.blocks)],
        id
      ),
    })

    if (title === TRY_IT && split !== undefined && split.exercises.length > 0) {
      parts.push({
        kind: "answers",
        id: `${id}-answers`,
        heading: sectionHeading("The exercise answers", `${id}-ah`),
        node: fragment(split.exercises, `${key}ea`),
        gate: {
          kind: "written",
          slug: slugFor(document.number, "try-it"),
          prompt: renderFragment(
            (ids) => [
              prose(
                ids,
                "Before these unlock: what did you predict each exercise would print? Summarise it — the exact strings if you wrote them down, and where you were unsure if you did not."
              ),
            ],
            `${key}tg`
          ),
        },
      })
    }
  }

  return parts
}

const LessonPage = async ({ params }: { readonly params: Params }) => {
  const { lesson: slug } = await params
  const document = documentFor(slug)

  if (document === undefined) notFound()

  return (
    <main style={style.column(6)}>
      {renderFragment(
        (ids) => [
          heading(ids, 1, `${pad(document.number)} — ${document.title}`),
          ...blockNodes(ids, document.front),
        ],
        `l${pad(document.number)}head`
      )}

      <LessonReader lesson={document.number} parts={partsOf(document)} />
    </main>
  )
}

export default LessonPage
