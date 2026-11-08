import Link from "next/link"

import { countWords, type RecentCount } from "@/app/(portal)/_lib/turned-down-list"

/**
 * The line under *For review* that leads to *Turned down*
 * (`docs/portal-wireframes.md`, *2 · For review*): how many changes were
 * turned down recently, and a way to see them where there are any.
 */
export const TurnedDownLine = ({
  count,
  projectId,
}: {
  readonly count: RecentCount
  readonly projectId: string
}) => (
  <p className="text-ink-muted m-0 text-xs">
    Turned down recently: {count.count === 0 ? "none" : countWords(count)}
    {count.count === 0 ? null : (
      <>
        {" · "}
        <Link href={`/portal/${projectId}/review/turned-down`} className="text-ink">
          see them
        </Link>
      </>
    )}
  </p>
)
