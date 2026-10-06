/**
 * The mark, as geometry the shell draws inline.
 *
 * A pinwheel interlock: four bars woven into a ring, in a 32×32 field. The gaps
 * between the arms are what carries the shape, so losing one leaves three bars
 * that still render and no longer interlock.
 *
 * **Third copy of one shape, and every copy is held to the same file.**
 * `app/icon.svg` is the browser-tab mark and is the shell's own file;
 * `(marketing)/_lib/chrome.ts` holds the same arms as SVG path data for
 * `loom.brand`. The two are deliberately not one artefact — a favicon answers
 * to `prefers-color-scheme` and a bar mark answers to the Loom palette, and an
 * image is opaque to the cascade either way — and `mark.test.ts` next door to
 * each derives its copy from `icon.svg`'s own rectangles and fails if they
 * disagree. This file is guarded the same way, against the same file, so no
 * copy is ever held against another copy.
 *
 * Rectangles rather than path data, because that is what the file holds and a
 * guard that has to parse two notations to compare them is a guard with a bug
 * in it waiting.
 */

export type MarkArm = {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** The field the arms are placed in, as the `viewBox` both copies declare. */
export const MARK_VIEW_BOX = "0 0 32 32"

export const MARK_ARMS: readonly MarkArm[] = [
  { x: 5, y: 5, width: 14, height: 6 },
  { x: 21, y: 5, width: 6, height: 14 },
  { x: 13, y: 21, width: 14, height: 6 },
  { x: 5, y: 13, width: 6, height: 14 },
]
