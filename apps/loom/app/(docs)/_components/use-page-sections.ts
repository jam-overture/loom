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
 * The page's sections, read off the page, for the two places that show them.
 *
 * `_lib/on-this-page.ts` is the reasoning — what counts as a section, why the
 * rows come out of the document rather than out of the markdown, and which row
 * is marked. This is the browser work that reasoning needs, and it is in a
 * module of its own because there are now **two presentations of one list**: a
 * rail beside the prose on a wide screen, and a disclosure above the article on
 * everything narrower.
 *
 * One walk, two callers, for the reason `in-view.ts` gives for the same shape:
 * two lists that answered *what is in this page* by each reading it their own
 * way would be two answers to one question, and the day one of them learned a
 * new rule about headings the other would go on applying the old one.
 *
 * **The measurement is shared too, as of 17 October.** It used to be the rail's
 * alone, because the narrow presentation was a line in the document above the
 * page's title and could not be on screen at the same time as a heading near
 * the top of the window. The bar that replaced it stays with the reader, so
 * both presentations now say which section is being read — and they say it from
 * one listener pair written once, rather than from two that could drift apart
 * about what a scroll means.
 *
 * Everything here is a read of the document and none of it is a judgement.
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

/**
 * Which section the reader is in, measured now.
 *
 * Both presentations ask this, and until 17 October only the rail did. The
 * disclosure above the article could not: it sat in the document above the
 * page's title, so a reader who could see it was a reader with no heading
 * anywhere near the top of the window, and a mark on it was a mark that could
 * never light up. The bar that replaced it stays under the header at every
 * scroll position, so the two are on screen together by construction and the
 * measurement means something there.
 */
export const sectionBeingReadNow = (sections: readonly PageSection[]): string | undefined =>
  sectionBeingRead({
    tops: topsOf(sections),
    line: READING_LINE_PX,
    atEnd: atEndOfPage(window.scrollY, window.innerHeight, document.documentElement.scrollHeight),
  })

/**
 * The sections of the page the reader is on now.
 *
 * Read on the address rather than on mount alone. Both presentations are
 * mounted by the layout and survive every navigation inside the documentation,
 * so a page change replaces the article underneath them without remounting
 * anything — the same fact the rail on the left answers the same way. A list
 * that read the document once would go on showing the previous page's sections.
 */
export const usePageSections = (): readonly PageSection[] => {
  const pathname = usePathname()
  const [sections, setSections] = useState<readonly PageSection[]>([])

  useEffect(() => {
    setSections(sectionsOnPage())
  }, [pathname])

  return sections
}

/**
 * The section the reader is in, kept up to date while they scroll.
 *
 * `sectionBeingReadNow` is the reading; this is the two listeners that take it
 * again whenever it could have changed, and it is here rather than in either
 * component because both of them now want it.
 *
 * **`resize` as well as `scroll`**, because the headings move without the page
 * scrolling: a window narrowed enough to rewrap a paragraph moves every heading
 * under it, and on a phone the address bar collapsing is a resize.
 *
 * Passive, and the work is two reads and a `setState` per event. A frame budget
 * would matter if this measured layout and then wrote to it; it measures, and
 * React does the writing afterwards.
 */
export const useSectionBeingRead = (sections: readonly PageSection[]): string | undefined => {
  const [current, setCurrent] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (sections.length === 0) {
      setCurrent(undefined)

      return
    }

    const mark = () => setCurrent(sectionBeingReadNow(sections))

    mark()

    window.addEventListener("scroll", mark, { passive: true })
    window.addEventListener("resize", mark, { passive: true })

    return () => {
      window.removeEventListener("scroll", mark)
      window.removeEventListener("resize", mark)
    }
  }, [sections])

  return current
}
