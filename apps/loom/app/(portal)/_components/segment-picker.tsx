import Link from "next/link"

import { FilterChips } from "@/app/(portal)/_components/filter-chips"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import {
  segmentChoicesOf,
  type SegmentHref,
  type SegmentPick,
} from "@/app/(portal)/_lib/segments/segment-pick"

/**
 * The segment picker (unit 9 piece 3, 0371 clause 7.3): *Everyone* and each of
 * the project's segments, as links that keep the rest of the screen's address.
 * Nothing is drawn for a project with no segment, and a line says so where the
 * segments could not be read, so a missing picker is never mistaken for none.
 */
export const SegmentPicker = ({ pick, hrefOf }: { pick: SegmentPick; hrefOf: SegmentHref }) => {
  const choices = segmentChoicesOf(pick, hrefOf)

  return (
    <div className="flex flex-col gap-1">
      {choices.length === 0 ? null : <FilterChips label="Segment" choices={choices} />}
      {pick.offered === undefined && (
        <p className="text-ink-muted m-0 text-xs">
          This project&rsquo;s segments could not be read just now, so none is offered.
        </p>
      )}
    </div>
  )
}

/**
 * What a screen says, in place of its figures, about a segment nothing has
 * been counted under (0371 clause 6 and its consequences: a segment's figures
 * are shown only once it has page views of its own). Until the site's server
 * sorts its readers and names the segment on its signals, there is nothing to
 * draw, which is not the same as nobody in it.
 */
export const SegmentUncounted = ({
  word,
  projectId,
  everyoneHref,
}: {
  word: string
  projectId: string
  everyoneHref: string
}) => (
  <StateNotice
    tone="empty"
    title={`Nothing has been counted for ${word} yet`}
    action={
      <span className="flex gap-3">
        <Link href={`/portal/${projectId}/segments`} className="text-ink underline">
          Segments
        </Link>
        <Link href={everyoneHref} className="text-ink underline">
          Show everyone
        </Link>
      </span>
    }
  >
    <span>
      A segment&rsquo;s figures start once your site&rsquo;s server sorts its readers into it and
      names <code>aud_{word}</code> on their signals. Until then there is nothing about these
      readers to show. <em>Segments</em> says what your site must send.
    </span>
  </StateNotice>
)
