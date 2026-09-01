import type { Metadata } from "next"
import { notFound } from "next/navigation"

import {
  LessonReader,
  type ExerciseUnit,
  type LessonPart,
  type PromptQuestion,
} from "../../_components/lesson-reader"
import * as style from "../../_components/style"
import { blockNodes } from "../../_lib/blocks"
import { transcriptText, type ExerciseRun } from "../../_lib/exercises"
import { lessonPointers } from "../../_lib/links"
import { heading, prose, renderFragment } from "../../_lib/loom"
import { promptSet, readLesson, section, splitAnswers, type LessonDocument, type Prompt } from "../../_lib/lesson"
import type { Block } from "../../_lib/markdown"
import { runExercises } from "../../_lib/run"
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

const CODE_LANGUAGES = new Set(["ts", "tsx"])

/**
 * Try it, as fences and the prose between them.
 *
 * The section is rebuilt rather than rendered whole because one thing has to be
 * inserted into the middle of it: under each fence that prints something, the
 * prediction it is owed and then what it actually printed. Everything else —
 * the introduction, the sentence naming each exercise, the fences that are
 * illustrations rather than programs — is the author's text in the author's
 * order, rendered exactly as the rest of the lesson is.
 */
const exerciseUnits = (
  blocks: readonly Block[],
  run: ExerciseRun,
  key: string
): { readonly units: readonly ExerciseUnit[]; readonly total: number } => {
  const outputs = new Map(
    (run.kind === "ran" ? run.outputs : []).filter((output) => output.tests.length > 0).map((output) => [output.index, output])
  )

  const units: ExerciseUnit[] = []
  let held: Block[] = []
  let fence = 0
  let numbered = 0

  const flush = (): void => {
    if (held.length === 0) return

    const id = `${key}x${units.length}`
    units.push({ kind: "prose", id, node: fragment(held, id) })
    held = []
  }

  for (const block of blocks) {
    if (block.kind !== "code" || !CODE_LANGUAGES.has(block.language ?? "")) {
      held.push(block)
      continue
    }

    flush()

    const index = fence
    fence += 1

    const output = outputs.get(index)
    const id = `${key}x${units.length}`

    if (output === undefined) {
      units.push({ kind: "code", id, node: fragment([block], id), run: undefined })
      continue
    }

    numbered += 1
    const number = numbered

    units.push({
      kind: "code",
      id,
      node: fragment([block], id),
      run: {
        number,
        prompt: renderFragment(
          (ids) => [
            prose(
              ids,
              `Exercise ${number}. Write down what this prints — the lines, in order, and the values on them. Where you are guessing, say which part you are guessing at.`
            ),
          ],
          `${id}p`
        ),
        transcript: fragment(
          [{ kind: "code", language: "console", code: transcriptText(output) }],
          `${id}t`
        ),
      },
    })
  }

  flush()

  return { units, total: numbered }
}

const partsOf = (document: LessonDocument, exercises: ExerciseRun): readonly LessonPart[] => {
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

    if (title === TRY_IT) {
      const { units, total } = exerciseUnits(each.blocks, exercises, key)

      parts.push({
        kind: "exercises",
        id,
        heading: sectionHeading(title, `${id}-h`),
        slug: slugFor(document.number, "try-it"),
        units,
        total,
        failure: exercises.kind === "failed" ? exercises.message : undefined,
      })

      if (split !== undefined && split.exercises.length > 0) {
        parts.push({
          kind: "answers",
          id: `${id}-answers`,
          heading: sectionHeading("The exercise answers", `${id}-ah`),
          node: fragment(split.exercises, `${key}ea`),
          gate: {
            kind: "written",
            slug: slugFor(document.number, "try-it"),
            count: Math.max(total, 1),
            /**
             * Where the exercises run, the predictions have already been taken
             * one fence at a time and asking for a summary of them afterwards
             * would be asking twice. Where they do not — a lesson with no
             * program in Try it — the single written prediction is still the
             * only thing standing between the reader and the answers.
             */
            prompt:
              total > 0
                ? undefined
                : renderFragment(
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
  }

  return parts
}

const LessonPage = async ({ params }: { readonly params: Params }) => {
  const { lesson: slug } = await params
  const document = documentFor(slug)

  if (document === undefined) notFound()

  const { run } = await runExercises(section(document, TRY_IT)?.blocks ?? [])

  return (
    <main style={style.column(6)}>
      {renderFragment(
        (ids) => [
          heading(ids, 1, `${pad(document.number)} — ${document.title}`),
          ...blockNodes(ids, document.front),
        ],
        `l${pad(document.number)}head`
      )}

      <LessonReader lesson={document.number} parts={partsOf(document, run)} />
    </main>
  )
}

export default LessonPage
