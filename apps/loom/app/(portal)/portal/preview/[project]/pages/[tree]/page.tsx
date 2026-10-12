import Link from "next/link"
import { notFound } from "next/navigation"

import { Screen } from "@/app/(portal)/_components/screen"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"

import { PreviewBanner, ProjectShell } from "../../../_components/shell"
import { PARTS_IN_PAGE, PREVIEW_PARTS, partById, projectBySlug } from "../../../_lib/fixtures"

/**
 * The page inspector, which is the screen with the most specific complaints
 * against it and the clearest brief.
 *
 * What it replaces is 5,594px tall. The outline is 189 parts, every one of
 * them expanded, down the left; the preview is pinned top right; and the panel
 * that tells you what you selected is **underneath the outline** — about
 * eleven thousand pixels from the thing you clicked, on a page whose whole
 * subject is clicking parts of a preview. Because that panel is a small dashed
 * box when nothing is picked and a tall one when something is, selecting also
 * moves the page under you. That is the jump, and it is a layout bug rather
 * than an animation one.
 *
 * Three changes, each answering one of those:
 *
 * 1. **The outline collapses.** Only the top two levels are open, and a row
 *    says how many parts are inside it, so 189 is navigable rather than
 *    endless. There is a search box, because on a real page the fastest route
 *    to a part is its name.
 * 2. **The inspector sits beside the preview**, in the same sticky column, so
 *    what you pressed and what it says are in one glance.
 * 3. **Its space is reserved.** The panel is the same height empty as filled,
 *    so selecting a part changes its contents and moves nothing.
 */

const Chevron = ({ open }: { open: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
    aria-hidden
  >
    <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** Shown at depth 0 and 1; deeper rows arrive collapsed behind their parent. */
const OPEN_TO_DEPTH = 1

const InspectorPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ project: string; tree: string }>
  searchParams: Promise<{ part?: string }>
}) => {
  await requireActor("/portal/preview")

  const { project: slug, tree } = await params
  const { part: pickedId } = await searchParams
  const project = projectBySlug(slug)

  if (project === undefined) notFound()

  const base = `/portal/preview/${project.slug}/pages/${tree}`
  const picked = pickedId === undefined ? undefined : partById(pickedId)

  return (
    <ProjectShell project={project} rest="/pages">
      <Screen>
        <PreviewBanner />

        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl tracking-tight">Make your web page dynamic with AI and Loom</h1>
            <span className="text-ink-muted font-mono text-xs">
              {tree} · version 4 · {PARTS_IN_PAGE} parts
            </span>
          </div>
          <div className="flex gap-2">
            <Link
              href={`${base}/versions`}
              className="border-edge hover:bg-surface-hover rounded-md border px-2.5 py-1 text-xs no-underline"
            >
              Versions
            </Link>
            <button
              type="button"
              className="bg-affirm text-affirm-ink border-affirm-edge rounded-md border px-2.5 py-1 text-xs"
            >
              Ask for a change
            </button>
          </div>
        </div>

        <div className="flex gap-4">
          {/* The outline. Its own scroll, so the preview never leaves the screen. */}
          <div className="w-64 shrink-0">
            <input
              type="search"
              placeholder="Find a part…"
              className="border-edge bg-surface-base placeholder:text-ink-placeholder mb-2 w-full rounded-md border px-2.5 py-1.5 text-xs"
            />
            <ul className="border-edge-subtle bg-surface-base max-h-[32rem] list-none overflow-y-auto rounded-lg border p-1">
              {PREVIEW_PARTS.filter((part) => part.depth <= OPEN_TO_DEPTH + 1).map((part) => {
                const expandable = part.inside > 0 && part.depth <= OPEN_TO_DEPTH

                return (
                  <li key={part.id}>
                    <Link
                      href={`${base}?part=${part.id}`}
                      style={{ paddingLeft: `${part.depth * 12 + 6}px` }}
                      className={`flex items-center gap-1.5 rounded px-1.5 py-1 text-xs no-underline ${
                        picked?.id === part.id
                          ? "bg-surface-active text-ink"
                          : "text-ink-secondary hover:bg-surface-hover"
                      }`}
                    >
                      {expandable ? (
                        <Chevron open={part.depth < OPEN_TO_DEPTH + 1} />
                      ) : (
                        <span className="w-3 shrink-0" />
                      )}
                      <span className="truncate">{part.label}</span>
                      {part.inside > 0 && (
                        <span className="text-ink-placeholder ml-auto shrink-0 font-mono text-[10px]">
                          {part.inside}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
            <p className="text-ink-muted pt-1 text-[11px]">
              Showing {PREVIEW_PARTS.filter((part) => part.depth <= OPEN_TO_DEPTH + 1).length} of{" "}
              {PARTS_IN_PAGE}. Open a part to see what is inside it.
            </p>
          </div>

          {/* The preview and the inspector, in one sticky column. */}
          <div className="sticky top-16 min-w-0 flex-1">
            <div className="border-edge-subtle bg-surface-preview mb-3 flex h-[22rem] items-center justify-center rounded-lg border">
              <span className="text-ink-placeholder text-xs">
                the page, as a reader is being served it
              </span>
            </div>

            {/*
             * **The height is fixed and that is the whole point.** Empty and
             * filled are the same size, so pressing a part in the preview
             * above changes what this says and moves nothing. The screen this
             * replaces grew a panel on selection, eleven thousand pixels from
             * the preview, and shifted the page under the reader's hand.
             */}
            <div className="border-edge-subtle bg-surface-base h-[11rem] overflow-y-auto rounded-lg border p-3">
              {picked === undefined ? (
                <p className="text-ink-muted text-xs">
                  Nothing picked. Press a part above, or choose one from the outline.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm">{picked.label}</span>
                    <code className="text-ink-muted shrink-0 font-mono text-[11px]">
                      {picked.type}
                    </code>
                  </div>
                  {/*
                   * No raw identifier here. It is the runtime's word for the
                   * runtime's handle, a reader has no use for it at a glance,
                   * and 0261 keeps that vocabulary behind a disclosure rather
                   * than in a panel's first three rows.
                   */}
                  <dl className="divide-edge-subtle m-0 divide-y text-[11px]">
                    <div className="flex gap-2 py-1">
                      <dt className="text-ink-muted w-24 shrink-0">depth</dt>
                      <dd className="m-0 font-mono">{picked.depth}</dd>
                    </div>
                    <div className="flex gap-2 py-1">
                      <dt className="text-ink-muted w-24 shrink-0">parts inside</dt>
                      <dd className="m-0 font-mono">{picked.inside}</dd>
                    </div>
                  </dl>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      className="border-edge hover:bg-surface-hover rounded-md border px-2 py-1 text-[11px]"
                    >
                      Ask to change this part
                    </button>
                    <button
                      type="button"
                      className="border-edge hover:bg-surface-hover rounded-md border px-2 py-1 text-[11px]"
                    >
                      What readers did here
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Screen>
    </ProjectShell>
  )
}

export default InspectorPage
