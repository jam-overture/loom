"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

import {
  atEndOfPage,
  READING_LINE_PX,
  sectionBeingRead,
  sectionsIn,
  SECTION_SCOPE_SELECTOR,
  SECTION_SELECTOR,
  type PageSection,
  type SectionTop,
} from "@/app/(docs)/_lib/on-this-page"

/**
 * The page's own sections, beside the page, with the one being read marked.
 *
 * The rail on the left says which page you are on. This says what is in it —
 * the half of the navigation the thirty-one written pages did not have, on
 * pages that run to fourteen headings. `_lib/on-this-page.ts` is the whole of
 * the reasoning: what counts as a section, why the rows are read out of the
 * document rather than compiled from the markdown, and which row is marked.
 *
 * Everything in here is the three pieces of browser that reasoning needs — the
 * walk, the measurement, and the two listeners — and no judgement of its own.
 */

/** The headings on the page, in document order, as the rows they become. */
const sectionsOnPage = (): readonly PageSection[] => {
  const article = document.querySelector(SECTION_SCOPE_SELECTOR)

  if (article === null) return []

  return sectionsIn(
    [...article.querySelectorAll(SECTION_SELECTOR)].map((heading) => ({
      level: Number(heading.tagName.slice(1)),
      id: heading.id,
      /* `textContent` rather than `innerText`: a heading holding a name in
         backticks is a `<code>` inside it, and both report the same words — but
         `innerText` asks for a layout of an element that may be off screen. */
      text: heading.textContent ?? "",
    }))
  )
}

/** Where each row's heading currently is, which changes with every scroll. */
const topsOf = (sections: readonly PageSection[]): readonly SectionTop[] =>
  sections.flatMap((section) => {
    const heading = document.getElementById(section.id)

    return heading === null ? [] : [{ id: section.id, top: heading.getBoundingClientRect().top }]
  })

export const OnThisPage = () => {
  const pathname = usePathname()
  const [sections, setSections] = useState<readonly PageSection[]>([])
  const [current, setCurrent] = useState<string | undefined>(undefined)

  /*
   * Read on the address rather than on mount alone. This is mounted by the
   * layout and survives every navigation inside the documentation, so a page
   * change replaces the article underneath it without remounting anything —
   * the same fact the rail on the left answers the same way.
   */
  useEffect(() => {
    setSections(sectionsOnPage())
    setCurrent(undefined)
  }, [pathname])

  useEffect(() => {
    if (sections.length === 0) return

    const mark = () =>
      setCurrent(
        sectionBeingRead({
          tops: topsOf(sections),
          line: READING_LINE_PX,
          atEnd: atEndOfPage(window.scrollY, window.innerHeight, document.documentElement.scrollHeight),
        })
      )

    mark()

    /*
     * `resize` as well as `scroll`, because the headings move without the page
     * scrolling: a window narrowed enough to rewrap a paragraph moves every
     * heading under it, and on a phone the address bar collapsing is a resize.
     *
     * Passive, and the work is two reads and a `setState` per event. A frame
     * budget would matter if this measured layout and then wrote to it; it
     * measures, and React does the writing afterwards.
     */
    window.addEventListener("scroll", mark, { passive: true })
    window.addEventListener("resize", mark, { passive: true })

    return () => {
      window.removeEventListener("scroll", mark)
      window.removeEventListener("resize", mark)
    }
  }, [sections])

  /*
   * A page with no sections gets no rail rather than an empty one. The
   * generated reference pages are the case — they carry a contents list of
   * their own, shaped for sixty module names — and `_lib/on-this-page.ts` says
   * why nothing here matches on them.
   */
  if (sections.length === 0) return null

  return (
    /* `data-search="off"`: a page's own contents list is navigation, and every
       heading in it is already in the index as the heading it links to. The
       same note is on the reference's own list, for the same reason. */
    <nav aria-label="On this page" data-search="off" className="flex flex-col gap-2 py-8 pr-6 pl-4 text-sm">
      <p className="text-ink-faint text-xs font-semibold tracking-wide uppercase">On this page</p>

      <ul className="border-edge flex flex-col border-l">
        {sections.map((section) => {
          const here = section.id === current

          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                {...(here ? { "aria-current": "location" as const } : {})}
                className={`-ml-px block border-l py-1.5 transition-colors ${
                  section.level === 3 ? "pl-6" : "pl-3"
                } ${
                  here
                    ? "border-accent-ring text-ink font-medium"
                    : "text-ink-muted hover:border-edge-strong hover:text-ink border-transparent"
                }`}
              >
                {section.text}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
