import Link from "next/link"
import { notFound } from "next/navigation"

import { treeIdSchema } from "@loom/runtime"
import { describeStoreError } from "@loom/runtime/store"

import { requireActor } from "@/lib/auth/identity"
import { ensureSeeded, portalStore, storeIsDurable } from "@/lib/store"

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
 */
const HistoryPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ tree?: string; older?: string }>
}) => {
  const { tree, older } = await searchParams
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

  const page = await portalStore.revisions(scope.data, {
    direction: "older",
    ...(older === undefined ? {} : { cursor: older }),
  })

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

      {newestFirst.length === 0 ? (
        <p className="text-ink-muted text-sm">
          This tree has never been changed. It is at revision 0 — the shape it was created
          with, and nothing has been accepted into it since.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {newestFirst.map((stored) => (
            <RevisionRow key={stored.revision} stored={stored} />
          ))}
        </ul>
      )}

      <div className="flex gap-4">
        {page.value.older !== null && (
          <Link
            href={`/history?${scopeQuery}&older=${encodeURIComponent(page.value.older)}`}
            className="text-xs"
          >
            ← earlier
          </Link>
        )}
        {older !== undefined && (
          <Link href={`/history?${scopeQuery}`} className="text-xs">
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
