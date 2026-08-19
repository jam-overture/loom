/**
 * Where the reader's colour choice is kept.
 *
 * It lives in its own module, imported by both the inline script in the layout
 * and the toggle, because the toggle is a client component and a plain constant
 * exported from one does not survive being imported by a server component — it
 * arrives as `undefined`, and `localStorage.getItem(undefined)` is a bug that
 * looks exactly like a toggle nobody pressed.
 */
export const THEME_STORAGE_KEY = "loom-docs-theme"
