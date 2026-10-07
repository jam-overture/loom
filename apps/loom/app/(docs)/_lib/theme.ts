/**
 * Where the reader's color choice is kept.
 *
 * It lives in its own module, imported by both the inline script in the layout
 * and the toggle, because the toggle is a client component and a plain constant
 * exported from one does not survive being imported by a server component — it
 * arrives as `undefined`, and `localStorage.getItem(undefined)` is a bug that
 * looks exactly like a toggle nobody pressed.
 */
export const THEME_STORAGE_KEY = "loom-docs-theme"

/**
 * The strip of browser above this site, and the two colors it is told to be.
 *
 * *The bar above your page* on the theming page is the recipe, and this is the
 * site following it. Until now it did not: the site has had a dark theme for as
 * long as it has had a toggle and has never emitted a `theme-color`, so a
 * reader on a phone with dark chosen got a white address bar over a `#0a0a0a`
 * page.
 *
 * **It is a transcription, and that is the one thing the recipe cannot be here.**
 * The page's version reads `themeGround(resolved).backgroundColor` off a
 * resolved theme, which is available to anything rendering a Loom tree. This
 * chrome is not a tree — a sidebar and a header are application furniture and
 * have no theme mounted on them (0067) — so there is nothing to resolve and
 * nothing to read a ground off. The values below are `--surface-page` from
 * `globals.css` under each of the two states, copied, exactly as every other
 * color in this site's chrome is copied and for the same reason.
 *
 * That makes this the hazard 0197 records rather than an exception to it: two
 * copies of one decision, in two files, with nothing in the framework able to
 * hold them together. So `browser-bar-chrome.test.ts` holds them together
 * instead, by reading the stylesheet and comparing — which is `house-theme.test.ts`'s
 * approach applied to two more values.
 */
export const SITE_BAR: Readonly<Record<"light" | "dark", string>> = {
  light: "#ffffff",
  dark: "#0a0a0a",
}

/**
 * The name the meta goes out under, in one place.
 *
 * Three files write this string — the layout renders the element, the inline
 * script finds it before paint, and the toggle finds it again on every press —
 * and a selector that drifted from the element's own `name` would be a bar that
 * silently stopped following the page. The inline script interpolates it rather
 * than inheriting it, because a pre-paint script has no imports.
 */
export const THEME_COLOR_NAME = "theme-color"
