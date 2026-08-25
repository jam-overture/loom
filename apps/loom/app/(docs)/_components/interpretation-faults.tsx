import { faultActors, faultRows } from "@/app/(docs)/_lib/prompt/faults"

/**
 * Seven ways a guess can fail, grouped by who would have to do something.
 *
 * Both the sentence and the grouping come from the runtime — this component
 * arranges them and writes nothing. The five actors lead, because a reader
 * meeting this list for the first time needs the question "is this mine?"
 * answered before they need seven identifiers.
 */
export const InterpretationFaults = () => (
  <div className="not-prose my-8 space-y-6">
    <dl className="border-edge divide-edge divide-y rounded-lg border">
      {Object.entries(faultActors).map(([fault, meaning]) => (
        <div key={fault} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-4">
          <dt className="text-ink font-mono text-xs font-semibold sm:w-28 sm:shrink-0 sm:pt-0.5">
            {fault}
          </dt>
          <dd className="text-ink-muted text-sm leading-relaxed">{meaning}</dd>
        </div>
      ))}
    </dl>

    <div className="border-edge overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-surface-sunken text-ink">
            <th className="border-edge border-b px-3 py-2 text-left font-semibold">Code</th>
            <th className="border-edge border-b px-3 py-2 text-left font-semibold">Whose</th>
            <th className="border-edge border-b px-3 py-2 text-left font-semibold">
              What the runtime says
            </th>
          </tr>
        </thead>
        <tbody>
          {faultRows.map((row) => (
            <tr key={row.code} className="border-edge border-b last:border-b-0">
              <td className="text-ink px-3 py-2 align-top font-mono text-xs">{row.code}</td>
              <td className="text-ink-faint px-3 py-2 align-top font-mono text-xs">
                {row.fault}
              </td>
              <td className="text-ink-muted px-3 py-2 align-top">{row.sentence}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)
