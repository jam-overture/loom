import { editorialPalette, type PaletteSlot } from "@jam-overture/loom"
import type { ReactElement } from "react"

import { CHROME, CHROME_RADIUS } from "./chrome"
import type { DemoShareCard } from "./share"
import { SPOT_COLOURS } from "./spotlight"

/**
 * The card, drawn.
 *
 * **It is the demo's own layout at a size that survives a thumbnail**, and that
 * constraint decided everything here. An unfurled card is about 360 pixels wide
 * in a chat client, so what a stranger actually resolves is the *split* — a
 * white page on the left, a dark instrument on the right — an amber ring around
 * one band, and one sentence large enough to read. Everything else is there for
 * the person who clicks the image, and nothing is there that the page does not
 * already say.
 *
 * **The split is the claim, which is why it is the composition.** This surface's
 * one structural decision is that the stage is light and the rail is dark, so a
 * visitor can tell the page being changed from the thing changing it
 * (`globals.css`). A card that showed a logo, or a screenshot, or a headline on
 * a gradient would be a picture of a product; this is a picture of the argument.
 *
 * **Not a Loom tree, and the reason is the same one the marketing lane's card
 * gives:** the renderer resolves no cascade and no custom properties, so no
 * registered primitive can paint a pixel of a PNG. That is a framework gap
 * rather than a licence — there is one element per region here, this module is
 * private to the image route, and no page imports any of it.
 *
 * **No colour below is chosen here, and the two halves take theirs from
 * different places on purpose.** The rail's are `chrome.ts`'s, which are
 * `globals.css`'s. The stage's are the registered palette the demo tree
 * carries — `editorial`, named by `DEMO_STARTING_THEME` — because the page
 * being changed wears its own theme (0050) and always has. That division is the
 * running surface's, and copying it is what stops the card being a picture of a
 * page this deployment does not serve.
 *
 * `share-card.test.tsx` measures every ink-on-ground pair below and holds it to
 * 4.5:1. An unreadable card is a failure only a stranger would ever see.
 */

/** The page's own ink, off the theme its tree names. */
const page = (slot: PaletteSlot): string => {
  const colour = editorialPalette.slots[slot]
  if (colour === undefined) throw new Error(`loom: the editorial palette has no ${slot}`)

  return colour
}

/**
 * Every pairing the card draws, exported so the contrast test measures what is
 * on the image rather than a second list of what somebody believed was on it.
 */
export const CARD_PAIRINGS: readonly {
  readonly what: string
  readonly foreground: string
  readonly background: string
}[] = [
  { what: "the wordmark", foreground: CHROME.inkPrimary, background: CHROME.page },
  { what: "the eyebrow", foreground: CHROME.accent, background: CHROME.page },
  { what: "the page's eyebrow", foreground: page("fg-muted"), background: page("bg-canvas") },
  { what: "the page's headline", foreground: page("fg-default"), background: page("bg-canvas") },
  { what: "a figure", foreground: page("accent"), background: page("bg-canvas") },
  { what: "a figure's label", foreground: page("fg-muted"), background: page("bg-canvas") },
  { what: "the mark's chip", foreground: SPOT_COLOURS.awaiting.ink, background: SPOT_COLOURS.awaiting.fill },
  { what: "the badge", foreground: CHROME.awaitingInk, background: CHROME.awaitingGround },
  { what: "the ask", foreground: CHROME.inkSecondary, background: CHROME.page },
  { what: "the verdict", foreground: CHROME.inkPrimary, background: CHROME.page },
  { what: "the footnote", foreground: CHROME.inkMuted, background: CHROME.page },
]

const GUTTER = 44
const STAGE_WIDTH = 640
/**
 * The rail's width is stated rather than left to `flexGrow`, and that is a
 * defect rather than a preference. A flex item will not shrink below its own
 * min-content, so a rail sized by growth widened to fit the longest unbroken
 * run of the verdict and drew the end of it past the right edge of the image.
 * A picture that loses its one sentence is worse than no picture.
 */
const RAIL_WIDTH = 560
const BAR_HEIGHT = 76
const FOOT_HEIGHT = 86

/**
 * The two panes, exported so the test can add them up. It is one assertion and
 * it is the one that would have caught the overflow above before it was drawn.
 */
export const PANE_WIDTHS = { stage: STAGE_WIDTH, rail: RAIL_WIDTH } as const

/** The chip the stage draws on a marked band, at the size a card needs. */
const chip = (words: string): ReactElement => (
  <div
    style={{
      display: "flex",
      backgroundColor: SPOT_COLOURS.awaiting.fill,
      color: SPOT_COLOURS.awaiting.ink,
      borderRadius: 999,
      paddingTop: 5,
      paddingBottom: 5,
      paddingLeft: 14,
      paddingRight: 14,
      fontSize: 18,
      fontWeight: 600,
    }}
  >
    {words}
  </div>
)

/**
 * The band the leading ask takes off the page, ringed the way the stage rings
 * it while the question is open.
 *
 * Three figures and their labels, and the captions left out — a caption is a
 * third line of 13px type that is illegible at every size this image is ever
 * seen at, and leaving it out is the only edit the card makes to the page.
 */
const band = (card: DemoShareCard): ReactElement => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      marginTop: 34,
      border: `3px solid ${SPOT_COLOURS.awaiting.edge}`,
      borderRadius: CHROME_RADIUS.large,
      paddingTop: 20,
      paddingBottom: 22,
      paddingLeft: 22,
      paddingRight: 22,
    }}
  >
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
      {chip(card.markLabel)}
    </div>
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      {card.figures.map((figure) => (
        <div
          key={figure.value}
          style={{ display: "flex", flexDirection: "column", maxWidth: 160, marginRight: 12 }}
        >
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700, color: page("accent") }}>
            {figure.value}
          </div>
          <div style={{ display: "flex", marginTop: 4, fontSize: 16, color: page("fg-muted") }}>
            {figure.label}
          </div>
        </div>
      ))}
    </div>
  </div>
)

/** The left half: somebody else's page, with the part in question marked. */
const stage = (card: DemoShareCard): ReactElement => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      width: STAGE_WIDTH,
      backgroundColor: page("bg-canvas"),
      paddingLeft: GUTTER,
      paddingRight: GUTTER,
    }}
  >
    <div
      style={{
        display: "flex",
        fontSize: 17,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: page("fg-muted"),
      }}
    >
      {card.pageEyebrow}
    </div>
    <div
      style={{
        display: "flex",
        marginTop: 14,
        fontSize: 44,
        fontWeight: 700,
        lineHeight: 1.1,
        letterSpacing: "-0.02em",
        color: page("fg-default"),
      }}
    >
      {card.pageHeadline}
    </div>
    {band(card)}
  </div>
)

/** The right half: the instrument, and the one sentence worth reading at 360px. */
const rail = (card: DemoShareCard): ReactElement => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      width: RAIL_WIDTH,
      backgroundColor: CHROME.page,
      paddingLeft: GUTTER,
      paddingRight: GUTTER,
    }}
  >
    <div style={{ display: "flex" }}>
      <div
        style={{
          display: "flex",
          backgroundColor: CHROME.awaitingGround,
          color: CHROME.awaitingInk,
          borderRadius: CHROME_RADIUS.medium,
          paddingTop: 6,
          paddingBottom: 6,
          paddingLeft: 14,
          paddingRight: 14,
          fontSize: 20,
          fontWeight: 600,
        }}
      >
        {card.badge}
      </div>
    </div>

    <div
      style={{
        display: "flex",
        marginTop: 20,
        fontSize: 25,
        lineHeight: 1.35,
        color: CHROME.inkSecondary,
      }}
    >
      {`“${card.ask}”`}
    </div>

    <div
      style={{
        display: "flex",
        marginTop: 18,
        fontSize: 36,
        fontWeight: 600,
        lineHeight: 1.25,
        letterSpacing: "-0.01em",
        color: CHROME.inkPrimary,
      }}
    >
      {card.verdict}
    </div>
  </div>
)

export const shareCardImage = (card: DemoShareCard): ReactElement => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      width: "100%",
      height: "100%",
      backgroundColor: CHROME.page,
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: BAR_HEIGHT,
        paddingLeft: GUTTER,
        paddingRight: GUTTER,
        borderBottom: `1px solid ${CHROME.edge}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            width: 20,
            height: 20,
            borderRadius: 999,
            backgroundColor: CHROME.accent,
          }}
        />
        <div
          style={{
            display: "flex",
            marginLeft: 14,
            fontSize: 28,
            fontWeight: 600,
            color: CHROME.inkPrimary,
          }}
        >
          {card.wordmark}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 19,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: CHROME.accent,
        }}
      >
        {card.eyebrow}
      </div>
    </div>

    <div style={{ display: "flex", flexGrow: 1 }}>
      {stage(card)}
      {rail(card)}
    </div>

    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: FOOT_HEIGHT,
        paddingLeft: GUTTER,
        paddingRight: GUTTER,
        borderTop: `1px solid ${CHROME.edge}`,
        fontSize: 20,
        lineHeight: 1.35,
        color: CHROME.inkMuted,
      }}
    >
      {card.footnote}
    </div>
  </div>
)
