import type { ReactNode } from "react"

/**
 * How wide a portal screen is, and how wide the words on it are — which are two
 * different questions that one container has been answering with one number.
 *
 * ## The defect, measured
 *
 * Every screen in this portal caps itself: eighteen at `max-w-3xl` (768px), six
 * at `max-w-xl` (576px). On a 1280-pixel display with the rail, that leaves
 * **a little over half the screen empty**; on a 1920 it leaves two thirds. The
 * front door was photographed at **1280 × 2150** — two and a half screens of
 * scrolling, using 568 pixels of width.
 *
 * The maintainer's verdict, 3 October: *"The portal is too vertical in the main
 * content pane."*
 *
 * ## Why one number cannot answer both questions
 *
 * The cap is not a mistake. Prose has a measure — somewhere around 65 to 75
 * characters a line — past which a reader loses their place returning to the
 * left margin, and 768px is about right for it. A screen that simply dropped
 * the cap would trade a column of empty space for paragraphs 140 characters
 * wide, which is worse and is the reason nobody had dropped it.
 *
 * **But almost nothing on these screens is prose.** Cards, grids, lists of
 * rows, tables of counters, panels: all of them want the width and none of them
 * has a measure. The front door's card grid is already written as
 * `repeat(auto-fill, minmax(288px, 1fr))` — a grid that fills whatever it is
 * given — and it has been drawing **two columns** because it was given 672.
 *
 * So the rule is:
 *
 * > **The screen is as wide as the display. The sentences are as wide as a
 * > sentence should be.**
 *
 * `Screen` is the first half, `Measured` the second. A screen that wraps its
 * prose and lets its grids alone gets shorter and wider at the same time,
 * without a single paragraph changing shape.
 *
 * ## Why there is still an outer bound
 *
 * `90rem` — 1440px. Not for prose, which `Measured` handles, but because a
 * card grid on a 3440-pixel display becomes eleven columns of thumbnail, and a
 * row of eleven is a different screen from a row of four. The bound is where
 * the layout stops improving rather than where reading stops working.
 */
export const Screen = ({
  children,
  className = "",
}: {
  readonly children: ReactNode
  /** Extra layout for a screen that needs it. The width and padding are fixed. */
  readonly className?: string
}) => (
  <div className={`flex w-full max-w-[90rem] flex-col gap-6 p-8 ${className}`.trimEnd()}>
    {children}
  </div>
)

/**
 * A measure for the words.
 *
 * `68ch` rather than a pixel width, because the measure is about characters: a
 * reader's eye returns to the left margin by counting, not by distance, so the
 * number that matters moves with the font and the size. At this screen's body
 * size it lands near 600px, which is roughly where the old `max-w-3xl` cap was
 * doing its real work.
 *
 * Wrap the sentences, never the section. A heading, a lead paragraph, the body
 * of a notice: those. Not the grid under them, not the row of counters, not a
 * list whose rows each hold three short facts — those are the things the old cap
 * was strangling, and a `Measured` around one of them would put it straight
 * back.
 */
export const Measured = ({
  children,
  className = "",
  as: Element = "div",
}: {
  readonly children: ReactNode
  readonly className?: string
  /**
   * The element to render, for the case that turned out to be almost all of
   * them: a screen's opening heading and lead are prose *and* a `<header>`.
   *
   * Added when the other sixteen screens were converted, because the two ways of
   * writing it without this are both worse. A `<div>` inside the `<header>`
   * keeps the landmark and adds a wrapper that exists only to hold one number;
   * putting `max-w-[68ch]` on the `<header>` itself drops the wrapper and puts
   * the number in fourteen files, which is how a measure stops being one
   * measure. The element is the thing that varies, so the element is the prop.
   */
  readonly as?: "div" | "header" | "section"
}) => (
  <Element className={`flex max-w-[68ch] flex-col gap-1 ${className}`.trimEnd()}>{children}</Element>
)

/**
 * A screen's main subject, and the smaller things that sit beside it.
 *
 * The other half of *too vertical*: three sections that each answer a question
 * about the same deployment, stacked, each using half the width. Side by side
 * they are one screen instead of three.
 *
 * **A row of equals is the wrong shape and this is not one.** The sections on
 * these screens are not equal — one is the queue a person came for and the
 * others are a paragraph and a button — so an even split would leave two short
 * panels beside a long one and a column of white below them. `main` takes two
 * thirds and `beside` takes one, which is the proportion those two kinds of
 * thing actually are.
 *
 * **Source order is reading order**, so `main` comes first in the markup and
 * lands on the left. Nothing here reverses a row: on a narrow screen the rail's
 * contents fall below the main column, which is the order somebody reading down
 * a phone should meet them in anyway.
 */
export const Columns = ({
  main,
  beside,
}: {
  readonly main: ReactNode
  /** Secondary sections. Absent — not an empty column — when there are none. */
  readonly beside?: ReactNode
}) =>
  beside === undefined ? (
    <>{main}</>
  ) : (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-[2] flex-col gap-6">{main}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-6">{beside}</div>
    </div>
  )

/**
 * A list of cards that fills the width it is given.
 *
 * The third thing a wide screen needs, after a width and a measure, and the one
 * that decides whether the width was worth taking. A stack of cards in a 768px
 * column and the same stack in a 1440px column are the same screen with longer
 * rows; the same stack as a grid is three columns and a third of the scrolling.
 *
 * It is a component rather than a line of CSS because by the time the other
 * sixteen screens were converted there were **five** copies of it, written out
 * by hand, and two of them were reaching into `page-card.tsx` for the minimum —
 * a *page* card's number, borrowed by a screen about pieces. The shape is the
 * shared thing and the number is the caller's.
 *
 * `minmax(min(100%, ...), 1fr)` rather than `minmax(..., 1fr)`: the inner `min`
 * is what stops the track being wider than the grid on a phone, which is a
 * single column of card plus a horizontal scrollbar.
 */
export const CardGrid = ({
  children,
  min,
  className = "",
}: {
  readonly children: ReactNode
  /**
   * The narrowest a card may be drawn, in pixels, which is what decides how many
   * columns a given width becomes. The caller's, because it is a fact about the
   * card rather than about the grid: a page thumbnail stops being legible at a
   * different width than a row of three short facts does.
   */
  readonly min: number
  readonly className?: string
}) => (
  <ul
    className={`grid list-none gap-3 p-0 ${className}`.trimEnd()}
    style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${min}px), 1fr))` }}
  >
    {children}
  </ul>
)
