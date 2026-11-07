import type { DailyChart as Chart, DayOrigin } from "@/app/(portal)/_lib/daily-rate"

/**
 * The goal's daily rate over the last 8 weeks, at the top of a page's history
 * (`docs/portal-wireframes.md`, *5 · Pages · History*): one bar a day, green
 * after a Loom change and grey after the site's own edit or on the page as
 * Loom first saw it, with each version named where it starts.
 *
 * Drawn on the server as one SVG stretched to the width it is given, as the
 * hourly chart on *Signals* is. The version names sit under the bars in HTML,
 * placed by share of the width, so they are not stretched with the bars. Each
 * bar says its day and figures when pointed at; today is lighter, so a day
 * still being counted does not read as a fall.
 */

const HEIGHT = 100
const SLOT = 10
const GAP = 2

const FILL: Readonly<Record<DayOrigin, string>> = {
  loom: "fill-applied-ink",
  site: "fill-ink-muted",
  first: "fill-ink-muted",
}

export const DailyChart = ({ chart }: { chart: Chart }) => (
  <figure className="m-0 flex flex-col gap-1.5">
    {chart.bars.length === 0 ? null : (
      <>
        <svg
          role="img"
          aria-label={chart.summary}
          viewBox={`0 0 ${chart.bars.length * SLOT} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="border-edge-subtle bg-surface-base h-28 w-full rounded-lg border"
        >
          {chart.boundaries.map((boundary) => (
            <rect
              key={`${boundary.index}-${boundary.label}`}
              x={boundary.index * SLOT - 0.5}
              y={0}
              width={1}
              height={HEIGHT}
              className="fill-edge"
            />
          ))}
          {chart.bars.map((bar, index) => {
            const tall = bar.views === 0 || bar.height === 0 ? 0 : Math.max(bar.height * HEIGHT, 1)

            return (
              <rect
                key={bar.day}
                x={index * SLOT + GAP / 2}
                y={HEIGHT - tall}
                width={SLOT - GAP}
                height={tall}
                className={`${FILL[bar.origin]}${bar.whole ? "" : " opacity-50"}`}
              >
                <title>{bar.title}</title>
              </rect>
            )
          })}
        </svg>
        {chart.boundaries.length === 0 ? null : (
          <ol className="relative m-0 h-4 list-none p-0" aria-label="Where each version starts">
            {chart.boundaries.map((boundary) => (
              <li
                key={`${boundary.index}-${boundary.label}`}
                className={`absolute top-0 border-l pl-1 text-[11px] whitespace-nowrap ${
                  boundary.origin === "loom"
                    ? "border-applied-ink text-applied-ink"
                    : "border-edge text-ink-muted"
                }`}
                style={{ left: `${(boundary.index / chart.bars.length) * 100}%` }}
              >
                {boundary.label}
              </li>
            ))}
          </ol>
        )}
      </>
    )}
    <figcaption className="text-ink-muted flex flex-wrap justify-between gap-2 text-[11px]">
      {chart.starts === undefined ? null : <span>{chart.starts}</span>}
      {chart.note === undefined ? null : <span>{chart.note}</span>}
      {chart.ends === undefined ? null : <span>{chart.ends}</span>}
    </figcaption>
    {chart.bars.length === 0 ? null : (
      <p className="text-ink-muted m-0 flex flex-wrap gap-3 text-[11px]">
        <span>
          <span aria-hidden className="bg-applied-ink mr-1 inline-block h-2 w-2 rounded-sm" />
          After a Loom change
        </span>
        <span>
          <span aria-hidden className="bg-ink-muted mr-1 inline-block h-2 w-2 rounded-sm" />
          After your site&apos;s own edit, or before any change
        </span>
      </p>
    )}
  </figure>
)
