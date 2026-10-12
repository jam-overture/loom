import Link from "next/link"

import { WorkspaceShell } from "./_components/shell"
import { HEALTH_LABEL, HEALTH_TONE, PREVIEW_PROJECTS } from "./_lib/fixtures"

/**
 * The workspace, which is the screen Loom has never had.
 *
 * It is the answer to the question the maintainer asked on 1 October — *"know
 * which apps I have registered with Loom"* — and which
 * [0220](../../../../../decisions/0220-an-app-is-a-registry-a-policy-and-a-store-and-loom-has-one-of-each.md)
 * answered with *there is no such thing, and here is what a second would
 * cost*. This is what refusing 0220 buys.
 *
 * Every row carries the four numbers somebody actually opens a portal for:
 * whether it is receiving, how much, how much of it went wrong, and how much
 * is waiting on them.
 */

const Figure = ({
  value,
  label,
  tone,
}: {
  value: string
  label: string
  tone?: string | undefined
}) => (
  <div className="flex flex-col gap-0.5">
    <span className={`font-mono text-sm ${tone ?? ""}`}>{value}</span>
    <span className="text-ink-muted text-[11px]">{label}</span>
  </div>
)

const WorkspacePage = () => (
  <WorkspaceShell>
    <div className="flex items-center justify-between pb-5">
      <h1 className="text-xl tracking-tight">Projects</h1>
      <button
        type="button"
        className="bg-affirm text-affirm-ink border-affirm-edge rounded-md border px-3 py-1.5 text-sm"
      >
        New project
      </button>
    </div>

    <div className="flex flex-wrap items-center gap-2 pb-4">
      <input
        type="search"
        placeholder="Search projects"
        className="border-edge bg-surface-base placeholder:text-ink-placeholder w-60 rounded-md border px-2.5 py-1.5 text-sm"
      />
      <select className="border-edge bg-surface-base rounded-md border px-2.5 py-1.5 text-sm">
        <option>All statuses</option>
        <option>Healthy</option>
        <option>Errors</option>
        <option>Not connected</option>
        <option>Paused</option>
      </select>
    </div>

    <ul className="grid list-none grid-cols-1 gap-3 p-0 lg:grid-cols-2">
      {PREVIEW_PROJECTS.map((project) => (
        <li key={project.slug}>
          <Link
            href={`/portal/preview/${project.slug}`}
            className="border-edge-subtle bg-surface-base hover:border-edge flex flex-col gap-3 rounded-lg border p-4 no-underline"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium tracking-tight">{project.name}</span>
                <span className="text-ink-muted font-mono text-[11px]">{project.host}</span>
              </div>
              <span
                className={`rounded border px-1.5 py-0.5 text-[10px] tracking-wide uppercase ${HEALTH_TONE[project.health]}`}
              >
                {HEALTH_LABEL[project.health]}
              </span>
            </div>

            <div className="border-edge-subtle grid grid-cols-4 gap-3 border-t pt-3">
              <Figure value={project.pages.toString()} label="pages" />
              <Figure value={project.signals24h.toLocaleString("en-GB")} label="signals · 24h" />
              <Figure
                value={project.errors24h.toLocaleString("en-GB")}
                label="errors · 24h"
                tone={project.errors24h > 0 ? "text-refuse-ink" : undefined}
              />
              <Figure
                value={project.waiting.toString()}
                label="waiting on you"
                tone={project.waiting > 0 ? "text-awaiting-ink" : undefined}
              />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  </WorkspaceShell>
)

export default WorkspacePage
