/**
 * The three screens a person checks their page on, and what each one is.
 *
 * ## Why these three and not a list of devices
 *
 * A device list is a product decision disguised as a dropdown: it is never
 * finished, every entry dates, and nobody opening this screen wants to choose
 * between an iPhone 14 and an iPhone 15. What a person actually asks is *does
 * this hold up on a phone* — three widths answer that, and a fourth would be a
 * fourth thing to read before pressing anything.
 *
 * The widths are the CSS widths those screens report, not their hardware pixel
 * counts. A phone with a 1170-pixel panel lays out at 390, and a preview built
 * on the hardware number would be a picture of a page nobody is served.
 *
 * ## Why a width is not enough, and the pane uses a whole document
 *
 * This is the one fact that decides the shape of the whole feature, so it is
 * written where the widths are.
 *
 * Most of the primitive library responds with `@container`, which a fixed-width
 * box would emulate exactly. **Three rules are still viewport `@media`**, and
 * one of them is `loom.nav` folding its destinations behind a button below
 * 48rem. A `<div>` 390 pixels wide does not change the viewport, so a pane built
 * that way would show a phone-width page wearing a desktop navigation bar — the
 * right shape, drawn on a screen, about nothing.
 *
 * So the pane is an iframe over `…/surface`, which is a document of its own with
 * a viewport of its own. Every rule the library has resolves against the width
 * the reader picked, including the three that a cheaper pane would get wrong.
 * When the library's last `@media` becomes a `@container`, the iframe stops
 * being load-bearing and could go — that is a finding, not a plan.
 */

export type ViewportName = "desktop" | "tablet" | "phone"

export type Viewport = {
  readonly name: ViewportName
  /** What a person calls it. Never a device model, never a breakpoint. */
  readonly label: string
  /** The CSS width that screen reports, which is what the page lays out at. */
  readonly width: number
  /**
   * The CSS height, used for the frame's shape rather than to clip anything.
   *
   * A page is as long as it is; the pane scrolls. What this buys is that an
   * empty page still looks like the screen it is being checked on, and that the
   * fold — the line below which a reader has to scroll — is drawn where it
   * really falls.
   */
  readonly height: number
  /** One line saying what picking it tells you. */
  readonly meaning: string
}

export const VIEWPORTS: readonly Viewport[] = [
  {
    name: "desktop",
    label: "Desktop",
    width: 1280,
    height: 800,
    meaning: "A laptop or a desktop screen — the widest your page is usually read on.",
  },
  {
    name: "tablet",
    label: "Tablet",
    width: 834,
    height: 1112,
    meaning: "An iPad held upright, which is where a two-column layout usually has to give.",
  },
  {
    name: "phone",
    label: "Phone",
    width: 390,
    height: 844,
    meaning: "An iPhone held upright. Most people read most pages here.",
  },
]

/**
 * Desktop, because a page is written on one.
 *
 * Not phone-first, and the reason is about this screen rather than about the
 * web: a reviewer opens a page to judge a change somebody proposed to it, and
 * the change was almost certainly described in desktop terms. Opening on a phone
 * would make every reviewer's first action be to switch back.
 */
export const DEFAULT_VIEWPORT: ViewportName = "desktop"

const BY_NAME = new Map(VIEWPORTS.map((viewport) => [viewport.name, viewport]))

/**
 * The viewport a request asked for, or the default.
 *
 * An unknown value is the default rather than a refusal. A mistyped query
 * parameter is not worth a 404 on a screen whose job is to show somebody their
 * own page, and there is nothing here a wrong value could damage — the pane is
 * a read.
 */
export const viewportFrom = (asked: string | undefined): Viewport =>
  BY_NAME.get((asked ?? "") as ViewportName) ?? BY_NAME.get(DEFAULT_VIEWPORT)!

/**
 * The address that shows this page at that size.
 *
 * A link rather than a control, which is this lane's standing choice and is
 * worth restating because it buys three things here: the pane works with
 * scripting off, the back button undoes a size, and **a reviewer can send
 * somebody the phone view of a page they are arguing about.** The last one is
 * the one that matters — *"look at it on a phone"* is a sentence that should
 * carry a link.
 *
 * The default is dropped from the address, so a link only ever names what
 * differs from what you would get by opening the page yourself.
 */
export const viewportAddress = (treeId: string, name: ViewportName): string => {
  const base = `/portal/pages/${encodeURIComponent(treeId)}`

  return name === DEFAULT_VIEWPORT ? base : `${base}?as=${name}`
}

/** Where the pane's document lives, for one page at one size. */
export const surfaceAddress = (treeId: string, name: ViewportName): string =>
  `/portal/pages/${encodeURIComponent(treeId)}/surface?as=${name}`
