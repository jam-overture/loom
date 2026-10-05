import type { WhatElse } from "@/app/(demo)/_lib/what-else"

/**
 * The end of the sixty seconds: what the visitor just proved, and the way back
 * to the controls that are now above the viewport.
 *
 * **When this draws at all is `what-else.ts`'s**, and the measurement of the
 * screen it is for is there with it. What this file owes it is 92 pixels: the
 * record card lands at the top of the rail (`arrival.ts`) and is 765 of an
 * 857px scroller after the one sequence the demo invites, so everything that
 * follows the card has that much room and no more. Two lines and a link fit;
 * a second ask list does not, and a second primary control is the defect
 * `ask-panel.tsx` opens by arguing against.
 *
 * **A link rather than a button**, for the reason the caution's *Answer it
 * first* is one: it goes somewhere rather than doing something. `#ask` is the
 * panel's own element, so this lands on the green button and the rows rather
 * than on a heading above them, and it is the same gesture a visitor has
 * already seen once on this rail.
 *
 * **The arrow points up and the one on the way out points right.** The rail
 * now has two forward moves at the end of a demonstration — ask for another
 * change, or go and get this — and they are different kinds of move. The
 * footer's *Want this on a page of your own? Read the docs →* is untouched and
 * is not repeated here: saying it twice on one screen is how a footer stops
 * being read at all, which is this lane's own rule from `rail-header.tsx`.
 *
 * **It is a `<section>` with a heading nothing draws.** The sentence is a
 * claim about the card above it rather than a new topic, so a visible heading
 * would announce a fourth region on a rail that already has three; an
 * `aria-label` gives a screen reader the landmark a sighted visitor gets from
 * its position under the card.
 *
 * **And no rule above it, which is the other half of the same claim and is
 * also 17 pixels.** Every other block at the foot of this rail opens with
 * `border-t pt-4`, because each of them is a new topic: the steps are the
 * frame the cards are read through, the footer is what becomes of the page.
 * This is a caption, and a rule over a caption says the opposite. Measured on
 * a production build at 1280 × 900: with the rule and its padding the row is
 * 73px and the card leaves 68, so the link came back **6px clipped** — the
 * surface's own ending cut off at the bottom edge. Without them it is 56 in
 * 68, separated by the rail's own `gap-6` like every other sibling, and the
 * clearance is 12.
 */
export const WhatElseToAsk = ({ end }: { readonly end: WhatElse }) => (
  <section aria-label="What you just saw" className="flex flex-col gap-2">
    <p className="text-ink-secondary text-xs">{end.sentence}</p>

    <a
      href="#ask"
      className="text-ink-secondary hover:text-ink group inline-flex items-center gap-1.5 self-start text-xs transition-colors"
    >
      {end.label}
      <span aria-hidden="true" className="transition-transform group-hover:-translate-y-0.5">
        ↑
      </span>
    </a>
  </section>
)
