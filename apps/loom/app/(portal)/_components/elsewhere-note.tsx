import Link from "next/link"

import type { TreeId } from "@jam-overture/loom"

import {
  elsewhereFrom,
  screenHref,
  screenName,
  type PortalRoute,
} from "@/app/(portal)/_lib/screen-names"

/**
 * One line saying what this screen does not answer, and where that answer is.
 *
 * Three screens in this portal are about what happened, and their names are
 * synonyms in ordinary English. `screen-names.ts` has the argument; this is the
 * whole of the rendering.
 *
 * ## Where it goes, and why not in the header
 *
 * Under the heading and its sentence, and **below the strip** on a scoped
 * screen. Reading order on every screen in this portal is *what am I looking
 * at* → *what else can I look at* → the thing itself, and this is the last of
 * the second group: a reader who already knows which of the three they want
 * should never have to read past a disclaimer to reach the list. Putting it in
 * the header would make the correction arrive before the thing being corrected.
 *
 * ## Why the neighbour's name is the link
 *
 * The clause ends where the link begins, so the two read as one sentence and
 * the last words of it are the name a reader will meet in the rail. A separate
 * "see also" would be a second thing to read that says nothing the sentence has
 * not already said, and it would let the link's wording drift from the name —
 * which is the defect this whole unit exists to close.
 */
export const ElsewhereNote = ({
  from,
  treeId,
}: {
  readonly from: PortalRoute
  /** The page the reader is already looking at, carried across so the scope survives. */
  readonly treeId?: TreeId
}) => {
  const elsewhere = elsewhereFrom(from)

  return (
    /* The measure travels with the sentence rather than with the screen: this
       note is one paragraph, it is on six screens, and every one of them is now
       as wide as the display. See `_components/screen.tsx`. */
    <p className="text-ink-muted max-w-[68ch] text-xs">
      {elsewhere.clause}{" "}
      <Link href={screenHref(elsewhere.route, treeId)}>{screenName(elsewhere.route)} →</Link>
    </p>
  )
}
