/**
 * Invented data for the shell prototype, and nothing else in the portal may
 * import it.
 *
 * Everything here is made up. It exists so the new information architecture can
 * be walked through and argued with before any of it is built on real tables —
 * the maintainer's words on 12 October were that he *"can't even make heads or
 * tails of what I should be looking at and therefore can't give you any real
 * direction"*, and a screen with plausible numbers on it is the cheapest way to
 * fix that.
 *
 * The numbers are chosen to show the states that matter rather than to flatter:
 * one project healthy, one never connected, one erroring, one paused.
 */

export type ProjectHealth = "healthy" | "erroring" | "waiting" | "paused"

export type PreviewProject = {
  readonly slug: string
  readonly name: string
  readonly host: string
  readonly health: ProjectHealth
  readonly pages: number
  readonly signals24h: number
  readonly errors24h: number
  readonly waiting: number
  readonly createdAt: string
  readonly ingestKey: string
}

export const PREVIEW_PROJECTS: readonly PreviewProject[] = [
  {
    slug: "loom-site",
    name: "loomjs.org",
    host: "www.loomjs.org",
    health: "healthy",
    pages: 3,
    signals24h: 18_422,
    errors24h: 0,
    waiting: 2,
    createdAt: "2026-10-12",
    ingestKey: "lk_live_7f3a9c2e5b184d6a",
  },
  {
    slug: "storefront",
    name: "Storefront",
    host: "shop.example.com",
    health: "erroring",
    pages: 14,
    signals24h: 240_915,
    errors24h: 312,
    waiting: 7,
    createdAt: "2026-09-04",
    ingestKey: "lk_live_2d81b4f09ae37c55",
  },
  {
    slug: "docs-portal",
    name: "Docs",
    host: "docs.example.com",
    health: "waiting",
    pages: 0,
    signals24h: 0,
    errors24h: 0,
    waiting: 0,
    createdAt: "2026-10-11",
    ingestKey: "lk_live_9c04e7a1f6b2d830",
  },
  {
    slug: "campaign-q4",
    name: "Q4 campaign",
    host: "go.example.com",
    health: "paused",
    pages: 6,
    signals24h: 0,
    errors24h: 0,
    waiting: 0,
    createdAt: "2026-08-19",
    ingestKey: "lk_live_51ac8e03d7f94b26",
  },
]

export const projectBySlug = (slug: string): PreviewProject | undefined =>
  PREVIEW_PROJECTS.find((project) => project.slug === slug)

export const HEALTH_LABEL: Readonly<Record<ProjectHealth, string>> = {
  healthy: "Healthy",
  erroring: "Errors",
  waiting: "Not connected",
  paused: "Paused",
}

/**
 * The **outcome** families, not the action ones.
 *
 * `affirm` and `refuse` read like success and failure and are neither: they
 * are the primary and secondary *button* styles — `affirm` is `#0a0a0a` on
 * white, so a HEALTHY badge wearing it comes out solid black, and
 * `text-affirm-ink` on a white row is white on white. The semantic set is
 * `applied` / `awaiting` / `rejected`, which carry a tinted background and a
 * readable ink.
 */
export const HEALTH_TONE: Readonly<Record<ProjectHealth, string>> = {
  healthy: "bg-applied text-applied-ink border-applied-ink/20",
  erroring: "bg-rejected text-rejected-ink border-rejected-ink/20",
  waiting: "bg-awaiting text-awaiting-ink border-awaiting-ink/20",
  paused: "bg-neutral text-neutral-ink border-neutral-edge",
}

export type LogKind = "signal" | "change" | "error" | "gate"

export type PreviewLog = {
  readonly id: string
  readonly at: string
  readonly kind: LogKind
  readonly status: number
  readonly page: string
  readonly summary: string
  readonly durationMs: number
  readonly region: string
  readonly detail: readonly (readonly [string, string])[]
}

const LOG_SEED: readonly (readonly [string, LogKind, number, string, string, number, string])[] = [
  ["04:12:09.431", "error", 422, "/checkout", "Signal batch rejected — unknown node id", 12, "iad1"],
  ["04:12:09.088", "signal", 200, "/checkout", "214 signals across 31 parts", 48, "iad1"],
  ["04:11:58.902", "gate", 200, "/pricing", "Held for review — reaches 11 parts", 604, "sfo1"],
  ["04:11:51.337", "signal", 200, "/pricing", "189 signals across 24 parts", 41, "sfo1"],
  ["04:11:44.210", "change", 200, "/pricing", "Applied — shorten the hero", 1_284, "sfo1"],
  ["04:10:02.775", "error", 500, "/checkout", "Model timed out after 30s", 30_014, "iad1"],
  ["04:09:47.119", "signal", 200, "/", "402 signals across 58 parts", 55, "fra1"],
  ["04:09:12.640", "gate", 200, "/", "Turned down — would remove 14 parts", 388, "fra1"],
  ["04:08:55.001", "signal", 200, "/", "377 signals across 58 parts", 39, "fra1"],
  ["04:08:31.492", "change", 200, "/about", "Applied — reorder the testimonials", 902, "iad1"],
  ["04:07:19.883", "error", 401, "/checkout", "Ingest key not recognised", 4, "sin1"],
  ["04:06:58.204", "signal", 200, "/about", "96 signals across 12 parts", 33, "iad1"],
]

export const PREVIEW_LOGS: readonly PreviewLog[] = LOG_SEED.map(
  ([at, kind, status, page, summary, durationMs, region], index) => ({
    id: `log_${index.toString().padStart(3, "0")}`,
    at,
    kind,
    status,
    page,
    summary,
    durationMs,
    region,
    detail: [
      ["Request ID", `req_${(index * 7919).toString(16).padStart(12, "0")}`],
      ["Page", page],
      ["Revision", `${12 - index}`],
      ["Region", region],
      ["Duration", `${durationMs} ms`],
      ["Status", `${status}`],
      ["Ingest key", "lk_live_2d81…7c55"],
      ["User agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"],
    ],
  })
)

export const logById = (id: string): PreviewLog | undefined =>
  PREVIEW_LOGS.find((log) => log.id === id)

export const LOG_TONE: Readonly<Record<LogKind, string>> = {
  signal: "text-ink-muted",
  change: "text-applied-ink",
  error: "text-rejected-ink",
  gate: "text-awaiting-ink",
}

/** Signals per hour over a day, for the sparkline on the overview. */
export const SIGNALS_BY_HOUR: readonly number[] = [
  412, 388, 301, 254, 198, 171, 190, 266, 402, 611, 844, 1_002, 1_118, 1_203, 1_164, 1_088, 996,
  921, 870, 798, 702, 611, 522, 455,
]

export const ERRORS_BY_HOUR: readonly number[] = [
  0, 0, 0, 0, 0, 0, 0, 0, 2, 4, 1, 0, 0, 0, 18, 44, 61, 72, 51, 33, 14, 6, 4, 2,
]
