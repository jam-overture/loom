/**
 * The first of the two panels `/why-use-it` prints under *What you write*, and
 * the point of this one is that there is nothing of ours in it.
 *
 * The band answers *what do I actually write*, which this site asked four times
 * before today and never showed. The claim both panels make is about
 * **quantity**: this file is React somebody would have written anyway, and
 * `register.tsx` beside it is the whole of what Loom has to be told about it.
 *
 * ## Why it is a module and not a string
 *
 * `written.ts` holds the text the page renders. This is the copy the
 * **typechecker** reads, and `written.test.ts` holds the two together.
 *
 * A snippet typed into a page builder is a claim about an API that nothing
 * checks, and it rots the first time the API moves. `(docs)` avoided that for
 * its quickstart by printing the file it runs; this is the same discipline
 * reached a different way, because a marketing route may not read from disk at
 * request time — see `written.ts` on why the text is a constant rather than a
 * `readFileSync`. The property that matters is the one both arrangements have:
 * **a stranger cannot be shown code that does not compile.**
 *
 * ## Everything below the marker is published
 *
 * The marker is what lets this file carry a docblock at all. Everything under
 * it is printed on the site exactly as it is written here, so there are no
 * comments in it and nothing in it is clever: a reader has to recognise it as
 * the sort of thing already in their repository, and anything surprising
 * weakens the one claim the panel makes.
 *
 * `was` is written `string | undefined` rather than `string` because this
 * repository sets `exactOptionalPropertyTypes`, and the schema in `register.tsx`
 * infers the optional prop as exactly that. A panel showing the shorter
 * spelling would be showing a reader something that does not compile here,
 * which is the one thing printing a real file is meant to prevent.
 */

// ── shown on the site ──
export type PriceTagProps = {
  readonly amount: string
  readonly was?: string | undefined
}

export const PriceTag = ({ amount, was }: PriceTagProps) => (
  <p className="price-tag">
    {was === undefined ? null : <s>{was}</s>} <strong>{amount}</strong>
  </p>
)
