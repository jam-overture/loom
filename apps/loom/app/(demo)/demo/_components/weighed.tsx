import type { WeighedAnswer } from "@/app/(demo)/_lib/weighed"

/**
 * The two answers, above the rule that read them.
 *
 * Order is the whole design here. The rail promised *weighed on two questions,
 * then a named rule decides*, so on the card the two answers come first and the
 * rule's sentence follows them — the card reads as the argument the rail said
 * it would be, rather than as a verdict with its reasoning behind a click.
 *
 * On a held change that also puts the reassurance directly above the button
 * asking a stranger to commit. *"Can it be taken back? Yes — the four pieces it
 * takes off the page are kept"* is the sentence that makes **Apply this change**
 * safe to press, and it was two clicks away, phrased as `undo carries: 4 nodes`.
 *
 * A `<dl>` because that is what this is: two questions and their answers. It
 * buys the screen-reader pairing free, and it is the same shape the technical
 * record uses one disclosure down, so the plain view and the evidence for it
 * are recognisably the same object.
 *
 * Bordered and inset rather than loose in the card's column: the card is a
 * stack of sentences and these two are a unit — a reader who takes only one
 * thing from the card should take this block whole rather than half of it.
 */
export const Weighed = ({ answers }: { readonly answers: readonly WeighedAnswer[] }) => (
  <dl className="border-edge-subtle flex flex-col gap-2 rounded-sm border p-2.5">
    {answers.map((answer) => (
      <div key={answer.question} className="flex flex-col gap-0.5">
        <dt className="text-ink-muted text-2xs">{answer.question}</dt>
        <dd className="text-ink-secondary text-xs">
          <strong className="text-ink font-medium">{answer.verdict}.</strong> {answer.meaning}
        </dd>
      </div>
    ))}
  </dl>
)
