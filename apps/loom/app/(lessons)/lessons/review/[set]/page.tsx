import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { SetRunner, type RunnableQuestion } from "../../../_components/set-runner"
import { reviewPointers } from "../../../_lib/links"
import { heading, prose, renderFragment } from "../../../_lib/loom"
import { REVIEW_SETS, reviewSet, type ReviewSet } from "../../../_lib/schedule"
import * as style from "../../../_components/style"

/**
 * One set, one sitting.
 *
 * Every question is rendered here, on the server, as its own small tree of
 * registered primitives — and then handed to the runner, which decides when the
 * reader may see it. That split is the whole architecture of this surface: the
 * words are content and go through Loom, and *when you are allowed to read them*
 * is machinery and does not.
 */

type Params = Promise<{ readonly set: string }>

export const dynamicParams = false

export const generateStaticParams = () => REVIEW_SETS.map((set) => ({ set: set.slug }))

export const generateMetadata = async ({ params }: { readonly params: Params }): Promise<Metadata> => {
  const { set } = await params
  const found = reviewSet(set)

  return found === undefined
    ? {}
    : { title: `Set ${found.letter}`, description: `Review set ${found.letter} — ${found.timing}.` }
}

const questionsOf = (set: ReviewSet): readonly RunnableQuestion[] =>
  set.questions.map((question) => ({
    number: question.number,
    checkIn: reviewPointers(set.anchor, question.refs),
    body: renderFragment(
      (ids) => [prose(ids, question.text)],
      `${set.slug}-q${question.number}`
    ),
  }))

const ReviewSetPage = async ({ params }: { readonly params: Params }) => {
  const { set: slug } = await params
  const set = reviewSet(slug)

  if (set === undefined) notFound()

  return (
    <main style={style.column(5)}>
      {renderFragment(
        (ids) => [
          heading(ids, 1, `Set ${set.letter}`),
          prose(ids, `${set.timing}. ${set.questions.length} questions.`, { tone: "muted" }),
          ...set.notes.map((note) => prose(ids, note)),
        ],
        `${set.slug}-head`
      )}

      <SetRunner
        slug={set.slug}
        letter={set.letter}
        questions={questionsOf(set)}
        closing={renderFragment(
          (ids) => set.closing.map((line) => prose(ids, line, { size: "small", tone: "muted" })),
          `${set.slug}-closing`
        )}
      />
    </main>
  )
}

export default ReviewSetPage
