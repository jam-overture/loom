/**
 * The stylesheet for the page that belongs to no surface, held as text.
 *
 * **A `<style>` element rather than an imported `.css` file, and it is forced
 * rather than preferred.** Every other stylesheet in this application is
 * imported by a layout, and a layout is never rendered in a test. This page has
 * no layout — that is the whole reason it exists — so the stylesheet would have
 * to be imported by the page itself, and a page that imports CSS cannot be
 * rendered under Vitest at all: the import reaches `vite:css`, which loads the
 * application's PostCSS config, and `@tailwindcss/postcss` is not a plugin
 * Vite's PostCSS runner accepts. Filed as a finding; the first renderable
 * component in this repository to meet it is this one.
 *
 * Two things follow and both are improvements rather than costs.
 *
 * **It cannot be dropped.** A page outside every layout whose stylesheet failed
 * to be emitted would render in the browser's own defaults — which is precisely
 * the defect this unit closes, arriving again by a different door, and no test
 * in either place could see it.
 *
 * **It can be asserted.** `not-found-style.test.ts` reads this text and holds
 * every `var(--loom-*)` in it against the properties the mounted theme actually
 * carries, so a reference to a property no theme supplies fails the build
 * instead of silently dropping a declaration. A real stylesheet is opaque to
 * that check, which is the shape of defect this repository keeps finding — a CSS
 * value nothing could see was wrong.
 */

export const NOT_FOUND_STYLE = `
/*
 * Everything this stylesheet is allowed to do.
 *
 * No colour, no type size, no spacing step and no radius is written here: all
 * four come from the theme \`SHELL_ROOT_CSS\` mounts on \`:root\` as \`--loom-*\`
 * custom properties, and a value written in this file would be a second source
 * of truth that no re-theme reaches (0049). The same rule the marketing site's
 * stylesheet keeps, for the same reason, on the one page that has no tree to
 * read it from.
 *
 * Line heights are the exception and are not tokens: the library has no
 * \`--loom-leading-*\`, because every primitive carries its own — \`loom.prose\`
 * sets 1.6, a heading 1.25, a control 1.2. The numbers below are those numbers,
 * so this page leads its text the way a Loom page leads it.
 */

html,
body {
  margin: 0;
  padding: 0;
}

/*
 * One centred group rather than a bar and a body.
 *
 * The first build of this page put the wordmark in a bar at the top and centred
 * the message in what was left below it, which is the shape a page with content
 * on it has. Photographed at 1280×760 and on a phone, it was most of a screen
 * of white with two small things at opposite ends of it — and this page is
 * three short lines, so there is no body for a bar to sit above.
 *
 * Stacking them as one group and centring it puts the mark directly over the
 * message, which is also the stronger version of this page's one job: a reader
 * who arrived from a mistyped address or a stale link reads the two together.
 *
 * \`100dvh\` rather than \`100vh\` so the ground reaches the bottom of the window
 * under a phone's retracting toolbar, and \`min-height\` rather than \`height\` so a
 * reader who has scaled their text up gets a taller page instead of a clipped
 * one.
 */
.not-found {
  box-sizing: border-box;
  display: grid;
  place-content: center;
  justify-items: start;
  gap: var(--loom-spacing-6);
  min-height: 100dvh;
  padding: var(--loom-spacing-5);
  font-family: var(--loom-body-family);
  font-size: var(--loom-scale-3);
  font-weight: var(--loom-body-weight);
  line-height: 1.6;
}

.not-found__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--loom-spacing-2);
  justify-self: start;
  color: var(--loom-fg-default);
  font-family: var(--loom-heading-family);
  font-size: var(--loom-scale-4);
  font-weight: var(--loom-heading-weight);
  line-height: 1.2;
  letter-spacing: -0.01em;
  text-decoration: none;
}

/*
 * \`currentColor\` is the reason the arms are drawn inline rather than served as
 * the icon file: an image is opaque to the cascade, so \`app/icon.svg\` in this
 * position would paint its own ink on whatever paper the palette supplied.
 */
.not-found__mark {
  display: block;
  width: var(--loom-scale-4);
  height: var(--loom-scale-4);
  fill: currentColor;
  flex: none;
}

/*
 * A reading measure, which is what every surface of this product holds its text
 * to. \`ch\` rather than a spacing step: a measure is a count of characters, and
 * the one step wide enough to stand in for it would stop being right the moment
 * a font pack changed.
 */
.not-found__message {
  max-width: 54ch;
}

.not-found__heading {
  margin: 0;
  color: var(--loom-fg-default);
  font-family: var(--loom-heading-family);
  font-size: var(--loom-scale-6);
  font-weight: var(--loom-heading-weight);
  line-height: 1.25;
  letter-spacing: -0.02em;
}

.not-found__prose {
  margin: var(--loom-spacing-3) 0 0;
  color: var(--loom-fg-muted);
}

/*
 * Outlined rather than filled, which is not a preference — \`minimal\` sets
 * \`bg-surface\` to the canvas white so that every card, nav and panel in the
 * library is defined by its border instead of by a change of ground. A filled
 * button here would be the one element on the page that did not belong to the
 * palette it is wearing.
 */
.not-found__way-out {
  display: inline-block;
  margin-top: var(--loom-spacing-5);
  padding: var(--loom-spacing-2) var(--loom-spacing-4);
  border: 1px solid var(--loom-border-default);
  border-radius: var(--loom-radius-sm);
  background-color: var(--loom-bg-surface);
  color: var(--loom-fg-default);
  font: inherit;
  line-height: 1.2;
  text-decoration: none;
  transition:
    border-color var(--loom-motion-fast) ease,
    color var(--loom-motion-fast) ease;
}

/*
 * The green appears as a rule and a ring and never as a fill, which is where
 * \`minimal\` puts its one accent. Hover and focus are the same treatment because
 * the keyboard reader and the pointer reader are asking the same question.
 */
.not-found__way-out:hover,
.not-found__way-out:focus-visible {
  border-color: var(--loom-border-accent);
  color: var(--loom-accent-strong);
}

.not-found__way-out:focus-visible {
  outline: 2px solid var(--loom-border-accent);
  outline-offset: 2px;
}

.not-found__brand:focus-visible {
  outline: 2px solid var(--loom-border-accent);
  outline-offset: 2px;
  border-radius: var(--loom-radius-sm);
}

@media (prefers-reduced-motion: reduce) {
  .not-found__way-out {
    transition: none;
  }
}
`
