import Link from "next/link"

import { OutlinePair } from "@/app/(portal)/_components/outline-pair"
import { NOT_DRAWN_WORDS, type Compared } from "@/app/(portal)/_lib/compare-reading"

/**
 * *Compare* (`docs/portal-wireframes.md`, *5 · Pages · History*): the page
 * before a version and the page it became, side by side as two small
 * outlines, in a drawer whose subject is in the address (`?compare=`). What
 * arrived is outlined green on *After*; what went, or moved from where it
 * was, red and dashed on *Before*. Each part's id is one point away, and the
 * parts away from any change fold into a line saying how many.
 */
export const ComparePanel = ({
  heading,
  compared,
  close,
  timeline,
}: {
  heading: string
  compared: Compared
  /** The history without the drawer, every other choice kept. */
  close: string
  timeline: string
}) => (
  <aside
    aria-label="Compare"
    className="border-edge-subtle bg-surface-base flex w-full shrink-0 flex-col self-start rounded-lg border lg:w-[480px]"
  >
    <div className="border-edge-subtle flex items-start justify-between gap-3 border-b px-4 py-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-ink-muted text-xs">Compare</span>
        <h3 className="m-0 text-sm font-medium tracking-tight">{heading}</h3>
      </div>
      <Link href={close} className="text-ink-muted text-xs no-underline" aria-label="Close">
        ✕
      </Link>
    </div>

    <div className="flex flex-col gap-3 px-4 py-3">
      {compared.kind === "drawn" ? (
        <OutlinePair comparison={compared.comparison} />
      ) : (
        <p className="text-ink-secondary m-0 max-w-prose text-xs">
          {compared.kind === "unreadable"
            ? "The page's record could not be read. Nothing here is a statement about the change; try again in a moment."
            : NOT_DRAWN_WORDS[compared.why]}
        </p>
      )}
      <Link href={timeline} className="text-ink self-start text-xs">
        Follow it from Accept
      </Link>
    </div>
  </aside>
)
