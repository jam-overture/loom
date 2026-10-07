import {
  BAR_COMBINATIONS,
  BAR_OUTCOMES,
  BAR_ROWS,
  combinationsThatAre,
  distinctCanvases,
  mediaPairServes,
  noSilentPaletteLine,
  PAIR_DARK_ID,
  PAIR_LIGHT_ID,
  pairVerdictLine,
  unpaintableBars,
  type BarCombination,
  type BarOutcome,
} from "@/app/(docs)/_lib/browser-bar"

/**
 * What the two forms of `<meta name="theme-color">` answer, shown rather than
 * argued.
 *
 * Two blocks, and the order is the brief's: the concrete case first, the
 * general rule after it.
 *
 * - `<BarPicture>` is one palette under one machine, drawn twice — the bar the
 *   media pair serves, and the bar the tree asks for. It is the whole defect in
 *   a picture a reader can see without reading a number.
 * - `<BarOutcomes>` is every palette under both machines, grouped by how it
 *   comes out, with the counts read off the data.
 *
 * Both render on the server and ship nothing. There is no state and nothing to
 * press, for the reason `palette-scheme.tsx` gives: a measurement a reader can
 * edit is not a measurement.
 *
 * **Nothing here names a color.** Every swatch is painted a hex that came out
 * of `themeGround`, which is the rule this route group holds itself to and the
 * reason this table cannot quietly describe a palette that no longer exists.
 */

/** What a reader calls each outcome, which is not what the data calls it. */
const OUTCOME_HEADINGS: Readonly<Record<BarOutcome, string>> = {
  exact: "The bar is the page",
  "off-by-a-shade": "Right way round, wrong color",
  inverted: "The other way round entirely",
}

const OUTCOME_NOTES: Readonly<Record<BarOutcome, string>> = {
  exact: "Only the two palettes the host nominated ever land here.",
  "off-by-a-shade": "A seam across the top of the page. This is the most common outcome of the three.",
  inverted: "A white bar over a near-black page, or the reverse.",
}

/**
 * A browser bar over a page, which is the thing the whole section is about.
 *
 * Drawn as two stacked blocks rather than a framed mock of a browser: the
 * question is whether the two colors are the same color, and a rounded window
 * with a URL in it would put furniture between the reader and that.
 *
 * **Two things it deliberately does not do**, and the first version of this did
 * both. It drew a dividing border between the bands, which puts a seam on the
 * screen in the one case whose whole meaning is that there is no seam — the
 * reader would have been looking at a line the browser does not draw and
 * reading it as the defect. And it printed each hex *inside* its own band in
 * the other band's color, which is legible exactly when the two colors differ:
 * the `exact` row came out as an empty white box and the `off-by-a-shade` row
 * as a ghost. Both were photographed before they were noticed.
 *
 * So the colors are the whole of what is inside the outline, the outline is
 * there only to separate the swatch from the page it sits on, and the hexes are
 * printed underneath where they are always readable.
 */
const Stack = ({
  bar,
  page,
  label,
}: {
  readonly bar: string
  readonly page: string
  readonly label: string
}) => (
  <span className="flex min-w-0 flex-col gap-1" data-stack={label}>
    <span className="border-edge flex min-w-0 flex-col overflow-hidden rounded-md border">
      <span className="h-7" style={{ backgroundColor: bar }} data-stack-bar={label} />
      <span className="h-16" style={{ backgroundColor: page }} data-stack-page={label} />
    </span>
    <span className="text-ink-faint font-mono text-[0.625rem] leading-tight" data-stack-hexes={label}>
      {bar} over {page}
    </span>
  </span>
)

/**
 * One palette under one setting of the machine, both ways.
 *
 * The caption under each is what the host wrote rather than what the reader
 * sees, because the two pictures differ in one line of `<head>` and a reader
 * comparing them needs to know which line.
 */
export const BarPicture = ({
  palette = PAIR_DARK_ID,
  machine = "light",
}: {
  readonly palette?: string
  readonly machine?: "light" | "dark"
}) => {
  const combination = BAR_COMBINATIONS.find(
    (candidate) => candidate.paletteId === palette && candidate.machine === machine
  )

  if (combination === undefined) {
    throw new Error(`loom: the browser-bar section asked for "${palette}" on a ${machine} machine, which it has no row for`)
  }

  if (combination.painted === undefined) {
    throw new Error(`loom: "${palette}" has no ground, so the browser-bar section cannot picture it`)
  }

  return (
    <div className="not-prose my-6 flex flex-col gap-3" data-bar-picture={palette}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <Stack bar={combination.served} page={combination.painted} label="pair" />
          <p className="text-ink-muted m-0 text-xs">
            The media pair, on a machine set to <code className="font-mono">{machine}</code>. It served{" "}
            <span className="font-mono" data-pair-served={palette}>
              {combination.served}
            </span>{" "}
            because that is what the machine says.
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <Stack bar={combination.painted} page={combination.painted} label="ground" />
          <p className="text-ink-muted m-0 text-xs">
            One meta, from <code className="font-mono">themeGround</code>. It serves{" "}
            <span className="font-mono" data-ground-served={palette}>
              {combination.painted}
            </span>{" "}
            because that is what the page is.
          </p>
        </div>
      </div>
      <p className="text-ink-faint m-0 text-xs" data-picture-outcome={combination.outcome}>
        The tree named <code className="font-mono">{palette}</code>, and the reader&rsquo;s machine was never asked.
      </p>
    </div>
  )
}

/** One outcome's row: how many pairings land in it, and one of them. */
const OutcomeRow = ({
  outcome,
  rows,
}: {
  readonly outcome: BarOutcome
  readonly rows: readonly BarCombination[]
}) => {
  const example = rows[0]

  return (
    <div className="border-edge flex items-start gap-4 border-b py-3 last:border-b-0" data-outcome={outcome}>
      {/*
       * A sample rather than every row. Twenty-one palettes under two machines
       * is forty-two pictures, and the reader learns the same thing from one of
       * each kind — the count beside it is what carries the claim about all of
       * them.
       */}
      <span className="w-40 shrink-0">
        {example?.painted === undefined ? (
          <span className="text-ink-faint font-mono text-xs">no ground</span>
        ) : (
          <Stack bar={example.served} page={example.painted} label={outcome} />
        )}
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-ink text-sm font-semibold">
          {OUTCOME_HEADINGS[outcome]} — <span data-outcome-count={outcome}>{rows.length}</span> of{" "}
          {BAR_COMBINATIONS.length}
        </span>
        <span className="text-ink-muted text-xs">{OUTCOME_NOTES[outcome]}</span>
        {example !== undefined && (
          <span className="text-ink-faint font-mono text-[0.6875rem]" data-outcome-example={outcome}>
            e.g. {example.paletteId} on a {example.machine} machine
          </span>
        )}
      </span>
    </div>
  )
}

/**
 * Every palette under both settings of the machine, grouped by how it comes out.
 *
 * The counts are the lengths of the three lists, so a group that printed no
 * rows would say `0` rather than looking like a short answer, and the sentence
 * under them is read off the same data rather than written beside it.
 */
export const BarOutcomes = () => (
  <div className="not-prose my-6 flex flex-col gap-3" data-bar-outcomes="">
    <p className="text-ink-muted m-0 text-xs">
      <span data-bar-rows={String(BAR_ROWS.length)}>{BAR_ROWS.length}</span> palettes, painting{" "}
      <span data-distinct-canvases={String(distinctCanvases)}>{distinctCanvases}</span> different grounds between
      them. The pair can only ever serve two:{" "}
      <span className="font-mono">{mediaPairServes.light}</span> from{" "}
      <code className="font-mono">{PAIR_LIGHT_ID}</code> and{" "}
      <span className="font-mono">{mediaPairServes.dark}</span> from{" "}
      <code className="font-mono">{PAIR_DARK_ID}</code>.
    </p>
    <div className="border-edge flex flex-col rounded-lg border px-4">
      {BAR_OUTCOMES.map((outcome) => (
        <OutcomeRow key={outcome} outcome={outcome} rows={combinationsThatAre(outcome)} />
      ))}
    </div>
    <p className="text-ink m-0 text-sm" data-pair-verdict="">
      {pairVerdictLine(BAR_COMBINATIONS)}
    </p>
    <p className="text-ink-muted m-0 text-xs" data-unpaintable={String(unpaintableBars.length)}>
      {noSilentPaletteLine(unpaintableBars)}
    </p>
  </div>
)
