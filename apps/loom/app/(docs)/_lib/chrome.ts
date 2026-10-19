/**
 * What the chrome's own files have to agree on: two names, and its height.
 *
 * None of it is content and none of it is a theme value. Each is one fact that
 * two or more files have to spell the same way, written here and read wherever
 * else it is needed. The two names were transcribed before this file existed —
 * `#article` in the skip link and `id="article"` in the layout that answers it
 * — which is 0197's shape at its smallest, and the kind that is cheapest to
 * close while it is still two copies rather than four. The height arrived as
 * six copies, and closing it is the second section below.
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

/* ── The chrome's height ─────────────────────────────────────────────────
 *
 * The classes that read the chrome's own measurements back out of the
 * stylesheet, so that a height and the offset something sits at are one
 * declaration rather than two numbers that happen to agree.
 *
 * ## The plain version
 *
 * Two bands are stuck to the top of the window: the site's header, and under
 * 1280 the bar that holds both of a narrow screen's navigations. Four other
 * things are measured against them — where the bar sticks, where each of the
 * two rails sticks and how tall it can be, and how far down the page the
 * browser scrolls when a reader asks for a heading.
 *
 * Until 18 October each of those spelled the numbers itself: `h-14` in the
 * header, `top-14` in three files, `calc(100vh - 3.5rem)` in two of them, and
 * `7rem` plus `3rem` in `globals.css`. All of them were right and none of them
 * was connected to any other, so a run that made one band taller left the rest
 * behind and nothing anywhere went red.
 *
 * `globals.css` declares the parts now. These are how the markup reads them.
 *
 * ## Each one is a complete class, variant included
 *
 * That is not a style choice. Tailwind generates the utilities it has **seen**,
 * as text, in a file it scanned — so a class assembled at runtime from a prefix
 * and one of these is a class nothing generated, and the symptom is an element
 * with no height at all rather than an error. `lg:` and `xl:` are therefore
 * written here rather than by the caller.
 *
 * It is also why a property named by one of these has to be declared: an
 * undeclared `var()` is not a failure, it is a declaration the browser throws
 * away. `chrome.test.ts` is what insists, and the chain it holds runs
 * stylesheet → property → class → element.
 * ──────────────────────────────────────────────────────────────────── */

/** The header's own row, on the element that draws it. */
export const HEADER_ROW_CLASS = "h-[var(--chrome-header)]"

/** Where a second sticky band starts: under the header and its hairline. */
export const UNDER_HEADER_CLASS = "top-[var(--chrome-under-header)]"

/** A control in the bar, which is the one thing giving the bar its row. */
export const BAR_CONTROL_CLASS = "h-[var(--chrome-bar)]"

/** The site's rail: sticks under the header, from the width it appears at. */
export const SITE_RAIL_CLASS = "lg:top-[var(--chrome-under-header)] lg:h-[var(--chrome-rail)]"

/**
 * The page's rail: the same two decisions as the site's, and the width it
 * arrives at.
 *
 * It carries `xl:sticky xl:block xl:overflow-y-auto` as well, which the layout
 * used to spell beside it. Those are not a second decision — they are the same
 * one — and keeping them here is what lets the breakpoint be checkable: every
 * `xl:` in this route group is now in this file.
 */
export const PAGE_RAIL_CLASS =
  "xl:sticky xl:block xl:overflow-y-auto xl:top-[var(--chrome-under-header)] xl:h-[var(--chrome-rail)]"

/* ── The width the chrome changes at ─────────────────────────────────────
 *
 * ## The plain version
 *
 * Below 1280 there is a bar under the header holding both of a narrow
 * screen's navigations. At 1280 and above there is not: the page's contents
 * get a rail of their own beside the prose, so the bar has nothing left to
 * offer and stands down.
 *
 * That is **one** decision and three things follow from it — the bar is
 * hidden, the rail appears, and the chrome loses the bar's band, which is
 * what the scrollport is inset by. Three readers of one number, and until
 * 19 October each of them spelled it: two `xl:` prefixes in the markup, and
 * nothing at all in the stylesheet, which went on insetting the page by a
 * band that was not on the screen.
 *
 * ## Why there is no number here
 *
 * `xl` is Tailwind's, and Tailwind declares it as `--breakpoint-xl`. The
 * stylesheet asks for it by that name — `@media (width >= theme(--breakpoint-xl))`
 * — rather than transcribing `80rem`, so the query and the variants move
 * together if the theme ever moves. What this file holds is the other half:
 * the **name**, so the markup spells it once.
 *
 * A class is still written out in full, for the reason the section above
 * gives: Tailwind generates the utilities it has seen as text, so
 * `` `${BAR_BREAKPOINT}:hidden` `` is a class nothing generated. The tie
 * between the name and the literal is an assertion in `chrome.test.ts`
 * instead.
 * ──────────────────────────────────────────────────────────────────── */

/** Tailwind's name for the width, as a variant prefix is spelled. */
export const BAR_BREAKPOINT = "xl"

/** The theme variable that variant compiles against, which is what the stylesheet asks for. */
export const BAR_BREAKPOINT_PROPERTY = `--breakpoint-${BAR_BREAKPOINT}`

/** The bar: there below the breakpoint, and not above it. */
export const BAR_HIDDEN_CLASS = "xl:hidden"

/**
 * All of them, for the check that every property they name is declared.
 *
 * A list rather than a lookup over the module's exports, because a run adding
 * a sixth class should have to put it here and be asked the same question of
 * it.
 */
export const CHROME_CLASSES = [
  HEADER_ROW_CLASS,
  UNDER_HEADER_CLASS,
  BAR_CONTROL_CLASS,
  SITE_RAIL_CLASS,
  PAGE_RAIL_CLASS,
  BAR_HIDDEN_CLASS,
] as const
