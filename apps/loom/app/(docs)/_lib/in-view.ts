import { RAIL_CURRENT_SELECTOR, RAIL_SCROLLER_SELECTOR } from "./chrome"

/**
 * Where a scroller has to be for the reader to see the thing it has marked.
 *
 * Two places on this site mark something and then show it in a box smaller
 * than the list it is in, and both got it wrong in the same way.
 * **The rail** lists every page on the site, in reading order, and it is
 * taller than the box it sits in: 1,730 pixels of links in 844 on a 1280×900
 * screen. So the mark saying *you are here* is drawn correctly and sits off
 * the bottom of its own scroller for every page past the first third of the
 * list. A reader who reaches *Decision records* from the search box gets a
 * rail showing *Getting started*, with nothing on it highlighted anywhere.
 *
 * **The search box's result list** shows 384 pixels and holds 536 of them for
 * a ten-row answer. The ninth press of ArrowDown selects a row 92 pixels below
 * the bottom edge: the selection is correct, `aria-activedescendant` is
 * correct, a screen reader is told — and a reader watching the screen sees the
 * highlight leave the last visible row and nothing take its place, then
 * presses Enter and goes to a page they never saw.
 *
 * Both numbers were measured with `pnpm shoot`'s `measure` on the deployment
 * before any of this was written.
 *
 * Neither is search's defect to fix in search, and the rail's is not the
 * pager's either — the pager at the foot of a page, a link in the prose and a
 * bookmark opened cold all arrive the same way. It belongs to whoever draws
 * the mark, which is why it is one function and two callers.
 *
 * **The judgement is a pure function of four numbers**, and the component
 * around it reads boxes and assigns one. That split is deliberate: a scroller's
 * geometry is a browser fact and this file has to be testable without one.
 */

/** The scroller, as the three numbers that bound a `scrollTop`. */
export type Scroller = {
  /** What the scroller shows at once. `clientHeight`. */
  readonly viewport: number
  /** Where it is now. */
  readonly scrollTop: number
  /** The whole list, which is what a `scrollTop` is bounded by. `scrollHeight`. */
  readonly content: number
}

/** The marked row, measured from the top of the list and not the screen. */
export type Row = {
  readonly top: number
  readonly height: number
}

/**
 * How much of the list to keep either side of the row.
 *
 * Roughly one and a half rows of either list, which is what makes the answer
 * *a row in its neighbourhood* rather than *a row against an edge*. Minimal
 * movement with no margin lands the row flush against the bottom, where a
 * reader can see the mark and nothing of what comes after it, and both of
 * these lists say "here, among these" rather than "here".
 */
export const IN_VIEW_CONTEXT = 48

/**
 * The `scrollTop` the rail should take, or `undefined` for *leave it alone*.
 *
 * `undefined` rather than the current value, because the two mean different
 * things to the caller and only one of them is safe to assign: writing
 * `scrollTop` that is already correct is a no-op in a browser and is not one in
 * a test, and the distinction between *nothing to do* and *do this* is the
 * whole of the property below.
 *
 * **A reader who scrolled the rail themselves is not moved.** The row is left
 * exactly where it is whenever it is on screen at all, which covers the case
 * that matters most: a reader who pressed a link *in* the rail is looking at
 * the row they pressed, and a rail that re-centred under them on every
 * navigation would be a rail that moved for no reason the reader could see.
 * That is also what makes the effect safe to run on every navigation rather
 * than only the ones the rail did not cause, which it has no way to tell apart.
 *
 * Minimal movement rather than centring, for the same reason. Centring the
 * first page of the site would scroll *Getting started*'s own heading off the
 * top, which is to hide the one piece of context the reader has.
 */
export const scrollToShow = (
  box: Scroller,
  entry: Row,
  context: number = IN_VIEW_CONTEXT
): number | undefined => {
  /*
   * On screen, and that is the whole question. The context below is given when
   * the rail moves and is never a reason to move it: a row the reader can see
   * with ten pixels above it is a row the reader can see, and a rail that
   * nudged itself to make the margin tidy would be moving for a reason nothing
   * on the screen explains.
   */
  const visible =
    entry.top >= box.scrollTop && entry.top + entry.height <= box.scrollTop + box.viewport

  if (visible) return undefined

  /* The two ends of the list, as the `scrollTop` that puts the row at each. */
  const atTop = entry.top - context
  const atBottom = entry.top + entry.height + context - box.viewport

  /*
   * A row too tall to fit with its context shows its top. Not a row this rail
   * has — every entry is one line — and the branch is here because without it
   * the choice below would put the top of a tall row off the edge to make room
   * for a margin under its bottom.
   */
  const tooTall = atBottom > atTop

  const wanted = tooTall || entry.top < box.scrollTop ? atTop : atBottom

  const furthest = Math.max(0, box.content - box.viewport)
  const clamped = Math.min(Math.max(wanted, 0), furthest)

  /*
   * Clamping can land on where the rail already is — the first rows of the list
   * cannot be given 48 pixels above them, and the last rows cannot be given 48
   * below. Those are the two cases where a correct answer is no movement, and
   * they arrive here rather than at the test above.
   */
  return clamped === box.scrollTop ? undefined : clamped
}

/**
 * The same judgement, off two elements rather than four numbers, applied.
 *
 * Returns what it did — the new `scrollTop`, or `undefined` for *nothing* —
 * because a caller and a test both need to tell *moved* from *already right*,
 * and writing a `scrollTop` that is already correct is a no-op in a browser
 * and is not one anywhere else.
 *
 * Separated from the function above so that the arithmetic is tested without a
 * browser and the reading is tested against a DOM, which are two different
 * claims: that the right number comes out, and that the numbers going in are
 * the ones a browser would report.
 *
 * `getBoundingClientRect` on both and the scroller's own `scrollTop` added
 * back, rather than `offsetTop`, because `offsetTop` is measured from the
 * nearest positioned ancestor and the rail sits inside a sticky one. The two
 * agree today and would stop agreeing the first time anything between them
 * grew a `position`.
 */
export const scrollOf = (scroller: Element, entry: Element): number | undefined => {
  const frame = scroller.getBoundingClientRect()
  const box = entry.getBoundingClientRect()

  return scrollToShow(
    { viewport: scroller.clientHeight, scrollTop: scroller.scrollTop, content: scroller.scrollHeight },
    { top: box.top - frame.top + scroller.scrollTop, height: box.height }
  )
}

/**
 * Bring a row into view inside a scroller that is known, and say what moved.
 *
 * The caller holding both elements is the search box: its list is its own
 * scroller with a ref on it, and the row is the one it has marked selected. It
 * needs no lookup and is given none.
 */
export const showInScroller = (scroller: Element, row: Element): number | undefined => {
  const to = scrollOf(scroller, row)

  if (to !== undefined) scroller.scrollTop = to

  return to
}

/**
 * And the rail, which has to find both.
 *
 * The rail is rendered by one component and scrolled by an element two layouts
 * above it, so the pair is looked up rather than passed: `aria-current="page"`
 * is already the mark and `data-rail-scroller` is on whichever of the two
 * boxes this rail is in. `_lib/chrome.ts` is why those are attributes.
 *
 * `undefined` covers two of the three outcomes — already right, and there is
 * no scroller here at all. The second is the phone's panel before it had a
 * height, and it has to stay a no-op: a version of this that fell back to
 * scrolling the document would answer the same question by throwing a reader
 * who had just pressed a button into the middle of a list.
 */
export const showRailCurrent = (rail: Element): number | undefined => {
  const here = rail.querySelector(RAIL_CURRENT_SELECTOR)
  const scroller = rail.closest(RAIL_SCROLLER_SELECTOR)

  return here === null || scroller === null ? undefined : showInScroller(scroller, here)
}
