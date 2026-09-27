import {
  canCarryText,
  contrastRatio,
  derivePaletteChecked,
  hslHex,
  TEXT_CONTRAST_MINIMUM,
  type PaletteSpec,
} from "@jam-overture/loom"

/**
 * What happens to a brand colour when you ask the runtime to build a palette
 * around it — derived here, on this page, rather than described.
 *
 * The page needs to make a claim that sounds like an excuse when it is only
 * asserted: *your mint will come back darker than your brand book says, and that
 * is the right answer.* Asserting it invites the reader to assume the tool is
 * clumsy. So the derivation runs at build time and the two colours are printed
 * side by side with the measured ratio under each — the brand colour cannot
 * carry text and the derived accent can, and both numbers came from
 * `contrastRatio` rather than from a paragraph.
 *
 * The mint is a stand-in for the reader's own colour and is deliberately a hard
 * case: pale, saturated, and the sort of thing a brand book is proudest of.
 */

/** A brand hue that cannot be ink, chosen because it is the common case. */
const BRAND_HUE = 152
const BRAND_SATURATION = 68

/** The colour as a brand book would print it: mid-lightness, full chroma. */
const brandColour = hslHex(BRAND_HUE, BRAND_SATURATION, 55)

const spec: PaletteSpec = {
  id: "your-brand",
  name: "Your brand",
  description: "Derived from one brand hue, on a near-white canvas.",
  mode: "light",
  canvas: { hue: BRAND_HUE, saturation: 4 },
  accent: { hue: BRAND_HUE, saturation: BRAND_SATURATION },
  secondary: { hue: BRAND_HUE - 40, saturation: BRAND_SATURATION },
}

const { palette: derived, clean } = derivePaletteChecked(spec)

const canvas = derived.slots["bg-canvas"] ?? ""
const accent = derived.slots["accent"] ?? ""
const borderAccent = derived.slots["border-accent"] ?? ""
const brandSecondary = derived.slots["brand-secondary"] ?? ""

const ratio = (colour: string): number => contrastRatio(colour, canvas) ?? 0

/** What the derivation actually returned. Held against the prose by a test. */
export const brandDerivation = {
  brandColour,
  accent,
  borderAccent,
  brandSecondary,
  canvas,
  brandCanCarryText: canCarryText(brandColour, canvas),
  accentCanCarryText: canCarryText(accent, canvas),
  brandRatio: ratio(brandColour),
  accentRatio: ratio(accent),
  clean,
  bar: TEXT_CONTRAST_MINIMUM,
} as const

const Verdict = ({
  label,
  colour,
  measured,
  carries,
}: {
  readonly label: string
  readonly colour: string
  readonly measured: number
  readonly carries: boolean
}) => (
  <div className="border-edge flex flex-col gap-2 rounded-lg border p-3">
    <p className="text-ink-muted text-xs">{label}</p>
    <div
      className="border-edge flex h-16 items-end rounded border p-2"
      style={{ backgroundColor: canvas }}
    >
      <span className="text-base font-semibold" style={{ color: colour }}>
        Read the archive
      </span>
    </div>
    <p className="text-ink font-mono text-xs">{colour}</p>
    <p className={carries ? "text-ink-muted text-xs" : "text-ink text-xs font-semibold"}>
      {measured.toFixed(2)}:1 on the canvas — {carries ? "can be ink" : "cannot be ink"}
    </p>
  </div>
)

export const BrandColour = () => (
  <div className="not-prose my-6 flex flex-col gap-3">
    <div className="grid gap-3 sm:grid-cols-2">
      <Verdict
        label="The colour as your brand book prints it"
        colour={brandDerivation.brandColour}
        measured={brandDerivation.brandRatio}
        carries={brandDerivation.brandCanCarryText}
      />
      <Verdict
        label="What the derivation put in accent"
        colour={brandDerivation.accent}
        measured={brandDerivation.accentRatio}
        carries={brandDerivation.accentCanCarryText}
      />
    </div>

    <div className="border-edge rounded-lg border p-3">
      <p className="text-ink-muted text-xs">
        The brand colour is not thrown away. It goes where a colour is an area rather than a
        letterform:
      </p>
      <div className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
        {[
          { slot: "border-accent", colour: borderAccent },
          { slot: "brand-secondary", colour: brandSecondary },
        ].map((entry) => (
          <div key={entry.slot} className="flex items-center gap-2">
            <span
              className="border-edge h-6 w-10 rounded border"
              style={{ backgroundColor: entry.colour }}
              data-swatch={entry.colour}
            />
            <span className="text-ink font-mono text-xs">{entry.slot}</span>
            <span className="text-ink-faint font-mono text-xs">{entry.colour}</span>
          </div>
        ))}
      </div>
    </div>

    <p className="text-ink-muted text-xs">
      {clean
        ? `Every pairing the primitives paint clears ${TEXT_CONTRAST_MINIMUM}:1 in the derived palette — derivePaletteChecked said so, here, as this page built.`
        : `derivePaletteChecked reports this spec does not clear ${TEXT_CONTRAST_MINIMUM}:1 on every painted pairing — the derivation is a rule, and this is the check on it.`}
    </p>
  </div>
)
