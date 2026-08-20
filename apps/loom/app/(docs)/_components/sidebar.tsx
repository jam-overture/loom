"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { docsSections } from "@/app/(docs)/_lib/nav"

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
          <p className="text-ink mb-1 text-xs font-semibold tracking-wide uppercase">
            {section.title}
          </p>

          <ul className="border-edge flex flex-col border-l">
            {section.pages.map((page) => {
              const href = `/docs/${section.slug}/${page.slug}`
              const here = pathname === href

              return (
                <li key={page.slug}>
                  <Link
                    href={href}
                    {...dismiss}
                    {...(here ? { "aria-current": "page" as const } : {})}
                    className={`-ml-px block border-l py-1.5 pl-3 transition-colors ${
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
