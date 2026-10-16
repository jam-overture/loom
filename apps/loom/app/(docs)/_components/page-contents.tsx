"use client"

import { usePathname } from "next/navigation"
import { useState } from "react"

import { sectionsSummary } from "@/app/(docs)/_lib/on-this-page"

import { usePageSections } from "./use-page-sections"

/**
 * What is in the page, on a screen with no room beside the page.
 *
 * ## The plain version
 *
 * *Making it look like yours* is fourteen sections and 24,944 pixels of
 * article. On a wide screen the rail beside it lists all fourteen. On a phone
 * there is no rail, so a reader gets the whole page and no way to see that it
 * has parts, which is the reader a contents list helps most — scrolling is the
 * only instrument they have, and 24,944 pixels is a lot of it.
 *
 * So the same rows, in the shape a narrow screen can hold: a line above the
 * article saying **On this page** and how many sections there are, which opens
 * into the list. It is the same list from the same walk
 * (`use-page-sections.ts`), so there is no second answer to keep in step.
 *
 * ## Closed to start with, and the count is why that works
 *
 * A reader came for the prose. A list of fourteen links between the title and
 * the first paragraph is a list in the way of the thing they came for, so this
 * starts closed and takes one line.
 *
 * Closed, the only thing it can offer is a reason to press it, which is the
 * count: *14 sections* says the page has parts and roughly how many. Without
 * it the line is a label with nothing in it, and a reader has to open it to
 * find out whether it was worth opening.
 *
 * ## What is open is a page, not a flag
 *
 * `mobile-nav.tsx` reached this first and the reason is the same one. This is
 * mounted by the documentation layout, so it survives every navigation inside
 * the documentation — which means a boolean set on one page is still set on the
 * next one, and a reader who opens the list and then reaches another page some
 * other way finds it open over a page it is no longer about. The state is
 * **which page it was opened on**, so every navigation closes it, including the
 * ones that have not been invented yet, and there is no effect to run.
 *
 * ## A press of a row leaves it open, and that is not laziness
 *
 * The obvious behaviour is to close on press, and it is wrong here in a way
 * that is easy to measure. This sits in the document **above** the article, so
 * closing it removes its own height from above the reader at the moment the
 * browser is scrolling them to a heading. The heading lands that much higher
 * than the 5rem `scroll-margin-top` it was aimed at, which on a phone puts the
 * section a reader just asked for behind the header.
 *
 * Open, nothing moves and the heading lands where the stylesheet says. The
 * list is far above the reader by then, so what it costs is a panel still open
 * if they scroll back to the top, and what it buys is the press landing where
 * it said it would.
 *
 * ## No row is marked here, and the reason is a measurement
 *
 * The rail marks the section the reader is in. This does not, and that is not
 * an omission: **a mark here is a mark that could never light up.**
 *
 * The rule the rail uses is *the last section whose heading has gone past the
 * reading line*, and the line is 184 pixels from the top of the window. For a
 * row to be marked, some `h2` has to be in the top 184 pixels of the screen.
 * For a reader to press this line, this line has to be on the screen — and it
 * sits above the page's title, so the first `h2` is below the title and below
 * the opening paragraph. The two cannot both be true, and the gap is not
 * narrow. Measured on *Making it look like yours* at 390×844:
 *
 * - at the top of the page this line is at `y 142` and the first heading is at
 *   `y 881`, which is already 95 pixels **below the fold** of the screen;
 * - by the time that heading has come up to 184, the line is 573 pixels above
 *   the top of the window.
 *
 * So a mark was built, and taken out again rather than shipped. The same
 * arithmetic is what `sectionBeingRead`'s second clause exists for on the rail,
 * and the lesson it taught is the one applied here: a row that can never be
 * marked is worse than no mark, because it looks like a feature.
 *
 * This leaves the list reachable where the reader arrives rather than where
 * they have scrolled to, which is a real limit and a filed one. Both of the
 * phone's navigations are at the top of the document — `mobile-nav.tsx` too —
 * so the remedy is one bar that stays with the reader and holds both
 * questions, which is a unit of its own and the shape the finding names.
 *
 * ## Which widths get it
 *
 * `docs/layout.tsx` decides, because it is the file that decides the rail's
 * widths too and the two are one answer: this is shown wherever the rail is
 * not. That is a phone, a tablet, and a laptop under 1280 — three readers, not
 * one, and the laptop was the one nobody was counting.
 */
export const PageContents = () => {
  const pathname = usePathname()
  const sections = usePageSections()
  const [openAt, setOpenAt] = useState<string | undefined>(undefined)

  const open = openAt === pathname

  /*
   * A page with no sections gets no line rather than an empty one, which is
   * every page of the API reference. `_lib/on-this-page.ts` says why nothing
   * matches on those, and they carry a contents list of their own.
   */
  if (sections.length === 0) return null

  return (
    /* `data-search="off"`, as on the rail: a page's own contents is navigation,
       and every heading in it is already in the index as the heading it links
       to. Only one of the two is ever displayed, so a screen reader is never
       offered two navigations with this name. */
    <nav aria-label="On this page" data-search="off" className="border-edge mb-10 rounded-lg border text-sm">
      <button
        type="button"
        onClick={() => setOpenAt(open ? undefined : pathname)}
        aria-expanded={open}
        className="text-ink-muted hover:text-ink flex w-full items-center gap-2.5 px-4 py-3"
      >
        <span aria-hidden className="text-ink-faint text-xs">
          {open ? "▾" : "▸"}
        </span>
        <span className="font-medium">On this page</span>
        <span className="text-ink-faint ml-auto text-xs">{sectionsSummary(sections.length)}</span>
      </button>

      {open && (
        /*
         * Bounded and scrolling, which is `mobile-nav.tsx`' measurement applied
         * to a shorter list: a panel that lays its whole height into the
         * document pushes the article down by that much, and a reader who
         * closes it again is somewhere else on the page than where they were.
         */
        <ul className="border-edge max-h-[60vh] overflow-y-auto border-t px-4 py-2">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className={`text-ink-muted hover:text-ink block py-2 ${section.level === 3 ? "pl-4" : ""}`}
              >
                {section.text}
              </a>
            </li>
          ))}
        </ul>
      )}
    </nav>
  )
}
