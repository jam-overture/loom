import type { WeighedAnswer } from "@/app/(demo)/_lib/weighed"

/**
 * The two answers, above the rule that read them.
 *
 * Order is the whole design here. The rail promised *weighed on two questions,
 * then a named rule decides*, so on the card the two answers come first and the
 * rule's sentence follows them — the card reads as the argument the rail said
 * it would be, rather than as a verdict with its reasoning behind a click.
 *
 * On a held change that also puts the reassurance on the same card as the
 * button asking a stranger to commit. *"Can it be taken back? Yes — the 4
 * pieces it takes off the page are kept"* is what makes **Apply this change**
 * safe to press, and it was two clicks away, phrased as `undo carries: 4
 * nodes`.
 *
 * A `<dl>` because that is what this is: two questions and their answers. It
 * buys the screen-reader pairing free, and it is the same shape the technical
 * record uses one disclosure down, so the plain view and the evidence for it
 * are recognisably the same object.
 *
 * Bordered and inset rather than loose in the card's column, and deliberately
 * *not* another left rule: the card already spends that device twice, in green
 * for what the visitor did (`answerNote`) and amber for what a change would do
 * (`WhatWouldHappen`), and both are Loom addressing the reader. This is the one
 * block that is Loom showing its working, so it is a panel rather than a
 * margin note — and a reader who takes only one thing from the card takes the
 * pair whole rather than half of it.
 *
 * **The heading is doing two jobs and the second one is not cosmetic.** It says
 * whose questions these are, so a visitor who has not read the rail's third
 * step does not meet two questions apparently being put to *them*. And it puts
 * the block in the past, which is what makes it honest on a card the visitor
 * has already answered: the level's sentence is the portal's, and for `medium`
 * that sentence is *"Worth a look before you say yes"* — advice, under a badge
 * reading **Applied**, three lines above *"You said yes"*. Read as *what Loom
 * weighed*, it is the reasoning that was in hand when the Gate decided, which
 * is what it is. The alternative was a second stakes table in this lane phrased
 * for two tenses, which is the drift `weighed.ts` exists to refuse.
 *
 * It deliberately echoes the disclosure's own *what the gate weighed* section
 * one click down: the same name over the plain answer and over the evidence for
 * it, so a visitor who opens the record finds the thing they just read, in the
 * runtime's numbers.
 */
export const Weighed = ({ answers }: { readonly answers: readonly WeighedAnswer[] }) => (
  /*
   * A heading rather than `aria-labelledby`, and that is a constraint rather
   * than a preference: this block is rendered once per card and a page can hold
   * a dozen, so an id here would be a dozen elements sharing one. The heading
   * names it for a reader navigating by headings, which is the thing a
   * duplicated id would have bought and then broken.
   */
  <section className="border-edge-subtle flex flex-col gap-2 rounded-sm border p-2.5">
    <h3 className="text-ink-muted text-2xs tracking-wide uppercase">what Loom weighed</h3>

    <dl className="flex flex-col gap-2">
      {answers.map((answer) => (
        <div key={answer.question} className="flex flex-col gap-0.5">
          <dt className="text-ink-muted text-2xs">{answer.question}</dt>
          <dd className="text-ink-secondary text-xs">
            <strong className="text-ink font-medium">{answer.verdict}.</strong> {answer.meaning}
          </dd>
        </div>
      ))}
    </dl>
  </section>
)
