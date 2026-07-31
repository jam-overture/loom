"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"

import type { OutlineRow } from "@/lib/outline"

/**
 * Which node the user is pointing at, shared between the outline and the preview.
 *
 * Selection lives here rather than in either pane because both author it and both
 * read it: the outline selects by row, the preview selects by click, and neither
 * owns the answer. It is deliberately the *requested* node that is stored, not the
 * node the DOM can address — a text row stays selected as a text row, and the
 * delegation to its parent stays visible as a fallback rather than being silently
 * rewritten into the selection itself.
 */

type SelectionValue = {
  readonly rows: readonly OutlineRow[]
  readonly selected: OutlineRow | null
  readonly select: (nodeId: string | null) => void
}

const SelectionContext = createContext<SelectionValue | null>(null)

export const SelectionProvider = ({
  rows,
  children,
}: {
  readonly rows: readonly OutlineRow[]
  readonly children: ReactNode
}) => {
  const [nodeId, setNodeId] = useState<string | null>(null)

  const value = useMemo<SelectionValue>(
    () => ({
      rows,
      selected: rows.find((row) => row.nodeId === nodeId) ?? null,
      select: setNodeId,
    }),
    [rows, nodeId]
  )

  return <SelectionContext value={value}>{children}</SelectionContext>
}

export const useSelection = (): SelectionValue => {
  const value = useContext(SelectionContext)

  if (!value) throw new Error("loom: useSelection was called outside a SelectionProvider")

  return value
}
