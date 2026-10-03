/**
 * What *on screen* means, as the two numbers that decide it.
 *
 * `viewed` and `dwelled` are the two kinds a browser produces by watching, and
 * what they are watching for is one rule: enough of an element is showing that a
 * reader could be reading it. The rule is applied in `broadcast.ts`, where the
 * intersection observer is; the numbers are here because they are the whole of
 * what those two kinds **mean**, and a page that explains either of them should
 * be able to say so without typing a number beside the noun it counts.
 *
 * They are published for that reason and no other. Nothing configures them: a
 * deployment that could set its own would have counters whose meaning differed
 * from every other deployment's while the column names stayed the same, and
 * changing them at all changes what every counter already stored meant when it
 * was written. They are a documented promise rather than a threshold to tune.
 *
 * **Deliberately not in the broadcaster's own module.** A name that a browser
 * entry point exports survives minification, and two exported names cost every
 * reader of every page about 77 bytes to serve a sentence on a documentation
 * site. Imported into `broadcast.ts` and re-exported from `@jam-overture/loom/signals`
 * instead, the browser pays for the two numbers and not for what they are
 * called (rule 4 of `docs/signals.md`).
 */

/** At least this much of the element is visible. */
export const READABLE_VISIBLE_FRACTION = 0.5

/**
 * Or the element fills at least this much of the window.
 *
 * Not optional and not a softening: the visible fraction of an element taller
 * than the window can never reach {@link READABLE_VISIBLE_FRACTION}, so a long
 * section judged by that clause alone would never be viewed at all.
 */
export const READABLE_VIEWPORT_FRACTION = 0.3
