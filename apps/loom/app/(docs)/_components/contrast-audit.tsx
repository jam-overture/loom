import {
  auditPalette,
  describePaletteAudit,
  PALETTE_TEXT_PAIRINGS,
  STARTER_PALETTES,
  TEXT_CONTRAST_MINIMUM,
} from "@loom/runtime"

/**
 * The bar, run for real against every palette the runtime registers.
 *
 * This is the component on the site that would be most tempting to write down
 * and most dishonest to. A documentation page that *says* the starter palettes
 * are readable is a page making a claim about eighteen files it cannot see; this
 * one calls `auditPalette` at build time and prints what came back, including
 * the failures. If a palette regresses, this page says so before anybody has to
 * notice.
 *
 * It shows the composed failures rather than only the summary, and that is the
 * whole reason it is worth having. `describePaletteAudit`'s own comment says a
 * description that showed only what is asserted would let a reader take an empty
 * string for a clean palette — a docs site that printed a green tick over the
 * same two pairings would be committing exactly that.
 */

const audits = STARTER_PALETTES.map((palette) => ({
  palette,
  audit: auditPalette(palette),
}))

const painted = PALETTE_TEXT_PAIRINGS.filter((pairing) => pairing.basis === "painted")
const composed = PALETTE_TEXT_PAIRINGS.filter((pairing) => pairing.basis === "composed")

const withPaintedFailures = audits.filter(({ audit }) => audit.failures.length > 0)
const withComposedFailures = audits.filter(({ audit }) => audit.composedFailures.length > 0)

/** What this run of the bar found. Read by the page's prose test, not just rendered. */
export const contrastAuditFacts = {
  bar: TEXT_CONTRAST_MINIMUM,
  palettes: STARTER_PALETTES.length,
  pairings: PALETTE_TEXT_PAIRINGS.length,
  painted: painted.length,
  composed: composed.length,
  palettesWithPaintedFailures: withPaintedFailures.length,
  palettesWithComposedFailures: withComposedFailures.length,
} as const

/**
 * `data-figure` rather than a heading, because two of these four are legitimately
 * the same number today and a test that queried by value would be asserting a
 * coincidence. The name is what the figure is, and it does not move.
 */
const Figure = ({
  name,
  value,
  of,
}: {
  readonly name: string
  readonly value: number
  readonly of: string
}) => (
  <div className="border-edge bg-surface-sunken rounded-lg border px-3 py-3" data-figure={name}>
    <p className="text-ink text-2xl leading-none font-semibold tabular-nums">{value}</p>
    <p className="text-ink-muted mt-1 text-xs">{of}</p>
  </div>
)

export const ContrastAudit = () => (
  <div className="not-prose my-6 flex flex-col gap-4">
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Figure name="palettes" value={contrastAuditFacts.palettes} of="palettes registered" />
      <Figure name="pairings" value={contrastAuditFacts.pairings} of="pairings measured in each" />
      <Figure
        name="painted-failures"
        value={contrastAuditFacts.palettesWithPaintedFailures}
        of="with a painted failure"
      />
      <Figure
        name="composed-failures"
        value={contrastAuditFacts.palettesWithComposedFailures}
        of="with a composed one"
      />
    </div>

    <div className="border-edge overflow-hidden rounded-lg border">
      <p className="bg-surface-sunken border-edge text-ink border-b px-3 py-2 text-sm font-semibold">
        What the bar says today
      </p>
      {withComposedFailures.length === 0 ? (
        <p className="text-ink-muted px-3 py-3 text-sm">
          Nothing to report: every registered palette clears every pairing.
        </p>
      ) : (
        <ul className="divide-edge list-none divide-y pl-0">
          {withComposedFailures.map(({ palette, audit }) => (
            <li key={palette.id} className="px-3 py-3">
              <pre
                className="text-ink-muted m-0 overflow-x-auto bg-transparent p-0 font-mono text-xs whitespace-pre-wrap"
                data-audit={palette.id}
              >
                {describePaletteAudit(audit)}
              </pre>
            </li>
          ))}
        </ul>
      )}
    </div>
  </div>
)
