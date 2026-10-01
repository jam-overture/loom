import type { LoomTree } from "@jam-overture/loom"
import type { ReactNode } from "react"

import type {
  ElaborationPrompt,
  ElaborationSource,
  ExerciseUnit,
  LessonPart,
  PromptQuestion,
} from "../_components/lesson-reader"
import { blockNodes } from "./blocks"
import { transcriptText, type ExerciseRun } from "./exercises"
import {
  EXERCISE_ANSWERS,
  heldHref,
  ONLY,
  SELF_CHECK_ANSWERS,
  TRANSCRIPTS,
  type HeldDocument,
  type HeldPart,
} from "./held"
import { buildFragment, heading, prose, renderFragment } from "./loom"
import { checkPointers, lessonPointer } from "./links"
import { promptSet, readLesson, section, splitAnswers, type LessonDocument, type Prompt } from "./lesson"
import type { Block } from "./markdown"
import { ELABORATION_PART, lessonSlug } from "./slugs"
import { lesson as syllabusLesson } from "./syllabus"
import { lessonsNamedInProse } from "./text"

/**
 * A lesson, cut into the parts a screen treats differently — and the parts it
 * does not send.
 *
 * This used to live inside the page, which was the right place for it while
 * everything it produced went to the same component. It does not any more: the
 * held parts of a lesson are served from their own addresses (`held.ts`) and
 * the page and the route handler have to agree exactly about what is in them
 * and what each is called. Two callers, one description.
 *
 * The split is the whole point. `parts` is what the reader is given; `held` is
 * what the reader is not, and nothing in `parts` contains a word of it — only
 * the URL it can be fetched from when the gate opens.
 */

const pad = (number: number): string => String(number).padStart(2, "0")

/**
 * The lesson at a two-digit slug, or nothing.
 *
 * Shared rather than duplicated because the page and the held addresses have to
 * resolve `20` to the same document — a handler that read a different file
 * would serve one lesson's answers under another lesson's questions, and
 * nothing downstream could notice.
 */
export const lessonDocument = (slug: string): LessonDocument | undefined => {
  if (!/^\d{2}$/.test(slug)) return undefined

  const entry = syllabusLesson(Number(slug))

  return entry?.file === undefined ? undefined : readLesson(entry.file)
}

const fragment = (blocks: readonly Block[], key: string) =>
  blocks.length === 0 ? undefined : renderFragment((ids) => blockNodes(ids, blocks), key)

/**
 * A section's heading is content, not furniture, so it is composed like the
 * paragraph under it — including for the two headings this module invents, which
 * name the halves of `## Answers` where they now stand.
 */
const sectionHeading = (text: string, key: string) =>
  renderFragment((ids) => [heading(ids, 2, text, { balance: true })], key)

const questionsOf = (
  prompts: readonly Prompt[],
  key: string,
  checkIn: (prompt: Prompt) => readonly number[]
): readonly PromptQuestion[] =>
  prompts.map((prompt) => ({
    number: prompt.number,
    body: renderFragment((ids) => [prose(ids, prompt.text)], `${key}q${prompt.number}`),
    checkIn: checkPointers(checkIn(prompt)),
  }))

/**
 * The six sections a screen treats differently. Everything else in a lesson is
 * prose and is rendered as written, in the order it was written.
 */
const WARM_UP = "Warm-up"
const PREDICT = "Predict"
export const TRY_IT = "Try it"
const EXPLAIN_IT_BACK = "Explain it back"
const SELF_CHECK = "Self-check"
const REFLECT = "Reflect"
const ANSWERS = "Answers"

const CODE_LANGUAGES = new Set(["ts", "tsx"])

/**
 * The lessons an elaboration prompt says it builds on, as somewhere to go and a
 * place in the record to read.
 *
 * Every lesson but the first has a prompt that names an earlier one — *derive it
 * from lesson 08*, *lesson 03 told you operations are ordered* — and on paper
 * that instruction is all it can be. What the surface can add is the one thing
 * the reader has and the course does not: **what they themselves wrote about
 * that lesson**, at the time, in their own words. So each named lesson travels
 * with the slug its explanations are filed under, and the reader component
 * decides what to do with it after the prompt has been answered.
 *
 * This lesson is dropped when a prompt names it, because a prompt saying *lesson
 * 14 gave you the renderer* inside lesson 14 is the author locating the reader
 * rather than pointing anywhere. Everything else a prompt names is kept in the
 * order the course teaches it, including a lesson later than this one: a reader
 * working out of order has words about lesson 28 while sitting in lesson 20, and
 * refusing to show them would be this file deciding it knows what order they
 * read in.
 */
const reachesBackTo = (prompt: Prompt, lesson: number): readonly ElaborationSource[] =>
  lessonsNamedInProse(prompt.text)
    .filter((number) => number !== lesson)
    .flatMap((number): readonly ElaborationSource[] => {
      const pointer = lessonPointer(number)

      return pointer === undefined
        ? []
        : [
            {
              lesson: number,
              title: pointer.title,
              href: pointer.href,
              slug: lessonSlug(number, ELABORATION_PART),
            },
          ]
    })

const elaborationQuestions = (
  prompts: readonly Prompt[],
  lesson: number,
  key: string
): readonly ElaborationPrompt[] =>
  prompts.map((prompt) => ({
    number: prompt.number,
    body: renderFragment((ids) => [prose(ids, prompt.text)], `${key}q${prompt.number}`),
    reaches: reachesBackTo(prompt, lesson),
  }))

export type LessonParts = {
  readonly parts: readonly LessonPart[]
  /** What the page does not carry, by the address it is served from. */
  readonly held: ReadonlyMap<HeldPart, HeldDocument>
}

/**
 * Try it, as fences and the prose between them.
 *
 * The section is rebuilt rather than rendered whole because one thing has to be
 * inserted into the middle of it: under each fence that prints something, the
 * prediction it is owed and then a place for what it actually printed. The
 * transcript itself is not built here — it is a slot in the held document,
 * numbered by exercise, and the page carries the number and not the output.
 * Everything else — the introduction, the sentence naming each exercise, the
 * fences that are illustrations rather than programs — is the author's text in
 * the author's order, rendered exactly as the rest of the lesson is.
 *
 * With one exception, and it is the one this section was leaking through: an
 * untagged fence here is the output the lesson printed for itself, and it is
 * held rather than rendered. See the comment at the branch that does it.
 */
const exerciseUnits = (
  blocks: readonly Block[],
  run: ExerciseRun,
  lesson: number,
  key: string
): {
  readonly units: readonly ExerciseUnit[]
  readonly total: number
  readonly transcripts: Record<string, LoomTree>
} => {
  const outputs = new Map(
    (run.kind === "ran" ? run.outputs : []).filter((output) => output.tests.length > 0).map((output) => [output.index, output])
  )

  const units: ExerciseUnit[] = []
  const transcripts: Record<string, LoomTree> = {}
  let held: Block[] = []
  let fence = 0
  let numbered = 0
  let printed = 0

  const flush = (): void => {
    if (held.length === 0) return

    const id = `${key}x${units.length}`
    units.push({ kind: "prose", id, node: fragment(held, id) })
    held = []
  }

  for (const block of blocks) {
    /**
     * A fence with no language on it, inside Try it, is the output the lesson
     * printed for itself — every one of the fifty-odd in lessons 12 to 20 is,
     * and they all sit a line or two under the sentence asking the reader to
     * predict it. Rendered as written it is an answer beside its question with
     * nothing in between, so it is held in the transcripts document and appears
     * where the author put it, when the gate that holds the transcripts opens.
     */
    if (block.kind === "code" && (block.language ?? "") === "") {
      flush()

      printed += 1
      const slot = `p${printed}`
      const id = `${key}x${units.length}`

      transcripts[slot] = buildFragment((ids) => blockNodes(ids, [block]), `${id}o`)
      units.push({ kind: "printed", id, held: { href: heldHref(lesson, TRANSCRIPTS), slot } })
      continue
    }

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
    const slot = String(number)

    transcripts[slot] = buildFragment(
      (ids) => blockNodes(ids, [{ kind: "code", language: "console", code: transcriptText(output) }]),
      `${id}t`
    )

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
        held: { href: heldHref(lesson, TRANSCRIPTS), slot },
      },
    })
  }

  flush()

  return { units, total: numbered, transcripts }
}

export const lessonParts = (document: LessonDocument, exercises: ExerciseRun): LessonParts => {
  const key = `l${pad(document.number)}`
  const parts: LessonPart[] = []
  const held = new Map<HeldPart, HeldDocument>()

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
        slug: lessonSlug(document.number, "warm-up"),
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
        slug: lessonSlug(document.number, "predict"),
        intro: fragment(set.intro, `${key}pi`),
        outro: fragment(set.outro, `${key}po`),
        questions: predictQuestions,
      })
      continue
    }

    if (title === EXPLAIN_IT_BACK && set !== undefined) {
      parts.push({
        kind: "elaborate",
        id,
        heading: sectionHeading(title, `${id}-h`),
        slug: lessonSlug(document.number, ELABORATION_PART),
        intro: fragment(set.intro, `${key}ei`),
        outro: fragment(set.outro, `${key}eo`),
        questions: elaborationQuestions(set.prompts, document.number, `${key}e`),
      })
      continue
    }

    if (title === SELF_CHECK && set !== undefined) {
      parts.push({
        kind: "recall",
        id,
        heading: sectionHeading(title, `${id}-h`),
        slug: lessonSlug(document.number, "self-check"),
        intro: fragment(set.intro, `${key}si`),
        outro: fragment(set.outro, `${key}so`),
        /**
         * Where to check is this lesson and whatever the question reaches back
         * into — never the printed answer, which is not in this page at all
         * until every question here has been attempted.
         */
        questions: questionsOf(set.prompts, `${key}s`, (prompt) => [document.number, ...prompt.refs]),
      })

      if (split !== undefined && split.selfCheck.length > 0) {
        held.set(SELF_CHECK_ANSWERS, {
          slots: { [ONLY]: buildFragment((ids) => blockNodes(ids, split.selfCheck), `${key}sa`) },
        })

        parts.push({
          kind: "answers",
          id: `${id}-answers`,
          heading: sectionHeading("The Self-check answers", `${id}-ah`),
          held: { href: heldHref(document.number, SELF_CHECK_ANSWERS), slot: ONLY },
          gate: { kind: "attempted", slug: lessonSlug(document.number, "self-check"), count: selfCheckCount, of: "Self-check" },
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
        slug: lessonSlug(document.number, "predict"),
        questions: predictQuestions,
      })
      continue
    }

    if (title === TRY_IT) {
      const { units, total, transcripts } = exerciseUnits(each.blocks, exercises, document.number, key)

      if (Object.keys(transcripts).length > 0) held.set(TRANSCRIPTS, { slots: transcripts })

      parts.push({
        kind: "exercises",
        id,
        heading: sectionHeading(title, `${id}-h`),
        slug: lessonSlug(document.number, "try-it"),
        units,
        total,
        failure: exercises.kind === "failed" ? exercises.message : undefined,
      })

      if (split !== undefined && split.exercises.length > 0) {
        held.set(EXERCISE_ANSWERS, {
          slots: { [ONLY]: buildFragment((ids) => blockNodes(ids, split.exercises), `${key}ea`) },
        })

        parts.push({
          kind: "answers",
          id: `${id}-answers`,
          heading: sectionHeading("The exercise answers", `${id}-ah`),
          held: { href: heldHref(document.number, EXERCISE_ANSWERS), slot: ONLY },
          gate: {
            kind: "written",
            slug: lessonSlug(document.number, "try-it"),
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

  return { parts, held }
}

/** The lesson's own heading and front matter, which nothing gates. */
export const lessonFront = (document: LessonDocument): ReactNode =>
  renderFragment(
    (ids) => [
      heading(ids, 1, `${pad(document.number)} — ${document.title}`),
      ...blockNodes(ids, document.front),
    ],
    `l${pad(document.number)}head`
  )
