import type { RangeChart as Chart } from "@/app/(portal)/_lib/signals-range"

/**
 * Page views by hour across the range, one place an hour
 * (`docs/portal-wireframes.md`, *1 · Signals*).
 *
 * Drawn on the server as one SVG stretched to the width it is given, so a
 * thirty-day range is 720 places without a script or a charting library. The
 * chart is always the whole range: the hours before counting by hour began are
 * a shaded band, a counted hour nobody arrived in sits on the baseline, and the
 * scale on the left says what the top stands for. Times sit under the bars in
 * HTML, placed by share of the width, so they are not stretched with the bars.
 * Each bar says its hour and count when pointed at; the hour still in progress
 * is lighter, so the right-hand edge does not read as readers leaving. The
 * whole chart is one sentence for a screen reader, and the figure beside it
 * carries the numbers.
 */

const HEIGHT = 100
const SLOT = 10
const GAP = 2
const BASELINE = 1

/** The least share of the width the shaded band needs before it is named in words. */
const NAMED_BAND = 0.2

const shareOf = (slot: number, slots: number): string => `${(slot / slots) * 100}%`

const Scale = ({ top }: { top: number }) => (
  <div
    aria-hidden
    className="text-ink-muted flex h-24 flex-col justify-between py-0.5 text-right text-[11px] tabular-nums"
  >
    <span>{top.toLocaleString("en-GB")}</span>
    <span>0</span>
  </div>
)

const Bars = ({ chart }: { chart: Chart }) => (
  <div className="relative">
    <svg
      role="img"
      aria-label={chart.summary}
      viewBox={`0 0 ${chart.slots * SLOT} ${HEIGHT}`}
      preserveAspectRatio="none"
      className="border-edge-subtle bg-surface-base block h-24 w-full rounded-lg border"
    >
      {chart.uncounted === 0 ? null : (
        <rect
          x={0}
          y={0}
          width={chart.uncounted * SLOT}
          height={HEIGHT}
          className="fill-surface-muted"
        />
      )}
      <rect
        x={chart.uncounted * SLOT}
        y={HEIGHT - BASELINE}
        width={(chart.slots - chart.uncounted) * SLOT}
        height={BASELINE}
        className="fill-edge"
      />
      {chart.bars.map((bar) => {
        const tall = bar.views === 0 ? 0 : Math.max(bar.height * HEIGHT, BASELINE)

        return (
          <rect
            key={bar.hour}
            x={bar.slot * SLOT + GAP / 2}
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
    {chart.uncounted / chart.slots < NAMED_BAND ? null : (
      <span
        aria-hidden
        className="text-ink-muted absolute inset-y-0 left-0 flex items-center justify-center text-[11px]"
        style={{ width: shareOf(chart.uncounted, chart.slots) }}
      >
        Not counted yet
      </span>
    )}
  </div>
)

const Ticks = ({ chart }: { chart: Chart }) => (
  <ol aria-hidden className="relative m-0 h-4 list-none p-0">
    {chart.ticks.map((tick) => (
      <li
        key={tick.slot}
        className="border-edge text-ink-muted absolute top-0 border-l pl-1 text-[11px] whitespace-nowrap"
        style={{ left: shareOf(tick.slot, chart.slots) }}
      >
        {tick.label}
      </li>
    ))}
  </ol>
)

export const RangeChart = ({ chart }: { chart: Chart }) => (
  <figure className="m-0 flex flex-col gap-1.5">
    {chart.bars.length === 0 ? null : (
      <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
        <Scale top={chart.scale} />
        <Bars chart={chart} />
        <span />
        <Ticks chart={chart} />
      </div>
    )}
    <figcaption className="text-ink-muted flex flex-wrap justify-between gap-2 text-[11px]">
      {chart.starts === undefined ? null : <span>{chart.starts}</span>}
      {chart.note === undefined ? null : <span>{chart.note}</span>}
      {chart.ends === undefined ? null : <span>{chart.ends}</span>}
    </figcaption>
  </figure>
)
