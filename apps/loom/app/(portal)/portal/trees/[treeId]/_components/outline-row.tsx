"use client"

import { describeAddressing } from "@loom/runtime/react"

import type { OutlineRow } from "@/app/(portal)/_lib/outline"

/** One row of the address book. Indent is the only thing depth is used for. */
const INDENT_PER_LEVEL = 14

const KIND_MARK = {
  element: "◆",
  slot: "◇",
  text: "·",
} as const

export const OutlineRowButton = ({
  row,
  isSelected,
  onSelect,
}: {
  readonly row: OutlineRow
  readonly isSelected: boolean
  readonly onSelect: (nodeId: string) => void
}) => (
  <li>
    <button
      type="button"
      onClick={() => onSelect(row.nodeId)}
      title={describeAddressing(row.addressing)}
      className={`flex w-full items-center gap-2 rounded-sm py-1 pr-2 text-left text-xs ${
        isSelected ? "bg-surface-active text-ink" : "text-ink-secondary hover:bg-surface-hover"
      }`}
      style={{ paddingLeft: 8 + row.depth * INDENT_PER_LEVEL }}
    >
      <span className="text-ink-placeholder">{KIND_MARK[row.kind]}</span>
      <span className={`truncate ${row.kind === "element" ? "font-mono" : ""}`}>{row.label}</span>
      {row.addressing.outcome !== "addressable" && (
        <span className="text-ink-placeholder ml-auto text-2xs">↑</span>
      )}
    </button>
  </li>
)
