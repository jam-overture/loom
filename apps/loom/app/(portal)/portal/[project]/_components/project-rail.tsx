"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

import { isNavItemActive } from "@/app/(portal)/_lib/nav"
import {
  projectTabs,
  waitingCountHref,
  type ProjectTab,
  type ProjectTabGroup,
} from "@/app/(portal)/_lib/project-tabs"
import { waitingCountOf } from "@/app/(portal)/_lib/waiting-count"

/**
 * How many changes wait for a person, asked again each time the address
 * changes, since the rail is not drawn again when a person moves between a
 * project's screens. The last count stays until the new one arrives, and a
 * read that fails leaves no count rather than a stale one.
 */
const useWaitingCount = (projectId: string, pathname: string): number | undefined => {
  const [waiting, setWaiting] = useState<number | undefined>(undefined)

  useEffect(() => {
    const asking = new AbortController()

    fetch(waitingCountHref(projectId), { cache: "no-store", signal: asking.signal })
      .then((response) => response.json())
      .then((body: unknown) => setWaiting(waitingCountOf(body)))
      .catch(() => {
        if (!asking.signal.aborted) setWaiting(undefined)
      })

    return () => asking.abort()
  }, [projectId, pathname])

  return waiting
}

/** The count beside *For review*, drawn only when something waits, as *By page*'s badge is. */
const WaitingCount = ({ waiting }: { readonly waiting: number | undefined }) =>
  waiting === undefined || waiting === 0 ? null : (
    <span className="bg-awaiting text-awaiting-ink rounded px-1.5 py-0.5 text-[11px] tabular-nums">
      {waiting}
      <span className="sr-only"> waiting</span>
    </span>
  )

const RailItem = ({
  tab,
  active,
  waiting,
}: {
  readonly tab: ProjectTab
  readonly active: boolean
  readonly waiting: number | undefined
}) => (
  <li>
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center justify-between gap-3 rounded-md px-3 py-1.5 text-sm whitespace-nowrap no-underline ${
        active ? "bg-nav-active text-ink font-medium" : "text-ink-muted hover:text-ink"
      }`}
    >
      {tab.label}
      {tab.counts === "waiting" ? <WaitingCount waiting={waiting} /> : null}
    </Link>
  </li>
)

const GROUPS: readonly ProjectTabGroup[] = ["work", "setup"]

/**
 * The labelled rail beside every screen of one project
 * (`docs/portal-wireframes.md`, *The chrome*): words at rest, the screens a
 * person works in, a divider, then the ones that set the project up, and the
 * count of what waits beside *For review*.
 *
 * A client component for the two things a layout cannot know: which screen
 * the person is on, and what waits now rather than when the layout was drawn.
 * Which screens there are is `projectTabs`, so this decides nothing else. On
 * a narrow screen it is a row above the screen rather than a column beside it.
 */
export const ProjectRail = ({ projectId }: { readonly projectId: string }) => {
  const pathname = usePathname()
  const waiting = useWaitingCount(projectId, pathname)
  const tabs = projectTabs(projectId)

  return (
    <nav
      aria-label="This project"
      className="flex flex-wrap gap-1 md:flex-col md:flex-nowrap md:gap-3"
    >
      {GROUPS.map((group, index) => (
        <ul
          key={group}
          className={`m-0 flex list-none flex-wrap gap-1 p-0 md:flex-col ${
            index === 0
              ? ""
              : "border-edge-subtle border-l pl-1 md:border-t md:border-l-0 md:pt-3 md:pl-0"
          }`}
        >
          {tabs
            .filter((tab) => tab.group === group)
            .map((tab) => (
              <RailItem
                key={tab.href}
                tab={tab}
                active={isNavItemActive(pathname, tab.href, tab.exact)}
                waiting={waiting}
              />
            ))}
        </ul>
      ))}
    </nav>
  )
}
