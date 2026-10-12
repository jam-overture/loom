/**
 * What a report's visual may weigh, and what makes a file in `reports/` weight
 * rather than evidence.
 *
 * Sixteen visual defects in this repository were found by looking at a screen
 * rather than at an assertion ([0116](../../decisions/0116-a-screenshot-is-taken-by-the-repository-and-playwright-is-never-a-dependency.md)),
 * so the picture is not negotiable. What it is stored as turns out to be, and
 * nothing had ever said: `docs/routines.md` asked for "a visual alongside" and
 * left the format, the resolution and the size to whoever was holding the
 * camera. The answer every lane reached independently was the harness default —
 * a full-page PNG at `deviceScaleFactor: 2` — and 1662 of them came to 669MB,
 * which is 95% of everything this repository tracks.
 *
 * The rule below is the measurement, not a preference. On a sample across four
 * eras, the same screenshots re-encoded as WebP at the resolution the page was
 * actually laid out at came back about five times smaller, and the saving is the
 * format rather than the scale: the same pictures as PNG at the same reduced
 * scale only came back 1.4 times smaller.
 */

/** The format a raster visual is stored in. Vector stays vector. */
export const STORED_EXTENSION = ".webp"

/** Formats a visual may be committed as. `.svg` is a diagram, and already cheap. */
export const STORED_EXTENSIONS: readonly string[] = [STORED_EXTENSION, ".svg"]

/**
 * WebP cannot encode a side longer than this, which full-page shots of a long
 * page genuinely exceed — `2026-09-06-marketing-four-units-record.png` is 30484
 * pixels tall. Storing at laid-out resolution brings most of them under it on
 * its own; `storedSize` takes the rest down the remaining way rather than
 * handing the encoder something it will refuse.
 */
export const LONGEST_WEBP_SIDE = 16383

/**
 * The ceiling one visual may weigh.
 *
 * Set from what honest output actually costs once stored at laid-out
 * resolution, with room above the longest page this repository has ever
 * photographed, so that tripping it means something has gone wrong rather than
 * that a page was long. It is a backstop: the harness writing WebP is what
 * keeps the weight down, and this is what notices when something bypasses it.
 */
export const MOST_ONE_VISUAL_WEIGHS = 1_200_000

/** A file in `reports/` that is a picture. */
export type Visual = {
  readonly file: string
  readonly bytes: number
}

/** Everything the rule needs to know about the repository, as a value. */
export type Survey = {
  readonly visuals: readonly Visual[]
  /** Every image filename mentioned by any tracked file that is not itself an image. */
  readonly mentioned: ReadonlySet<string>
}

export type Fault =
  | { readonly code: "over-budget"; readonly file: string; readonly bytes: number }
  | { readonly code: "unstored-format"; readonly file: string }

const extensionOf = (file: string): string => {
  const dot = file.lastIndexOf(".")
  return dot === -1 ? "" : file.slice(dot).toLowerCase()
}

/** The name a reference would use, which is the filename rather than the path. */
export const nameOf = (file: string): string => file.slice(file.lastIndexOf("/") + 1)

/**
 * The rule, as a function of the survey and nothing else.
 *
 * Ordered by file so that a run's output is comparable with the last one's, and
 * both faults are reported for the same file rather than the first hiding the
 * second.
 *
 * What is deliberately *not* a fault here is a visual nothing cites, and the
 * reason is worth the paragraph because the first draft of this check had it
 * the other way round and would have deleted 139MB of evidence.
 *
 * 387 visuals in this repository are cited by no file. Of those, 273 are named
 * after a report that exists — `2026-07-31-day-20-telemetry-journal.svg` beside
 * `2026-07-31-day-20-telemetry-journal.md` — and are that report's own diagram,
 * which the report simply never wrote the image line for. The remaining 114
 * each share a date with between seven and sixteen reports, any of which could
 * be theirs. And the duplicates are worse than that: 81 visuals are
 * byte-identical to another, which looks like waste until you read their names.
 * They are `-before` and `-embed-unchanged` shots, and *that they are identical
 * is the argument the report is making* — `docs/routines.md` says so in as many
 * words. Git stores one copy of them regardless.
 *
 * So a citation is not something this check can infer, and the weight was never
 * in the count. 1776 visuals at the size the page was laid out at come to about
 * a tenth of what they came to at twice the resolution in PNG, which is the
 * whole problem, and it is mechanical. An uncited visual is reported as a
 * number by `reports:check` and left on disk.
 */
export const faultsIn = (survey: Survey): readonly Fault[] =>
  [...survey.visuals]
    .sort((left, right) => left.file.localeCompare(right.file))
    .flatMap((visual): readonly Fault[] => [
      ...(STORED_EXTENSIONS.includes(extensionOf(visual.file))
        ? []
        : [{ code: "unstored-format" as const, file: visual.file }]),
      ...(visual.bytes > MOST_ONE_VISUAL_WEIGHS
        ? [{ code: "over-budget" as const, file: visual.file, bytes: visual.bytes }]
        : []),
    ])

/** Reported as a count rather than a fault, for the reason `faultsIn` gives. */
export const uncitedIn = (survey: Survey): readonly string[] =>
  survey.visuals
    .filter((visual) => !survey.mentioned.has(nameOf(visual.file)))
    .map((visual) => visual.file)
    .sort((left, right) => left.localeCompare(right))

const kb = (bytes: number): string => `${Math.round(bytes / 1024)}KB`

export const describeFault = (fault: Fault): string => {
  switch (fault.code) {
    case "over-budget":
      return `${fault.file} weighs ${kb(fault.bytes)}, over the ${kb(MOST_ONE_VISUAL_WEIGHS)} a visual may weigh — run \`pnpm reports:shrink\``
    case "unstored-format":
      return `${fault.file} is not ${STORED_EXTENSIONS.join(" or ")} — run \`pnpm reports:shrink\``
  }
}

/**
 * The pixel size a capture is stored at: the size the page was laid out at.
 *
 * A screenshot at `deviceScaleFactor: 2` holds four times the pixels the layout
 * had, which is worth having while you are looking for a half-pixel seam and is
 * not worth committing — the thing a report argues from is what the reader saw.
 * Dividing by the scale is therefore not a compromise on the evidence; it is
 * the evidence, at the size it existed.
 *
 * The clamp afterwards is the encoder's limit rather than ours, and it is
 * proportional: a long page comes back shorter, not cropped.
 */
export const storedSize = (captured: {
  readonly width: number
  readonly height: number
  readonly scale: number
}): { readonly width: number; readonly height: number } => {
  const laidOut = {
    width: Math.max(1, Math.round(captured.width / captured.scale)),
    height: Math.max(1, Math.round(captured.height / captured.scale)),
  }

  const longest = Math.max(laidOut.width, laidOut.height)
  if (longest <= LONGEST_WEBP_SIDE) return laidOut

  const fit = LONGEST_WEBP_SIDE / longest
  return {
    width: Math.max(1, Math.floor(laidOut.width * fit)),
    height: Math.max(1, Math.floor(laidOut.height * fit)),
  }
}
