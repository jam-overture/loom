"use client"

import type { OutlineRow } from "@/app/(portal)/_lib/outline"
import type { OutlineEntry } from "@/app/(portal)/_lib/outline-view"
import { PART_KINDS, pointingWords } from "@/app/(portal)/_lib/vocabulary"

/** One row of the address book. Indent is the only thing depth is used for. */
const INDENT_PER_LEVEL = 14

const KIND_MARK = {
  element: "◆",
  slot: "◇",
  text: "·",
} as const

/**
 * The row's hover title was `describeAddressing(row.addressing)`, which is the
 * runtime describing its own delegation rule — `this primitive does not spread
 * loom.editable, so selection falls back to n_card1`. A tooltip is the one place
 * a technical string cannot be put behind a disclosure, so it is the one place
 * where the plain sentence has to *be* the surface. The runtime's own wording
 * for the same row is under the legend and in the pane beside the list.
 */
const titleFor = (row: OutlineRow): string =>
  `${PART_KINDS[row.kind].label} — ${pointingWords(row.addressing).label.toLowerCase()}`

/**
 * The fold control's own glyph, which is the prototype's.
 *
 * A rotation rather than two marks: the same shape pointing along the list and
 * then into it is what every file tree a developer already uses draws, and it is
 * the one convention on this screen worth borrowing rather than explaining.
 */
const Chevron = ({ open }: { readonly open: boolean }) => (
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

/**
 * `aria-pressed` rather than `aria-selected`, and it is the change phase 2
 * forced.
 *
 * A row used to be one of a set of which exactly one could be current, which is
 * what `aria-selected` means. It is now a toggle a reader turns on and off
 * independently of every other row, which is what `aria-pressed` means — and the
 * difference is what a screen reader says when the second row is picked. With
 * the wrong one it announces that the first row is no longer selected, which is
 * the behaviour this phase exists to remove.
 *
 * ## Two controls on a row, and why they are two
 *
 * A row that holds other parts has a fold control beside the row itself. They
 * are separate buttons because they do different things to different things:
 * picking a card scopes a change to that card, and opening it says what is in
 * it. One control doing both means a reader cannot look inside a part without
 * also asking for a change to it, which is the behaviour a file tree gets wrong
 * when it conflates the two.
 *
 * The fold control's name says what it does **and what it does it to** — *Show
 * what is inside Card* — because a list of twenty bare *Show* buttons is what a
 * screen reader otherwise reads out. The indent moves to the row's wrapper so
 * that the two controls indent together, which is the only thing that changed
 * about depth.
 */
export const OutlineRowButton = ({
  entry,
  isPicked,
  onPick,
  onToggle,
}: {
  readonly entry: OutlineEntry
  readonly isPicked: boolean
  readonly onPick: (nodeId: string) => void
  readonly onToggle: (nodeId: string) => void
}) => {
  const { row, partsInside, open } = entry

  return (
    <li
      className="flex items-center gap-1"
      style={{ paddingLeft: 4 + row.depth * INDENT_PER_LEVEL }}
    >
      {/*
        * The spacer is the fold control's own width — 12px of glyph inside 2px
        * of padding either side — so a row with nothing to open lines its mark
        * up with the rows that do. At `w-3` it was four pixels out, which is
        * invisible on one row and a wobbling column on fourteen.
        */}
      {open === null ? (
        <span className="w-4 shrink-0" aria-hidden />
      ) : (
        <button
          type="button"
          onClick={() => onToggle(row.nodeId)}
          aria-expanded={open}
          aria-label={`${open ? "Hide" : "Show"} what is inside ${row.label}`}
          className="text-ink-placeholder hover:text-ink flex shrink-0 items-center rounded-sm p-0.5"
        >
          <Chevron open={open} />
        </button>
      )}

      <button
        type="button"
        onClick={() => onPick(row.nodeId)}
        aria-pressed={isPicked}
        title={titleFor(row)}
        className={`flex min-w-0 flex-1 items-center gap-2 rounded-sm py-1 pr-2 pl-1 text-left text-xs ${
          isPicked ? "bg-surface-active text-ink" : "text-ink-secondary hover:bg-surface-hover"
        }`}
      >
        <span className="text-ink-placeholder" aria-hidden="true">
          {KIND_MARK[row.kind]}
        </span>
        {/*
          * Monospace was right while this said `loom.card`, because that is a
          * string you might paste somewhere. `Card` is a word, and setting a word
          * in the typeface a screen keeps for identifiers says it is one.
          */}
        <span className="truncate">{row.label}</span>
        {row.addressing.outcome !== "addressable" && (
          <span className="text-ink-placeholder ml-auto text-2xs" aria-hidden="true">
            ↑
          </span>
        )}
        {/*
          * The number of parts inside, on a row that is folded. It is the thing
          * that makes a fold a disclosure rather than a filter: a reader can see
          * there are nine parts in that card without opening it, and a row with
          * nothing in it says nothing instead of saying zero.
          */}
        {open === false && partsInside > 0 && (
          <span
            className="text-ink-placeholder ml-auto shrink-0 font-mono text-2xs"
            aria-hidden="true"
          >
            {partsInside}
          </span>
        )}
      </button>
    </li>
  )
}
