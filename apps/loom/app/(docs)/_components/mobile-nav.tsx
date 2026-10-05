"use client"

import { usePathname } from "next/navigation"
import { useState } from "react"

import { Sidebar } from "./sidebar"

/**
 * The rail, on a screen too narrow to keep it open.
 *
 * It is the same component rather than a second list of links — a mobile
 * navigation that drifted from the desktop one would be a second statement of
 * what the site contains, and `lib/nav.ts` exists so there is only ever one.
 *
 * **What is open is a page, not a flag.** The obvious state here is a boolean,
 * and a boolean is wrong in a way only a phone shows. This component is mounted
 * by the documentation layout, so it survives every navigation inside the
 * documentation — which is what a layout is for, and which means a boolean set
 * on one page is still set on the next one. A reader who opens the menu and
 * then reaches a page some other way is left with the menu over the top of it:
 * the search dialog in the header pushes a route, a link in the prose pushes a
 * route, the wordmark pushes a route, and none of them is this component's to
 * know about.
 *
 * So the state is **which page it was opened on**, and it is open only while
 * the reader is still on that page. Every navigation closes it, including the
 * ones that have not been invented yet, and there is no effect to run and
 * nothing to clean up.
 *
 * `onNavigate` is still wired, and both halves are load-bearing: a route pushed
 * from inside the panel takes a moment to commit, so without it the menu is
 * still over the page for as long as the navigation is pending.
 */
export const MobileNav = () => {
  const pathname = usePathname()
  const [openAt, setOpenAt] = useState<string | undefined>(undefined)

  const open = openAt === pathname

  return (
    <div className="border-edge border-b lg:hidden">
      <button
        type="button"
        onClick={() => setOpenAt(open ? undefined : pathname)}
        aria-expanded={open}
        className="text-ink-muted hover:text-ink flex w-full items-center gap-2 px-5 py-3 text-sm"
      >
        <span aria-hidden>{open ? "×" : "☰"}</span>
        {open ? "Close" : "Browse the documentation"}
      </button>

      {open && (
        <div className="border-edge border-t">
          <Sidebar onNavigate={() => setOpenAt(undefined)} />
        </div>
      )}
    </div>
  )
}
