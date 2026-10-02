import { siteCount, spellOut, type SiteCountId } from "@/app/(docs)/_lib/counts"

/**
 * A number this site states about Loom, put on a page.
 *
 * It renders one number and nothing else — no wrapper, no markup, no label —
 * so a sentence reads the same written as rendered: *"the <Count
 * of="starter-primitives" as="word" /> primitives every example on this site is
 * built from"*. That matters more than it looks: the whole point is that an
 * author reaches for this as readily as they would reach for typing the number,
 * and an element that brought a box or a font with it would be reached for
 * less.
 *
 * **`as` is why this is usable in prose at all.** A documentation page spells
 * its numbers — *seventeen named slots*, not *17 named slots* — and the version
 * of this component that could only render a digit was asking authors to make
 * the page read worse in exchange for a guarantee. So it renders the word, and
 * `"Word"` is the same word with a capital for a sentence that opens on it. The
 * prop's own spelling is the example.
 *
 * The id is a union of the registered counts, so a misspelling is a compile
 * error. `_lib/counts.ts` says what each one counts and where it is read from,
 * and `counts.test.ts` is what makes typing the number instead a red test.
 */
export const Count = ({ of, as = "digit" }: { readonly of: SiteCountId; readonly as?: "digit" | "word" | "Word" }) => {
  const { value } = siteCount(of)

  return <>{as === "digit" ? value : spellOut(value, as)}</>
}
