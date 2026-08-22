import type { ConfidenceBucket } from "@loom/runtime/telemetry"

import { formatRange, formatRate, NO_VALUE } from "@/app/(portal)/_lib/calibration-view"

/**
 * One confidence band. The bar is the observed survival rate; the tick is where
 * the mean claim for that band sat. A band the model read correctly has the tick
 * sitting at the end of its bar, which makes the table readable at a glance
 * without anyone subtracting two percentages in their head.
 */
export const BucketRow = ({
  bucket,
  isLast,
}: {
  readonly bucket: ConfidenceBucket
  readonly isLast: boolean
}) => (
  <tr className="border-edge-subtle border-t">
    <td className="text-ink-muted py-2 pr-4 font-mono text-2xs whitespace-nowrap">
      {formatRange(bucket.lower, bucket.upper, isLast)}
    </td>
    <td className="py-2 pr-4 text-right font-mono text-2xs">{bucket.judged || NO_VALUE}</td>
    <td className="py-2 pr-4 text-right font-mono text-2xs">{formatRate(bucket.observedRate)}</td>
    <td className="w-full py-2">
      {bucket.observedRate === null ? null : (
        <div className="bg-surface-hover relative h-2 w-full rounded-[2px]">
          <div
            className="bg-applied h-2 rounded-[2px]"
            style={{ width: `${bucket.observedRate * 100}%` }}
          />
          {bucket.meanConfidence === null ? null : (
            <span
              className="bg-ink absolute top-0 h-2 w-px"
              style={{ left: `${bucket.meanConfidence * 100}%` }}
            />
          )}
        </div>
      )}
    </td>
  </tr>
)
