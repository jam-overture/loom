"use client"

import { usePathname } from "next/navigation"
import { useState } from "react"

import {
  BAR_CONTROL_CLASS,
  BAR_HIDDEN_CLASS,
  railScrollerAttr,
  UNDER_HEADER_CLASS,
} from "@/app/(docs)/_lib/chrome"
import { docsEntryAt } from "@/app/(docs)/_lib/nav"
import { sectionsSummary } from "@/app/(docs)/_lib/on-this-page"

import { Sidebar } from "./sidebar"
import { usePageSections, useSectionBeingRead } from "./use-page-sections"

/**
 * The navigation that stays with the reader on a screen with no rail.
 *
 * ## The plain version
 *
 * A documentation page here can be very long. *Making it look like yours* is
 * 24,944 pixels of article on a phone, which is about thirty screens. A reader
 * somewhere in the middle of it has two questions a reference site has to keep
 * answering — *where am I in this site* and *what else is in this page* — and
 * until today both answers were at the very top of the document. The menu was
 * above the article and the contents were above the article, so a reader twenty
 * screens down scrolled back through all twenty of them to use either.
 *
 * This is one bar, under the site's header, that does not scroll away. It holds
 * both questions, and it says where you are without being pressed.
 *
 * It replaces two components that each held one of them, a menu and a contents
 * disclosure, because the thing that was wrong with them was not in either one.
 * It was that there were two of them, in the document, at the top.
 *
 * ## What it says when nothing is open
 *
 * A bar that stays on screen takes a row of a phone's height on every scroll,
 * so the row has to be worth more than the two labels it would otherwise spend
 * itself on.
 *
 * - **On the left, the section of the site you are in** — *Getting started*,
 *   *The runtime* — which is the rail's answer to *where am I*, reduced to the
 *   part that fits and kept visible. Pressing it opens the rail.
 * - **On the right, the section of the page you are in** — the heading you are
 *   under, which changes as you scroll. Pressing it opens the page's contents.
 *
 * So the closed bar is two breadcrumbs rather than two buttons with nouns on
 * them, and a reader who presses nothing still gets told twice where they are.
 * Before the first heading there is no section to name, and the right-hand
 * control says *On this page*, which is the one state where a label is all
 * there is to say.
 *
 * Both controls keep **On this page** and **Browse the documentation** as their
 * accessible names, because a name that changes as the reader scrolls is a name
 * a screen-reader user cannot learn.
 *
 * ## A mark here is now a mark that can light up
 *
 * The disclosure this replaces built one and took it out again, and the reason
 * was a measurement rather than a preference: the line sat above the page's
 * title, so a reader who could see it had no heading near the top of the
 * window, and the mark could never be on. Being sticky is exactly what changes
 * that. The bar
 * and the reading line are on screen together at every scroll position, so the
 * rule the rail uses — *the last section whose heading has gone past the
 * reading line* — means the same thing here, from the same hook.
 *
 * ## One open at a time, and what is open is a page
 *
 * Two panels under one bar have to agree about which of them is open, or a
 * reader presses the contents and gets the site's rail underneath it. So the
 * state is **which panel, on which page**, and opening one closes the other by
 * construction rather than by an effect that remembers to.
 *
 * The *on which page* half is the menu's old argument and it is load-bearing
 * for the same reason: this is mounted by the documentation layout, so it
 * survives every navigation inside the documentation. A boolean set on one page
 * would still be set on the next one, and a reader who opens a panel and then
 * reaches another page some other way — the search dialog pushes a route, a
 * link in the prose pushes a route, the wordmark pushes a route, and none of
 * them is this component's to know about — would find it open over a page it is
 * no longer about. Keyed on the address, every navigation closes it, including
 * the ones that have not been invented yet, and there is no effect to run.
 *
 * ## Both panels are bounded scrollers
 *
 * Opened on the last page of the site, the rail used to lay 1,712 pixels of
 * links into the document with the mark saying *you are here* 938 pixels past
 * the bottom of the screen. Bounded, it is a scroller rather than a stretch of
 * document, so `in-view.ts` has something to move and moves the panel instead
 * of the page — which is why the panel declares itself the rail's scroller.
 *
 * ## A press of a contents row leaves the panel open
 *
 * Closing on press is the obvious behaviour and it is the wrong one, for an
 * arithmetic reason worth keeping: a press scrolls the reader to a heading, and
 * a panel that closed at the same moment would take its own height out from
 * above them mid-scroll. What makes this safe where the old line was not is
 * that the bar is sticky — its height is the same before and after, so nothing
 * the reader is looking at moves. The panel is left open and the next press of
 * the control closes it.
 *
 * ## Which widths get it, and why its height is in the server's HTML
 *
 * The bar is shown wherever the contents rail is not, which is every width
 * below 1280. The left-hand control stands down from 1024, where the site's own
 * rail is on screen and a second way to reach it would be furniture.
 *
 * That width is `_lib/chrome.ts`' and not this file's, because the same number
 * decides three things: whether the bar is here, whether the page's rail is
 * there instead, and whether the scrollport is inset by the bar's band. The
 * stylesheet reads it out of Tailwind's theme rather than transcribing it.
 *
 * It sticks **under** the header rather than at its height: the header's row
 * and the hairline it draws are two declarations, and taking only the first of
 * them left the bar covering that hairline by a pixel. `_lib/chrome.ts` names
 * the sum, so the bar, the site's rail and the page's rail all start in the
 * same place and none of them says where that is.
 *
 * **Whether there is a right-hand control is decided before the browser runs**,
 * from `_lib/contents/pages.ts`, and that is what closes the 86-pixel shift the
 * line above the article had. The rows still come from the document walk, so
 * the server never claims to know what is in a page — only whether the page has
 * sections at all, which is a question its markdown answers.
 */
export const DocsBar = ({ pagesWithSections }: { readonly pagesWithSections: readonly string[] }) => {
  const pathname = usePathname()
  const sections = usePageSections()
  const current = useSectionBeingRead(sections)
  const [openAt, setOpenAt] = useState<{ readonly panel: "site" | "page"; readonly at: string } | undefined>(
    undefined
  )

  const open = openAt?.at === pathname ? openAt.panel : undefined

  const show = (panel: "site" | "page") =>
    setOpenAt(open === panel ? undefined : { panel, at: pathname })

  /*
   * The page's own section, for the left-hand label. A reference page is in the
   * navigation like any other, so this is the same answer the rail gives; an
   * address the navigation does not list — nothing serves one today — gets the
   * site's name rather than an empty label.
   */
  const section = docsEntryAt(pathname)?.section.title ?? "Documentation"

  /*
   * Decided on the server, not by the walk, which is the whole of why the bar
   * is the right height in the HTML a reader is sent. The walk fills the rows
   * in afterwards and `sections` is empty until it has.
   */
  const hasContents = pagesWithSections.includes(pathname)

  const reading = sections.find((candidate) => candidate.id === current)

  /*
   * The row's height is the control's height, declared rather than left to
   * `py-3` and a line of `text-sm` adding up to 44 — which they did, and which
   * nothing could read. `_lib/chrome.ts` names the class and `globals.css` has
   * the number, and the scrollport's inset is arithmetic over the same
   * declaration, so a taller control moves what clears it.
   */
  const control = `text-ink-muted hover:text-ink flex min-w-0 items-center gap-2 text-sm transition-colors ${BAR_CONTROL_CLASS}`

  /*
   * The bar has no height of its own: its row is as tall as the controls in it
   * and no taller, so a width where both controls have stood down leaves
   * nothing rather than an empty band. That happens in exactly one place — a
   * generated reference page between 1024 and 1279, where there is no contents
   * to offer and the site's rail is already on screen — and the rule below is
   * the one thing that does not follow from a collapsed row, because a border
   * is 1 pixel tall whatever is above it.
   */
  const edge = hasContents ? "border-b" : "border-b lg:border-b-0"

  return (
    <div
      className={`bg-surface-page/85 border-edge sticky z-30 backdrop-blur ${BAR_HIDDEN_CLASS} ${UNDER_HEADER_CLASS} ${edge}`}
    >
      <div className="flex items-center gap-4 px-5 sm:px-8 lg:px-12">
        {/*
         * `lg:hidden`: from 1024 the site's rail is on screen beside the page.
         *
         * **It keeps its width and the label beside it gives way**, which is the
         * opposite of what flexbox does on its own and was decided by looking
         * at the picture. At 390 pixels the row has 334 to share and the two
         * labels want 146 and 243, so one of them is cut whatever the rule is.
         * Cut from the left, *Building with Loom* becomes *Building …*, which
         * names nothing; cut from the right, *The third answer is undefined,
         * and it is the one to plan for* becomes *The third answer is unde…*,
         * which a reader can still place. So the short, stable label is held
         * whole, up to half the row, and the long, changing one truncates.
         */}
        <button
          type="button"
          onClick={() => show("site")}
          aria-expanded={open === "site"}
          aria-label="Browse the documentation"
          className={`${control} max-w-[50%] shrink-0 lg:hidden`}
        >
          <span aria-hidden className="text-ink-faint">
            {open === "site" ? "×" : "☰"}
          </span>
          <span className="truncate">{section}</span>
        </button>

        {hasContents && (
          <button
            type="button"
            onClick={() => show("page")}
            aria-expanded={open === "page"}
            aria-label="On this page"
            className={`${control} ml-auto lg:ml-0`}
          >
            {/*
             * The section being read, or the label and the page's size where no
             * section is being read yet — which is the state a reader arrives
             * in, and the state the count was written for: *14 sections* says
             * the page has parts and roughly how many, where *On this page* on
             * its own is a label with nothing in it.
             *
             * The count waits for the walk, because only the walk can count. So
             * the server sends *On this page* and the number joins it a moment
             * later, which moves this label's own width and nothing else — the
             * row's height, and the prose under it, are settled before the
             * browser runs.
             */}
            <span className="truncate">{reading?.text ?? "On this page"}</span>
            {reading === undefined && sections.length > 0 && (
              <span className="text-ink-faint shrink-0 text-xs">{sectionsSummary(sections.length)}</span>
            )}
            <span aria-hidden className="text-ink-faint shrink-0 text-xs">
              {open === "page" ? "▾" : "▸"}
            </span>
          </button>
        )}
      </div>

      {open === "site" && (
        /* Opaque, where the closed bar is translucent. The bar borrows the
           header's `bg-surface-page/85` and blur so that prose scrolling under
           a 45-pixel strip stays softly visible; a panel is a list to read, and
           a page showing through forty-five links is forty-five links a reader
           has to pick out of a paragraph. */
        <div {...railScrollerAttr} className="bg-surface-page border-edge max-h-[70vh] overflow-y-auto border-t">
          <Sidebar onNavigate={() => setOpenAt(undefined)} />
        </div>
      )}

      {open === "page" && sections.length > 0 && (
        /* `data-search="off"`, as on the rail beside the prose: a page's own
           contents is navigation, and every heading in it is already in the
           index as the heading it links to. */
        <nav
          aria-label="On this page"
          data-search="off"
          className="bg-surface-page border-edge max-h-[60vh] overflow-y-auto border-t px-5 py-2 text-sm sm:px-8 lg:px-12"
        >
          <ul>
            {sections.map((row) => {
              const here = row.id === current

              return (
                <li key={row.id}>
                  <a
                    href={`#${row.id}`}
                    {...(here ? { "aria-current": "location" as const } : {})}
                    className={`block py-2 ${row.level === 3 ? "pl-4" : ""} ${
                      here ? "text-ink font-medium" : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    {row.text}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>
      )}
    </div>
  )
}
