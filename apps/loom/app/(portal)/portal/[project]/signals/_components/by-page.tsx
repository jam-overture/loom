import Link from "next/link"

import type { ByPageList, NamedPart, PageDrawer } from "@/app/(portal)/_lib/by-page"
import { plainMoment } from "@/app/(portal)/_lib/when"

/**
 * *Signals · By page*: the project's pages, newest first, fifty to a page,
 * and the drawer for the one the URL names (8a of `docs/portal.md`).
 *
 * Every link is a plain address — `from` for where the list starts, `page`
 * for the drawer's subject — so a link a person sends reopens exactly what
 * they were looking at, and the screen needs no client code to do it.
 */

export type ByPageAddress = {
  readonly base: string
  readonly from: string | undefined
}

const hrefOf = ({ base }: ByPageAddress, query: Readonly<Record<string, string | undefined>>) => {
  const kept = new URLSearchParams(
    Object.entries(query).flatMap(([key, value]) => (value === undefined ? [] : [[key, value]]))
  ).toString()

  return kept === "" ? base : `${base}?${kept}`
}

const count = (value: number): string => value.toLocaleString("en-GB")

/** A page by the heading it published, with its id beneath; by its id alone otherwise. */
const PageName = ({ name, treeId }: { name: string | undefined; treeId: string }) =>
  name === undefined ? (
    <span className="font-mono">{treeId}</span>
  ) : (
    <>
      {name}
      <span className="text-ink-muted block font-mono text-[11px]">{treeId}</span>
    </>
  )

const PartLabel = ({ part }: { part: NamedPart }) =>
  part.name === undefined ? (
    <span className="font-mono">{part.nodeId}</span>
  ) : (
    <>
      {part.name} <span className="text-ink-muted font-mono text-[11px]">{part.nodeId}</span>
    </>
  )

const WaitingBadge = ({ waiting }: { waiting: number | undefined }) =>
  waiting === undefined || waiting === 0 ? null : (
    <span className="bg-awaiting text-awaiting-ink ml-2 rounded px-1.5 py-0.5 text-[11px] whitespace-nowrap">
      {waiting} waiting
    </span>
  )

const Pager = ({ list, address }: { list: ByPageList; address: ByPageAddress }) => (
  <div className="text-ink-muted flex items-center justify-between gap-3 text-xs">
    <span>
      {list.first === list.last
        ? `${count(list.first)} of ${count(list.total)}`
        : `${count(list.first)}–${count(list.last)} of ${count(list.total)}`}
    </span>
    <span className="flex gap-3">
      {list.newer === undefined && list.first <= 1 ? (
        <span aria-disabled="true">Newer</span>
      ) : (
        <Link href={hrefOf(address, { from: list.newer })} className="text-ink">
          Newer
        </Link>
      )}
      {list.older === undefined ? (
        <span aria-disabled="true">Older</span>
      ) : (
        <Link href={hrefOf(address, { from: list.older })} className="text-ink">
          Older
        </Link>
      )}
    </span>
  </div>
)

export const ByPageTable = ({
  list,
  address,
  open,
}: {
  list: ByPageList
  address: ByPageAddress
  open: string | undefined
}) => (
  <div className="flex min-w-0 flex-1 flex-col gap-2">
    <table className="w-full text-left text-xs">
      <thead className="text-ink-muted">
        <tr>
          <th className="py-1.5 font-normal">Page</th>
          <th className="py-1.5 font-normal">Live version</th>
          <th className="py-1.5 text-right font-normal">Page views</th>
          <th className="py-1.5 pl-3 font-normal">Pressed most</th>
          <th className="py-1.5 text-right font-normal">Last moved</th>
        </tr>
      </thead>
      <tbody>
        {list.rows.map((row) => (
          <tr
            key={row.treeId}
            className={`border-edge-subtle border-t ${
              open === row.treeId ? "bg-surface-active" : "hover:bg-surface-hover"
            }`}
          >
            <td className="py-1.5">
              <Link
                href={hrefOf(address, { from: address.from, page: row.treeId })}
                className="text-ink no-underline hover:underline"
              >
                <PageName name={row.name} treeId={row.treeId} />
              </Link>
              <WaitingBadge waiting={row.waiting} />
            </td>
            <td className="py-1.5">{row.liveVersion}</td>
            <td className="py-1.5 text-right">{count(row.opened)}</td>
            <td className="py-1.5 pl-3">
              {row.mostPressed === undefined ? (
                <span className="text-ink-muted">Nothing pressed</span>
              ) : (
                <PartLabel part={row.mostPressed} />
              )}
            </td>
            <td className="py-1.5 text-right">{plainMoment(row.lastMoved)}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <Pager list={list} address={address} />
  </div>
)

const seconds = (value: number): string => (value === 1 ? "1 second" : `${value} seconds`)

const waitingSentence = (waiting: number): string =>
  waiting === 1
    ? "1 change for this page waits for review."
    : `${waiting} changes for this page wait for review.`

export const PageDrawerPanel = ({
  drawer,
  address,
  projectId,
}: {
  drawer: PageDrawer
  address: ByPageAddress
  projectId: string
}) => (
  <aside
    aria-label="One page"
    className="border-edge-subtle bg-surface-base flex w-full shrink-0 flex-col self-start rounded-lg border lg:w-[440px]"
  >
    <div className="border-edge-subtle flex items-start justify-between gap-3 border-b px-4 py-3">
      <div className="text-sm">
        <PageName name={drawer.row.name} treeId={drawer.row.treeId} />
      </div>
      <Link
        href={hrefOf(address, { from: address.from })}
        className="text-ink-muted text-xs no-underline"
        aria-label="Close"
      >
        ✕
      </Link>
    </div>

    <div className="flex flex-col gap-5 px-4 py-3">
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-medium">What readers did</h3>
        <p className="text-ink-muted text-[11px]">
          Since this page was first counted, across every version.
        </p>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {drawer.bars.map((bar) => (
            <li key={bar.technical} className="flex flex-col gap-1" title={bar.meaning}>
              <span className="flex justify-between text-xs">
                <span>{bar.label}</span>
                <span>{count(bar.count)}</span>
              </span>
              <span className="bg-surface-hover block h-1.5 rounded">
                <span
                  className="bg-ink block h-1.5 rounded"
                  style={{ width: `${Math.round(bar.share * 100)}%` }}
                />
              </span>
            </li>
          ))}
        </ul>
        {drawer.longest === undefined ? null : (
          <p className="text-xs">
            Readers kept <PartLabel part={drawer.longest} /> on screen longest, for{" "}
            {seconds(drawer.longest.seconds)} on average.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-medium">Pressed most</h3>
        {drawer.pressed.length === 0 ? (
          <p className="text-ink-muted text-xs">Nothing on this page has been pressed yet.</p>
        ) : (
          <ol className="m-0 flex list-decimal flex-col gap-1 pl-5 text-xs">
            {drawer.pressed.map((part) => (
              <li key={part.nodeId}>
                <PartLabel part={part} />{" "}
                <span className="text-ink-muted">
                  {part.presses === 1 ? "1 press" : `${count(part.presses)} presses`}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {drawer.row.waiting === undefined || drawer.row.waiting === 0 ? null : (
        <Link
          href={`/portal/${projectId}/review`}
          className="bg-awaiting text-awaiting-ink rounded px-3 py-2 text-xs no-underline"
        >
          {waitingSentence(drawer.row.waiting)}
        </Link>
      )}

      <div className="flex gap-4 text-xs">
        <Link href={`/portal/${projectId}/pages/${drawer.row.treeId}`} className="text-ink">
          Open the page
        </Link>
        <Link href={`/portal/${projectId}/signals?on=${drawer.row.treeId}`} className="text-ink">
          Events on this page
        </Link>
      </div>
    </div>
  </aside>
)
