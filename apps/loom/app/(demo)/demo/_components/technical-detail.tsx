import type { ReactNode } from "react"

/**
 * The click the technical record is one of.
 *
 * The maintainer's direction binds this surface twice over: *plain language is
 * the default, the technical record is one click away, nothing is ever
 * removed.* On the demo the middle clause carries the most weight, because the
 * visitor arriving has read no decision records and knows no vocabulary — a
 * rule code and the sentence they actually need cannot arrive as peers in the
 * same 11px monospace, which is what the first version of this surface did.
 *
 * So: everything the demo used to print stays exactly where it was in the data
 * and moves behind one disclosure. A visitor who wants the policy fingerprint
 * is one click from it and always will be; a visitor who wants to know what
 * just happened to the page is not made to read past it first.
 *
 * `<details>` rather than state, deliberately — the same reasoning the portal's
 * own disclosure records, and it holds harder here. It works with JavaScript
 * off, costs no bundle in a Server Component, gets keyboard and screen-reader
 * semantics from the browser, and browser find-in-page reaches inside a closed
 * `<details>` where it would not reach inside anything we built ourselves.
 *
 * The demo owns its own copy rather than importing the portal's because the two
 * are the same idea aimed at different readers: the portal names what is down
 * there for someone who knows the vocabulary, and this one has to invite
 * somebody who does not. The label is the difference, and the label is most of
 * the component.
 */
export const TechnicalDetail = ({
  summary = "Show the full record",
  children,
}: {
  /**
   * An invitation rather than a category. "Technical details" tells a visitor
   * what is behind the arrow; "Show the full record" tells them why they might
   * want it — and on a surface whose whole argument is that the record exists,
   * the difference is the argument.
   */
  readonly summary?: string
  readonly children: ReactNode
}) => (
  <details className="group border-edge-subtle border-t pt-2.5">
    <summary className="text-ink-muted hover:text-ink cursor-pointer list-none text-xs transition-colors select-none">
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

    <div className="text-2xs mt-3 flex flex-col gap-3">{children}</div>
  </details>
)
