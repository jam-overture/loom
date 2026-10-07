import type { ResolvedTheme } from "@jam-overture/loom"

import type { PartInQuestion } from "@/app/(demo)/_lib/in-question"

import { PageBand } from "./page-band"

/**
 * The part of the page the question is about, inside the question.
 *
 * `_lib/in-question.ts` decides which node and what is about to happen to it,
 * and says why a stacked layout needs this at all. What is here is the two
 * shapes a question puts around it.
 *
 * **What the band is, is not here any more and that is this run's one
 * extraction.** The registry it is resolved with, the theme and the ground it
 * wears and the fact that edit mode is off are `page-band.tsx`'s — three
 * decisions with a defect behind each, which a fourth caller in this lane now
 * needs too (`the-page-itself.tsx`). What is left here is the only thing this
 * file was ever about: the two shapes a *question* puts around a band.
 *
 * **Which of the two moments it is standing in comes with the part**, not as a
 * prop of this component. `in-question.ts` sets it from the caller that asked —
 * a hold, or a press nobody has made — and `globals.css` hangs the wide-screen
 * `display: none` and the window height off it. The reason it is not a prop is
 * measured rather than argued: with it a prop, the only place the answer could
 * be written was `page.tsx`, and a `where="question"` typed by habit on the
 * ask's callback hid the arrival screen's excerpt at the one width this surface
 * is judged at with **every test in this lane still passing**.
 *
 * ## Two shapes, and the field that chooses between them
 *
 * **An excerpt that arrives shut is a `<details>`; one that arrives open is a
 * `<section>`.** `invitation` is present on exactly the moment that is folded,
 * so the branch is a presence check rather than a second reading of `where` —
 * which is what makes it impossible to render a disclosure whose control has no
 * words on it.
 *
 * `<details>` rather than state, for the reasons `technical-detail.tsx` already
 * records and one more that belongs to this excerpt in particular: this
 * component is rendered on the **server**, through a callback `page.tsx` hands
 * the rail, so a disclosure built out of `useState` would mean the first thing
 * under the demo's one green button could not exist until a bundle arrived.
 * The browser supplies the control, the keyboard, the screen-reader semantics
 * and find-in-page for nothing.
 */
export const PartInQuestionView = ({
  part,
  theme,
}: {
  readonly part: PartInQuestion
  /**
   * The page's own resolved theme. Absent only if the tree names no theme, in
   * which case the excerpt inherits the same nothing the stage does and the
   * primitives fall back exactly as they do out there.
   */
  readonly theme?: ResolvedTheme
}) => {
  /*
   * **What the band is, is `page-band.tsx`'s** — the registry it is resolved
   * with, the theme and the ground it wears, and the fact that edit mode is
   * off. Three decisions, each of them a defect once, and they moved to one
   * file the day a fourth place in this lane needed to draw a part of this
   * page (`the-page-itself.tsx`, the arrival screen's window). The two shapes
   * below differ in what stands above the band and in whether it arrives
   * visible; what the band *is* is not one of the things they, or any later
   * caller, are allowed to disagree about.
   */
  const band = <PageBand tree={part.tree} {...(theme ? { theme } : {})} />

  /*
   * **The shut one: the sentence becomes the control.**
   *
   * There is no second copy of the words and no second sentence. `LEADS` says
   * what the excerpt is of and `INVITATIONS` says the same thing as an offer,
   * both off one operation (`in-question.ts`), and the open disclosure shows
   * the band directly under the control rather than under a restatement of it —
   * which is what the `<p>` here used to be and would now read as a stutter
   * two lines high.
   *
   * **And the markup is better than the thing it replaces.** That paragraph
   * existed because the ask panel has no heading for an `h4` to be a sibling
   * of, so this excerpt had to be the one of the three that announced no
   * subsection. A `<summary>` announces none either — it is a control, and the
   * only one on the arrival screen that is about the band rather than about
   * the press.
   */
  if (part.invitation !== undefined) {
    return (
      <details className={`demo-part demo-part--${part.where} group`}>
        <summary className="text-ink-secondary hover:text-ink flex cursor-pointer list-none items-center gap-1.5 text-xs transition-colors select-none">
          <svg
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
            className="h-3 w-3 shrink-0 transition-transform group-open:rotate-90"
          >
            <path d="M4 2.5L8 6l-4 3.5" />
          </svg>
          {part.invitation}
        </summary>

        {band}
      </details>
    )
  }

  return (
    <section className={`demo-part demo-part--${part.where}`}>
      {/*
        * **In a card, a heading**, and the same size as the card's other
        * heading, so the two readings of the change — what it would do, and what
        * it would do it to — read as siblings rather than as a section and its
        * caption. Both cards: the question's, and the landed one holding what it
        * took off.
        *
        * It is unconditional now, and the condition that used to be here is the
        * reason the branch above exists. There were three moments and one of
        * them — the ask's, on a rail whose only heading is the `h1` three
        * inches up — had to print a paragraph instead, because an `h4` there
        * announces a level four subsection of nothing to every visitor
        * navigating by headings. That moment is a `<summary>` now, so the two
        * left are the two that are in a card, and both of them have a sibling
        * to be level with.
        */}
      <h4 className="text-ink-secondary text-xs">{part.lead}</h4>

      {band}
    </section>
  )
}
