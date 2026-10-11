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
 * ## The silence, and the premise under it that stopped being true
 *
 * **The window went quiet at the first press, and the reason it gave was a
 * fact about which press that was.** Written on 6 October:
 *
 * > **The visitor has asked for something.** From the first press onwards every
 * > screen on this surface already brings the page to them: the question
 * > renders the band it is about inside itself, answering carries them to the
 * > mark on the page with `BackToTheRecord` pinned underneath, and a removal's
 * > content is in the landed card.
 *
 * Every clause of that was true of the surface it was written on, where the
 * press a visitor was invited to make first raised a **question** about the
 * stat grid. `demo-43` made the first press the **re-theme** — the one change
 * on this surface whose subject is the page itself — and all three clauses are
 * false of it at once: it is applied rather than held, so no band is rendered
 * inside a question; it configures the root, so `spotFor` refuses to mark it
 * and there is no mark to be carried to; and it removes nothing, so no card is
 * holding any content.
 *
 * Measured on a production build of `main` at `39c6ef3`, 390 × 844, by pressing
 * the green button the arrival screen offers:
 *
 * | | before the press | after it |
 * | --- | --- | --- |
 * | this window | `y 325`, 350 × 262 | **gone** |
 * | the clinic's own `h1`, on the stage | `y 1,515` | `y 1,998` |
 * | the record the press produced | — | `y 981` — 649 past the fold |
 *
 * So the press that turns every colour and typeface on the page over left a
 * phone with **nothing on screen that is the page**, having just taken away the
 * one thing that was. A stranger pressed the button, watched the window it sat
 * under disappear, and read a new label on the same button.
 *
 * ## So the condition is about the screen rather than about the records
 *
 * The window is drawn when **nothing else on this rail is bringing the page to
 * the visitor**, which is what the paragraph above was always claiming and what
 * `asked` was a proxy for. Two things count, and both are things a card is
 * already doing rather than predictions about what it might:
 *
 * - **a band rendered inside a card** — the part a question is about, or the
 *   content a removal is holding (`in-question.ts`, `kept.ts`);
 * - **a mark on the page** — any spotlight actually drawn, which is what
 *   `SpotlightScroll` carries a phone down to.
 *
 * The leading ask's preview is deliberately not one of them: it arrives shut
 * (`part-in-question.tsx`), and a window a visitor has not opened is not a page
 * in front of them.
 *
 * **Every screen that had one of those keeps exactly what it had.** The arrival
 * screen has neither and is unchanged; a question marks the page and renders
 * its band; an answered removal is holding content and the gap it left is
 * ringed; a repaint rings the band it repainted. The one state that changes is
 * the state nothing was speaking for — a change whose subject is the whole page
 * — and there the window stays where it was and turns over with it.
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
 * And what it says once a change the visitor pressed for is on the page.
 *
 * One word longer, because the window is doing a second job by then: on
 * arrival it is the referent for *It's the page below*, and after a press it is
 * also the evidence that the press did something. The word carries the
 * comparison without describing it — a stranger reads *now* against the band
 * they were looking at a second ago, which is the whole of what changed.
 *
 * **It does not say what happened.** That is the record card's sentence, forty
 * pixels down and in Loom's own voice, and a caption competing with it would be
 * the third place one change is narrated. This one keeps the window's own job:
 * saying that what is in it is a part of the page, and that it is the part as
 * it stands.
 */
export const THE_TOP_OF_IT_NOW = "This is the top of it, now."

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
 * The window, or nothing — and the one reason it is ever nothing that a visitor
 * can cause is that something else on the rail is already showing them the
 * page.
 *
 * Handed the rail's two answers rather than reading the records itself, for the
 * reason the first version of this gave about `asked`: the silence and the
 * screen cannot come apart if the screen is what decides it. Booleans rather
 * than the readings and the spotlights, because *is the page in front of them*
 * and *has a change of theirs landed* are the whole of what this needs, and a
 * list would invite a second opinion here about which of them counts.
 */
export const thePageItself = ({
  tree,
  shownElsewhere,
  landed,
}: {
  readonly tree: LoomTree
  /**
   * Whether anything else on this rail is rendering the page: a band inside a
   * card, or a mark drawn on the stage. `rail.ts` reads both off the values it
   * has already built, so neither can be claimed here over a screen that does
   * not have it.
   */
  readonly shownElsewhere: boolean
  /**
   * Whether a change the visitor pressed for is on the page — `rail.ts`'s
   * `landing`, which is the same boolean the nomination turns on. It decides
   * the caption and nothing else: a question declined leaves the page where it
   * was, and a window captioned *now* over an unmoved page would claim a change
   * nobody made.
   */
  readonly landed: boolean
}): PageItself | undefined => {
  if (shownElsewhere) return undefined

  const band = topBand(tree.root)
  if (band === undefined) return undefined

  return { tree: { ...tree, root: band }, caption: landed ? THE_TOP_OF_IT_NOW : THE_TOP_OF_IT }
}
