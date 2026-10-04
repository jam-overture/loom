import {
  COLOUR_FORMS,
  noGapsLine,
  palettesAnswering,
  printLuminance,
  schemeWorkingFor,
  unreadablePalettes,
  type SchemedPalette,
} from "@/app/(docs)/_lib/scheme"

/**
 * What `paletteScheme` answers, shown rather than described.
 *
 * Three blocks, each with a different job, and the order is the one the brief
 * asks for: the concrete case, then the general rule, then the limit.
 *
 * - `<SchemeWorking>` is one palette with its two luminances, so *compares the
 *   ink to the canvas* is a sentence a reader can check rather than take.
 * - `<PaletteSchemes>` is every palette they were given, grouped by answer.
 * - `<ColourForms>` is the third answer: the same pair written six ways, with
 *   what the registry makes of each and what the measure makes of it.
 *
 * All three render on the server and ship nothing. There is no state here and
 * nothing to press — the propose-a-change box belongs on an `<Example>`, where
 * the point is that a reader can change the tree. This is a measurement, and
 * `theme-mount.tsx` wrote down why a measurement a reader can edit is not one.
 *
 * **Nothing here names a color.** Every swatch is painted the hex the data
 * carries, and the data comes off the registry — which is the rule this route
 * group holds itself to and the reason the table cannot quietly describe a
 * palette that no longer exists.
 */

/** The canvas with the ink on it, which is what the answer is about. */
const Pair = ({ canvas, ink, label }: { readonly canvas: string; readonly ink: string; readonly label: string }) => (
  <span
    className="border-edge inline-flex h-7 w-10 shrink-0 items-center justify-center rounded border font-mono text-xs"
    style={{ backgroundColor: canvas, color: ink }}
    data-pair={label}
    aria-hidden="true"
  >
    Aa
  </span>
)

/**
 * One palette's row.
 *
 * The swatch is the pair rather than two squares side by side, because the
 * question is which of the two is lighter and ink-on-canvas is the form a
 * reader can answer that from at a glance. The hex of both is beside it for a
 * reader who cannot.
 */
const PaletteRow = ({ row }: { readonly row: SchemedPalette }) => (
  <li className="border-edge flex items-center gap-3 border-b py-2 last:border-b-0" data-palette={row.id}>
    <Pair canvas={row.canvas} ink={row.ink} label={row.id} />
    <span className="flex min-w-0 flex-col">
      <span className="text-ink font-mono text-xs" data-palette-id={row.id}>
        {row.id}
      </span>
      <span className="text-ink-faint font-mono text-[0.6875rem] leading-tight">
        {row.canvas} · {row.ink}
      </span>
    </span>
  </li>
)

const Group = ({ answer, rows }: { readonly answer: string; readonly rows: readonly SchemedPalette[] }) => (
  <div className="flex min-w-0 flex-col gap-2" data-scheme-group={answer}>
    <p className="text-ink font-mono text-xs font-semibold">
      {`"${answer}"`} — <span data-scheme-count={answer}>{rows.length}</span>
    </p>
    <ul className="m-0 flex list-none flex-col p-0">
      {rows.map((row) => (
        <PaletteRow key={row.id} row={row} />
      ))}
    </ul>
  </div>
)

/**
 * Every registered palette, under the word it answers.
 *
 * Grouped rather than listed, because the claim the section makes is about the
 * groups: a reader looking at the left column sees pale swatches and the word
 * `"light"`, looks at the right and sees dark ones and `"dark"`, and has
 * checked the function against their own eyes without being asked to.
 *
 * The count under each group is the length of the list above it, so a group
 * that printed no rows would say so rather than looking like a short answer.
 */
export const PaletteSchemes = () => (
  <div className="not-prose my-6 flex flex-col gap-4" data-palette-schemes="">
    <div className="grid gap-6 sm:grid-cols-2">
      <Group answer="light" rows={palettesAnswering("light")} />
      <Group answer="dark" rows={palettesAnswering("dark")} />
    </div>
    <p className="text-ink-muted text-sm" data-unreadable={String(unreadablePalettes.length)}>
      {noGapsLine(unreadablePalettes)}
    </p>
  </div>
)

/**
 * The comparison, for one palette, with both numbers.
 *
 * `minimal` is the palette this site is built from, so a reader is looking at
 * the answer for the page they are on.
 */
export const SchemeWorking = ({ palette = "minimal" }: { readonly palette?: string }) => {
  const working = schemeWorkingFor(palette)

  return (
    <div className="not-prose border-edge my-6 overflow-x-auto rounded-lg border" data-scheme-working={working.id}>
      <table className="w-full min-w-[20rem] border-collapse text-sm">
        <tbody>
          {[
            { slot: "bg-canvas", colour: working.canvas, luminance: working.canvasLuminance, of: "the paper" },
            { slot: "fg-default", colour: working.ink, luminance: working.inkLuminance, of: "the ink" },
          ].map(({ slot, colour, luminance, of }) => (
            <tr key={slot} className="border-edge border-b">
              <td className="text-ink px-3 py-2 font-mono text-xs whitespace-nowrap">{slot}</td>
              <td className="text-ink-muted px-3 py-2">
                <span className="inline-flex items-center gap-2">
                  <span
                    className="border-edge inline-block h-4 w-4 shrink-0 rounded border"
                    style={{ backgroundColor: colour }}
                  />
                  <span className="font-mono text-xs">{colour}</span>
                </span>
              </td>
              <td className="text-ink-muted px-3 py-2 font-mono text-xs whitespace-nowrap" data-luminance={slot}>
                {printLuminance(luminance)}
              </td>
              <td className="text-ink-faint px-3 py-2 text-xs">{of}</td>
            </tr>
          ))}
          <tr className="bg-surface-sunken">
            <td className="text-ink px-3 py-2 text-xs" colSpan={3}>
              The ink is {working.inkLuminance > working.canvasLuminance ? "lighter" : "darker"} than the paper, so{" "}
              <code className="font-mono">paletteScheme</code> answers
            </td>
            <td className="text-ink px-3 py-2 font-mono text-xs font-semibold" data-scheme-answer={working.id}>
              {`"${String(working.scheme)}"`}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

/**
 * The six spellings of one pair, and the two different things said about each.
 *
 * The first column is the one worth a reader's attention and the reason this
 * block exists: a palette written in `hsl()` is a **legal** palette. It
 * registers, it resolves, it renders — and the measurement comes back
 * `undefined` with nothing anywhere saying so.
 */
export const ColourForms = () => (
  <div className="not-prose border-edge my-6 overflow-x-auto rounded-lg border" data-colour-forms="">
    <table className="w-full min-w-[21rem] border-collapse text-sm">
      <thead>
        <tr className="bg-surface-sunken text-ink">
          <th className="border-edge border-b px-3 py-2 text-left font-semibold">Written as</th>
          <th className="border-edge border-b px-3 py-2 text-left font-semibold">Registers?</th>
          <th className="border-edge border-b px-3 py-2 text-left font-semibold">The answer</th>
        </tr>
      </thead>
      <tbody>
        {COLOUR_FORMS.map((form) => (
          <tr key={form.label} className="border-edge border-b last:border-b-0" data-colour-form={form.label}>
            <td className="px-3 py-2">
              <span className="flex flex-col gap-1">
                <span className="text-ink font-mono text-xs">{form.label}</span>
                <span className="text-ink-faint font-mono text-[0.6875rem] leading-tight">
                  {form.canvas} · {form.ink}
                </span>
              </span>
            </td>
            <td className="text-ink-muted px-3 py-2 text-xs" data-registrable={String(form.registrable)}>
              {form.registrable ? "yes" : "no"}
            </td>
            <td
              className={`px-3 py-2 font-mono text-xs ${form.scheme === undefined ? "text-warning-ink" : "text-ink-muted"}`}
              data-form-answer={form.label}
            >
              {form.scheme === undefined ? "undefined" : `"${form.scheme}"`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)
