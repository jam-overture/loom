import Link from "next/link"

import { OffSiteLink } from "@/app/(docs)/_components/off-site-link"
import { docsHref, docsLandingOf, docsPagesIn, docsSections } from "@/app/(docs)/_lib/nav"
import {
  DECISIONS_URL,
  LICENSE_NOTICE,
  LICENSE_URL,
  OTHER_SURFACES,
  REPOSITORY_URL,
} from "@/app/(docs)/_lib/surfaces"

/**
 * The foot of every page, and the reason this run exists.
 *
 * Until now this site had no footer at all. That is defensible for a reference
 * site right up to the moment it is one surface of five, at which point the
 * foot of the page is the only place a reader who has finished reading can be
 * handed anywhere — and the documentation was handing them nowhere (the
 * 24 September finding, filed by `Loom marketing` from the front door).
 *
 * Three columns, and the order is what a reader wants in the order they want
 * it: **out of here first**, because that is what a footer is for; the rest of
 * this site second, for the reader who wants a different section and is at the
 * bottom of a page rather than at the top of the rail; the project itself last,
 * because a link that leaves for GitHub is the least likely of the three to be
 * what somebody is looking for.
 *
 * It is application furniture rather than content, which is the one part of
 * this surface 0067 exempts from being composed out of registered primitives.
 * The marketing site's footer *is* a tree — a `loom.footer` holding
 * `loom.link-list`s — and that is right for a page whose whole claim is that
 * the page is data. It is not right here: a model has no business proposing a
 * change to the chrome of a reference site, and a footer rendered from a tree
 * on every page of a statically prerendered site is work done 114 times for a
 * result that never differs.
 */

/** A column, which is a heading and a list, three times over. */
const Group = ({
  title,
  children,
}: {
  readonly title: string
  readonly children: React.ReactNode
}) => (
  <div className="flex w-full flex-col gap-3 sm:w-auto sm:max-w-xs sm:min-w-[11rem]">
    <p className="text-ink text-xs font-semibold tracking-wide uppercase">{title}</p>
    <ul className="flex flex-col gap-2 text-sm">{children}</ul>
  </div>
)

const linkClass = "text-ink-muted hover:text-ink transition-colors"

export const SiteFooter = () => (
  <footer className="border-edge mt-24 border-t">
    <div className="mx-auto max-w-[100rem] px-5 py-12 sm:px-8 lg:px-12">
      {/*
       * A wrapping row rather than a grid of equal thirds. The container is
       * `100rem` wide to line up with the header, and three equal columns of
       * that are three short lists a third of a screen apart — the eye has to
       * travel to find the third one. Packed left they read as one block, and
       * they still stack on a phone.
       */}
      <div className="flex flex-wrap gap-x-16 gap-y-10">
        {/*
         * The way back. Each row says where it goes *and what is there*,
         * because "Portal" is a word this project made up and a stranger who
         * has read four pages of documentation has no reason to know it means
         * the screen where proposals are answered.
         */}
        <Group title="The rest of Loom">
          {OTHER_SURFACES.map((surface) => (
            <li key={surface.path}>
              <Link href={surface.path} className={`${linkClass} font-medium`}>
                {surface.label}
              </Link>
              <span className="text-ink-faint block text-xs">{surface.blurb}</span>
            </li>
          ))}
        </Group>

        {/*
         * The sections, read from the same list the rail and the pager read, so
         * a section added or renamed cannot leave a stale row down here.
         */}
        <Group title="Documentation">
          {docsSections.map((section) => {
            const entry = docsLandingOf(section) ?? docsPagesIn(section)[0]

            if (entry === undefined) return null

            return (
              <li key={section.slug}>
                <Link href={docsHref(section.slug, entry.slug)} className={linkClass}>
                  {section.title}
                </Link>
              </li>
            )
          })}
        </Group>

        <Group title="The project">
          <li>
            <OffSiteLink href={REPOSITORY_URL} className={linkClass}>
              Source on GitHub
            </OffSiteLink>
          </li>
          <li>
            <OffSiteLink href={DECISIONS_URL} className={linkClass}>
              Decision records
            </OffSiteLink>
          </li>
          <li>
            <OffSiteLink href={LICENSE_URL} className={linkClass}>
              The MIT license
            </OffSiteLink>
          </li>
        </Group>
      </div>

      <p className="text-ink-faint border-edge mt-10 border-t pt-6 text-xs">{LICENSE_NOTICE}</p>
    </div>
  </footer>
)
