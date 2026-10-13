"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import type { ReactNode } from "react"

import { isNavItemActive } from "@/app/(portal)/_lib/nav"
import { PAGE_FILTER_KEY } from "@/app/(portal)/_lib/page-filter"

import { SECTIONS, sectionFor, type Section, type SectionIcon } from "./sections"

/**
 * The chrome beside every portal screen: a labelled icon rail, and a second
 * rail for the section you are in.
 *
 * ## The one behaviour this deletes
 *
 * The rail it replaces widened from 56px to 275px on `hover` **and**
 * `focus-within`, and the second of those needed a mechanism to undo it: a
 * link keeps focus after it is clicked, so the rail stayed open after the
 * pointer had left — *"super annoying to have to click again to close it"* —
 * and on a touch screen it covered a third of the display until something else
 * was tapped. The fix was `event.detail === 0`, which is how a click from the
 * keyboard is told from a click from a finger, so that one could keep the focus
 * and the other could give it back.
 *
 * All of that existed to make hidden labels reachable. **The labels are not
 * hidden any more**, so there is nothing to reveal, nothing to close, and no
 * reason for a rail to know what kind of press opened it. One subtle
 * interaction and its two tests come out; the words a reader needed go in.
 *
 * ## Why it is still a client component
 *
 * One reason only: which place you are in is a function of the current path,
 * and a layout is handed its children and nothing else. Everything the rails
 * decide from that path is in `sections.ts` and `_lib/nav.ts`, so the matching
 * rules are testable without a router, and this file is the drawing.
 */

const GLYPHS: Readonly<Record<SectionIcon, ReactNode>> = {
  home: <path d="M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5" />,
  pages: (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </>
  ),
  pieces: (
    <>
      <rect x="2.5" y="7" width="19" height="13.5" rx="1.5" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </>
  ),
  rules: (
    <>
      <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" />
      <polyline points="9 12 11 14 15 10" />
    </>
  ),
  logs: <path d="M3 5h18M3 12h18M3 19h12" />,
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
}

const Glyph = ({ icon }: { readonly icon: SectionIcon }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-[18px] w-[18px] shrink-0"
    aria-hidden="true"
  >
    {GLYPHS[icon]}
  </svg>
)

/**
 * The sections, with their words under the glyphs.
 *
 * `md:flex-col` and nothing else is what makes this a rail on a display and a
 * strip on a phone. A 64px column beside a 224px column leaves 102 pixels of a
 * 390px screen for the screen itself, so on a phone both rails lie down above
 * the content and scroll sideways — which is the one arrangement that keeps
 * every destination reachable without a disclosure to open, and a disclosure is
 * the thing this change exists to remove.
 *
 * `loom-rail` is what `globals.css` hangs the inset focus ring off: the rail
 * scrolls its own overflow, so a ring drawn outside a link would be clipped at
 * the edge.
 */
const SectionRail = ({
  current,
  pathname,
}: {
  readonly current: Section | undefined
  readonly pathname: string
}) => (
  <nav
    aria-label="Sections"
    data-rail="sections"
    className="loom-rail bg-surface-sidebar border-edge-subtle flex w-full shrink-0 flex-row gap-1 overflow-x-auto border-b px-2 py-2 md:sticky md:top-14 md:h-[calc(100dvh-3.5rem)] md:w-16 md:flex-col md:gap-0.5 md:overflow-x-visible md:overflow-y-auto md:border-r md:border-b-0 md:px-1 md:py-3"
  >
    {SECTIONS.map((section) => {
      const active = current?.key === section.key

      return (
        <Link
          key={section.key}
          href={section.href}
          /*
           * `page` only where the href is the screen you are on. A section is
           * lit from every route inside it — `Pages` stays lit three levels
           * down inside one page — and calling that link "the current page"
           * would be a claim a reader's screen reader would then have to
           * reconcile with the second rail, which has the real one.
           */
          aria-current={active ? (pathname === section.href ? "page" : "true") : undefined}
          className={
            "flex shrink-0 flex-col items-center gap-1 rounded-md px-2 py-1.5 no-underline md:w-14 " +
            (active ? "bg-nav-active text-ink" : "text-nav-idle hover:bg-surface-hover hover:text-ink")
          }
        >
          <Glyph icon={section.icon} />
          <span className="text-2xs leading-none tracking-tight whitespace-nowrap">
            {section.label}
          </span>
        </Link>
      )
    })}
  </nav>
)

/**
 * One section's screens, grouped.
 *
 * The group names are the half of this rail that is not a link, and they are
 * `hidden` on a phone for the reason the rail lies down there: a heading over a
 * sideways-scrolling row of two names describes nothing and costs a line. On a
 * display they are the whole reason the second level is worth having — the old
 * rail had group names too, and they were behind the same hover as everything
 * else.
 */
/**
 * The parameters the rail is answerable for.
 *
 * Named rather than *every parameter in the URL*, because a screen passes
 * itself things the rail has no opinion about — `/portal/pages?after=…` is a
 * cursor, and a rail that compared it would go dark the moment somebody turned
 * a page.
 */
const RAIL_KEYS: readonly string[] = [PAGE_FILTER_KEY]

const ScreenRail = ({
  section,
  pathname,
  search,
}: {
  readonly section: Section
  readonly pathname: string
  readonly search: string
}) => (
  <nav
    aria-label={`${section.label} screens`}
    data-rail="screens"
    className="loom-rail bg-surface-base border-edge-subtle w-full shrink-0 border-b px-2 py-2 md:sticky md:top-14 md:h-[calc(100dvh-3.5rem)] md:w-56 md:overflow-y-auto md:border-r md:border-b-0 md:px-3 md:py-4"
  >
    <p className="hidden px-2 pb-3 text-sm font-medium tracking-tight md:block">{section.label}</p>
    <div className="flex flex-row gap-1 overflow-x-auto md:flex-col md:gap-0 md:overflow-x-visible">
      {(section.groups ?? []).map((group) => (
        <div key={group.name} className="flex flex-row gap-1 md:flex-col md:gap-0 md:pb-4">
          <p className="text-ink-muted hidden px-2 pb-1 text-2xs tracking-widest uppercase md:block">
            {group.name}
          </p>
          <ul className="m-0 flex list-none flex-row gap-1 p-0 md:flex-col md:gap-0">
            {group.items.map((item) => {
              const active = isNavItemActive(pathname, item.href, item.exact, {
                search,
                keys: RAIL_KEYS,
              })

              return (
                <li key={item.href} className="shrink-0">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      "flex items-center rounded-md px-2 py-1.5 text-xs no-underline md:text-[13px] " +
                      (active
                        ? "bg-nav-active text-ink"
                        : "text-ink-secondary hover:bg-surface-hover hover:text-ink")
                    }
                  >
                    <span className="whitespace-nowrap md:whitespace-normal">{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  </nav>
)

/**
 * Both rails, or one, depending on whether the section has more than itself.
 *
 * A section with no `groups` draws no second rail. `Pages`, `Pieces` and
 * `Sign-ins` are each one screen, and a submenu listing the screen you are
 * already on is a rail that exists to be symmetrical.
 */
export const Rails = () => {
  const pathname = usePathname()
  /**
   * `?? ""` because `useSearchParams` hands back `null` during a static render,
   * and every screen under this shell is server-rendered on demand — so the
   * null branch is the one that never runs here and would be the only one that
   * mattered if that ever changed.
   */
  const search = useSearchParams()?.toString() ?? ""
  const current = sectionFor(pathname)

  return (
    <>
      <SectionRail current={current} pathname={pathname} />
      {current?.groups !== undefined && (
        <ScreenRail section={current} pathname={pathname} search={search} />
      )}
    </>
  )
}
