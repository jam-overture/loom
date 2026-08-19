"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { docsNeighbours } from "@/lib/nav"

/**
 * Where to go next, at the foot of every page.
 *
 * It reads the same ordered list the rail does, so the two can never disagree
 * about what follows what. A page with no neighbour on one side leaves that
 * side empty rather than linking somewhere plausible — the last page of the
 * documentation is allowed to be the last page.
 */
export const Pager = () => {
  const pathname = usePathname()
  const { previous, next } = docsNeighbours(pathname)

  if (previous === undefined && next === undefined) return null

  return (
    <nav aria-label="Pagination" className="border-edge mt-16 grid gap-3 border-t pt-6 sm:grid-cols-2">
      {previous ? (
        <Link
          href={previous.href}
          rel="prev"
          className="border-edge hover:border-edge-strong group flex flex-col gap-1 rounded-lg border px-4 py-3 transition-colors"
        >
          <span className="text-ink-faint text-xs">Previous</span>
          <span className="text-ink font-medium">{previous.page.title}</span>
        </Link>
      ) : (
        <span />
      )}

      {next && (
        <Link
          href={next.href}
          rel="next"
          className="border-edge hover:border-edge-strong group flex flex-col gap-1 rounded-lg border px-4 py-3 text-right transition-colors sm:col-start-2"
        >
          <span className="text-ink-faint text-xs">Next</span>
          <span className="text-ink font-medium">{next.page.title}</span>
        </Link>
      )}
    </nav>
  )
}
