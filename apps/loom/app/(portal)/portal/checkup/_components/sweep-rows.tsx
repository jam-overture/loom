import Link from "next/link"

import { ListOrder } from "@/app/(portal)/_components/list-order"
import { PageName } from "@/app/(portal)/_components/page-name"
import {
  inWorstFirstOrder,
  plainStanding,
  rowNote,
  type PageCheck,
} from "@/app/(portal)/_lib/checkup-sweep"
import { toneClasses } from "@/app/(portal)/_lib/outcome"
import { nameFrom, type PageName as PageNameValue } from "@/app/(portal)/_lib/page-name"

/**
 * Every page the sweep looked at, worst first.
 *
 * ## Why every row is here
 *
 * A page that could not be checked is listed exactly as loudly as one that
 * failed, and a page that passed is listed too. Dropping the passes would make
 * this a list of faults, and a list of faults cannot be counted against the
 * tally above it — a reader who sees *9 pages found* and six rows has no way to
 * know whether three were fine or three were forgotten.
 *
 * ## Why every row is a link to the same place
 *
 * One destination, `/portal/checkup?tree=…`, including for the rows that reached
 * no verdict. That page is the full account of this one page — the parts that
 * disagree, the change the replay stopped at, the reason a starting shape is
 * needed and cannot be inferred — and a row that had to choose a different
 * destination per standing would be teaching a reader that some rows are
 * dead ends. None of them is.
 *
 * So the row is a summary and never a replacement: nothing shown here is the
 * only place it is said.
 *
 * ## The order is said out loud now, and its tail agrees with the rest of the portal
 *
 * Worst first was already this screen's rule and is unchanged. What changed is
 * that it is written above the list instead of being a thing a reader has to
 * infer from four rows, and that the pages it has nothing to separate are in the
 * same order here as on every other list of pages in this portal — the page's own
 * name, rather than whichever cursor order the store handed back. See
 * `_lib/page-order.ts`.
 */
export const SweepRows = ({
  checks,
  names,
}: {
  readonly checks: readonly PageCheck[]
  /** What each page is called. A page missing from it still lists, by its id. */
  readonly names: ReadonlyMap<string, PageNameValue>
}) => (
  <div className="flex flex-col gap-3">
    <ListOrder order="worst-first" />

    <ul className="flex flex-col gap-2">
      {inWorstFirstOrder(checks, names).map((check) => {
        const word = plainStanding(check.standing.state)
        const note = rowNote(check.standing)

        return (
          <li key={check.treeId}>
            <Link
              href={`/portal/checkup?tree=${encodeURIComponent(check.treeId)}`}
              className="border-edge-subtle bg-surface-base hover:bg-surface-hover flex flex-col gap-2 rounded-md border p-4 no-underline"
            >
              <span className="flex items-start justify-between gap-3">
                <PageName page={nameFrom(names, check.treeId)} />
                <span
                  className={"shrink-0 rounded-sm px-2 py-1 text-xs " + toneClasses(word.tone)}
                >
                  {word.label}
                </span>
              </span>
              <span className="text-ink-secondary text-xs">
                {word.meaning}
                {note === null ? null : (
                  <>
                    {" "}
                    <span className="text-ink">{note}</span>
                  </>
                )}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  </div>
)
