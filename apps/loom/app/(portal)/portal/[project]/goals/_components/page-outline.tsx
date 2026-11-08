"use client"

import { useState } from "react"

import { outlinePageOf, pageLabelOf, type PageChoice } from "@/app/(portal)/_lib/goals/goal-view"

/** Deeper than this and the outline would be all indent on a drawer's width. */
const DEEPEST_DRAWN = 6

/**
 * The wireframe's *or pick the part on the page* (section 3): a small outline
 * of one published page, a box per part nested as the page nests them, the
 * picked part outlined green. Pressing a part picks it, exactly as choosing it
 * from the list above does.
 *
 * It opens on the page that has the part already picked, and *Page* draws
 * another. It holds no field of its own: the part is the form's, by `onPick`.
 */
export const PageOutline = ({
  pages,
  picked,
  onPick,
}: {
  pages: readonly PageChoice[]
  /** The part picked so far, `""` before any is. */
  picked: string
  onPick: (nodeId: string) => void
}) => {
  const [chosen, setChosen] = useState<string | undefined>(undefined)
  const page = outlinePageOf(pages, chosen, picked)

  if (page === undefined) return null

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-ink-muted text-xs">Or pick the part on the page</span>
      <label className="text-ink-muted flex items-center gap-1.5 text-xs">
        Page
        <select
          value={page.treeId}
          onChange={(event) => setChosen(event.target.value)}
          className="border-edge bg-surface-base min-w-0 flex-1 truncate rounded-md border px-1.5 py-0.5 text-xs"
        >
          {pages.map((each) => (
            <option key={each.treeId} value={each.treeId}>
              {pageLabelOf(each)}
            </option>
          ))}
        </select>
      </label>
      <ol
        aria-label={`The parts of ${pageLabelOf(page)}`}
        className="border-edge-subtle m-0 flex max-h-64 list-none flex-col gap-1 overflow-y-auto rounded-md border p-2"
      >
        {page.parts.map((part) => {
          const on = part.nodeId === picked

          return (
            <li
              key={part.nodeId}
              style={{ marginLeft: `${Math.min(part.depth, DEEPEST_DRAWN) * 0.75}rem` }}
            >
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onPick(part.nodeId)}
                className={
                  on
                    ? "bg-applied text-applied-ink border-applied-ink w-full rounded border-2 px-2 py-1 text-left text-xs"
                    : "border-edge-subtle hover:border-edge w-full rounded border px-2 py-1 text-left text-xs"
                }
              >
                {part.name} <span className="text-ink-muted ml-1.5 font-mono">{part.nodeId}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
