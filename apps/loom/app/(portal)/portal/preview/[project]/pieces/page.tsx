import { notFound } from "next/navigation"

import { Screen } from "@/app/(portal)/_components/screen"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"

import { PreviewBanner, ProjectShell } from "../../_components/shell"
import {
  PIECES_REGISTERED,
  PIECE_GROUPS,
  PREVIEW_PIECES,
  projectBySlug,
  type PieceGroup,
} from "../../_lib/fixtures"

/**
 * What the AI may build from — as a table somebody can find something in.
 *
 * The screen this replaces is **10,426 pixels tall**: 107 cards in three
 * columns, each carrying a paragraph, with no search, no grouping and no
 * ordering a reader chose. The maintainer's words on 12 October were that
 * cards *"especially for any complex website will be overwhelming"*, and 107
 * is the starter set — somebody with their own component library has more.
 *
 * A piece is a row: what it is called, what it is for, whether this project
 * actually uses it, and how much of it there is to configure. The paragraph
 * each card carried is what a row expands to, not what it leads with.
 *
 * **The counts are what make it a tool rather than a catalogue.** *Used 0
 * times* is the only number on this screen that changes what somebody does
 * next: it is either a piece they could turn off, or one they meant to use
 * and have not.
 */

const PiecesPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ project: string }>
  searchParams: Promise<{ group?: string; show?: string }>
}) => {
  await requireActor("/portal/preview")

  const { project: slug } = await params
  const { group, show } = await searchParams
  const project = projectBySlug(slug)

  if (project === undefined) notFound()

  const base = `/portal/preview/${project.slug}/pieces`
  const unusedOnly = show === "unused"

  const shown = PREVIEW_PIECES.filter(
    (piece) =>
      (group === undefined || piece.group === group) && (!unusedOnly || piece.used === 0)
  )

  const used = PREVIEW_PIECES.filter((piece) => piece.used > 0).length

  const tab = (label: string, href: string, on: boolean) => (
    <a
      key={label}
      href={href}
      className={`rounded-md px-2 py-1 text-xs no-underline ${
        on ? "bg-surface-active text-ink" : "text-ink-secondary hover:bg-surface-hover"
      }`}
    >
      {label}
    </a>
  )

  return (
    <ProjectShell project={project} rest="/pieces">
      <Screen>
        <PreviewBanner />

        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-xl tracking-tight">Pieces</h1>
          <span className="text-ink-muted text-xs">
            {used} of {PIECES_REGISTERED} used on this project
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            placeholder="Search pieces"
            className="border-edge bg-surface-base placeholder:text-ink-placeholder w-56 rounded-md border px-2.5 py-1.5 text-sm"
          />
          <div className="border-edge-subtle flex gap-0.5 rounded-md border p-0.5">
            {tab("All", base, group === undefined && !unusedOnly)}
            {tab("Unused", `${base}?show=unused`, unusedOnly)}
          </div>
          <div className="flex flex-wrap gap-0.5">
            {PIECE_GROUPS.map((name: PieceGroup) =>
              tab(name, `${base}?group=${name}`, group === name)
            )}
          </div>
        </div>

        <table className="w-full table-fixed border-collapse text-left">
          <thead>
            <tr className="text-ink-muted border-edge-subtle border-b text-[10px] tracking-widest uppercase">
              <th className="w-[200px] py-1.5 pr-3 font-normal">Piece</th>
              <th className="w-[92px] py-1.5 pr-3 font-normal">Group</th>
              <th className="w-[76px] py-1.5 pr-3 font-normal">Used</th>
              <th className="w-[60px] py-1.5 pr-3 font-normal">Slots</th>
              <th className="w-[68px] py-1.5 pr-3 font-normal">Settings</th>
              <th className="py-1.5 font-normal">On for this project</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((piece) => (
              <tr key={piece.type} className="border-edge-subtle hover:bg-surface-hover border-b text-xs">
                <td className="truncate py-1.5 pr-3 font-mono">{piece.type}</td>
                <td className="text-ink-muted py-1.5 pr-3">{piece.group}</td>
                <td
                  className={`py-1.5 pr-3 font-mono ${piece.used === 0 ? "text-ink-placeholder" : ""}`}
                >
                  {piece.used}
                </td>
                <td className="text-ink-muted py-1.5 pr-3 font-mono">{piece.slots}</td>
                <td className="text-ink-muted py-1.5 pr-3 font-mono">{piece.props}</td>
                <td className="py-1.5">
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[10px] uppercase ${
                      piece.on
                        ? "bg-applied text-applied-ink border-applied-ink/20"
                        : "bg-neutral text-neutral-ink border-neutral-edge"
                    }`}
                  >
                    {piece.on ? "on" : "off"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {shown.length === 0 && (
          <p className="text-ink-muted py-6 text-center text-xs">Nothing matched.</p>
        )}
      </Screen>
    </ProjectShell>
  )
}

export default PiecesPage
