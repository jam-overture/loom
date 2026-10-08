/**
 * The two names a layout and a client component both have to spell.
 *
 * Neither is content and neither is a theme value: each is one string that two
 * files have to agree on, written in one of them and read in the other. Both
 * were transcribed before this file existed — `#article` in the skip link and
 * `id="article"` in the layout that answers it — which is 0197's shape at its
 * smallest, and the kind that is cheapest to close while it is still two
 * copies rather than four.
 */

/**
 * Where the page begins, for a reader who did not arrive by scrolling.
 *
 * The skip link has pointed at it since the site had a header, and it is the
 * site's own answer to *which element is the page rather than the chrome* — so
 * anything else that has to hand a reader to the page uses the same answer
 * instead of choosing a second one. The search dialog is the other caller: a
 * result press is a reader asking for a page, and it leaves them standing in
 * it.
 */
export const ARTICLE_ID = "article"

/** `#article`, for the one caller that needs the fragment rather than the id. */
export const ARTICLE_HREF = `#${ARTICLE_ID}`

/**
 * The element the rail scrolls inside, where it is in one.
 *
 * Declared on the scroller rather than sniffed off a computed `overflow-y`,
 * for a reason that is the whole of how one rail serves two places: on a wide
 * screen the rail lives in a sticky `aside` with its own scrollbar, and on a
 * phone it lives in a panel under a menu button. The attribute says which
 * element that is; the rail looks for the nearest ancestor carrying it and
 * does nothing when there is none. A phone that had no panel would get no
 * document scroll rather than a page yanked out from under a reader, and
 * neither case needs a prop, a width or a media query in script.
 */
const RAIL_SCROLLER = "data-rail-scroller"

/** Spread onto the element that scrolls. */
export const railScrollerAttr = { [RAIL_SCROLLER]: "" } as const

/** Read with `closest`, from inside the rail. */
export const RAIL_SCROLLER_SELECTOR = `[${RAIL_SCROLLER}]`

/**
 * The page the rail says the reader is on.
 *
 * `aria-current="page"` is already in the markup and already means exactly
 * this, so the rail is not given a second marker to keep in step with it. A
 * list that marked one page for a screen reader and a different one for the
 * scroller would be a bug nothing could see.
 */
export const RAIL_CURRENT_SELECTOR = '[aria-current="page"]'
