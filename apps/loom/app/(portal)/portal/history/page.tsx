import Link from "next/link"
import { notFound } from "next/navigation"

import { treeIdSchema } from "@jam-overture/loom"
import { describeStoreError } from "@jam-overture/loom/store"

import { ElsewhereNote } from "@/app/(portal)/_components/elsewhere-note"
import { PageViews } from "@/app/(portal)/_components/page-views"
import { ScopedLead } from "@/app/(portal)/_components/scoped-lead"
import { Measured, Screen } from "@/app/(portal)/_components/screen"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { pageNameOf, unnamed } from "@/app/(portal)/_lib/page-name"
import { namesInTree } from "@/app/(portal)/_lib/part-name"
import { screenName } from "@/app/(portal)/_lib/screen-names"
import {
  anchorOf,
  describeAnchorMiss,
  echoOf,
  historyPageHref,
  historyRead,
  parseRevisionParam,
} from "@/app/(portal)/_lib/history-link"
import { previewReversal, type Reversal } from "@/app/(portal)/_lib/reversal"
import { seedFor } from "@/app/(portal)/_lib/seeds"
import { ensureSeeded, portalStore, storeIsDurable } from "@/app/(portal)/_lib/store"

import { RevisionBox } from "./_components/revision-box"
import { RevisionRow } from "./_components/revision-row"
import { TreeChooser } from "./_components/tree-chooser"

/**
 * What was actually accepted into a tree, in the order it was applied.
 *
 * `/portal/activity` answers what the runtime was *asked* to do; this answers what
 * became of the tree — and the two are deliberately different views, because a
 * refused proposal appears in one and never in the other. 0016 made the log the
 * truth and the snapshot a view of it; this is the log, read directly.
 *
 * Each row also carries what its own delta cannot: what undoing it would put
 * back. A reconfigure records the value it set and not the one it wrote over; a
 * removal records the id it deleted and not the subtree that went with it. The
 * "before" side is gone from the tree as it stands and lives only in the log,
 * inverted — which is the one thing a reviewer deciding whether to undo actually
 * needs, and which nothing but a replay can produce.
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
  await requireActor("/portal/history")
  await ensureSeeded()

  if (tree === undefined) {
    return (
      <Screen>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl tracking-tight">{screenName("/portal/history")}</h1>
          <p className="text-ink-muted text-sm">
            Every change that has actually been made to one of your pages, newest first &mdash; and,
            for each one, exactly what undoing it would put back.
          </p>
        </div>
        <ElsewhereNote from="/portal/history" />
        <TreeChooser />
      </Screen>
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
      <Screen>
        <h1 className="text-2xl tracking-tight">{screenName("/portal/history")}</h1>
        <StateNotice tone="failure" title="We couldn&rsquo;t read this page&rsquo;s history.">
          <p>
            Nothing has been lost and nothing has changed &mdash; this is a screen that could not
            load, not a record that went missing. Your page is exactly as it was.
          </p>
          <p>
            Try again in a moment. If you came here to check whether a change was kept, this screen
            cannot answer that until the read works.
          </p>
          <TechnicalDetail summary="What went wrong">
            <p className="font-mono">{describeStoreError(page.error)}</p>
          </TechnicalDetail>
        </StateNotice>
      </Screen>
    )
  }

  const newestFirst = [...page.value.revisions].reverse()
  /**
   * What undoing each shown revision would restore and cost, read from the log.
   *
   * A revision's forward delta records only what it did; the value it wrote over,
   * the subtree it destroyed and the place a move came from are recoverable only
   * by inverting the log, which is what `previewReversal` asks the runtime to do
   * (0016, 0035). Computed here, on a review page, rather than on any render path.
   *
   * One plan per shown revision — the runtime's own forward walk, consumed rather
   * than reimplemented (0018). That is one bounded read per row: a review page can
   * afford it where a render path could not, the same trade 0041 made for
   * attribution. A host whose log grows long enough for the per-row cost to bite
   * is the case for a batched plan, filed as a finding rather than worked around.
   *
   * Absent for a host with no seed for this tree: without the shape the log
   * replays from, no inverse can be computed, and the row falls back to offering
   * undo and answering on the click (the same reason `undoRevision` needs one).
   */
  const seed = seedFor(scope.data)

  /**
   * The page as it stands, read once — for its name, and for the names of the
   * parts every sentence on this screen is about.
   *
   * One head read where there used to be one, doing two jobs. `nameFor` made
   * the same read and threw the tree away; the rows below need the tree itself,
   * because a delta names what it touched by id and the words for those ids are
   * in the tree or nowhere.
   *
   * "Or nowhere" is not quite true, and the exception is the interesting half:
   * a part a revision *deleted* is in no tree at all, and its name survives
   * only inside the inverse of the change that removed it. Each row merges what
   * its own inverse carries over this, which is why the map is passed down
   * rather than applied here.
   */
  const head = await portalStore.head(scope.data)
  const pageName = head.ok ? pageNameOf(head.value) : unnamed(scope.data)
  const standing = head.ok ? namesInTree(head.value) : new Map()

  const reversals: ReadonlyMap<number, Reversal | undefined> =
    seed === undefined
      ? new Map()
      : new Map(
          await Promise.all(
            newestFirst.map(
              async (stored) =>
                [
                  stored.revision,
                  await previewReversal(portalStore, scope.data, seed, stored.revision, standing),
                ] as const
            )
          )
        )

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
    <Screen>
      <Measured as="header" className="gap-2">
        <h1 className="text-2xl tracking-tight">{screenName("/portal/history")}</h1>
        {/*
         * "this page" meant the tree and nothing on screen said which tree it
         * was, except an id in the corner with an arrow after it. The id is in
         * the sentence now, where a reader meets it while being told what they
         * are looking at rather than beside a link out.
         */}
        <p className="text-ink-muted text-sm">
          <ScopedLead view="changed" page={pageName} />
        </p>
      </Measured>

      <PageViews treeId={scope.data} current="changed" />

      <ElsewhereNote from="/portal/history" treeId={scope.data} />

      <RevisionBox treeId={scope.data} typed={echoOf(named)} />

      {anchorMiss && <p className="text-ink-muted text-sm">{anchorMiss}</p>}

      {newestFirst.length === 0 ? (
        <StateNotice
          tone="empty"
          title="Nothing has been changed on this page yet."
          action={<Link href={`/portal/pages/${scope.data}`}>Open this page →</Link>}
        >
          <p>
            It is exactly as it was created &mdash; version 0. Open it, click any part of it, and
            ask for a change; whatever Loom does about it turns up here.
          </p>
          <p>
            An empty history never means a change was made and not kept. Every accepted change lands
            here, in order, and none of them is ever edited or removed.
          </p>
        </StateNotice>
      ) : (
        <ul className="flex flex-col gap-3">
          {newestFirst.map((stored) => (
            <RevisionRow
              key={stored.revision}
              stored={stored}
              anchored={stored.revision === anchor}
              reversal={reversals.get(stored.revision)}
              standing={standing}
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
            ← Show earlier changes
          </Link>
        )}
        {page.value.newer !== null && (
          <Link href={historyPageHref(scope.data, { newer: page.value.newer })} className="text-xs">
            Show later changes →
          </Link>
        )}
        {(older !== undefined || newer !== undefined || anchor !== undefined) && (
          <Link href={historyPageHref(scope.data)} className="text-xs">
            Jump to the newest →
          </Link>
        )}
      </div>

      {storeIsDurable ? null : (
        <StateNotice tone="notice">
          <p>
            This history is being kept in memory rather than in a database, so it holds only what
            has happened since this server last started and it will be empty again after a restart.
            Everything on this page is real; there is just less of it than there will be once a
            database is connected.
          </p>
          <TechnicalDetail summary="How to make it permanent">
            <p>
              {/*
               * The space is explicit because the implicit one did not survive a
               * production build on 24 August: this construction rendered as
               * `DATABASE_URLin this deployment's`, and a screenshot is what
               * caught it.
               */}
              Set <span className="font-mono">DATABASE_URL</span>{" "}
              in this deployment&rsquo;s environment and restart. Nothing already written is
              migrated &mdash; the history starts from the moment the database is connected.
            </p>
          </TechnicalDetail>
        </StateNotice>
      )}
    </Screen>
  )
}

export default HistoryPage
