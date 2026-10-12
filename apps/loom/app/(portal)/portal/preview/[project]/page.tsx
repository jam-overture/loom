import Link from "next/link"
import { notFound } from "next/navigation"

import { Screen } from "@/app/(portal)/_components/screen"

import { PreviewBanner, ProjectShell } from "../_components/shell"
import {
  ERRORS_BY_HOUR,
  HEALTH_LABEL,
  HEALTH_TONE,
  PREVIEW_LOGS,
  SIGNALS_BY_HOUR,
  projectBySlug,
} from "../_lib/fixtures"

/**
 * The project overview — the screen `Your app` should have been.
 *
 * `Your app` is 13,298px tall and prints every registered primitive and the
 * whole policy inline. This is the same subject in one screen: what it is,
 * whether it is receiving, what went wrong, and the two identifiers somebody
 * came here to copy.
 */

const Stat = ({
  label,
  value,
  tone,
  note,
}: {
  label: string
  value: string
  tone?: string | undefined
  note?: string | undefined
}) => (
  <div className="border-edge-subtle bg-surface-base flex flex-col gap-1 rounded-lg border p-3">
    <span className="text-ink-muted text-[11px] tracking-wide uppercase">{label}</span>
    <span className={`font-mono text-lg leading-none ${tone ?? ""}`}>{value}</span>
    {note !== undefined && <span className="text-ink-muted text-[11px]">{note}</span>}
  </div>
)

/** A bar chart in CSS. A prototype does not need a charting dependency. */
const Bars = ({ series, tone }: { series: readonly number[]; tone: string }) => {
  const peak = Math.max(...series, 1)

  return (
    <div className="flex h-16 items-end gap-[3px]">
      {series.map((value, hour) => (
        <span
          key={hour}
          className={`min-w-0 flex-1 rounded-[1px] ${tone}`}
          style={{ height: `${Math.max((value / peak) * 100, 2)}%` }}
          title={`${String(hour).padStart(2, "0")}:00 — ${value.toLocaleString("en-GB")}`}
        />
      ))}
    </div>
  )
}

const Field = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="flex flex-col gap-1">
    <span className="text-ink-muted text-[11px] tracking-wide uppercase">{label}</span>
    <div className="flex items-center gap-2">
      <code className="border-edge-subtle bg-surface-page flex-1 truncate rounded-md border px-2.5 py-1.5 font-mono text-xs">
        {value}
      </code>
      <button type="button" className="border-edge hover:bg-surface-hover rounded-md border px-2 py-1.5 text-xs">
        Copy
      </button>
    </div>
    {hint !== undefined && <span className="text-ink-muted text-[11px]">{hint}</span>}
  </div>
)

const ProjectOverview = async ({ params }: { params: Promise<{ project: string }> }) => {
  const { project: slug } = await params
  const project = projectBySlug(slug)

  if (project === undefined) notFound()

  return (
    <ProjectShell project={project} rest="">
    <Screen>
      <PreviewBanner />
      <div className="flex items-start justify-between gap-4 pb-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl tracking-tight">{project.name}</h1>
          <span className="text-ink-muted font-mono text-xs">{project.host}</span>
        </div>
        <span
          className={`rounded border px-2 py-1 text-[11px] tracking-wide uppercase ${HEALTH_TONE[project.health]}`}
        >
          {HEALTH_LABEL[project.health]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 pb-6 lg:grid-cols-4">
        <Stat label="Pages" value={project.pages.toString()} note="governed here" />
        <Stat
          label="Signals · 24h"
          value={project.signals24h.toLocaleString("en-GB")}
          note="last at 04:12 UTC"
        />
        <Stat
          label="Errors · 24h"
          value={project.errors24h.toLocaleString("en-GB")}
          tone={project.errors24h > 0 ? "text-rejected-ink" : undefined}
          note={project.errors24h > 0 ? "3 kinds" : "none"}
        />
        <Stat
          label="Waiting on you"
          value={project.waiting.toString()}
          tone={project.waiting > 0 ? "text-awaiting-ink" : undefined}
          note={project.waiting > 0 ? "oldest 4h ago" : "nothing held"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 pb-6 lg:grid-cols-2">
        <section className="border-edge-subtle bg-surface-base rounded-lg border p-4">
          <div className="flex items-baseline justify-between pb-3">
            <h2 className="text-sm font-medium tracking-tight">Signals</h2>
            <span className="text-ink-muted text-[11px]">last 24 hours</span>
          </div>
          <Bars series={SIGNALS_BY_HOUR} tone="bg-applied-ink/35" />
        </section>
        <section className="border-edge-subtle bg-surface-base rounded-lg border p-4">
          <div className="flex items-baseline justify-between pb-3">
            <h2 className="text-sm font-medium tracking-tight">Errors</h2>
            <Link
              href={`/portal/preview/${project.slug}/logs?kind=error`}
              className="text-[11px] no-underline hover:underline"
            >
              Open in logs →
            </Link>
          </div>
          <Bars series={ERRORS_BY_HOUR} tone="bg-rejected-ink/45" />
        </section>
      </div>

      <section className="border-edge-subtle bg-surface-base mb-6 rounded-lg border p-4">
        <div className="flex items-baseline justify-between pb-3">
          <h2 className="text-sm font-medium tracking-tight">Connect your app</h2>
          <Link
            href={`/portal/preview/${project.slug}/settings/credentials`}
            className="text-[11px] no-underline hover:underline"
          >
            Credentials →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Field label="Project ID" value={`prj_${project.slug}`} />
          <Field
            label="Ingest key"
            value={`${project.ingestKey.slice(0, 12)}••••••••`}
            hint="Sent with every batch. Rotatable; never shown in full twice."
          />
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between pb-2">
          <h2 className="text-sm font-medium tracking-tight">Recent events</h2>
          <Link
            href={`/portal/preview/${project.slug}/logs`}
            className="text-[11px] no-underline hover:underline"
          >
            All logs →
          </Link>
        </div>
        <ul className="border-edge-subtle divide-edge-subtle bg-surface-base list-none divide-y rounded-lg border p-0">
          {PREVIEW_LOGS.slice(0, 5).map((log) => (
            <li key={log.id} className="flex items-center gap-3 px-3 py-2 text-xs">
              <span className="text-ink-muted w-20 shrink-0 font-mono">{log.at.slice(0, 8)}</span>
              <span
                className={`w-10 shrink-0 font-mono ${log.status >= 400 ? "text-rejected-ink" : "text-ink-muted"}`}
              >
                {log.status}
              </span>
              <span className="text-ink-muted w-16 shrink-0 font-mono">{log.page}</span>
              <span className="truncate">{log.summary}</span>
            </li>
          ))}
        </ul>
      </section>
        </Screen>
  </ProjectShell>
  )
}

export default ProjectOverview
