import { courseLesson, type CourseLesson } from "./course"
import { decisionRecord, type DecisionRecord } from "./records"

/**
 * The spine of the system, in eight paragraphs, each with two doors out of it.
 *
 * What is written *here* is orientation and nothing else: the plainest sentence
 * that will let a stranger hold the idea, in the order the ideas depend on each
 * other. The reasoning behind each one is a lesson and the ruling is a record,
 * and neither is repeated — that is the whole design of this section, and the
 * reason a paragraph here is allowed to be lossy in a way a lesson is not.
 *
 * Each entry names a lesson and a record by number. Both are resolved against
 * the repository when this module loads and an unknown number throws, so a
 * lesson that is renumbered or a record that is withdrawn fails the build
 * instead of becoming a dead link on the friendliest page in the section.
 */

type IdeaSource = {
  readonly id: string
  readonly title: string
  readonly plain: string
  readonly lesson: number
  readonly record: number
}

const SOURCES: readonly IdeaSource[] = [
  {
    id: "a-page-is-data",
    title: "A page is data, not code",
    plain:
      "Open a Loom page and there is no markup and no JavaScript in it — there is a tree of ordinary data. A heading, the words inside it, the box it sits in: each is a node with a name, a few settings and a list of children. That matters because data can be printed, compared, stored and handed back an hour later, and a function cannot.",
    lesson: 2,
    record: 1,
  },
  {
    id: "a-change-is-data",
    title: "A change is data too",
    plain:
      "Nothing edits a page in place. A change arrives first as a written plan — add this node here, replace that setting, move this one, remove that one — and there are only those four kinds of operation, ever. So you can read what is about to happen to the page before any of it has happened.",
    lesson: 3,
    record: 3,
  },
  {
    id: "identity",
    title: "Every node keeps its name",
    plain:
      "A card moves from third in a list to first. It is the same card, so it keeps the same id, and where it sits is worked out from the tree rather than used to say which node it is. This is the small thing that makes “change that one” still mean something after five other changes have landed.",
    lesson: 4,
    record: 38,
  },
  {
    id: "purity",
    title: "Nothing throws at a seam",
    plain:
      "Hand a component something it does not understand and it does not take the page down. It renders what it can and leaves a note behind saying what was wrong and where. Time works the same way — the clock is passed in rather than read — so the same inputs give the same page, which is what makes a record of what happened worth keeping.",
    lesson: 5,
    record: 8,
  },
  {
    id: "undo",
    title: "Undo is another change",
    plain:
      "Putting something back is not a rewind to a saved copy. The runtime works out the exact change that would reverse this one — put back what was removed, remove what was added — and then proposes it like any other change. Which means an undo can be refused, and means it shows up in the record as a thing somebody did.",
    lesson: 6,
    record: 32,
  },
  {
    id: "the-gate",
    title: "Two questions, then three answers",
    plain:
      "Before anything is applied, the runtime asks two things about the change: how much is at stake if it is wrong, and could it be undone. Then it says one of three words — yes, ask a person, or no. The middle answer is the point. Software that can only permit or forbid has to decide at build time which changes are safe, and it will be wrong, because that depends on what the change touches.",
    lesson: 9,
    record: 2,
  },
  {
    id: "projection",
    title: "The model is never shown the tree",
    plain:
      "The AI is not handed the page's data structure and asked to edit it. It is shown a simplified picture of the page, and it answers in a deliberately small grammar with room for very little. A narrow reply is not a limitation to work around; it is what stops a wrong answer from being an inventive one. The runtime translates in both directions.",
    lesson: 12,
    record: 14,
  },
  {
    id: "registry",
    title: "The vocabulary is a list you write",
    plain:
      "A proposal may only name things you have registered — your heading, your card, your checkout. Anything else is not a bug that shows up when the page renders; it is a change that could not be proposed. This is the bargain the whole framework rests on: a bounded vocabulary buys you a change you can review, and the behavior lives in your component rather than in the tree.",
    lesson: 15,
    record: 13,
  },
]

export type ArchitectureIdea = {
  readonly id: string
  readonly title: string
  readonly plain: string
  /** Where the reasoning is worked through. Present even when it is not written yet. */
  readonly lesson: CourseLesson
  /** Where the ruling is recorded, with what was rejected. */
  readonly record: DecisionRecord
}

const resolve = (source: IdeaSource): ArchitectureIdea => {
  const lesson = courseLesson(source.lesson)
  const record = decisionRecord(source.record)

  if (lesson === undefined) {
    throw new Error(`loom: "${source.id}" points at lesson ${source.lesson}, which the course has no row for`)
  }

  if (record === undefined) {
    throw new Error(`loom: "${source.id}" points at decision record ${source.record}, which does not exist`)
  }

  return { id: source.id, title: source.title, plain: source.plain, lesson, record }
}

export const ARCHITECTURE_IDEAS: readonly ArchitectureIdea[] = SOURCES.map(resolve)
