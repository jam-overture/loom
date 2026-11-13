"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

import type { ProjectId } from "@jam-overture/loom/store"

import { projectInAddress, projectNameHref, projectNameOf } from "@/app/(portal)/_lib/project-name"
import { projectHome } from "@/app/(portal)/_lib/project-tabs"

/** A project's name as last read, with the project it was read for, so one project's name never labels another. */
type ReadName = {
  readonly projectId: ProjectId
  /** `undefined` where the name could not be read. */
  readonly name: string | undefined
}

/**
 * The name of the project in the address, asked again each time the address
 * changes, since the top bar is drawn once for the whole portal and a rename on
 * *Settings* should show on the next screen. A read that fails leaves the
 * project's id, which the address already says, never a stale name.
 */
const useProjectName = (projectId: ProjectId | undefined, pathname: string | null) => {
  const [read, setRead] = useState<ReadName | undefined>(undefined)

  useEffect(() => {
    if (projectId === undefined) return

    const asking = new AbortController()

    fetch(projectNameHref(projectId), { cache: "no-store", signal: asking.signal })
      .then((response) => response.json())
      .then((body: unknown) => setRead({ projectId, name: projectNameOf(body) }))
      .catch(() => {
        if (!asking.signal.aborted) setRead({ projectId, name: undefined })
      })

    return () => asking.abort()
  }, [projectId, pathname])

  return read?.projectId === projectId ? read : undefined
}

const Separator = () => (
  <li aria-hidden="true" className="text-ink-placeholder">
    /
  </li>
)

/**
 * Where a signed-in person is, after the wordmark: the projects, then the
 * project the screen is about (`docs/portal-wireframes.md`, *The chrome*,
 * `loom / <workspace> / <project>`). The portal has no workspace yet, so its
 * place is the list of projects, which is what a workspace would hold.
 *
 * The project's crumb is drawn once its name has been asked: the name, or the
 * id where the name could not be read. Nothing is drawn while it is being
 * asked, so a crumb never changes from one word to another under the pointer.
 */
export const Breadcrumb = () => {
  const pathname = usePathname()
  const projectId = projectInAddress(pathname)
  const read = useProjectName(projectId, pathname)

  return (
    <nav aria-label="Where you are" className="min-w-0 overflow-hidden">
      <ol className="m-0 flex min-w-0 list-none items-center gap-2 p-0 text-sm">
        <Separator />
        <li>
          <Link href="/portal" className="text-ink-secondary hover:text-ink no-underline">
            Projects
          </Link>
        </li>
        {projectId !== undefined && read !== undefined && (
          <>
            <Separator />
            <li className="min-w-20">
              <Link
                href={projectHome(projectId)}
                className={`text-ink hover:text-ink-secondary block max-w-[16rem] truncate no-underline ${
                  read.name === undefined ? "font-mono text-xs" : ""
                }`}
              >
                {read.name ?? projectId}
              </Link>
            </li>
          </>
        )}
      </ol>
    </nav>
  )
}
