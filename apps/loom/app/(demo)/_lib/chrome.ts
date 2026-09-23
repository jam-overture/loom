/**
 * The rail's own colours, as values something other than CSS can read.
 *
 * `globals.css` is the demo's chrome and it is the only declaration of it. This
 * file adds no colour and decides nothing: it is the handful of those tokens
 * that the share card needs, in a form the image renderer can take, because
 * `ImageResponse` resolves no cascade and no custom properties — a card styled
 * `var(--surface-page)` draws black on black.
 *
 * **So the risk this file creates is drift**, and `chrome.test.ts` is the whole
 * answer to it: every value below is asserted against the declaration in
 * `globals.css` by the same reader `globals.test.ts` already uses. A run that
 * retunes the rail and forgets the card turns that test red rather than
 * shipping a picture of a surface that no longer exists.
 *
 * It is deliberately the *subset* a picture needs, and only the **chrome** half
 * of it. The other half of the card is the page on the stage, and that one
 * carries a registered theme of its own (0050) — so its colours come off the
 * palette rather than from here, which is the same division the running surface
 * makes.
 */
export const CHROME = {
  /** The rail and the bar: near-black, `--surface-page`. */
  page: "#0a0a0a",
  /** `--border-subtle`, which on a dark ground is a real line. */
  edge: "#26262a",
  inkPrimary: "#fafafa",
  inkSecondary: "#b4b4bb",
  inkMuted: "#85858f",
  /** The one hue in the chrome, and the registry's green. */
  accent: "#72e3ad",
  /** The tint an open question wears everywhere on this surface. */
  awaitingGround: "#2b2210",
  awaitingInk: "#f0c674",
} as const

/** `--radius-medium` and `--radius-large`, in pixels the renderer can use. */
export const CHROME_RADIUS = { medium: 10, large: 16 } as const
