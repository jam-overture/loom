import Link from "next/link"
import { notFound } from "next/navigation"

import { Screen } from "@/app/(portal)/_components/screen"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"

import { PreviewBanner, ProjectShell } from "../../_components/shell"
import {
  LOG_TONE,
  PREVIEW_LOGS,
  SIGNALS_BY_HOUR,
  logById,
  projectBySlug,
  type LogKind,
} from "../../_lib/fixtures"

/**
 * Logs — the screen this product is for, and the one that does not exist.
 *
 * `Readers` today is a dashed box saying no page has reported anything and a
 * grey box saying the counts would not be kept anyway: 322 words, no table, no
 * chart, no filter, no detail. This is the fourth Supabase screenshot read as
 * a specification — a timeline you can see the shape of the day in, a dense
 * table, and a pane on the right that opens when you press a row.
 *
 * The selected row is a query parameter rather than client state, so a log
 * line is a URL somebody can paste into a message. That is worth more than the
 * interaction costs.
 */

const KINDS: readonly LogKind[] = ["signal", "change", "error", "gate"]

const Facet = ({
  name,
  options,
  base,
  active,
}: {
  name: string
  options: readonly { readonly label: string; readonly href: string; readonly count?: number }[]
  base: string
  active?: string | undefined
}) => (
  <div className="pb-4">
    <p className="text-ink-muted pb-1 text-[10px] tracking-widest uppercase">{name}</p>
    <ul className="list-none p-0">
      {options.map((option) => (
        <li key={option.label}>
          <Link
            href={`${base}${option.href}`}
            className={`flex items-center justify-between rounded px-1.5 py-1 text-[12px] no-underline ${
              active === option.label ? "bg-surface-active text-ink" : "text-ink-secondary hover:bg-surface-hover"
            }`}
          >
            {option.label}
            {option.count !== undefined && (
              <span className="text-ink-placeholder font-mono text-[10px]">{option.count}</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  </div>
)

const LogsPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ project: string }>
  searchParams: Promise<{ kind?: string; log?: string }>
}) => {
  await requireActor("/portal/preview")

  const { project: slug } = await params
  const { kind, log: openId } = await searchParams
  const project = projectBySlug(slug)

  if (project === undefined) notFound()

  const base = `/portal/preview/${project.slug}/logs`
  const shown = PREVIEW_LOGS.filter((entry) => kind === undefined || entry.kind === kind)
  const open = openId === undefined ? undefined : logById(openId)
  const peak = Math.max(...SIGNALS_BY_HOUR)

  const keep = (next: Record<string, string | undefined>): string => {
    const query = new URLSearchParams()

    if (next["kind"] !== undefined) query.set("kind", next["kind"])
    if (next["log"] !== undefined) query.set("log", next["log"])

    const search = query.toString()

    return search === "" ? "" : `?${search}`
  }

  return (
    <ProjectShell project={project} rest="/logs">
    <Screen>
      <PreviewBanner />
      <div className="flex items-baseline justify-between pb-4">
        <h1 className="text-xl tracking-tight">Logs</h1>
        <div className="flex items-center gap-2">
          <select className="border-edge bg-surface-base rounded-md border px-2 py-1 text-xs">
            <option>Last 24 hours</option>
            <option>Last hour</option>
            <option>Last 7 days</option>
          </select>
          <button type="button" className="border-edge hover:bg-surface-hover rounded-md border px-2 py-1 text-xs">
            Live
          </button>
        </div>
      </div>

      <input
        type="search"
        placeholder="Search logs…"
        className="border-edge bg-surface-base placeholder:text-ink-placeholder mb-4 w-full rounded-md border px-3 py-1.5 text-sm"
      />

      <div className="border-edge-subtle bg-surface-base mb-4 rounded-lg border p-3">
        <div className="flex h-12 items-end gap-[2px]">
          {SIGNALS_BY_HOUR.map((value, hour) => (
            <span
              key={hour}
              className="bg-applied-ink/35 min-w-0 flex-1 rounded-[1px]"
              style={{ height: `${Math.max((value / peak) * 100, 3)}%` }}
              title={`${String(hour).padStart(2, "0")}:00`}
            />
          ))}
        </div>
        <div className="text-ink-placeholder flex justify-between pt-1 font-mono text-[10px]">
          <span>04:00</span>
          <span>12:00</span>
          <span>20:00</span>
          <span>04:00</span>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="w-40 shrink-0">
          <Facet
            name="Kind"
            base={base}
            active={kind === undefined ? "All" : kind}
            options={[
              { label: "All", href: keep({ log: openId }), count: PREVIEW_LOGS.length },
              ...KINDS.map((one) => ({
                label: one,
                href: keep({ kind: one, log: openId }),
                count: PREVIEW_LOGS.filter((entry) => entry.kind === one).length,
              })),
            ]}
          />
          <Facet
            name="Status"
            base={base}
            options={[
              { label: "2xx", href: keep({ kind, log: openId }) },
              { label: "4xx", href: keep({ kind, log: openId }) },
              { label: "5xx", href: keep({ kind, log: openId }) },
            ]}
          />
          <Facet
            name="Region"
            base={base}
            options={[
              { label: "iad1", href: keep({ kind, log: openId }) },
              { label: "sfo1", href: keep({ kind, log: openId }) },
              { label: "fra1", href: keep({ kind, log: openId }) },
              { label: "sin1", href: keep({ kind, log: openId }) },
            ]}
          />
        </div>

        <div className="min-w-0 flex-1">
          <table className="w-full table-fixed border-collapse text-left">
            <thead>
              <tr className="text-ink-muted border-edge-subtle border-b text-[10px] tracking-widest uppercase">
                <th className="w-[94px] py-1.5 pr-3 font-normal">Time</th>
                <th className="w-[58px] py-1.5 pr-3 font-normal">Kind</th>
                <th className="w-[46px] py-1.5 pr-3 font-normal">Status</th>
                <th className="w-[76px] py-1.5 pr-3 font-normal">Page</th>
                <th className="py-1.5 font-normal">Event</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((entry) => (
                <tr
                  key={entry.id}
                  className={`border-edge-subtle border-b text-xs ${
                    open?.id === entry.id ? "bg-surface-active" : "hover:bg-surface-hover"
                  }`}
                >
                  <td className="py-1.5 pr-3">
                    <Link
                      href={`${base}${keep({ kind, log: entry.id })}`}
                      className="text-ink-muted font-mono no-underline"
                    >
                      {entry.at}
                    </Link>
                  </td>
                  <td className={`py-1.5 pr-3 font-mono ${LOG_TONE[entry.kind]}`}>{entry.kind}</td>
                  <td
                    className={`py-1.5 pr-3 font-mono ${entry.status >= 400 ? "text-rejected-ink" : "text-ink-muted"}`}
                  >
                    {entry.status}
                  </td>
                  <td className="text-ink-muted truncate py-1.5 pr-3 font-mono">{entry.page}</td>
                  <td className="truncate py-1.5">{entry.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 && (
            <p className="text-ink-muted py-6 text-center text-xs">Nothing matched.</p>
          )}
        </div>

        {open !== undefined && (
          <aside className="border-edge-subtle bg-surface-base w-72 shrink-0 self-start rounded-lg border">
            <div className="border-edge-subtle flex items-center justify-between border-b px-3 py-2">
              <span className={`font-mono text-xs ${LOG_TONE[open.kind]}`}>{open.kind}</span>
              <Link
                href={`${base}${keep({ kind })}`}
                className="text-ink-muted text-xs no-underline"
                aria-label="Close"
              >
                ✕
              </Link>
            </div>
            <div className="px-3 py-2">
              <p className="pb-2 text-xs">{open.summary}</p>
              <dl className="divide-edge-subtle m-0 divide-y">
                {open.detail.map(([key, value]) => (
                  <div key={key} className="flex gap-2 py-1.5">
                    <dt className="text-ink-muted w-20 shrink-0 text-[11px]">{key}</dt>
                    <dd className="m-0 truncate font-mono text-[11px]" title={value}>
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </aside>
        )}
      </div>
        </Screen>
  </ProjectShell>
  )
}

export default LogsPage
