import { parseBlocks, type Block } from "./markdown"
import { readCourseFile } from "./source"
import { plainText, referencedLessons } from "./text"

/**
 * A lesson, as the parts a screen has to treat differently.
 *
 * The markdown is one document read top to bottom, and on paper that is all it
 * can be: the Predict questions sit above the explanation that answers them,
 * and eleven of the thirteen lessons print an `## Answers` section a scroll
 * below the questions it answers. Both are the honour system, and the honour
 * system is where retrieval practice quietly dies.
 *
 * So the document is cut into named parts here, and the reader decides what the
 * reader may see yet. Nothing is rewritten: every block below came out of
 * `lessons/`, in the order it was written, and a section this module does not
 * recognise is still shown rather than dropped.
 */

export type LessonSection = {
  readonly title: string
  readonly blocks: readonly Block[]
}

export type LessonDocument = {
  readonly number: number
  readonly title: string
  /** Objectives, prerequisites, and the paragraph that says what came before. */
  readonly front: readonly Block[]
  readonly sections: readonly LessonSection[]
}

export type Prompt = {
  readonly number: number
  readonly text: string
  /** Lessons the prompt reaches back into, from its `*(06, 11)*` markers. */
  readonly refs: readonly number[]
}

/**
 * A numbered set of prompts, and whatever framed it.
 *
 * The framing is not decoration. Lesson 02's Predict opens with "React has
 * dozens of node types. Loom has three." and the three questions are
 * unanswerable without it, so it travels with them; the sentence *after* the
 * list ("Question 3 is this lesson's scaffolding") is a hint about the set as a
 * whole and is held back until the set is finished, where it reads as a review
 * rather than as a tip.
 */
export type PromptSet = {
  readonly intro: readonly Block[]
  readonly prompts: readonly Prompt[]
  readonly outro: readonly Block[]
}

const TITLE = /^(\d+)\s+—\s+(.*)$/

const isOrderedList = (block: Block): boolean => block.kind === "list" && block.ordered

export const parseLesson = (markdown: string): LessonDocument => {
  const blocks = parseBlocks(markdown)
  const heading = blocks[0]

  if (heading?.kind !== "heading") throw new Error("loom: a lesson must open with its title")

  const title = TITLE.exec(heading.text)

  if (title?.[1] === undefined || title[2] === undefined) {
    throw new Error(`loom: a lesson title must read "# NN — Title", not "${heading.text}"`)
  }

  const front: Block[] = []
  const sections: { title: string; blocks: Block[] }[] = []

  for (const block of blocks.slice(1)) {
    /** The rules between sections are the section breaks, and the sections are now the breaks. */
    if (block.kind === "rule") continue

    if (block.kind === "heading" && block.level === 2) {
      sections.push({ title: plainText(block.text), blocks: [] })
      continue
    }

    const open = sections[sections.length - 1]

    if (open === undefined) front.push(block)
    else open.blocks.push(block)
  }

  return { number: Number(title[1]), title: plainText(title[2]), front, sections }
}

/**
 * The section every check in this course is pointed at.
 *
 * It was a local `const` in three test files and an export of `parts.ts`, which
 * pulls in React and so cannot be imported by a node test. Four copies of one
 * string is this course's own lesson 28 in its own machinery, so it lives here,
 * next to the function that looks a section up, and `parts.ts` re-exports it for
 * the two routes that already import it from there.
 */
export const TRY_IT = "Try it"

export const section = (lesson: LessonDocument, title: string): LessonSection | undefined =>
  lesson.sections.find((each) => each.title === title)

/**
 * The numbered questions in a section, wherever they are.
 *
 * Warm-up and Self-check put the list at the top level; Predict puts it inside
 * a blockquote, sometimes under a paragraph of setup. Both shapes are the
 * author's and neither is worth normalising in `lessons/` to make this file
 * simpler — the blockquote is what makes Predict look like the thing it is on
 * the page a reader has in a checkout.
 */
export const promptSet = (blocks: readonly Block[]): PromptSet | undefined => {
  const direct = blocks.findIndex(isOrderedList)

  if (direct >= 0) {
    const list = blocks[direct]

    if (list?.kind !== "list") return undefined

    return {
      intro: blocks.slice(0, direct),
      prompts: list.items.map(toPrompt),
      outro: blocks.slice(direct + 1),
    }
  }

  const quoted = blocks.findIndex(
    (block) => block.kind === "quote" && block.blocks.some(isOrderedList)
  )
  const quote = quoted >= 0 ? blocks[quoted] : undefined

  if (quote?.kind !== "quote") return undefined

  const inner = quote.blocks.findIndex(isOrderedList)
  const list = quote.blocks[inner]

  if (list?.kind !== "list") return undefined

  return {
    intro: [...blocks.slice(0, quoted), ...quote.blocks.slice(0, inner)],
    prompts: list.items.map(toPrompt),
    outro: [...quote.blocks.slice(inner + 1), ...blocks.slice(quoted + 1)],
  }
}

const toPrompt = (item: string, index: number): Prompt => ({
  number: index + 1,
  text: plainText(item),
  refs: referencedLessons(item),
})

const TRY_IT_ENTRY = /^\*\*Q\d+[a-z]?\*\*/
const SELF_CHECK_ENTRY = /^\*\*\d+\*\*/

/**
 * The `## Answers` section, cut in two.
 *
 * Eleven lessons print answers, and they answer two different sets: `**Q1**`
 * and up belong to the exercises in Try it, and `**1**` and up belong to
 * Self-check. Those two are read at different moments — the exercise answers
 * are checked against a prediction written twenty minutes before the reader
 * reaches Self-check — so a single "reveal the answers" control would either
 * hold the first half hostage or hand over the second half early.
 *
 * The cut is made after the *last* `**Qn**` entry rather than before the first
 * numbered one, because a bold run inside an answer's prose (`**medium**` in
 * lesson 08) is indistinguishable from an entry label and one of them is inside
 * Q1. Working from the end means the noise falls in the half it was written in.
 */
export const splitAnswers = (
  blocks: readonly Block[]
): { readonly exercises: readonly Block[]; readonly selfCheck: readonly Block[] } => {
  const labelled = (block: Block, pattern: RegExp): boolean =>
    block.kind === "paragraph" && pattern.test(block.text)

  const lastExercise = blocks.reduce(
    (found, block, index) => (labelled(block, TRY_IT_ENTRY) ? index : found),
    -1
  )

  if (lastExercise < 0) return { exercises: [], selfCheck: [...blocks] }

  const cut = blocks.findIndex(
    (block, index) => index > lastExercise && labelled(block, SELF_CHECK_ENTRY)
  )

  return cut < 0
    ? { exercises: [...blocks], selfCheck: [] }
    : { exercises: blocks.slice(0, cut), selfCheck: blocks.slice(cut) }
}

export const readLesson = (file: string): LessonDocument => parseLesson(readCourseFile(file))
