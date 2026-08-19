import { entryPoints, type EntryPoint } from "@/app/(docs)/_lib/entry-points"

const AUDIENCE: Record<EntryPoint["audience"], string> = {
  app: "any app",
  host: "hosts",
  tooling: "tooling",
}

/**
 * The map of doors, rendered from the list a test holds against the runtime's
 * own `exports`. Written as a component rather than a table in MDX so that
 * adding an entry point is one edit, not one edit per page that lists them.
 */
export const EntryPoints = () => (
  <div className="not-prose border-edge my-6 overflow-x-auto rounded-lg border">
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-surface-sunken text-ink">
          <th className="border-edge border-b px-3 py-2 text-left font-semibold">Import</th>
          <th className="border-edge border-b px-3 py-2 text-left font-semibold">What is behind it</th>
          <th className="border-edge border-b px-3 py-2 text-left font-semibold">For</th>
        </tr>
      </thead>
      <tbody>
        {entryPoints.map((entry) => (
          <tr key={entry.specifier} className="border-edge border-b last:border-b-0">
            <td className="text-ink px-3 py-2 align-top font-mono text-xs whitespace-nowrap">
              {entry.specifier}
            </td>
            <td className="text-ink-muted px-3 py-2 align-top">{entry.summary}</td>
            <td className="text-ink-faint px-3 py-2 align-top text-xs whitespace-nowrap">
              {AUDIENCE[entry.audience]}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)
