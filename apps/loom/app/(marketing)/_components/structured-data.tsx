import { pageSchema } from "@/app/(marketing)/_lib/schema"
import type { SiteRoute } from "@/app/(marketing)/_lib/site"

/**
 * The second piece of this site that is not a Loom tree, and the second that
 * draws nothing.
 *
 * The layout's comment says the claim *the whole page is data* has to be true
 * at the edges too, and `CountReaders` is the standing exception to it: one
 * component, mounted once, **returning `null`**. The reasoning there is the
 * reasoning here, and it is about what a visitor sees rather than about what
 * the document contains — a reader signal is a fact about somebody reading and
 * no tree can hold one; a JSON-LD graph is a statement about the page and no
 * tree can hold one either.
 *
 * What this renders is a `<script type="application/ld+json">`. It has no box,
 * no text node and no styles, it cannot be themed, and it is invisible in every
 * palette. **No registered primitive is missing here**, which is the question
 * 0067 asks of anything this surface renders itself: `loom.code` prints data
 * *for a reader to look at*, and this is the opposite — data for a reader never
 * to see. A primitive that emitted a script tag would be a primitive that could
 * put arbitrary script into any page a model can edit, which is not a finding
 * to file, it is a thing that must not exist.
 *
 * ## Why it is per page rather than in the layout
 *
 * The layout does not know which route it is wrapping, and the graph's
 * `WebPage` node is the route's. Putting it in the layout would mean every page
 * claiming to be the front door.
 *
 * ## Why the JSON goes in unescaped
 *
 * `JSON.stringify` output is placed with `dangerouslySetInnerHTML`, which is
 * the only way to put a script's body in the document without React escaping
 * the quotes into entities and leaving a crawler with something unparseable.
 * It is safe **because of where the content comes from, and only because of
 * that**: every string in the graph is a literal in this repository — route
 * titles, route descriptions and `questions.ts` — and not one of them is read
 * from a request, a query string, a database or a model. `</script>` is
 * escaped anyway, because the day one of those strings stops being ours is the
 * day nobody re-reads this comment.
 */

/** The one sequence that would end the script early, wherever it appeared. */
const CLOSING_TAG = /<\/script/gi

export type StructuredDataProps = {
  readonly route: SiteRoute
  readonly origin: string
}

export const StructuredData = ({ route, origin }: StructuredDataProps) => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify(pageSchema(route, origin)).replace(CLOSING_TAG, "<\\/script"),
    }}
  />
)
