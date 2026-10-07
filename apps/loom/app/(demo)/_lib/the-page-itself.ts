import { type ElementNode, type LoomNode, type LoomTree } from "@jam-overture/loom"

/**
 * The page, on the first screen — **because on a phone there was no page on
 * it.**
 *
 * ## The screen this exists for
 *
 * Measured on a production build of `main` at `41c65e9`, 390 × 844, with
 * `pnpm shoot`'s `measure`, on the screen a stranger who follows a shared link
 * arrives at:
 *
 * | | |
 * | --- | --- |
 * | the rail | `y 82`, **390 × 1,013** |
 * | the heading, *Ask that page for a change.* | `y 130` |
 * | the referent under it, *It's the page below.* | `y 246` |
 * | the green button | `y 325` |
 * | the four other asks | `597`, `664`, `731`, `814` |
 * | the fold | **844** |
 * | **the page** | **`y 1,094`** — 250px past it |
 *
 * So a visitor on a phone meets a full screen of instrument, is told *ask that
 * page for a change* and *it's the page below*, and neither sentence is
 * pointing at anything on the screen. `rail-header.tsx` already knew that was
 * the risk — its comment says *"that page" is only pointing at something when
 * the page is beside you* — and drew the referent **only** on narrow screens,
 * which is the width where it is least true.
 *
 * **No run did this and nothing here is a regression.** The rail is 1,013px
 * because every one of the five runs that fought for the phone fold won: the
 * press is above it, `ask-panel.tsx` reverses its own reading order below `lg`
 * to keep it there, the explainer is folded, and the four asks carry their
 * verdicts. All of it is right, and the sum of it is a screen with no page on
 * it. The brief's own list of what makes a demo clunky has *nothing to react to
 * on arrival* on it, and this was the largest instance left.
 *
 * ## Why a window rather than the three shapes that were refused
 *
 * The finding of 5 October named three and recommended this one:
 *
 * 1. **Put the page's top band in the rail**, above the asks, as a shallow
 *    non-interactive window. The only shape that *adds* rather than moves.
 * 2. **Interleave** header, lead ask, the page, then the other asks — which
 *    splits the panel `ask-panel.tsx` is one component to keep whole.
 * 3. **Take 251px out of the phone rail.** There is nothing left in it that a
 *    previous run did not already measure and keep.
 *
 * The objection recorded against (1) was that it is a second rendering of the
 * tree. It is, and **this surface has three of those already**: the band a
 * question is about, the band an ask would touch, and the band a landed change
 * took off the page are all rendered a second time, in the rail, through the
 * same registry (`part-in-question.tsx`). Its own words for why that is sound
 * are the argument for this one:
 *
 * > a page kept as a tree can be shown twice, in two places, at two sizes,
 * > with no copy of it existing.
 *
 * There is no fourth copy of the clinic's page in this repository after this
 * unit, exactly as there was no second one before it. What the window shows is
 * the tree, resolved by the registry the stage resolved it with, wearing the
 * theme the page render produced — so the first thing a stranger sees is the
 * real page, and re-theming it changes this too.
 *
 * ## One silence, and it is the whole of the condition
 *
 * **The visitor has asked for something.** From the first press onwards every
 * screen on this surface already brings the page to them: the question renders
 * the band it is about inside itself, answering carries them to the mark on the
 * page with `BackToTheRecord` pinned underneath, and a removal's content is in
 * the landed card. The arrival screen is the one screen with no page on it, and
 * it is the one screen this draws on.
 *
 * Said in terms of the records rather than of a flag, because a record is what
 * an ask produces (`session.ts`) — so *nothing has been asked* and *there are
 * no records* are one fact and not two that could disagree. What it buys is the
 * property this lane checks on every run: **every screen after the first is
 * byte-identical**, so none of the pixel work above is touched.
 */

export type PageItself = {
  /**
   * The band at the top of the page, as a tree that can be handed straight to
   * `renderLoomTree`.
   *
   * The same value shape `PartInQuestion.tree` carries and for the same
   * reason: this page, at this revision, from this node down. Nothing here
   * mints an id, stores anything or proposes against it.
   */
  readonly tree: LoomTree
  /**
   * The one line under the window, and it is there because the window is a
   * part of a page and could be read as the whole of one.
   *
   * The fade at the window's foot says *this continues* in pixels
   * (`globals.css`); this says it in words. A stranger who takes the window
   * for the page has been shown a runtime that changes a thumbnail, which is
   * a smaller claim than the true one and the demo's whole difficulty is
   * being believed.
   *
   * No instruction in it. *Scroll down to see the rest* would be this lane
   * telling a visitor to go hunting on a 4,724px document, which
   * `rail-header.tsx` deleted two lines for on 26 September — and they do not
   * need to go: the press carries them.
   */
  readonly caption: string
}

/**
 * What the line says.
 *
 * Four words, in the rail's voice, directly under the band and directly above
 * the button. It completes the referent the header already draws on this width
 * — *It's the page below.* — rather than restating it: that sentence names the
 * thing, this one says that what is in the window is a part of it.
 */
export const THE_TOP_OF_IT = "This is the top of it."

/**
 * The band at the top of the page.
 *
 * **The root's own first element child, and no walk below that.** The page's
 * bands are the root's children (`page-tree.ts`) — the hero, the logos, the
 * features — so the top of the page is the first of them, and a search that
 * descended would find the hero's heading rather than the hero.
 *
 * A slot is skipped rather than descended into, for the reason `in-question.ts`
 * gives about refusing one: a slot is a named position rather than a thing on
 * the page, and its children are a fallback a parent primitive may never
 * render. A text node is skipped for the other half of that reason — a bare
 * string renders with no ground under it and no edges a visitor can see.
 */
const topBand = (root: LoomNode): ElementNode | undefined => {
  if (root.kind === "text") return undefined

  return root.children.find((child): child is ElementNode => child.kind === "element")
}

/**
 * The window, or nothing — and `asked` is the only reason it is ever nothing
 * that a visitor can cause.
 *
 * Handed the rail's own count rather than reading the records itself, so the
 * silence and the records cannot come apart; and taken as a boolean rather
 * than as the list, because *whether anything has been asked for* is the whole
 * of what this needs and a list would invite a second opinion about which asks
 * count.
 */
export const thePageItself = ({
  tree,
  asked,
}: {
  readonly tree: LoomTree
  readonly asked: boolean
}): PageItself | undefined => {
  if (asked) return undefined

  const band = topBand(tree.root)
  if (band === undefined) return undefined

  return { tree: { ...tree, root: band }, caption: THE_TOP_OF_IT }
}
