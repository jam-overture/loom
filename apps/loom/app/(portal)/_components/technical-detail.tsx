import type { ReactNode } from "react"

/**
 * The click that the technical record is one of.
 *
 * The portal's problem was never that it showed too much. It is that it showed
 * everything at the same altitude: the rule code, the policy fingerprint, the
 * delta's operations and the sentence a person actually needed all arrived as
 * peers, in the same 10px monospace, and the reader had to know which was
 * which. A screen built that way is unreadable to somebody who has not read
 * the decision records, and no amount of rewording fixes it.
 *
 * So this is the other half of the plain-language rule, and the half that keeps
 * it honest: **nothing is deleted to make a screen simple.** Everything the
 * portal used to print stays exactly where it was in the data and moves behind
 * one disclosure. A reviewer who wants the fingerprint is one click from it and
 * always will be; a reviewer who wants to know whether to press "Apply" is not
 * made to read past it first.
 *
 * ## The altitude is this component's, not the screen's
 *
 * For a fortnight it set no text colour at all, so the record was rendered in
 * whatever ink it happened to be mounted inside. Inside a `StateNotice`, whose
 * content wrapper is muted, that was quiet. Inside a card, which sets nothing,
 * it was **the body ink — the same weight as the plain sentence the disclosure
 * is a footnote to**, and on `/portal/sign-ins` the record came out darker than
 * the sentence above it. The rule this component exists to enforce, upside
 * down, and no assertion about text content can see it.
 *
 * So the body sets `text-ink-muted` itself. The invariant it buys is worth
 * stating as one sentence, because it is the only one that holds in both
 * places a disclosure is mounted:
 *
 * > **The record is never louder than the sentence it sits under.**
 *
 * Muted rather than `text-ink-secondary`, which was the tempting choice and is
 * wrong in exactly one context: a disclosure inside a `StateNotice` would then
 * be a step *louder* than the notice's own prose, which is the same defect
 * moved rather than fixed. Muted is quieter than a card's sentence and equal to
 * a notice's — never above either.
 *
 * `<details>` rather than state, deliberately. It works with JavaScript off, it
 * is a Server Component so it costs no bundle, the browser gives it keyboard
 * and screen-reader semantics for free, and — the reason that decided it —
 * browser find-in-page reaches inside a closed `<details>`. A reviewer
 * searching the page for a node id still finds one that is behind a
 * disclosure, which would not be true of anything we built ourselves.
 */
export const TechnicalDetail = ({
  summary = "Technical details",
  children,
}: {
  /**
   * What is down there, named. "Technical details" is the honest default; a
   * screen with two disclosures should say which is which ("What the AI
   * proposed", "How this was decided") rather than making the reader open
   * both to find out.
   */
  readonly summary?: string
  readonly children: ReactNode
}) => (
  <details className="group border-edge-subtle border-t pt-2">
    <summary className="text-ink-muted hover:text-ink-secondary cursor-pointer list-none text-xs select-none">
      <span className="inline-flex items-center gap-1.5">
        <svg
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
          className="h-3 w-3 shrink-0 transition-transform group-open:rotate-90"
        >
          <path d="M4 2.5L8 6l-4 3.5" />
        </svg>
        {summary}
      </span>
    </summary>

    <div className="text-ink-muted text-2xs mt-2 flex flex-col gap-3">{children}</div>
  </details>
)
