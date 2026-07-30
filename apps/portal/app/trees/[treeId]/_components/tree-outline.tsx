"use client"

import { OutlineRowButton } from "./outline-row"
import { useSelection } from "./selection-context"

/**
 * The third pane, built second (0019): an address book, not a layers panel.
 *
 * Every row is selectable, including the rows that cannot be pointed at in the
 * DOM. Hiding them would be the wrong kind of honesty — a text node is a node the
 * runtime can move and re-author, so it belongs in the address book; what it
 * cannot do is receive a click, and the row says so with a marker rather than
 * disappearing.
 */
export const TreeOutline = () => {
  const { rows, selected, select } = useSelection()

  return (
    <nav aria-label="Tree outline" className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-ink-secondary text-xs tracking-wide uppercase">outline</h2>
        <span className="text-ink-placeholder text-2xs">{rows.length} nodes</span>
      </div>

      <ul className="border-edge-subtle bg-surface-base flex flex-col rounded-md border p-1">
        {rows.map((row) => (
          <OutlineRowButton
            key={row.nodeId}
            row={row}
            isSelected={selected?.nodeId === row.nodeId}
            onSelect={select}
          />
        ))}
      </ul>
    </nav>
  )
}
