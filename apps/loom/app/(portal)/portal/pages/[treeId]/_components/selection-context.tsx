"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"

import type { OutlineRow } from "@/app/(portal)/_lib/outline"
import { scopeOf, type SelectionScope } from "@/app/(portal)/_lib/selection-scope"

/**
 * Which parts the user is pointing at, shared between the outline, the preview
 * and the two panes that read them.
 *
 * Selection lives here rather than in any one pane because they all author it
 * and they all read it: the outline picks by row, the preview picks by click,
 * and neither owns the answer. It is deliberately the *requested* nodes that are
 * stored, not the nodes the DOM can address — a text row stays picked as a text
 * row, and the delegation to its parent stays visible as a fallback rather than
 * being silently rewritten into the selection itself.
 *
 * ## It holds a set, as of phase 2
 *
 * The maintainer, on 27 September: *"The user should be able to click 1 or more
 * nodes."* One node was not a simplification of that — it was a different
 * screen, and the inspector `docs/portal.md` phase 2 describes cannot be built
 * over it.
 *
 * Two decisions here that the rest of the screen depends on:
 *
 * - **Picking toggles.** There is no modifier key. ⌘-click is what a desktop
 *   application does and it is undiscoverable: the test this surface is held to
 *   is whether a bright high schooler can work out what to do, and a person who
 *   does not know the chord can never pick two parts. Clicking a picked part
 *   again lets it go, which is the one behaviour that needs no instruction. The
 *   cost is that switching from one part to another is two clicks, and the pane
 *   answers it with a count and a way to let everything go at once.
 * - **`picked` is derived by filtering `rows`, never by the order clicked.** A
 *   set of parts has no arrangement of its own, and inventing one is how a
 *   canvas arrives through the side door (0199). Filtering the outline keeps
 *   document order by construction, so nothing downstream has to sort and
 *   nothing can disagree about what "in order" means.
 *
 * `pick` takes a plain string because one of its two callers reads it off a DOM
 * attribute, and an id that matches no row is dropped here rather than stored
 * and filtered out later. Only a part of this page can be picked.
 */

type SelectionValue = {
  readonly rows: readonly OutlineRow[]
  /** Every picked part, in the order the page holds them. Empty when none is. */
  readonly picked: readonly OutlineRow[]
  /** What a change asked for now would be about, and why. */
  readonly scope: SelectionScope
  /** Pick it, or let it go if it is already picked. Unknown ids are ignored. */
  readonly pick: (nodeId: string) => void
  /** Let all of them go. */
  readonly clear: () => void
}

const SelectionContext = createContext<SelectionValue | null>(null)

export const SelectionProvider = ({
  rows,
  children,
}: {
  readonly rows: readonly OutlineRow[]
  readonly children: ReactNode
}) => {
  const [nodeIds, setNodeIds] = useState<readonly string[]>([])

  const value = useMemo<SelectionValue>(() => {
    const picked = rows.filter((row) => nodeIds.includes(row.nodeId))

    return {
      rows,
      picked,
      scope: scopeOf(rows, picked),
      pick: (nodeId: string) => {
        if (!rows.some((row) => row.nodeId === nodeId)) return

        setNodeIds((held) =>
          held.includes(nodeId) ? held.filter((id) => id !== nodeId) : [...held, nodeId]
        )
      },
      clear: () => setNodeIds([]),
    }
  }, [rows, nodeIds])

  return <SelectionContext value={value}>{children}</SelectionContext>
}

export const useSelection = (): SelectionValue => {
  const value = useContext(SelectionContext)

  if (!value) throw new Error("loom: useSelection was called outside a SelectionProvider")

  return value
}
