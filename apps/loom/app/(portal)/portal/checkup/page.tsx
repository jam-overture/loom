import Link from "next/link"
import { notFound } from "next/navigation"

import { collectNodeIds, treeIdSchema } from "@jam-overture/loom"
import { auditSnapshot, describeStoreError } from "@jam-overture/loom/store"

import { PageViews } from "@/app/(portal)/_components/page-views"
import { ScopedLead } from "@/app/(portal)/_components/scoped-lead"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { describeAudit } from "@/app/(portal)/_lib/audit-view"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { nameFor } from "@/app/(portal)/_lib/page-name"
import { seedFor } from "@/app/(portal)/_lib/seeds"
import { ensureSeeded, portalStore, storeIsDurable } from "@/app/(portal)/_lib/store"

import { CheckupBasis } from "./_components/checkup-basis"
import { CheckupVerdictPanel } from "./_components/checkup-verdict"
import { CheckupTreeChooser } from "./_components/tree-chooser"

/**
 * Whether the history still produces the page being served.
 *
 * This was `/portal/audit`, and *audit* is a compliance word. What a person
 * wants from it is an answer to "is my page still what its history says it is",
 * so the route, the nav label and the heading now ask that instead. The
 * measurement underneath is identical: one `auditSnapshot` fold from the seed,
 * on demand, exactly as before.
 *
 * `/portal/history` shows what the record says happened and `/portal/pages`
 * shows what is being served. Nothing until this page checked that the first
 * still produces the second — 0016 made the snapshot a materialised view of the
 * log, and a view nobody verifies is a claim rather than a fact.
 *
 * On demand, by naming a tree. The fold is a read over every accepted change,
 * which is exactly the cost 0016 introduced the snapshot to avoid on a request
 * path — so it runs when a reviewer asks and never as a side effect of opening
 * a page. The tree is in the URL, so a result is a link somebody can be sent.
 *
 * A tree with no known seed is refused rather than approximated. Folding from
 * the snapshot would compare the tree with itself and agree every time, which
 * is worse than no answer: it is a green tick that means nothing.
 */
const CheckupPage = async ({ searchParams }: { searchParams: Promise<{ tree?: string }> }) => {
  const { tree } = await searchParams
  await requireActor("/portal/checkup")
  await ensureSeeded()

  if (tree === undefined) {
    return (
      <div className="flex max-w-3xl flex-col gap-6 p-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl tracking-tight">Does everything add up?</h1>
          <p className="text-ink-muted text-sm">
            Loom keeps a record of every change it has made to a page. A checkup replays that
            record from the beginning and compares the result with the page people are actually
            being served — so you can tell whether everything on it is accounted for.
          </p>
        </header>

        {/*
         * The one obvious thing to do, and until this run there was not one.
         *
         * This screen used to open on a list of pages with an identical button
         * on every row, which is a screen with as many primary actions as you
         * have pages — which is to say none. The question somebody arrives with
         * is not "which page shall I check"; it is "is anything wrong". So the
         * press that answers the question they have is the one at the top, and
         * picking a single page is what it degrades to.
         *
         * It is a link rather than a form because a sweep reads and writes
         * nothing. The cost is real and is why it does not run on this screen —
         * see the address it leads to — but it is a read, and a read a reviewer
         * can send somebody.
         */}
        <div className="flex flex-col gap-2">
          <Link
            href="/portal/checkup/everything"
            className="bg-affirm text-affirm-ink border-affirm-edge self-start rounded-md border px-3 py-1.5 no-underline"
          >
            Check every page →
          </Link>
          <p className="text-ink-muted text-xs">
            One answer over every page Loom is looking after. It replays each page&rsquo;s whole
            history, so it takes a moment.
          </p>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="text-ink-secondary text-sm">Or check one page</h2>
          <CheckupTreeChooser />
        </section>
      </div>
    )
  }

  const scope = treeIdSchema.safeParse(tree)
  if (!scope.success) notFound()

  const seed = seedFor(scope.data)

  /**
   * A tree nobody stores is a wrong URL, not an uncheckable tree — so an unknown
   * seed still costs one read to tell the two apart. Without it a mistyped id
   * comes back as a considered refusal to check something that was never there.
   */
  const found = seed === undefined ? await portalStore.head(scope.data) : undefined
  const audit = seed === undefined ? undefined : await auditSnapshot(portalStore, scope.data, seed)

  const problem = [found, audit].find((result) => result !== undefined && !result.ok)
  if (problem !== undefined && !problem.ok && problem.error.code === "not-found") notFound()

  /**
   * Read once, above the JSX, because two things below it need the same report
   * and calling `describeAudit` twice would let the verdict and the basis
   * describe two different folds.
   */
  const report = audit !== undefined && audit.ok ? describeAudit(audit.value) : undefined

  /**
   * What this page is called, for the sentence that says which page is being
   * checked. One bounded head read; a failed one costs the name and nothing
   * else.
   */
  const pageName = await nameFor(portalStore, scope.data)

  const scopeQuery = `tree=${encodeURIComponent(scope.data)}`

  return (
    <div className="flex max-w-3xl flex-col gap-6 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl tracking-tight">Does this page add up?</h1>
        {/*
         * The heading asks about "this page" and the only thing that said which
         * page was a bare monospace id in the corner, doing double duty as a
         * link. The id is in the sentence now and the links are the strip.
         */}
        <p className="text-ink-muted text-sm">
          <ScopedLead view="checkup" page={pageName} />
        </p>
      </header>

      <PageViews treeId={scope.data} current="checkup" />

      {problem !== undefined && !problem.ok ? (
        <StateNotice tone="failure" title="We couldn't check this page.">
          <p>
            Nothing is wrong with the page itself — the check reads its history, and that read
            didn&rsquo;t come back. Try again in a moment.
          </p>
          <p>
            No verdict is shown rather than a hopeful one. A checkup that could not run is not a
            checkup that passed.
          </p>
          <TechnicalDetail>
            <p className="font-mono">{describeStoreError(problem.error)}</p>
          </TechnicalDetail>
        </StateNotice>
      ) : seed !== undefined && report !== undefined ? (
        <>
          <CheckupVerdictPanel report={report} treeId={scope.data} />
          {/*
           * Below the verdict and below the differences: the answer, then what
           * to do about it, then the parts that disagree, and only then what
           * the check was made of.
           */}
          <CheckupBasis report={report} startingParts={collectNodeIds(seed.root).length} />
        </>
      ) : (
        <StateNotice tone="notice" title="This page can't be checked here.">
          <p>
            A checkup has to start from the shape a page was first created with, and this
            deployment doesn&rsquo;t know that shape for this one. Starting from the page being
            served instead would compare it with itself and agree every time.
          </p>
          <TechnicalDetail summary="Why a seed is needed and cannot be inferred">
            <p>
              0016 makes the log the truth and the snapshot a view of it, so neither is revision
              0 once a single delta has been accepted. A host that cannot reproduce a tree&rsquo;s
              original shape cannot fold its log from a starting point anything else established
              (0028), and folding from the answer being checked is a green tick that means
              nothing.
            </p>
          </TechnicalDetail>
        </StateNotice>
      )}

      <div className="flex gap-4">
        <Link href={`/portal/checkup?${scopeQuery}`} className="text-xs">
          Check again →
        </Link>
        <Link href="/portal/checkup/everything" className="text-xs">
          Check every page →
        </Link>
      </div>

      {storeIsDurable ? null : (
        <StateNotice tone="notice">
          <p>
            <strong className="font-medium">This checked a temporary copy.</strong> No database is
            set up, so the history it read lives in the server process and holds only what this
            instance has accepted.
          </p>
          <TechnicalDetail summary="What to set">
            <p>
              Set <span className="font-mono">DATABASE_URL</span> to check what is actually
              stored. Until then a restart is a fresh start, and a verdict here is a verdict over
              whatever this one instance happens to have seen.
            </p>
          </TechnicalDetail>
        </StateNotice>
      )}
    </div>
  )
}

export default CheckupPage
