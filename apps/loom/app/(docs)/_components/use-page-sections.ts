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
 * new rule about headings the other would go on applying the old one. The
 * measurement is the rail's alone and stays here beside the walk, because it is
 * the same subject read with the same selectors.
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
 * The rail asks this on every scroll, and it is the rail's alone. The
 * disclosure marks nothing, for a reason that is a measurement rather than a
 * preference — `page-contents.tsx` has it, and the short version is that the
 * line a reader presses and the top 120 pixels of the window are never on
 * screen together.
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
