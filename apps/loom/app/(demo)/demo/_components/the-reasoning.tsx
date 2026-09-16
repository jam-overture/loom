import type { Reasoning } from "@/app/(demo)/_lib/reasoning"
import type { WeighedAnswer } from "@/app/(demo)/_lib/weighed"

import { Weighed } from "./weighed"

/**
 * The Gate's working: shown whole, or folded under the line that summarises it.
 *
 * Three blocks travel together and always have — the two answers, the rule that
 * read them, and the comparison that rule reached its verdict by. They are one
 * argument in three parts, in the order the Gate made it, and until now every
 * card in the rail printed all three. `reasoning.ts` has the measurement and
 * decides which cards still should.
 *
 * **Open, this renders exactly what the card rendered before it existed.** A
 * fragment, so the three stay direct children of the card's own `gap-3` column
 * and the spacing, the order and the DOM are unchanged — which is why the card's
 * existing assertions about an open card did not have to be rewritten to
 * accommodate this, and why a regression in the open case would show up as those
 * tests going red rather than as a silent reflow.
 *
 * **Folded, nothing is removed.** The same three blocks, in the same order, one
 * click under a summary that states their conclusion. `<details>` rather than
 * state for the reasons this surface has recorded twice: it works with
 * JavaScript off, costs no bundle in a Server Component — though this one is
 * rendered inside a client card, so what it actually buys here is the other
 * three — takes keyboard and screen-reader semantics from the browser, and lets
 * browser find-in-page reach inside a closed disclosure, which nothing we built
 * ourselves would.
 *
 * **It is deliberately not `TechnicalDetail`.** That disclosure is the technical
 * record — codes, fingerprints, operations — and its summary is an invitation to
 * a reader who has decided they want the evidence. What folds here is *plain
 * language*, and filing it under a technical arrow would tell a visitor the
 * weighing is a technical matter when the whole argument of this surface is that
 * it is not. Two disclosures on one card, saying two different kinds of thing,
 * is the honest shape.
 */
export const TheReasoning = ({
  answers,
  rule,
  ceiling,
  brief,
  reasoning,
}: {
  /** The two questions and their answers, absent on an ask that never reached assessment. */
  readonly answers?: readonly WeighedAnswer[]
  /** The verdict in the words of the rule that produced it. */
  readonly rule?: string
  /** The comparison that rule reached its verdict by — on seven of the eight rules there is none. */
  readonly ceiling?: string
  /**
   * The two answers in one line, which is what a folded card shows.
   *
   * `weighed.ts` composes it from the same two strings the panel prints, so the
   * summary and the thing it summarises cannot disagree.
   */
  readonly brief?: string
  readonly reasoning: Reasoning
}) => {
  const body = (
    <>
      {answers && <Weighed answers={answers} />}
      {rule && <p className="text-ink-secondary text-xs">{rule}</p>}
      {ceiling && <p className="text-ink-muted text-xs">{ceiling}</p>}
    </>
  )

  /*
   * An ask that reached no verdict and no assessment has no working to show, and
   * a disclosure promising one would open on nothing. The card printed nothing
   * here before and still does.
   */
  if (answers === undefined && rule === undefined && ceiling === undefined) return null

  if (reasoning === "open") return body

  return (
    <details className="group">
      <summary className="text-ink-secondary hover:text-ink cursor-pointer list-none text-xs transition-colors select-none">
        <span className="inline-flex items-start gap-1.5">
          <svg
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
            className="mt-0.5 h-3 w-3 shrink-0 transition-transform group-open:rotate-90"
          >
            <path d="M4 2.5L8 6l-4 3.5" />
          </svg>
          {/*
            * The conclusion, then what is under it.
            *
            * A summary reading "What Loom weighed" would be a category, and a
            * visitor four cards down would have to open every one to find out
            * whether any of them said anything different. The verdict in the
            * line means the fold costs them nothing at a glance: they read
            * *Some risk, and you could undo it* without a click, and click only
            * for the working.
            *
            * The trailing clause names the rest rather than repeating the
            * invitation — the panel is not all that is down there, and a
            * disclosure that hid the rule without saying so would be the one
            * removal this surface does not allow itself.
            */}
          <span>
            {brief ?? "What Loom weighed"}{" "}
            <span className="text-ink-muted">· and the rule that read it</span>
          </span>
        </span>
      </summary>

      <div className="mt-3 flex flex-col gap-3">{body}</div>
    </details>
  )
}
