import {
  EXERCISE_ANSWERS,
  HELD_PARTS,
  SELF_CHECK_ANSWERS,
  TRANSCRIPTS,
  type HeldPart,
} from "../../../../_lib/held"
import { section, splitAnswers } from "../../../../_lib/lesson"
import { renderTree } from "../../../../_lib/loom"
import { lessonDocument, lessonParts, TRY_IT } from "../../../../_lib/parts"
import { runExercises } from "../../../../_lib/run"
import { WRITTEN_LESSONS } from "../../../../_lib/syllabus"

/**
 * The part of a lesson the lesson page is not carrying.
 *
 * A transcript and a printed answer are the two things this course must not
 * hand over before they are earned, and until now the lesson page shipped both
 * and asked the browser not to draw them. This is where they live instead: one
 * address per held part, built at the same moment the page is, and fetched by
 * the reader when the gate opens.
 *
 * **Served as trees, not as markup.** The response is the same `LoomTree` the
 * page would have rendered, and the reader parses it with the runtime's own
 * boundary parse and renders it through the same registry — so an answer that
 * arrives late is composed exactly like the paragraph above it, and there is no
 * second, laxer path into this surface for HTML to come in by. It is also the
 * shape the course spends Part I arguing for, which is a pleasant accident
 * rather than a reason.
 *
 * **Static.** Every one of these is prerendered into the build: the transcripts
 * are the output of programs that can only run against a checkout of `src/`,
 * and there is no version of this that computes them per request. The gate is
 * therefore not enforced here and cannot be — the address is guessable and the
 * answers are in `lessons/` anyway. What the split buys is that reading the
 * lesson page never delivers them, which is the standard `held.ts` states and
 * the only one a static surface can actually meet.
 */

export const dynamic = "force-static"
export const dynamicParams = false

const pad = (number: number): string => String(number).padStart(2, "0")

/**
 * Every held address, without running a single exercise.
 *
 * The two answer halves are visible in the markdown, so they are enumerated
 * exactly. The transcripts are not — knowing whether a fence prints anything
 * means running it — so the address is generated for every lesson and the
 * handler answers 404 for a lesson whose Try it has no program in it. Cheaper
 * than the alternative by twenty compilations of `src/`, and wrong in the
 * direction that costs a 404 nothing links to.
 */
export const generateStaticParams = () =>
  WRITTEN_LESSONS.flatMap((entry) => {
    const document = lessonDocument(pad(entry.number))
    const answers = document === undefined ? undefined : section(document, "Answers")
    const split = answers === undefined ? undefined : splitAnswers(answers.blocks)

    const parts: HeldPart[] = [TRANSCRIPTS]

    if (split !== undefined && split.exercises.length > 0) parts.push(EXERCISE_ANSWERS)
    if (split !== undefined && split.selfCheck.length > 0) parts.push(SELF_CHECK_ANSWERS)

    return parts.map((part) => ({ lesson: pad(entry.number), part }))
  })

const isHeldPart = (value: string): value is HeldPart =>
  (HELD_PARTS as readonly string[]).includes(value)

const missing = () => new Response(null, { status: 404 })

export const GET = async (
  _request: Request,
  { params }: { readonly params: Promise<{ readonly lesson: string; readonly part: string }> }
) => {
  const { lesson, part } = await params

  if (!isHeldPart(part)) return missing()

  const document = lessonDocument(lesson)

  if (document === undefined) return missing()

  /**
   * The exercises are compiled and run only for the address that needs their
   * output. The two answer halves are markdown and depend on nothing that runs,
   * so asking for them does not pay for a build of `src/`.
   */
  const run =
    part === TRANSCRIPTS
      ? (await runExercises(section(document, TRY_IT)?.blocks ?? [])).run
      : ({ kind: "ran", outputs: [] } as const)

  const held = lessonParts(document, run).held.get(part)

  if (held === undefined) return missing()

  /**
   * Rendered once here and thrown away.
   *
   * `renderTree` throws on a diagnostic, which is what makes a fragment the
   * registry refuses a failed build rather than a blank space on the page. That
   * guarantee was free while every fragment was rendered on the way to the
   * reader; a fragment that leaves as data would otherwise reach the browser
   * unchecked and fail there, in front of the one person this course is for.
   */
  for (const [slot, tree] of Object.entries(held.slots)) {
    renderTree(tree, `held ${part} ${slot} of lesson ${lesson}`)
  }

  return Response.json(held, {
    headers: { "cache-control": "public, max-age=0, must-revalidate" },
  })
}
