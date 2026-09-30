import Link from "next/link"
import { notFound } from "next/navigation"

import { treeIdSchema } from "@jam-overture/loom"

import { PageViews } from "@/app/(portal)/_components/page-views"
import { ScopedLead } from "@/app/(portal)/_components/scoped-lead"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { pageNameOf, unnamed } from "@/app/(portal)/_lib/page-name"
import { pageViewHref, pageViewLabel } from "@/app/(portal)/_lib/page-views"
import { versionsOf } from "@/app/(portal)/_lib/progression"
import { seedFor } from "@/app/(portal)/_lib/seeds"
import { ensureSeeded, portalStore } from "@/app/(portal)/_lib/store"

import { VersionPlayer } from "./_components/version-player"

/**
 * Every version this page has been, drawn — and playable.
 *
 * `docs/portal.md` phase 3. The mechanism is one sentence: **a tree the record
 * produced rather than the one being served**, and `_lib/progression.ts` carries
 * the argument for how it is folded. What this file decides is what a reader
 * meets, and the four states it can be in.
 *
 * ## Why it is a screen and not a control on the page screen
 *
 * `/portal/pages/[treeId]` is where a reader asks for a change: its whole subject
 * is the page **as it stands**, and everything on it — the outline, the parts you
 * picked, the box you type in — addresses into that one tree. A version selector
 * there would make every one of those ambiguous about which version it was
 * addressing, and the first person to pick a part at version 3 and ask for a
 * change would be asking about a page nobody is being served.
 *
 * So it is the seventh view of one page, in the strip every scoped screen
 * already carries, and this screen has no way to ask for anything.
 *
 * ## It does not cross-reference the list of changes, deliberately
 *
 * The obvious line to write here is *"what each change did in words is in …"*,
 * and it is already written: it is a tab in the strip directly above, in the
 * portal's one wording for that screen. `ElsewhereNote` exists for the three
 * screens whose **names** are synonyms in ordinary English and whose subjects are
 * nearly opposites — a reader cannot guess from either name which is which. This
 * screen is not one of those: nothing about *how did it get here?* suggests it is
 * a list of changes, so a correction has nothing to correct.
 */

/**
 * Four states, and every one of them has to be readable by somebody who has
 * never read a decision record:
 *
 * 1. **Versions to look at** — the ordinary case, and the player.
 * 2. **Only ever one version** — the page has never been changed. The empty
 *    state, which the brief singles out as where a new person actually starts,
 *    so it names the one thing that would put a second version here.
 * 3. **The record could not be read** — nothing is wrong with the page, and the
 *    notice says so before it says anything else.
 * 4. **This host cannot rebuild the page's beginning** — the honest limit of
 *    0028. It is not a failure and must not be dressed as one: a page whose
 *    original shape a deployment cannot reproduce can still be served, changed
 *    and reviewed. It just cannot be replayed.
 */
const VersionsPage = async ({ params }: { params: Promise<{ treeId: string }> }) => {
  const { treeId } = await params
  const parsed = treeIdSchema.safeParse(treeId)

  if (!parsed.success) notFound()

  await requireActor(`/portal/pages/${parsed.data}/versions`)
  await ensureSeeded()

  /**
   * The page as it stands, read once, for its name. A screen that cannot name
   * the page it is scoped to still knows which page it is — `unnamed` is what
   * keeps the sentence a sentence.
   */
  const head = await portalStore.head(parsed.data)

  if (!head.ok && head.error.code === "not-found") notFound()

  const page = head.ok ? pageNameOf(head.value) : unnamed(parsed.data)
  const progression = await versionsOf(portalStore, parsed.data, seedFor(parsed.data))

  return (
    <div className="flex max-w-4xl flex-col gap-6 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl tracking-tight">{pageViewLabel("versions")}</h1>
        <p className="text-ink-muted text-sm">
          <ScopedLead view="versions" page={page} />
        </p>
      </header>

      <PageViews treeId={parsed.data} current="versions" />

      {progression.kind === "unknown-start" && (
        <StateNotice
          tone="notice"
          title="We can’t rebuild the earlier versions of this page."
          action={<Link href={pageViewHref("page", parsed.data)}>Open this page →</Link>}
        >
          <p>
            Loom can only draw a page as it used to be by starting from the shape it was first
            created in and re-applying every change since. This deployment doesn’t hold that
            starting shape for this page, so there is nothing to start from.
          </p>
          <p>
            Nothing is wrong and nothing is lost. The page itself is fine, every change made to it
            is still recorded, and you can still read what each one did.
          </p>
        </StateNotice>
      )}

      {progression.kind === "unreadable" && (
        <StateNotice tone="failure" title="We couldn’t read this page’s record.">
          <p>
            Nothing has been lost and nothing has changed — this is a screen that could not load.
            Your page is exactly as it was.
          </p>
          <p>Try again in a moment.</p>
          <TechnicalDetail summary="What went wrong">
            <p className="font-mono">{progression.detail}</p>
          </TechnicalDetail>
        </StateNotice>
      )}

      {progression.kind === "replayed" && (
        <>
          {progression.versions.length === 1 ? (
            <StateNotice
              tone="empty"
              title="This page has only ever looked one way."
              action={<Link href={pageViewHref("page", parsed.data)}>Open this page →</Link>}
            >
              <p>
                Nothing has been changed on it yet, so there is nothing to play. Open it, click any
                part of it, and ask for a change — the page as it is now becomes the first frame,
                and this screen starts filling up.
              </p>
            </StateNotice>
          ) : (
            <VersionPlayer versions={progression.versions} newest={progression.newest} />
          )}

          {/*
            * Said after the player rather than before it, and only when it is
            * true. A reader is here to look at a page; a sentence about how many
            * of its versions they are being shown is a qualification on what
            * they just looked at, and a qualification that arrives first reads as
            * a warning about a screen that is working perfectly.
            */}
          {progression.versions.length > 1 &&
            progression.versions[0]!.version > 0 &&
            progression.stopped === undefined && (
              <p className="text-ink-muted text-xs">
                This page has {progression.newest + 1} versions in all. These are the most recent{" "}
                {progression.versions.length}, in one unbroken run — nothing in between has been
                left out.
              </p>
            )}

          {progression.stopped !== undefined && (
            <StateNotice
              tone="failure"
              title="We can’t rebuild this page past this point."
              /*
                * Built through the strip's own address and labelled with the
                * strip's own words, rather than written out here. A screen that
                * writes another view's URL and its own name for it is the defect
                * `_lib/page-views.ts` exists to close — five screens once
                * carried five wordings for the same five destinations — and this
                * is an *action* rather than navigation, which is exactly the
                * case that used to get written by hand.
                */
              action={
                <Link href={pageViewHref("checkup", parsed.data)}>
                  {pageViewLabel("checkup")} →
                </Link>
              }
            >
              <p>
                Everything above is real: those versions were rebuilt from the page’s own record and
                they are exactly what it says they were. From version{" "}
                {progression.stopped.after + 1} onwards, the record no longer lines up, so Loom has
                stopped rather than guessing — a picture of a version that never existed would be
                worse than none.
              </p>
              <p>
                The page you are being served is not affected by this and nothing has been lost.
                What it means is that this page’s record can’t be replayed all the way through, and
                the checkup screen is where that gets diagnosed.
              </p>
              <TechnicalDetail summary="Where the replay stopped">
                <p className="font-mono">{progression.stopped.detail}</p>
              </TechnicalDetail>
            </StateNotice>
          )}
        </>
      )}
    </div>
  )
}

export default VersionsPage
