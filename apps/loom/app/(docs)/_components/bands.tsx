import {
  bandCount,
  bandNodesIn,
  bandParts,
  catalogueTypeCount,
  largestBandPart,
  partCount,
  partsWithSeveralDesigns,
  registeredTypeCount,
} from "@/app/(docs)/_lib/compositions"

/**
 * The bands, as tables the library fills in.
 *
 * Nothing here holds a number, a name or a sentence of its own. Every cell is
 * something `@jam-overture/loom-primitives` says about itself — the parts of a
 * page it names, what its canonical design of each one calls itself, the
 * sentence that design carries about what lands on the page, and how many nodes
 * that is. A band added tomorrow shows up on the page with nobody editing it,
 * and a band removed stops being offered.
 *
 * The alternative was a hand-typed table of twenty-two rows, which is the thing
 * §4c already refuses for the API reference and for the same reason: a
 * hand-maintained list of what a package contains is wrong within a week of
 * anybody adding to it.
 */

/**
 * The regions of a page, in the order a page uses them.
 *
 * `min-w-[36rem]` is what makes the phone case readable rather than merely
 * non-overflowing. Without it the sentence column is handed about 150px and sets
 * one word to a line, which passes every measurement this repository takes — the
 * page is still 390 wide — and is not a table anybody can read. With it the
 * table keeps its shape and the container scrolls, which is the trade a
 * reference site makes.
 */
export const BandParts = () => (
  <div className="not-prose border-edge my-6 overflow-x-auto rounded-lg border">
    <table className="w-full min-w-[36rem] border-collapse text-sm">
      <thead>
        <tr className="bg-surface-sunken text-ink">
          <th className="border-edge border-b px-3 py-2 text-left font-semibold">Part</th>
          <th className="border-edge border-b px-3 py-2 text-left font-semibold">What lands on the page</th>
          <th className="border-edge border-b px-3 py-2 text-right font-semibold">Nodes</th>
          <th className="border-edge border-b px-3 py-2 text-right font-semibold">Designs</th>
        </tr>
      </thead>
      <tbody>
        {bandParts.map((row) => (
          <tr key={row.part} className="border-edge border-b last:border-b-0">
            <td className="text-ink px-3 py-2 align-top font-mono text-xs whitespace-nowrap">{row.part}</td>
            <td className="text-ink-muted px-3 py-2 align-top">{row.promise}</td>
            <td className="text-ink-faint px-3 py-2 text-right align-top font-mono text-xs">{row.nodes}</td>
            <td className="text-ink-faint px-3 py-2 text-right align-top font-mono text-xs">
              {row.designs.length}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

/**
 * The parts the library draws more than one way, and what each way is called.
 *
 * This is the table that makes *part* and *design* two different words rather
 * than one word used loosely. A reader who has seen it knows why there are
 * forty-four bands and twenty-two places to put one.
 */
export const BandDesigns = () => (
  <div className="not-prose border-edge my-6 overflow-x-auto rounded-lg border">
    <table className="w-full min-w-[28rem] border-collapse text-sm">
      <thead>
        <tr className="bg-surface-sunken text-ink">
          <th className="border-edge border-b px-3 py-2 text-left font-semibold">Part</th>
          <th className="border-edge border-b px-3 py-2 text-left font-semibold">The designs of it</th>
        </tr>
      </thead>
      <tbody>
        {partsWithSeveralDesigns.map((row) => (
          <tr key={row.part} className="border-edge border-b last:border-b-0">
            <td className="text-ink px-3 py-2 align-top font-mono text-xs whitespace-nowrap">{row.part}</td>
            <td className="text-ink-muted px-3 py-2 align-top">
              <ul className="flex flex-col gap-1">
                {row.designs.map((design) => (
                  <li key={design.id}>
                    <span className="text-ink font-mono text-xs">{design.id}</span>
                    <span className="text-ink-muted"> — {design.label}</span>
                  </li>
                ))}
              </ul>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

/**
 * One number, in a sentence, read from the library.
 *
 * A page that wants to say *forty-four* asks for it here. The alternative is a
 * digit typed into prose, which is the one thing on a generated page nothing can
 * catch going stale.
 */
export const BandCount = ({ of }: { readonly of: "bands" | "parts" | "largest" | "catalogue" | "registered" }) => {
  const value = {
    bands: bandCount,
    parts: partCount,
    largest: largestBandPart.nodes,
    catalogue: catalogueTypeCount,
    registered: registeredTypeCount,
  }[of]

  return <>{value}</>
}

/**
 * How many nodes one part's canonical design builds.
 *
 * The page opens on the pricing band's size and that number is its whole
 * argument, so it is asked for rather than typed. A part the library does not
 * name throws, which is the right severity: a page claiming a size for a band
 * that is not there has nothing to say.
 */
export const BandNodes = ({ part }: { readonly part: string }) => <>{bandNodesIn(part)}</>

/** The part the largest band is a design of, so the sentence can name it. */
export const LargestBandPart = () => <>{largestBandPart.part}</>
