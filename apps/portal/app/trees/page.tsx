import Link from "next/link"

import { portalStore, seedTreeId } from "@/lib/store"

/**
 * The one tree this process seeded. `TreeStore` has no `list`, so this is not a
 * listing of everything stored — it is the tree the portal created, named
 * honestly as such.
 */

/**
 * This page reads a mutable store, so it must not be prerendered. Next would
 * otherwise bake the build-time revision into static HTML and serve it forever,
 * which would be wrong the moment anything writes — and wrong in the most
 * confusing way, since the preview it links to is dynamic and would disagree
 * with it.
 */
export const dynamic = "force-dynamic"

const TreesPage = async () => {
  const head = await portalStore.head(seedTreeId)
  const log = await portalStore.history(seedTreeId)

  if (!head.ok) {
    return (
      <div className="p-8">
        <h1 className="text-2xl tracking-tight">trees</h1>
        <p className="text-ink-muted mt-2 text-sm">The store has no seeded tree.</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl tracking-tight">trees</h1>
      <Link
        href={`/trees/${head.value.treeId}`}
        className="border-edge-subtle bg-surface-base hover:bg-surface-hover mt-4 block max-w-xl rounded-md border p-4 no-underline"
      >
        <span className="font-mono text-sm">{head.value.treeId}</span>
        <span className="text-ink-muted mt-1 block text-xs">
          revision {head.value.revision} · {log.ok ? log.value.length : 0} changes in the log
        </span>
      </Link>

      <p className="text-ink-muted mt-4 max-w-xl text-xs">
        This deployment keeps its tree in the server process. Nothing is written yet, so
        there is nothing to lose — but the log will not survive a restart until a backing
        store lands.
      </p>
    </div>
  )
}

export default TreesPage
