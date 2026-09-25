"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  docsHref,
  docsLandingOf,
  docsPagesIn,
  docsSections,
  type DocsSection,
} from "@/app/(docs)/_lib/nav"

/**
 * A section's name, which is a link where the section has a page of its own.
 *
 * Marked the same way every other current page in this rail is: `aria-current`
 * first, so a screen reader is told, and an underline second, so a sighted
 * reader is told something that is not a shade of grey.
 */
const SectionTitle = ({
  section,
  pathname,
  dismiss,
}: {
  readonly section: DocsSection
  readonly pathname: string
  readonly dismiss: { readonly onClick?: () => void }
}) => {
  const landing = docsLandingOf(section)
  const name = "text-ink mb-1 text-xs font-semibold tracking-wide uppercase"

  if (landing === undefined) return <p className={name}>{section.title}</p>

  const href = docsHref(section.slug, landing.slug)
  const here = pathname === href

  return (
    <Link
      href={href}
      {...dismiss}
      {...(here ? { "aria-current": "page" as const } : {})}
      className={`${name} transition-colors ${
        here ? "underline underline-offset-4" : "hover:text-ink-muted"
      }`}
    >
      {section.title}
    </Link>
  )
}

/**
 * The persistent rail. It is the same on every page, which is the point: a
 * reader should be able to see where they are in the whole of the
 * documentation without navigating to find out.
 *
 * The current page is marked with `aria-current` first and a tint second. A
 * rail that says "you are here" only in colour says nothing to a screen reader
 * and nothing to anyone who cannot tell those two greys apart.
 */
export const Sidebar = ({ onNavigate }: { readonly onNavigate?: () => void }) => {
  const pathname = usePathname()

  /** Absent rather than `undefined`: the prop is optional, not nullable. */
  const dismiss = onNavigate === undefined ? {} : { onClick: onNavigate }

  return (
    <nav aria-label="Documentation" className="flex flex-col gap-7 py-8 pr-4 pl-6 text-sm">
      {docsSections.map((section) => (
        <div key={section.slug} className="flex flex-col gap-1">
          {/*
           * A section that has a page of its own puts it on its own title, and
           * does not also list it below. The alternative was a row under the
           * heading repeating the words directly above it, which is what a rail
           * looks like when it has been given a shape it does not have: the
           * page *is* the section, so the section's name is where a reader
           * reaches for it.
           */}
          <SectionTitle section={section} pathname={pathname} dismiss={dismiss} />

          <ul className="border-edge flex flex-col border-l">
            {docsPagesIn(section).map((page) => {
              const href = docsHref(section.slug, page.slug)
              const here = pathname === href

              /**
               * A generated section's pages are named after something a reader
               * types — an import path — so the rail sets them in the mono face
               * it is set in everywhere else on the site.
               */
              const face = section.source === "generated" ? "font-mono text-[0.8125rem]" : ""

              return (
                <li key={page.slug}>
                  <Link
                    href={href}
                    {...dismiss}
                    {...(here ? { "aria-current": "page" as const } : {})}
                    className={`-ml-px block border-l py-1.5 pl-3 transition-colors ${face} ${
                      here
                        ? "border-accent-ring text-ink font-medium"
                        : "text-ink-muted hover:border-edge-strong hover:text-ink border-transparent"
                    }`}
                  >
                    {page.title}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
