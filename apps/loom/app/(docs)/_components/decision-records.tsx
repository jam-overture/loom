import { DECISION_RECORDS, recordTally } from "@/app/(docs)/_lib/architecture/records"

/**
 * Every record, in the order they were written.
 *
 * This is the one page on the site where a record's number is in front of a
 * reader, and it is here because the page is *about* the records and has just
 * said what they are. Everywhere else the number is withheld and the title is
 * the link, because four digits are a footnote to a document nobody outside the
 * repository has opened.
 *
 * The table is the repository's own index, parsed rather than copied, so it can
 * only say what `pnpm decisions:index` says. The count above it is counted for
 * the same reason: a written total is wrong the first time somebody supersedes
 * something.
 */

const Standing = ({ status }: { readonly status: string }) => (
  <span className="text-ink-faint text-xs">{status}</span>
)

export const DecisionRecords = () => {
  const tally = recordTally()

  return (
    <div className="not-prose my-8">
      <p className="text-ink-muted text-sm">
        <strong className="text-ink font-semibold">{tally.total} records.</strong>{" "}
        {tally["in force"]} in force, {tally["partly superseded"]} superseded in part,{" "}
        {tally.superseded} replaced outright, {tally.proposed} proposed and waiting on a person.
      </p>

      <div className="border-edge mt-4 overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-surface-sunken text-ink">
              <th className="border-edge border-b px-3 py-2 text-left font-semibold">#</th>
              <th className="border-edge border-b px-3 py-2 text-left font-semibold">
                What was decided
              </th>
              <th className="border-edge border-b px-3 py-2 text-left font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {DECISION_RECORDS.map((record) => (
              <tr key={record.id} className="border-edge border-b last:border-b-0">
                <td className="text-ink-faint px-3 py-2 align-top font-mono text-xs">{record.id}</td>
                <td className="px-3 py-2 align-top">
                  <a
                    href={record.href}
                    className={`underline underline-offset-2 ${
                      record.standing === "superseded"
                        ? "text-ink-faint"
                        : "text-accent-strong font-medium"
                    }`}
                  >
                    {record.title}
                  </a>
                </td>
                <td className="px-3 py-2 align-top">
                  <Standing status={record.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
