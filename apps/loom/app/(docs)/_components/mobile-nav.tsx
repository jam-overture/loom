"use client"

import { useState } from "react"

import { Sidebar } from "./sidebar"

/**
 * The rail, on a screen too narrow to keep it open.
 *
 * It is the same component rather than a second list of links — a mobile
 * navigation that drifted from the desktop one would be a second statement of
 * what the site contains, and `lib/nav.ts` exists so there is only ever one.
 */
export const MobileNav = () => {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-edge border-b lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        className="text-ink-muted hover:text-ink flex w-full items-center gap-2 px-5 py-3 text-sm"
      >
        <span aria-hidden>{open ? "×" : "☰"}</span>
        {open ? "Close" : "Browse the documentation"}
      </button>

      {open && (
        <div className="border-edge border-t">
          <Sidebar onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  )
}
