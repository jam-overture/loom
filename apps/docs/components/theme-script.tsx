import { THEME_STORAGE_KEY } from "@/lib/theme"

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
 * about: nothing in the string comes from anywhere but this file.
 */
const SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var dark = stored === "dark" || (stored === null && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  } catch (error) {
    document.documentElement.dataset.theme = "light";
  }
})();
`

export const ThemeScript = () => <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
