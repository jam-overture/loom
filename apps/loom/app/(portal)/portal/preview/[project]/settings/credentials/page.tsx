import { notFound } from "next/navigation"

import { Screen } from "@/app/(portal)/_components/screen"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"

import { PreviewBanner, ProjectShell } from "../../../_components/shell"
import { projectBySlug } from "../../../_lib/fixtures"

/**
 * Credentials, and the snippet that registers an app — the maintainer's second
 * component and the portal's stated primary purpose.
 *
 * It is worth being plain that **this screen is invented.** The key, the
 * origin check and the filing it describes exist since 0298, and a key is
 * minted with `pnpm signals:key`; the screen that shows a real one with its
 * snippet is unit 4c's, and this preview is what it would be in service of.
 */

const Field = ({
  label,
  value,
  hint,
  action,
}: {
  label: string
  value: string
  hint?: string | undefined
  action?: string | undefined
}) => (
  <div className="flex flex-col gap-1 pb-4">
    <span className="text-ink-muted text-[11px] tracking-wide uppercase">{label}</span>
    <div className="flex items-center gap-2">
      <code className="border-edge-subtle bg-surface-page flex-1 truncate rounded-md border px-2.5 py-1.5 font-mono text-xs">
        {value}
      </code>
      <button type="button" className="border-edge hover:bg-surface-hover rounded-md border px-2 py-1.5 text-xs">
        Copy
      </button>
      {action !== undefined && (
        <button type="button" className="border-edge hover:bg-surface-hover rounded-md border px-2 py-1.5 text-xs">
          {action}
        </button>
      )}
    </div>
    {hint !== undefined && <span className="text-ink-muted text-[11px]">{hint}</span>}
  </div>
)

const CredentialsPage = async ({ params }: { params: Promise<{ project: string }> }) => {
  await requireActor("/portal/preview")

  const { project: slug } = await params
  const project = projectBySlug(slug)

  if (project === undefined) notFound()

  const snippet = `import { loom } from "@jam-overture/loom"

export const app = loom({
  projectId: "prj_${project.slug}",
  ingestKey: process.env.LOOM_INGEST_KEY,
})`

  return (
    <ProjectShell project={project} rest="/settings/credentials">
    <Screen>
      <PreviewBanner />
      <h1 className="pb-1 text-xl tracking-tight">Credentials</h1>
      <p className="text-ink-muted pb-5 text-xs">
        What your application sends with every batch so Loom knows whose it is.
      </p>

      <section className="border-edge-subtle bg-surface-base mb-4 rounded-lg border p-4">
        <Field label="Project ID" value={`prj_${project.slug}`} hint="Safe to commit." />
        <Field
          label="Ingest key"
          value={`${project.ingestKey.slice(0, 12)}••••••••••••`}
          hint="Secret. Shown in full once, when it is created."
          action="Rotate"
        />
        <Field
          label="Endpoint"
          value="https://api.loomjs.org/v1/signals"
          hint="Where batches are posted."
        />
        <div className="flex flex-col gap-1">
          <span className="text-ink-muted text-[11px] tracking-wide uppercase">
            Allowed origins
          </span>
          <input
            defaultValue="https://www.loomjs.org, https://loomjs.org"
            className="border-edge bg-surface-base rounded-md border px-2.5 py-1.5 font-mono text-xs"
          />
          <span className="text-ink-muted text-[11px]">
            A batch from anywhere else is rejected with 403 and counted on the overview.
          </span>
        </div>
      </section>

      <section className="border-edge-subtle bg-surface-base rounded-lg border p-4">
        <h2 className="pb-2 text-sm font-medium tracking-tight">Register your app</h2>
        <pre className="border-edge-subtle bg-surface-page m-0 overflow-x-auto rounded-md border p-3 font-mono text-[11px] leading-relaxed">
          {snippet}
        </pre>
        <p className="text-ink-muted pt-2 text-[11px]">
          Then set <code className="font-mono">LOOM_INGEST_KEY</code> wherever your app reads its
          environment.
        </p>
      </section>
        </Screen>
  </ProjectShell>
  )
}

export default CredentialsPage
