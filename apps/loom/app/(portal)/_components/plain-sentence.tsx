import type { PlainLine } from "@/app/(portal)/_lib/vocabulary"

/**
 * A sentence with a name in the middle of it, rendered.
 *
 * `PlainLine` named the three pieces and `readingOf` made the join assertable,
 * but every component that met one still spread it by hand — three expressions
 * in a row, the middle one wrapped in monospace. That is the half of the shape
 * a `readingOf` test cannot reach: the line can be correct and the component can
 * still drop `after`, and nothing fails.
 *
 * So the spread happens once, here, and this component's own test asserts that
 * what it renders reads exactly `readingOf(line)` — the same sentence the line's
 * test asserts, checked at the other end.
 */
export const PlainSentence = ({ line }: { readonly line: PlainLine }) => (
  <>
    {line.before}
    <span className="font-mono">{line.subject}</span>
    {line.after}
  </>
)
