import { storeFailures } from "@/app/(docs)/_lib/deployment/failures"
import { storageSeams, type SchemaTable } from "@/app/(docs)/_lib/deployment/schema"

/**
 * The two tables on the deployment page that nobody typed.
 *
 * Components rather than markdown for the same reason `EntryPoints` is one:
 * both are things the repository already knows, and a copy of either in prose
 * is a copy that goes stale silently.
 *
 * `StorageSchema` is parsed out of `TREE_STORE_DDL`, `HOLD_STORE_DDL` and
 * `TELEMETRY_DDL` as the page builds — see `_lib/deployment/schema.ts`, and
 * `schema.live.test.ts`, which checks the result against a real Postgres that
 * has run them. `StoreFailures` is keyed by `StoreError["code"]`, so a sixth
 * way to fail is a compile error here rather than a row a reader never sees.
 */

const Marks = ({ column }: { readonly column: SchemaTable["columns"][number] }) => {
  const marks = [
    column.key ? "key" : undefined,
    column.required ? "required" : undefined,
    column.addedLater ? "added by a later migration" : undefined,
  ].filter((mark): mark is string => mark !== undefined)

  return <>{marks.length === 0 ? "optional" : marks.join(" · ")}</>
}

const Table = ({ table }: { readonly table: SchemaTable }) => (
  <div className="border-edge overflow-x-auto rounded-lg border">
    <table className="w-full border-collapse text-sm">
      <caption className="bg-surface-sunken text-ink border-edge border-b px-3 py-2 text-left">
        <span className="font-mono text-xs">{table.name}</span>
        <span className="text-ink-faint ml-2 text-xs">
          {table.rowLevelSecurity ? "row level security on" : "not locked"}
        </span>
      </caption>
      <tbody>
        {table.columns.map((column) => (
          <tr key={column.name} className="border-edge border-b last:border-b-0">
            <td className="text-ink px-3 py-2 align-top font-mono text-xs whitespace-nowrap">
              {column.name}
            </td>
            <td className="text-ink-muted px-3 py-2 align-top font-mono text-xs whitespace-nowrap">
              {column.type}
            </td>
            <td className="text-ink-faint px-3 py-2 align-top text-xs">
              <Marks column={column} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    {table.indexes.map((index) => (
      <p key={index.name} className="text-ink-faint border-edge border-t px-3 py-2 text-xs">
        Indexed on <span className="font-mono">{index.columns.join(", ")}</span>
      </p>
    ))}
  </div>
)

export const StorageSchema = () => (
  <div className="not-prose my-6 flex flex-col gap-6">
    {storageSeams.map((seam) => (
      <section key={seam.id} className="flex flex-col gap-3">
        <div>
          {/*
            A paragraph rather than a heading: `.prose h3` outranks a utility
            class on font size, and these labels belong to a generated block
            rather than to the page's outline — a heading here would appear in
            the search index and in an anchor nobody wrote.
          */}
          <p className="text-ink text-sm font-semibold">{seam.title}</p>
          <p className="text-ink-muted mt-1 text-sm leading-relaxed">{seam.keeps}</p>
          <p className="text-ink-faint mt-1 text-sm leading-relaxed">
            Created by <span className="font-mono text-xs">{seam.ensure}(db)</span> from{" "}
            <span className="font-mono text-xs">{seam.specifier}</span>.
          </p>
        </div>
        {seam.tables.map((table) => (
          <Table key={table.name} table={table} />
        ))}
      </section>
    ))}
  </div>
)

export const StoreFailures = () => (
  <div className="not-prose border-edge my-6 overflow-x-auto rounded-lg border">
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-surface-sunken text-ink">
          <th className="border-edge border-b px-3 py-2 text-left font-semibold">Code</th>
          <th className="border-edge border-b px-3 py-2 text-left font-semibold">What happened</th>
          <th className="border-edge border-b px-3 py-2 text-left font-semibold">Kind</th>
        </tr>
      </thead>
      <tbody>
        {storeFailures.map((failure) => (
          <tr key={failure.code} className="border-edge border-b last:border-b-0">
            <td className="text-ink px-3 py-2 align-top font-mono text-xs whitespace-nowrap">
              {failure.code}
            </td>
            <td className="text-ink-muted px-3 py-2 align-top">{failure.meaning}</td>
            <td className="text-ink-faint px-3 py-2 align-top text-xs whitespace-nowrap">
              {failure.kind}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)
