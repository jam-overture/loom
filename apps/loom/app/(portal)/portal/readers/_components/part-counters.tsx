import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { dwellEach, type RevisionReading } from "@/app/(portal)/_lib/reading-view"

/**
 * Every counter the rollup keeps, one click down.
 *
 * Nothing on the surface of this screen is deleted to make room for plain
 * language; it is moved here. The sentences above name a handful of parts out
 * of however many a page has, and a reader who wants the other forty — or the
 * registered type, or the id, or the raw milliseconds the wording rounded, or
 * which of their sections readers actually used — is one disclosure away from
 * all of it.
 *
 * The registered type is on the surface of *this table* and nowhere else on the
 * screen, which is the arrangement `/portal/checkup` settled on 13 September:
 * the type is not deleted, it is findable rather than discoverable, and the
 * summary says it is here so nobody has to open the disclosure to learn whether
 * it is worth opening.
 *
 * A rate appears here too, for the same reason and under the same rule. On the
 * surface a count always carries its denominator, because two of two is not the
 * news two hundred of two hundred is. Inside a table with the denominator in
 * the next column, a reader has asked for the comparison and can see what it is
 * made of.
 */
export const PartCounters = ({ reading }: { readonly reading: RevisionReading }) => (
  <TechnicalDetail summary="Every part, its registered type, and what was counted">
    <p>
      One row per part of revision {reading.revision}. <span className="font-mono">seen</span> is
      the page views that reported the part scrolled into sight;{" "}
      <span className="font-mono">heard from</span> is the page views that said anything about it
      at all, which is the denominator every sentence above is measured against;{" "}
      <span className="font-mono">used inside</span> is the page views in which a reader used
      something under it, at any depth.
    </p>

    <p>
      That last column is the only one on the row that is ever about a region.{" "}
      <span className="font-mono">clicks</span> is filed against the node the reader aimed at, and
      every control in the starter library is an addressed node of its own — so a band&rsquo;s
      clicks are zero however busy the band was. It is{" "}
      <span className="font-mono">ReaderTally.engaged</span>, read off the{" "}
      <span className="font-mono">within</span> ancestry a delegated signal carries, and strictly
      inside: a button&rsquo;s own use is in <span className="font-mono">clicks</span> and never
      here, so a subtree total is the addition rather than a double count.
    </p>

    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-ink-muted text-left text-2xs">
            <th className="pb-1 pr-4 font-normal">part</th>
            <th className="pb-1 pr-4 font-normal">type</th>
            <th className="pb-1 pr-4 text-right font-normal">seen</th>
            <th className="pb-1 pr-4 text-right font-normal">heard from</th>
            <th className="pb-1 pr-4 text-right font-normal">of those</th>
            <th className="pb-1 pr-4 text-right font-normal">used inside</th>
            <th className="pb-1 pr-4 text-right font-normal">dwell each</th>
            <th className="pb-1 pr-4 text-right font-normal">clicks</th>
            <th className="pb-1 pr-4 text-right font-normal">opened</th>
            <th className="pb-1 text-right font-normal">closed</th>
          </tr>
        </thead>
        <tbody>
          {reading.parts.map((part) => (
            <tr key={part.nodeId} className="border-edge-subtle border-t">
              <td className="py-1 pr-4">
                <span className="block">{part.name.name}</span>
                <span className="block font-mono">{part.nodeId}</span>
              </td>
              <td className="py-1 pr-4 font-mono">{part.type}</td>
              <td className="py-1 pr-4 text-right font-mono">{part.reached}</td>
              <td className="py-1 pr-4 text-right font-mono">{part.views}</td>
              <td className="py-1 pr-4 text-right font-mono">
                {part.views === 0 ? "—" : `${Math.round((part.reached / part.views) * 100)}%`}
              </td>
              <td className="py-1 pr-4 text-right font-mono">{part.engaged}</td>
              <td className="py-1 pr-4 text-right font-mono">
                {part.reached === 0 ? "—" : `${Math.round(dwellEach(part))}ms`}
              </td>
              <td className="py-1 pr-4 text-right font-mono">{part.activations}</td>
              <td className="py-1 pr-4 text-right font-mono">{part.opens}</td>
              <td className="py-1 text-right font-mono">{part.closes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <p>
      A part with nothing in a column was never reported doing that, which is not
      the same as a reader declining to. A heading is never opened because a
      heading cannot be opened, and an empty cell says only that no signal
      arrived.
    </p>

    <p>
      <span className="font-mono">used inside</span> can be larger than{" "}
      <span className="font-mono">seen</span> on the same row, and that is not an error. A region
      is credited by what happened under it and by nothing else, so a band nobody reported
      scrolling into sight, whose button somebody pressed, has a use and no measured reach. The
      sentences above never divide one by the other in that case; they say so instead.
    </p>
  </TechnicalDetail>
)
