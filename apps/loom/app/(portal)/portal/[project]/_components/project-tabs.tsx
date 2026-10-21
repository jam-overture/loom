"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { isNavItemActive } from "@/app/(portal)/_lib/nav"
import { projectTabs } from "@/app/(portal)/_lib/project-tabs"

/**
 * The row of tabs above every screen of one project.
 *
 * A client component for the one thing a layout cannot know, which tab the
 * person is on. Which tabs there are is `projectTabs`, so this draws and
 * decides nothing else.
 */
export const ProjectTabs = ({ projectId }: { projectId: string }) => {
  const pathname = usePathname()

  return (
    <nav aria-label="This project" className="border-edge-subtle flex gap-1 border-b">
      {projectTabs(projectId).map((tab) => {
        const active = isNavItemActive(pathname, tab.href, tab.exact)

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm no-underline ${active ? "border-ink text-ink" : "text-ink-muted hover:text-ink border-transparent"}`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
