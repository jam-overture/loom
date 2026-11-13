import Link from "next/link"
import { notFound } from "next/navigation"

import { projectIdSchema } from "@jam-overture/loom/store"

import { Screen } from "@/app/(portal)/_components/screen"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { requireActor, requireRole } from "@/app/(portal)/_lib/auth/identity"
import { mayAdminister } from "@/app/(portal)/_lib/auth/roles"
import {
  audienceRulesFor,
  readPageRules,
  rulesPagesOf,
  type RulesPage,
} from "@/app/(portal)/_lib/segments/rules"
import {
  conditionsSentence,
  conditionsText,
  contextKeysOf,
  MAX_SEGMENTS,
  segmentsOf,
  segmentWordOf,
  type PageRules,
  type Segment,
} from "@/app/(portal)/_lib/segments/segment"
import {
  readSegmentViews,
  segmentViewsWords,
  type SegmentViews,
} from "@/app/(portal)/_lib/segments/segment-views"
import { arrivalRangeFor } from "@/app/(portal)/_lib/signals-range"
import { portalApplications, portalProjects } from "@/app/(portal)/_lib/store"
import { plainMoment } from "@/app/(portal)/_lib/when"
import { PORTAL_READ_BUDGET_MS } from "@/app/_lib/app/bounded"
import { boundedReaderTallyStore, readWithin, unavailable } from "@/app/_lib/app/bounded-store"
import { soleApplicationOf } from "@/app/_lib/app/sole-application"
import { publishedPagesFor } from "@/app/_lib/pages/store"
import { readingsFor } from "@/app/_lib/reader-signals/intake"

import { PlaceControls, RemoveSegment } from "./_components/segment-controls"
import { SegmentForm, type SegmentDraft } from "./_components/segment-form"

/**
 * *Segments* (unit 9 of `docs/portal.md`, piece 1 of 0371, *6 · Segments* of
 * the wireframes): the groups of readers a project's site sorts its readers
 * into, and the rules that sort them.
 *
 * A segment is an audience (0263). Its rules are kept in 0376's store, one
 * ordered list per page, and this screen is where they are written and read
 * (0371 clause 3): the list of segments, each page's order (a later segment
 * wins a part two of them change), and what the site's server has to set and
 * send. Each segment's page views over the last 7 days come from the counters
 * every delivery is already filed under by audience (0284), *None yet* until
 * the site names it.
 *
 * `?segment=new` opens the drawer an owner adds one in, `?segment=<word>` the
 * same drawer on that segment; everybody else reads.
 */

const NO_SITE_SORTS =
  "Your site does not sort its readers into segments yet. The Loom package that pulls your pages does not read these rules yet, so every reader is still served the page as published, and every segment says None yet. Writing segments now is safe: nothing a reader sees changes until it does."

type Listing = {
  readonly segments: readonly Segment[]
  readonly pages: readonly PageRules[]
  readonly views: ReadonlyMap<string, SegmentViews>
}

const pagesWords = (segment: Segment, total: number): string =>
  segment.places.length === total && total > 1
    ? "Every page"
    : segment.places.length === 1
      ? (segment.places[0]?.page ?? "")
      : `${segment.places.length} of ${total} pages`

const SegmentRow = ({
  segment,
  listing,
  projectId,
  owner,
}: {
  segment: Segment
  listing: Listing
  projectId: string
  owner: boolean
}) => (
  <tr className="border-edge-subtle border-t align-top">
    <td className="py-2 pr-3">
      <span className="text-sm">{segment.word}</span>
      <span className="text-ink-muted block font-mono text-[11px]">{segment.audienceId}</span>
    </td>
    <td className="py-2 pr-3 text-xs">
      {segment.sameEverywhere ? (
        conditionsSentence(segment.places[0]?.clauses ?? [])
      ) : (
        <ul className="m-0 list-none p-0">
          {segment.places.map((place) => (
            <li key={place.treeId}>
              <span className="text-ink-muted">{place.page}:</span>{" "}
              {conditionsSentence(place.clauses)}
            </li>
          ))}
        </ul>
      )}
    </td>
    <td className="py-2 pr-3 text-xs">{pagesWords(segment, listing.pages.length)}</td>
    <td className="py-2 pr-3 text-xs">
      {segmentViewsWords(listing.views.get(segment.audienceId))}
    </td>
    {owner && (
      <td className="py-2 text-right">
        <div className="flex flex-col items-end gap-1.5 sm:flex-row sm:items-start sm:justify-end">
          <Link
            href={`/portal/${projectId}/segments?segment=${segment.word}`}
            className="border-edge text-ink rounded-md border px-2 py-0.5 text-xs no-underline"
          >
            Change
          </Link>
          <RemoveSegment projectId={projectId} word={segment.word} />
        </div>
      </td>
    )}
  </tr>
)

const SegmentList = ({
  listing,
  projectId,
  owner,
}: {
  listing: Listing
  projectId: string
  owner: boolean
}) =>
  listing.segments.length === 0 ? (
    <p className="text-ink-muted text-sm">
      This project has no segments yet. Every reader is served the same page.{" "}
      {owner
        ? "Add one, and your site can serve it a page of its own later."
        : "An owner of the project adds them."}
    </p>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left">
        <thead className="text-ink-muted text-xs">
          <tr>
            <th className="py-1.5 pr-3 font-normal">Segment</th>
            <th className="py-1.5 pr-3 font-normal">Who is in it</th>
            <th className="py-1.5 pr-3 font-normal">On</th>
            <th className="py-1.5 pr-3 font-normal">Last 7 days</th>
            {owner && <th className="py-1.5 font-normal" />}
          </tr>
        </thead>
        <tbody>
          {listing.segments.map((segment) => (
            <SegmentRow
              key={segment.audienceId}
              segment={segment}
              listing={listing}
              projectId={projectId}
              owner={owner}
            />
          ))}
        </tbody>
      </table>
    </div>
  )

/** Each page's order, where the later of two segments changing one part is the one its readers see. */
const PageOrders = ({
  pages,
  projectId,
  owner,
}: {
  pages: readonly PageRules[]
  projectId: string
  owner: boolean
}) => {
  const ordered = pages.filter((page) => (page.head?.rules.length ?? 0) > 0)

  return ordered.length === 0 ? null : (
    <section className="flex flex-col gap-2">
      <h2 className="m-0 text-sm font-medium">Order on each page</h2>
      <p className="text-ink-muted m-0 text-xs">
        A reader can be in more than one segment. Where two of their segments change the same part
        of a page, the one lower in that page&rsquo;s list is what they see, so put the broad
        segments first and the narrow ones after.
      </p>
      {ordered.map((page) => {
        const rules = page.head?.rules ?? []

        return (
          <div key={page.treeId} className="border-edge-subtle rounded-lg border px-3 py-2">
            <p className="m-0 text-sm">{page.name}</p>
            {page.head !== undefined && (
              <p className="text-ink-muted m-0 text-[11px]">
                Changed {plainMoment(page.head.recordedAt)} by {page.head.actor}, change{" "}
                {page.head.revision}
              </p>
            )}
            <ol className="m-0 mt-1.5 flex list-none flex-col gap-1 p-0">
              {rules.map((rule, index) => (
                <li
                  key={rule.audienceId}
                  className="flex flex-wrap items-start justify-between gap-2 text-xs"
                >
                  <span>
                    {index + 1}.{" "}
                    <span className="font-medium">{segmentWordOf(rule.audienceId)}</span>{" "}
                    <span className="text-ink-muted">{conditionsSentence(rule.clauses)}</span>
                  </span>
                  {owner && (
                    <PlaceControls
                      projectId={projectId}
                      word={segmentWordOf(rule.audienceId)}
                      treeId={page.treeId}
                      revision={page.head?.revision ?? 0}
                      first={index === 0}
                      last={index === rules.length - 1}
                    />
                  )}
                </li>
              ))}
            </ol>
          </div>
        )
      })}
    </section>
  )
}

/** What the site's server must set while it draws a page, and what it must put on its signals. */
const SiteSends = ({ segments }: { segments: readonly Segment[] }) => {
  const keys = contextKeysOf(segments)

  return segments.length === 0 ? null : (
    <section className="flex flex-col gap-1.5">
      <h2 className="m-0 text-sm font-medium">What your site sends</h2>
      <p className="text-ink-muted m-0 text-xs">
        Your site&rsquo;s server sets{" "}
        {keys.map((key, index) => (
          <span key={key}>
            {index > 0 && (index === keys.length - 1 ? " and " : ", ")}
            <code>{key}</code>
          </span>
        ))}{" "}
        for each reader, as words, from what it already knows while it draws the page: Loom never
        sees them. The signals of a reader in a segment name it (
        {segments.map((segment, index) => (
          <span key={segment.audienceId}>
            {index > 0 && ", "}
            <code>{segment.audienceId}</code>
          </span>
        ))}
        ), and a reader in none with none.
      </p>
    </section>
  )
}

const draftFor = (asked: string, listing: Listing): SegmentDraft | undefined => {
  if (asked === "new") return { word: "", conditions: "", on: "every" }

  const segment = listing.segments.find((each) => each.word === asked)
  const first = segment?.places[0]

  return segment === undefined || first === undefined
    ? undefined
    : {
        word: segment.word,
        conditions: conditionsText(first.clauses),
        on:
          segment.places.length === listing.pages.length && listing.pages.length > 1
            ? "every"
            : first.treeId,
      }
}

const SegmentDrawer = ({
  projectId,
  pages,
  draft,
  full,
}: {
  projectId: string
  pages: readonly RulesPage[]
  draft: SegmentDraft
  full: boolean
}) => {
  const changing = draft.word !== ""

  return (
    <aside
      aria-label={changing ? "Change segment" : "New segment"}
      className="border-edge-subtle bg-surface-base flex w-full shrink-0 flex-col self-start rounded-lg border lg:w-[440px]"
    >
      <div className="border-edge-subtle flex items-start justify-between gap-3 border-b px-4 py-3">
        <h2 className="m-0 text-sm font-medium">
          {changing ? `Change ${draft.word}` : "New segment"}
        </h2>
        <Link
          href={`/portal/${projectId}/segments`}
          className="text-ink-muted text-xs no-underline"
          aria-label="Close"
        >
          ✕
        </Link>
      </div>
      <div className="px-4 py-3">
        {pages.length === 0 ? (
          <StateNotice
            tone="empty"
            title="No page has been published yet"
            action={
              <Link href={`/portal/${projectId}/connect`} className="text-ink underline">
                Connect your site
              </Link>
            }
          >
            A segment&rsquo;s rules are kept with each page, so your site publishes its pages first.
          </StateNotice>
        ) : full && !changing ? (
          <p className="text-ink-muted m-0 text-sm">
            This project has {MAX_SEGMENTS} segments, the most it can have. Remove one before adding
            another.
          </p>
        ) : (
          <SegmentForm projectId={projectId} pages={pages} draft={draft} changing={changing} />
        )}
      </div>
    </aside>
  )
}

const SegmentsPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ project: string }>
  searchParams: Promise<Readonly<Record<string, string | readonly string[] | undefined>>>
}) => {
  const asked = projectIdSchema.safeParse((await params).project)
  const query = await searchParams

  if (!asked.success) notFound()

  const projectId = asked.data

  await requireActor(`/portal/${projectId}/segments`)

  const role = await requireRole(projectId)

  const [project, applications] = await Promise.all([
    portalProjects.get(projectId),
    portalApplications.list({ closed: "all" }),
  ])

  const application = applications.ok ? soleApplicationOf(applications.value, projectId) : undefined

  const published =
    application === undefined
      ? undefined
      : await readWithin(
          () => publishedPagesFor(application.applicationId).list(),
          unavailable,
          PORTAL_READ_BUDGET_MS
        )
  const pages = published?.ok === true ? rulesPagesOf(published.value) : []
  const rules =
    application === undefined || published?.ok !== true
      ? undefined
      : await readPageRules(audienceRulesFor(application.applicationId), pages)
  const segments = rules?.ok === true ? segmentsOf(rules.pages) : []
  const signals = application === undefined ? undefined : readingsFor(application.applicationId)
  const views =
    signals === undefined
      ? new Map<string, SegmentViews>()
      : await readSegmentViews(
          boundedReaderTallyStore(signals.tallies),
          segments.map((segment) => segment.audienceId),
          arrivalRangeFor("7d", Date.now())
        )

  const closed =
    project.ok && (project.value.closedAt !== undefined || application?.closedAt !== undefined)
  const owner = mayAdminister(role) && !closed
  const segmentAsked = typeof query.segment === "string" ? query.segment : undefined

  const body = (() => {
    if (!project.ok || !applications.ok) {
      return (
        <StateNotice tone="failure" title="The store did not answer">
          Nothing here is a statement about this project&rsquo;s segments. Try again in a moment.
        </StateNotice>
      )
    }

    if (application === undefined) {
      return (
        <StateNotice tone="failure" title="There is no single site to sort readers for">
          This project does not hold exactly one site. Tell whoever runs this deployment.
        </StateNotice>
      )
    }

    if (published?.ok !== true) {
      return (
        <StateNotice tone="failure" title="Your site's pages could not be read">
          A segment&rsquo;s rules are kept with each page, so nothing can be said about them until
          the pages can be read. Try again in a moment.
        </StateNotice>
      )
    }

    if (rules?.ok !== true) {
      return (
        <StateNotice tone="failure" title="Segments cannot be read here">
          This deployment could not read its segments. If segments are new to it, whoever runs it
          has to run <code>pnpm db:push</code> once; otherwise try again in a moment.
        </StateNotice>
      )
    }

    const listing: Listing = { segments, pages: rules.pages, views }
    const draft = owner && segmentAsked !== undefined ? draftFor(segmentAsked, listing) : undefined

    return (
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <p className="text-ink-muted m-0 text-sm">
            A segment is a group of readers your site&rsquo;s server sorts into by what it already
            knows while it draws a page: a phone, a reader from search, someone who has been before.
            Loom never learns why a reader is in one; only the segment&rsquo;s name arrives with
            their signals.
          </p>
          <p className="text-ink-muted m-0 text-xs" role="note">
            {NO_SITE_SORTS}
          </p>
          <SegmentList listing={listing} projectId={projectId} owner={owner} />
          <PageOrders pages={rules.pages} projectId={projectId} owner={owner} />
          <SiteSends segments={segments} />
        </div>
        {draft !== undefined && (
          <SegmentDrawer
            projectId={projectId}
            pages={pages}
            draft={draft}
            full={segments.length >= MAX_SEGMENTS}
          />
        )}
      </div>
    )
  })()

  return (
    <Screen>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl tracking-tight">Segments</h1>
          {project.ok && <p className="text-ink-muted text-sm">{project.value.name}</p>}
        </div>
        {owner && segmentAsked === undefined && (
          <Link
            href={`/portal/${projectId}/segments?segment=new`}
            className="bg-ink text-surface-base rounded-md px-3 py-1.5 text-sm no-underline"
          >
            New segment
          </Link>
        )}
      </div>

      {body}
    </Screen>
  )
}

export default SegmentsPage
