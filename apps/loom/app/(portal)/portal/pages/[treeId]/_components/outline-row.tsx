"use client"

import type { OutlineRow } from "@/app/(portal)/_lib/outline"
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
 * `aria-pressed` rather than `aria-selected`, and it is the change phase 2
 * forced.
 *
 * A row used to be one of a set of which exactly one could be current, which is
 * what `aria-selected` means. It is now a toggle a reader turns on and off
 * independently of every other row, which is what `aria-pressed` means — and the
 * difference is what a screen reader says when the second row is picked. With
 * the wrong one it announces that the first row is no longer selected, which is
 * the behaviour this phase exists to remove.
 */
export const OutlineRowButton = ({
  row,
  isPicked,
  onPick,
}: {
  readonly row: OutlineRow
  readonly isPicked: boolean
  readonly onPick: (nodeId: string) => void
}) => (
  <li>
    <button
      type="button"
      onClick={() => onPick(row.nodeId)}
      aria-pressed={isPicked}
      title={titleFor(row)}
      className={`flex w-full items-center gap-2 rounded-sm py-1 pr-2 text-left text-xs ${
        isPicked ? "bg-surface-active text-ink" : "text-ink-secondary hover:bg-surface-hover"
      }`}
      style={{ paddingLeft: 8 + row.depth * INDENT_PER_LEVEL }}
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
    </button>
  </li>
)
