import Link from "next/link"
import { notFound } from "next/navigation"

import { treeIdSchema } from "@loom/runtime"
import { describeStoreError } from "@loom/runtime/store"

import { requireActor } from "@/lib/auth/identity"
import {
  anchorOf,
  describeAnchorMiss,
  echoOf,
  historyPageHref,
  historyRead,
  parseRevisionParam,
} from "@/lib/history-link"
import { ensureSeeded, portalStore, storeIsDurable } from "@/lib/store"

import { RevisionBox } from "./_components/revision-box"
import { RevisionRow } from "./_components/revision-row"
import { TreeChooser } from "./_components/tree-chooser"

/**
 * What was actually accepted into a tree, in the order it was applied.
 *
 * `/activity` answers what the runtime was *asked* to do; this answers what
 * became of the tree — and the two are deliberately different views, because a
 * refused proposal appears in one and never in the other. 0016 made the log the
 * truth and the snapshot a view of it; this is the log, read directly.
 *
 * The page is taken from the newest end (0026). A log only grows, and "what
 * changed lately" is the question — paging forward from revision 1 would answer
 * it only after reading every change ever accepted.
 *
 * Unless somebody arrives with a revision in mind. `?at=` opens the page holding
 * that one and marks it (0043), which is how a node's attribution reaches the
 * change that placed it — the alternative was a reviewer reading a number off
 * one page and paging back through this one until it appeared.
 *
 * A revision travels further than the links that carry it, though. It turns up
 * in a report, in a message, in a screenshot of somewhere else in the portal, and
 * a reader holding one had no way to act on it but to edit the URL. The box
 * writes the same parameter a link does, so there is one way in and one thing to
 * explain when it misses.
 *
 * From there the log reads both ways. A reader who arrived at revision 4 is not
 * asking about revision 4 alone; they are asking what happened around it, and
 * half of "around" is what came after. The store has named its `newer` end since
 * 0025 and nothing has ever read it, so until now the only way forward was back
 * to the newest page and a fresh descent.
 */
const HistoryPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ tree?: string; older?: string; newer?: string; at?: string }>
}) => {
  const { tree, older, newer, at } = await searchParams
  await requireActor("/history")
  await ensureSeeded()

  if (tree === undefined) {
    return (
      <div className="flex max-w-3xl flex-col gap-6 p-8">
        <h1 className="text-2xl tracking-tight">history</h1>
        <TreeChooser />
      </div>
    )
  }

  const scope = treeIdSchema.safeParse(tree)
  if (!scope.success) notFound()

  /** Where a link sent the reader or a reader asked to go, and what to mark on arrival. */
  const named = parseRevisionParam(at)
  const anchor = anchorOf(named)

  const page = await portalStore.revisions(scope.data, historyRead({ older, newer, at: anchor }))

  if (!page.ok) {
    /** A log nobody can name is a wrong URL, not a broken store. */
    if (page.error.code === "not-found") notFound()

    return (
      <div className="flex max-w-3xl flex-col gap-3 p-8">
        <h1 className="text-2xl tracking-tight">history</h1>
        <p className="text-ink-muted text-sm">{describeStoreError(page.error)}</p>
      </div>
    )
  }

  const newestFirst = [...page.value.revisions].reverse()
  const scopeQuery = `tree=${encodeURIComponent(scope.data)}`

  /**
   * A revision this log does not hold is not an error to the store — it answers
   * with the entries on that side of the number instead — so the page lands
   * looking exactly like an ordinary visit. Saying which of the ways it missed
   * is the difference between that and being told why.
   */
  const anchorMiss = describeAnchorMiss(named, {
    older,
    newer,
    onPage: anchor !== undefined && newestFirst.some((stored) => stored.revision === anchor),
    newestOnPage: newestFirst[0]?.revision,
  })

  return (
    <div className="flex max-w-3xl flex-col gap-6 p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl tracking-tight">history</h1>
        <div className="flex gap-4">
          <Link href={`/activity?${scopeQuery}`} className="text-xs">
            what was asked →
          </Link>
          <Link href={`/trees/${scope.data}`} className="font-mono text-xs">
            {scope.data}
          </Link>
        </div>
      </div>

      <RevisionBox treeId={scope.data} typed={echoOf(named)} />

      {anchorMiss && <p className="text-ink-muted text-sm">{anchorMiss}</p>}

      {newestFirst.length === 0 ? (
        <p className="text-ink-muted text-sm">
          This tree has never been changed. It is at revision 0 — the shape it was created
          with, and nothing has been accepted into it since.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {newestFirst.map((stored) => (
            <RevisionRow
              key={stored.revision}
              stored={stored}
              anchored={stored.revision === anchor}
            />
          ))}
        </ul>
      )}

      {/*
       * Both ends, whenever the page has them. A log read only backwards makes
       * "what happened after this" a question you answer by starting again from
       * the newest page, which is the same journey `?at=` was added to remove.
       *
       * "latest" stays alongside them rather than being implied by "later": a
       * reader deep in a long log wants the end, not thirty steps toward it.
       */}
      <div className="flex gap-4">
        {page.value.older !== null && (
          <Link href={historyPageHref(scope.data, { older: page.value.older })} className="text-xs">
            ← earlier
          </Link>
        )}
        {page.value.newer !== null && (
          <Link href={historyPageHref(scope.data, { newer: page.value.newer })} className="text-xs">
            later →
          </Link>
        )}
        {(older !== undefined || newer !== undefined || anchor !== undefined) && (
          <Link href={historyPageHref(scope.data)} className="text-xs">
            latest →
          </Link>
        )}
        <Link href="/history" className="text-ink-muted text-xs">
          another tree
        </Link>
      </div>

      {storeIsDurable ? null : (
        <p className="text-ink-muted text-xs">
          No database is configured, so this log lives in the server process and holds only
          what this instance has accepted. Set <span className="font-mono">DATABASE_URL</span>{" "}
          to make it durable.
        </p>
      )}
    </div>
  )
}

export default HistoryPage
