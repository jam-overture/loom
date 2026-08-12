import { createElement, type ReactElement } from "react"

/**
 * The one stylesheet this library emits, and the reason there is one at all.
 *
 * Every other value a primitive uses is an inline style, which is what keeps a
 * render a pure function of the tree with nothing to attach and nothing to load.
 * Three things cannot be said inline, and all three are the difference between a
 * primitive that looks like a UI kit and one that looks like a product:
 *
 * - **keyframes** — an entrance, a drift, a marquee
 * - **state selectors** — `:hover`, `:focus-visible`, `details[open]`
 * - **`prefers-reduced-motion`** — the one media query that is not a layout
 *   decision, and honouring it is not optional
 *
 * So a primitive that needs any of them emits this element beside its own root.
 * It is static text: no prop reaches it, nothing is interpolated into it, and it
 * is byte-identical under every theme because every value in it is a `var()`.
 * That matters more than it looks — it is what keeps 0049's re-theme guarantee
 * true for animated primitives, and it is why an AI proposal cannot reach the
 * animation. The tree configures content, variant and theme; motion is part of
 * the implementation the registry vouches for, which is the bargain in 0007
 * working exactly as intended.
 *
 * React 19 dedupes and hoists a `<style>` carrying `href` and `precedence`, so
 * twenty animated primitives on one page emit one stylesheet in the document
 * head. A renderer that does not hoist emits identical copies, which are inert.
 */

export const STYLESHEET_HREF = "loom-primitives"
export const STYLESHEET_PRECEDENCE = "loom"

/** Class names the library's primitives apply. Exported so a test can name them. */
export const LIBRARY_CLASS = {
  /** Fades and lifts into place once, on entry. Stagger with `animationDelay`. */
  rise: "loom-rise",
  /** Raises a card on hover, and marks it as a surface that responds. */
  lift: "loom-lift",
  /** Wipes an underline in from the left on hover — a link that is a whole tile. */
  underline: "loom-underline",
  /** Two slow-drifting colour fields, for a hero backdrop that is not a flat wash. */
  aurora: "loom-aurora",
  /** The disclosure marker of a `details`, rotated when its section is open. */
  marker: "loom-marker",
  /** A logo held back to grey until it is pointed at. */
  mark: "loom-mark",
} as const

/**
 * Reduced motion removes movement, never feedback: a `.loom-rise` element ends
 * at `opacity: 1` rather than never arriving, and hover still recolours. An
 * entrance animation that is simply switched off is how a page renders blank
 * for anyone who asked their system to calm it down.
 */
const CSS = `
@keyframes loom-rise {
  from { opacity: 0; transform: translate3d(0, 0.9rem, 0); }
  to { opacity: 1; transform: none; }
}
@keyframes loom-aurora {
  0% { transform: translate3d(-6%, -4%, 0) scale(1); }
  50% { transform: translate3d(6%, 4%, 0) scale(1.25); }
  100% { transform: translate3d(-6%, -4%, 0) scale(1); }
}
.loom-rise {
  animation: loom-rise calc(var(--loom-motion-slow) * 1.6) cubic-bezier(0.22, 1, 0.36, 1) both;
}
.loom-lift {
  transition: transform var(--loom-motion-medium) ease, box-shadow var(--loom-motion-medium) ease, border-color var(--loom-motion-medium) ease;
}
.loom-lift:hover {
  transform: translate3d(0, -4px, 0);
  box-shadow: 0 24px 48px -34px var(--loom-fg-default);
  border-color: var(--loom-border-accent);
}
.loom-underline {
  background-image: linear-gradient(var(--loom-accent), var(--loom-accent));
  background-repeat: no-repeat;
  background-position: 0 100%;
  background-size: 0% 2px;
  transition: background-size var(--loom-motion-medium) cubic-bezier(0.22, 1, 0.36, 1);
}
.loom-underline:hover, .loom-underline:focus-visible {
  background-size: 100% 2px;
}
.loom-aurora {
  animation: loom-aurora calc(var(--loom-motion-slow) * 40) ease-in-out infinite;
}
.loom-marker {
  transition: transform var(--loom-motion-medium) cubic-bezier(0.22, 1, 0.36, 1);
}
details[open] > summary .loom-marker {
  transform: rotate(45deg);
}
.loom-mark {
  filter: grayscale(1);
  opacity: 0.72;
  transition: filter var(--loom-motion-medium) ease, opacity var(--loom-motion-medium) ease;
}
.loom-mark:hover, a:hover > .loom-mark, a:focus-visible > .loom-mark {
  filter: none;
  opacity: 1;
}
@media (prefers-reduced-motion: reduce) {
  .loom-rise, .loom-aurora {
    animation: none;
    opacity: 1;
    transform: none;
  }
  .loom-lift, .loom-underline, .loom-marker, .loom-mark {
    transition: none;
  }
  .loom-lift:hover {
    transform: none;
  }
}
`.trim()

/**
 * Emitted beside a primitive's own root element rather than around it, for the
 * reason `editable.ts` gives for never wrapping: a wrapper changes what `>`,
 * `:first-child` and `:nth-child` select. A hoisted `<style>` is removed from
 * the flow entirely, and an un-hoisted one is a metadata element siblings do
 * not count.
 */
export const libraryStylesheet = (): ReactElement =>
  createElement("style", {
    href: STYLESHEET_HREF,
    precedence: STYLESHEET_PRECEDENCE,
    children: CSS,
  })
