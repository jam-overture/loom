import Link from "next/link"
import { notFound } from "next/navigation"

import { treeIdSchema } from "@loom/runtime"
import { auditSnapshot, describeStoreError } from "@loom/runtime/store"

import { describeAudit } from "@/lib/audit-view"
import { requireActor } from "@/lib/auth/identity"
import { seedFor } from "@/lib/seeds"
import { ensureSeeded, portalStore, storeIsDurable } from "@/lib/store"

import { AuditVerdict } from "./_components/audit-verdict"
import { AuditTreeChooser } from "./_components/tree-chooser"

/**
 * Whether the log still produces the tree being served.
 *
 * `/history` shows what the log says happened and `/trees` shows what is being
 * served. Nothing until now checked that the first still produces the second —
 * 0016 made the snapshot a materialised view of the log, and a view nobody
 * verifies is a claim rather than a fact. `auditSnapshot` has existed since the
 * store did and had never run outside a test.
 *
 * On demand, by naming a tree. The fold is a read over every accepted change,
 * which is exactly the cost 0016 introduced the snapshot to avoid on a request
 * path — so it runs when a reviewer asks and never as a side effect of opening
 * a page. The tree is in the URL, so an audit is a link somebody can be sent.
 *
 * A tree with no known seed is refused rather than approximated. Folding from
 * the snapshot would compare the tree with itself and agree every time, which
 * is worse than no audit: it is a green tick that means nothing.
 */
const AuditPage = async ({ searchParams }: { searchParams: Promise<{ tree?: string }> }) => {
  const { tree } = await searchParams
  await requireActor("/audit")
  await ensureSeeded()

  if (tree === undefined) {
    return (
      <div className="flex max-w-3xl flex-col gap-6 p-8">
        <h1 className="text-2xl tracking-tight">audit</h1>
        <AuditTreeChooser />
      </div>
    )
  }

  const scope = treeIdSchema.safeParse(tree)
  if (!scope.success) notFound()

  const seed = seedFor(scope.data)

  /**
   * A tree nobody stores is a wrong URL, not an unauditable tree — so an unknown
   * seed still costs one read to tell the two apart. Without it a mistyped id
   * comes back as a considered refusal to audit something that was never there.
   */
  const found = seed === undefined ? await portalStore.head(scope.data) : undefined
  const audit = seed === undefined ? undefined : await auditSnapshot(portalStore, scope.data, seed)

  const problem = [found, audit].find((result) => result !== undefined && !result.ok)
  if (problem !== undefined && !problem.ok && problem.error.code === "not-found") notFound()

  const scopeQuery = `tree=${encodeURIComponent(scope.data)}`

  return (
    <div className="flex max-w-3xl flex-col gap-6 p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl tracking-tight">audit</h1>
        <div className="flex gap-4">
          <Link href={`/history?${scopeQuery}`} className="text-xs">
            what changed →
          </Link>
          <Link href={`/trees/${scope.data}`} className="font-mono text-xs">
            {scope.data}
          </Link>
        </div>
      </div>

      {problem !== undefined && !problem.ok ? (
        <p className="text-ink-muted text-sm">{describeStoreError(problem.error)}</p>
      ) : audit !== undefined && audit.ok ? (
        <AuditVerdict report={describeAudit(audit.value)} treeId={scope.data} />
      ) : (
        <p className="text-ink-muted text-sm">
          This deployment cannot reproduce the shape this tree was created with, so its log
          cannot be folded from a starting point anything else established. Folding from the
          tree being served would compare it with itself.
        </p>
      )}

      <div className="flex gap-4">
        <Link href={`/audit?${scopeQuery}`} className="text-xs">
          run it again →
        </Link>
        <Link href="/audit" className="text-ink-muted text-xs">
          another tree
        </Link>
      </div>

      {storeIsDurable ? null : (
        <p className="text-ink-muted text-xs">
          No database is configured, so this audit read a log that lives in the server
          process and holds only what this instance has accepted. Set{" "}
          <span className="font-mono">DATABASE_URL</span> to audit what is actually stored.
        </p>
      )}
    </div>
  )
}

export default AuditPage
