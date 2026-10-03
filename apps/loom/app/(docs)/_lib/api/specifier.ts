/**
 * Where an import specifier is allowed to break, because a line-breaker will
 * not find those places on its own.
 *
 * **The plain version.** `@jam-overture/loom/signals/broadcast` is one word as
 * far as a browser is concerned. A browser breaks a line at a space, and there
 * is no space in an import — so on a narrow screen it either pushes the page
 * sideways or chops the word wherever the line happened to run out. Neither is
 * what a person would do. A person would break it at a slash. This splits the
 * specifier at its slashes so the page can offer those places.
 *
 * **The precise version.** A solidus is not a soft wrap opportunity in CSS, and
 * `overflow-wrap: break-word` — which `[entry]/page.tsx` has carried since
 * 22 September — is an *emergency* rule: it breaks between any two characters,
 * once nothing else fits. That is what stopped the four longest doors pushing
 * the document to 559 pixels, and it is why the heading has been readable-width
 * and unreadable ever since. A `<wbr/>` after each slash gives the breaker the
 * junctions a reader would pick, and `break-word` stays behind it as the floor
 * for a segment longer than a line.
 *
 * Measured in Chromium at 390 pixels against `next start`, 3 October, on the
 * real heading in the real font (`reports/2026-10-03-docs-where-a-specifier-breaks.md`
 * has the table for all seventeen doors):
 *
 * | | lines |
 * | --- | --- |
 * | today | `@jam-` · `overture/loom/signal` · `s/broadcast` |
 * | with these | `@jam-overture/loom/` · `signals/broadcast` |
 *
 * **Each segment keeps its own slash**, which is the one decision in this file.
 * A slash belongs to the end of the part before it, because that is the edge a
 * reader's eye uses to know the line is not finished — `@jam-overture/` is
 * plainly unfinished and `@jam-overture` is plainly a package. It also makes
 * the invariant the test holds a simple one: joining the segments in order
 * gives back the specifier, character for character, for any string at all.
 */
export const specifierSegments = (specifier: string): readonly string[] => {
  const parts = specifier.split("/")

  return parts.map((part, at) => (at === parts.length - 1 ? part : `${part}/`))
}
