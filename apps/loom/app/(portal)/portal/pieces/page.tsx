import Link from "next/link"

import { catalogueOf } from "@jam-overture/loom/sdk"

import { Screen } from "@/app/(portal)/_components/screen"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { MOST_PAGES_DRAWN, pieceUsage, type PieceUsage } from "@/app/(portal)/_lib/app-view"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { headsOf } from "@/app/(portal)/_lib/page-name"
import { settingsOf } from "@/app/(portal)/_lib/piece-view"
import { portalRegistry } from "@/app/(portal)/_lib/registry"
import { ensureSeeded, portalStore } from "@/app/(portal)/_lib/store"

/**
 * What the AI may build from — as a table somebody can find something in.
 *
 * ## What this replaces
 *
 * 107 cards in three columns, each carrying a paragraph, with no search, no
 * grouping and no order a reader chose. Photographed on 12 October at **10,426
 * pixels**, which is eleven screens. The maintainer's verdict was that cards
 * *"especially for any complex website will be overwhelming"*, and 107 is the
 * starter set — somebody with their own component library has more.
 *
 * ## Why a row rather than a card
 *
 * A card is the right shape for a thing you browse and the wrong one for a
 * thing you look up. Nobody arrives here to read about `loom.tier`; they arrive
 * to find out whether a piece is registered, whether anything uses it, and how
 * much of it there is to configure. Those are four short facts, which is a row.
 *
 * The sentence each card led with is the registry's own description and is kept
 * — it is what the model is handed (0013), so a screen that dropped it would be
 * showing something other than the catalogue. It is the row's last column, where
 * a reader scanning the first four can ignore it.
 *
 * ## The one number that changes what somebody does
 *
 * **Used.** Zero means either a piece to turn off or one they meant to use and
 * have not, and both are actions. It is counted over the pages actually drawn
 * rather than over the store, for `app-view.ts`'s reason: a count that silently
 * spanned pages the reader cannot see is the one number here nobody could check.
 * The window's size is stated below the table.
 */

const usedFilter = (shown: string | undefined) => (piece: PieceUsage) =>
  shown === "unused" ? piece.used === 0 : shown === "used" ? piece.used > 0 : true

const PiecesPage = async ({ searchParams }: { searchParams: Promise<{ show?: string }> }) => {
  await requireActor("/portal/pieces")
  await ensureSeeded()

  const { show } = await searchParams
  const catalogue = catalogueOf(portalRegistry)

  /*
   * The same window `Your app` draws, so the two cannot disagree about what
   * "used" counts. When that screen goes, this becomes the only reader of it.
   */
  const listed = await portalStore.list({ limit: MOST_PAGES_DRAWN })
  const trees = listed.ok
    ? [...(await headsOf(portalStore, listed.value.trees.map((row) => row.treeId))).values()]
    : []

  const pieces = pieceUsage(portalRegistry, trees)
  const settings = new Map(catalogue.map((entry) => [String(entry.type), settingsOf(entry)]))
  const slots = new Map(catalogue.map((entry) => [String(entry.type), entry.slots.length]))
  const describes = new Map(catalogue.map((entry) => [String(entry.type), entry.description]))

  const shown = pieces.filter(usedFilter(show))
  const used = pieces.filter((piece) => piece.used > 0).length

  const tab = (label: string, href: string, on: boolean) => (
    <Link
      key={label}
      href={href}
      className={`rounded-md px-2 py-1 text-xs no-underline ${
        on ? "bg-surface-active text-ink" : "text-ink-secondary hover:bg-surface-hover"
      }`}
    >
      {label}
    </Link>
  )

  return (
    <Screen>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-xl tracking-tight">Pieces</h1>
        <span className="text-ink-muted text-xs">
          {used} of {pieces.length} used on the {trees.length} page
          {trees.length === 1 ? "" : "s"} below
        </span>
      </div>

      {pieces.length === 0 ? (
        <StateNotice
          tone="empty"
          title="Nothing is registered here."
          action={
            <Link
              href="/docs/building-with-loom/primitives"
              className="bg-affirm text-affirm-ink border-affirm-edge rounded-md border px-3 py-1.5 no-underline"
            >
              How a piece gets registered →
            </Link>
          }
        >
          <p>
            This is the list the AI is handed every time somebody asks for a change. While it is
            empty there is nothing for a change to be made out of, so nothing can be proposed.
          </p>
        </StateNotice>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="border-edge-subtle flex gap-0.5 rounded-md border p-0.5">
              {tab("All", "/portal/pieces", show === undefined)}
              {tab("Used", "/portal/pieces?show=used", show === "used")}
              {tab("Unused", "/portal/pieces?show=unused", show === "unused")}
            </div>
            <span className="text-ink-muted text-[11px]">
              {shown.length} shown
            </span>
          </div>

          <table className="w-full table-fixed border-collapse text-left">
            <thead>
              <tr className="text-ink-muted border-edge-subtle border-b text-[10px] tracking-widest uppercase">
                <th className="w-[150px] py-1.5 pr-3 font-normal">Piece</th>
                <th className="w-[170px] py-1.5 pr-3 font-normal">Name</th>
                <th className="w-[56px] py-1.5 pr-3 font-normal">Used</th>
                <th className="w-[54px] py-1.5 pr-3 font-normal">Slots</th>
                <th className="w-[72px] py-1.5 pr-3 font-normal">Settings</th>
                <th className="py-1.5 font-normal">What it is for</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((piece) => {
                const setting = settings.get(String(piece.type))

                return (
                  <tr
                    key={String(piece.type)}
                    className="border-edge-subtle hover:bg-surface-hover border-b align-top text-xs"
                  >
                    <td className="truncate py-1.5 pr-3 font-mono" title={String(piece.type)}>
                      {String(piece.type)}
                    </td>
                    <td className="truncate py-1.5 pr-3">{piece.name}</td>
                    <td
                      className={`py-1.5 pr-3 font-mono ${piece.used === 0 ? "text-ink-placeholder" : ""}`}
                    >
                      {piece.used}
                    </td>
                    <td className="text-ink-muted py-1.5 pr-3 font-mono">
                      {slots.get(String(piece.type)) ?? 0}
                    </td>
                    {/*
                     * An em dash for `unknowable`, which is not zero. A piece
                     * whose declared schema is not an object has settings that
                     * cannot be enumerated — `catalogue.ts` is explicit that
                     * this is "unknown, which is not the same claim as none",
                     * and a 0 here would make it the same claim.
                     */}
                    <td className="text-ink-muted py-1.5 pr-3 font-mono">
                      {setting === undefined || setting.kind === "unknowable"
                        ? "—"
                        : setting.kind === "none"
                          ? 0
                          : setting.required.length + setting.optional.length}
                    </td>
                    <td className="text-ink-secondary py-1.5">
                      {describes.get(String(piece.type)) ?? ""}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {shown.length === 0 && (
            <p className="text-ink-muted py-6 text-center text-xs">
              Nothing matched. Every registered piece is in use.
            </p>
          )}

          <TechnicalDetail summary="What “used” is counted over">
            <p>
              The {trees.length} most recently stored page{trees.length === 1 ? "" : "s"}, which is
              a window rather than a sample — a sample has holes and a reader cannot tell a hole
              from a piece nothing uses. A piece used only on a page outside the window reads as
              unused here, and the count above says how wide the window is.
            </p>
          </TechnicalDetail>
        </>
      )}
    </Screen>
  )
}

export default PiecesPage
