import { spotlightCss, type Spotlight } from "@/app/(demo)/_lib/spotlight"

import { SpotlightScroll } from "./spotlight-scroll"

/**
 * The change, marked on the page it happened to.
 *
 * The demo's two halves used to speak only one way. A visitor pressed a button
 * in the rail, the record card explained what became of the ask in the runtime's
 * own words, and the *page* — the thing that had actually changed — said
 * nothing. For the two presets that act near the bottom, and the two the Gate
 * holds, a stranger's whole experience of the most interesting moment on this
 * surface was a paragraph about a part of the screen they could not see.
 *
 * So the card and the node are now the same colour, and the eye can go from one
 * to the other. Green means it landed; amber means Loom is waiting for an answer
 * about *this*.
 *
 * Rules rather than script, and rules emitted here in the body rather than
 * hoisted: the primitives' own stylesheet is hoisted into the head with a
 * precedence (`stylesheet.ts`), so a body rule of equal specificity wins the tie
 * on source order — which is what lets the mark override a primitive's own
 * `::after` on the rare node that has one, instead of losing to it silently.
 */
export const ChangeSpotlight = ({
  spots,
  token,
}: {
  readonly spots: readonly Spotlight[]
  /** The revision and the record the marks belong to, so a re-ask scrolls again. */
  readonly token: string
}) => {
  const first = spots[0]

  if (first === undefined) return null

  return (
    <>
      <style>{spotlightCss(spots)}</style>
      {/*
        * A change that has landed is worth carrying a stacked layout to; one
        * that is waiting on an answer is not, because the answer is a button in
        * the rail the visitor would be scrolled away from.
        */}
      <SpotlightScroll nodeId={first.nodeId} token={token} whenStacked={first.tone === "applied"} />
    </>
  )
}
