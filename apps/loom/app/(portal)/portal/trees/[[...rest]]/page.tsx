import { permanentRedirect } from "next/navigation"

/**
 * `/portal/trees` was the route until this branch. It is `/portal/pages` now,
 * because a tree is a data structure and a person has pages.
 *
 * A rename that breaks every bookmark and every link written in a report is a
 * rename that gets reverted, so the old path keeps answering — permanently,
 * with the rest of the URL carried through, so a link to a particular tree
 * lands on that tree rather than on the list. The optional catch-all is what
 * makes `/portal/trees` and `/portal/trees/t_42` one file instead of two.
 *
 * This is deliberately a redirect and not an alias. Two live names for one
 * screen is how a vocabulary comes back: somebody links to the old one, it
 * works, and the portal is speaking two languages again. A 308 lets the old
 * name work exactly once per visitor and then teaches their browser the new
 * one.
 */
const MovedTrees = async ({ params }: { params: Promise<{ rest?: readonly string[] }> }) => {
  const { rest } = await params
  const tail = (rest ?? []).map(encodeURIComponent).join("/")

  permanentRedirect(tail === "" ? "/portal/pages" : `/portal/pages/${tail}`)
}

export default MovedTrees
