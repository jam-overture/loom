import Link from "next/link"
import { notFound } from "next/navigation"

import { treeIdSchema } from "@jam-overture/loom"
import { projectIdSchema } from "@jam-overture/loom/store"

import { Screen } from "@/app/(portal)/_components/screen"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { requireActor, requireRole } from "@/app/(portal)/_lib/auth/identity"
import { EVERY_CHANGE, reviewHrefOf } from "@/app/(portal)/_lib/review-filter"
import { readReview } from "@/app/(portal)/_lib/review-reading"

import { ReviewCard, ReviewGaps } from "../../../review/_components/review-card"
import { PageHeading } from "../_components/page-heading"
import { PageTabs } from "../_components/page-tabs"

/**
 * A page's own *For review* tab (`docs/portal-wireframes.md`, *5 · Pages ·
 * History*: *The page · History · For review (N)*): the changes waiting for a
 * person on this page alone, whichever copy of it they were made to, with the
 * same cards and answers as the project's *For review* (one reading,
 * `_lib/review-reading.ts`), oldest first.
 *
 * It has no goal picker or standing chips: one page holds few changes, and the
 * project's list, linked under them, filters across every page.
 */
const PageReviewScreen = async ({
  params,
}: {
  params: Promise<{ project: string; tree: string }>
}) => {
  const route = await params
  const asked = projectIdSchema.safeParse(route.project)
  const treeId = treeIdSchema.safeParse(route.tree)

  if (!asked.success || !treeId.success) notFound()

  const projectId = asked.data
  const pageId = treeId.data

  /** Signed in first, with this address to come back to — the Connect screen's reason. */
  await requireActor(`/portal/${projectId}/pages/${pageId}/review`)

  const reading = await readReview(projectId, await requireRole(projectId))

  if (reading.kind !== "read" || reading.pageIds === undefined) {
    return (
      <Screen>
        <StateNotice tone="failure" title="The store did not answer">
          Nothing here is a statement about what waits for review on this page. Try again in a
          moment.
        </StateNotice>
      </Screen>
    )
  }

  if (!reading.pageIds.has(pageId)) notFound()

  const name = reading.pages?.get(pageId)
  const rows = reading.rows.filter((row) => row.pageId === pageId)
  const everything = (
    <Link href={`/portal/${projectId}/review`} className="text-ink underline">
      Everything for review
    </Link>
  )

  return (
    <Screen>
      <PageHeading projectId={projectId} pageId={pageId} name={name} />

      <PageTabs projectId={projectId} treeId={pageId} current="review" waiting={rows.length} />

      <div className="flex flex-col gap-3">
        <ReviewGaps unreadable={reading.unreadable} goalsRead={reading.goalsRead} />
        {rows.length === 0 ? (
          <StateNotice
            tone="empty"
            title="Nothing waits for review on this page"
            action={everything}
          >
            A change Loom proposes for this page waits here when it needs a person to say yes.
          </StateNotice>
        ) : (
          <>
            {rows.map((row) => (
              <ReviewCard
                key={row.proposalId}
                row={row}
                projectId={projectId}
                goalsRead={reading.goalsRead}
                open={reviewHrefOf(projectId, EVERY_CHANGE, row.proposalId)}
              />
            ))}
            <p className="text-ink-muted m-0 text-xs">
              {everything}, on every page, can be narrowed by goal and standing.
            </p>
          </>
        )}
      </div>
    </Screen>
  )
}

export default PageReviewScreen
