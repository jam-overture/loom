import { PartName } from "@/app/(portal)/_components/part-name"
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
 *
 * ## Two kinds of subject, and only one of them is monospace
 *
 * A subject that is a bare string is an identifier and is set in monospace, as
 * it always was. A subject that is a `PartName` has been named — *the card
 * “Autumn arrivals”* — and setting the whole of that in monospace would undo
 * the naming: a reader skims monospace as machinery and skips it, which is why
 * the identifier is in it in the first place. So the words are body text and
 * only the id stays monospace, which is what `PartName` renders.
 *
 * This is the half that made the union worth having. Three components were
 * still spreading a `PlainLine` by hand a fortnight after this one was written,
 * each with its own `<span className="font-mono">` around the subject, and each
 * would have quietly set a named part in monospace. Widening the type broke all
 * three at compile time instead.
 */
export const PlainSentence = ({ line }: { readonly line: PlainLine }) => (
  <>
    {line.before}
    {typeof line.subject === "string" ? (
      <span className="font-mono">{line.subject}</span>
    ) : (
      <PartName part={line.subject} />
    )}
    {line.after}
  </>
)
