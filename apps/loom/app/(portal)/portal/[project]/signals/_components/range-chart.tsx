import type { RangeChart as Chart } from "@/app/(portal)/_lib/signals-range"

/**
 * Page views by hour across the range, one bar an hour
 * (`docs/portal-wireframes.md`, *1 · Signals*).
 *
 * Drawn on the server as one SVG stretched to the width it is given, so a
 * thirty-day range is 720 bars without a script or a charting library. Each
 * bar says its hour and count when pointed at; the hour still in progress is
 * lighter, so the right-hand edge does not read as readers leaving. The whole
 * chart is one sentence for a screen reader, and the figure beside it carries
 * the numbers.
 */

const HEIGHT = 100
const SLOT = 10
const GAP = 2

export const RangeChart = ({ chart }: { chart: Chart }) => (
  <figure className="m-0 flex flex-col gap-1.5">
    {chart.bars.length === 0 ? null : (
      <svg
        role="img"
        aria-label={chart.summary}
        viewBox={`0 0 ${chart.bars.length * SLOT} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="border-edge-subtle bg-surface-base h-24 w-full rounded-lg border"
      >
        {chart.bars.map((bar, index) => {
          const tall = bar.views === 0 ? 0 : Math.max(bar.height * HEIGHT, 1)

          return (
            <rect
              key={bar.hour}
              x={index * SLOT + GAP / 2}
              y={HEIGHT - tall}
              width={SLOT - GAP}
              height={tall}
              className={bar.whole ? "fill-ink" : "fill-ink-muted"}
            >
              <title>{bar.title}</title>
            </rect>
          )
        })}
      </svg>
    )}
    <figcaption className="text-ink-muted flex flex-wrap justify-between gap-2 text-[11px]">
      {chart.starts === undefined ? null : <span>{chart.starts}</span>}
      {chart.note === undefined ? null : <span>{chart.note}</span>}
      {chart.ends === undefined ? null : <span>{chart.ends}</span>}
    </figcaption>
  </figure>
)
