import { SITE_BAR, THEME_COLOR_NAME, THEME_STORAGE_KEY } from "@/app/(docs)/_lib/theme"

/** The selector built here rather than inside the script, which has no imports. */
const META_SELECTOR = `meta[name="${THEME_COLOR_NAME}"]`

/**
 * The one script that has to run before paint.
 *
 * A reader who chose dark and is served a light page for two frames has been
 * shown the wrong answer by the site that stored their preference, and no
 * amount of correcting it afterwards is as good as not doing it. React cannot
 * help here: the choice lives in `localStorage`, which the server cannot read,
 * so the attribute has to be set by the document itself.
 *
 * It is inline, synchronous, and deliberately tiny. `dangerouslySetInnerHTML`
 * is the only way to emit it and is safe here for the reason the name warns
 * about: nothing in the string comes from anywhere but this file, and the four
 * values interpolated into it are `JSON.stringify`'d constants out of
 * `_lib/theme.ts` rather than anything a reader or a request can reach.
 *
 * **It now sets the browser's bar as well as the page**, for the same reason it
 * sets the page: `<meta name="theme-color">` is read when the document is
 * parsed, so a bar corrected in an effect is a bar the reader watches change.
 * The layout renders the element with the light color already on it, so this
 * only ever has to overwrite it — which is also what makes the no-JavaScript
 * case right rather than blank, since light is what the markup is.
 *
 * The meta is set inside the same `try` and after the attribute, which is the
 * order that matters: if `localStorage` throws, both land on light together. A
 * bar that followed a preference the page did not get is worse than no bar.
 */
const SCRIPT = `
(function () {
  function bar(value) {
    var meta = document.querySelector(${JSON.stringify(META_SELECTOR)});
    if (meta) meta.setAttribute("content", value);
  }
  try {
    var stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var dark = stored === "dark" || (stored === null && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    bar(dark ? ${JSON.stringify(SITE_BAR.dark)} : ${JSON.stringify(SITE_BAR.light)});
  } catch (error) {
    document.documentElement.dataset.theme = "light";
    bar(${JSON.stringify(SITE_BAR.light)});
  }
})();
`

export const ThemeScript = () => <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
