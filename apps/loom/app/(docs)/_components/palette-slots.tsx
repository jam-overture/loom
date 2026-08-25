import { PALETTE_SLOTS, STARTER_PALETTES, type Palette, type PaletteSlot } from "@loom/runtime"

/**
 * Every slot a palette owes, and what three registered palettes put in each.
 *
 * Rendered from `PALETTE_SLOTS` and `STARTER_PALETTES` rather than typed out,
 * for the reason the whole site prefers: a slot added to the runtime appears
 * here on the next build, and a slot renamed cannot leave a row behind that
 * still names the old one. The list is the point of the section it sits in —
 * *every palette declares every slot* is a claim about a length, and a
 * hand-written table would be the one place that claim could quietly stop being
 * true.
 *
 * Three palettes rather than the whole registered set. Twenty-one columns is a
 * catalogue, and the argument the page is making needs only enough width to see
 * that the same seventeen names hold different colours — the count of the rest
 * is stated in prose beside it, and generated too.
 */

/** The palettes shown, by id. These are the three the four surfaces wear. */
const SHOWN = ["minimal", "editorial", "bold"] as const

const shownPalettes: readonly Palette[] = SHOWN.flatMap((id) => {
  const palette = STARTER_PALETTES.find((candidate) => candidate.id === id)

  return palette ? [palette] : []
})

/**
 * The tier a slot belongs to, taken from its own name.
 *
 * The enum is written in tier order and says so, so the break between tiers is
 * already in the data — it is the moment the prefix changes. Deriving it beats
 * declaring it here, because a tier declared in this file is a second opinion
 * about the runtime's ordering, and second opinions drift.
 */
const tierOf = (slot: PaletteSlot): string => slot.split("-")[0] ?? slot

const TIER_LABELS: Readonly<Record<string, string>> = {
  bg: "Surfaces — what the page and the things on it are painted",
  fg: "Inks — what carries meaning",
  accent: "Accent — the one colour that means “this one”",
  brand: "Brand secondary — areas, never letterforms",
  border: "Borders — the rules and rings",
}

const Swatch = ({ colour }: { readonly colour: string }) => (
  <div className="flex flex-col gap-1">
    <div
      className="border-edge h-8 w-full min-w-14 rounded border"
      style={{ backgroundColor: colour }}
      data-swatch={colour}
    />
    <span className="text-ink-faint font-mono text-[0.6875rem] leading-none">{colour}</span>
  </div>
)

export const PaletteSlots = () => (
  <div className="not-prose border-edge my-6 overflow-x-auto rounded-lg border">
    <div className="min-w-[30rem]">
      <div className="bg-surface-sunken border-edge grid grid-cols-[minmax(9rem,1fr)_repeat(3,minmax(0,1fr))] gap-3 border-b px-3 py-2">
        <span className="text-ink text-sm font-semibold">Slot</span>
        {shownPalettes.map((palette) => (
          <span key={palette.id} className="text-ink text-sm font-semibold">
            {palette.id}
          </span>
        ))}
      </div>

      {PALETTE_SLOTS.map((slot, index) => {
        const tier = tierOf(slot)
        const startsTier = index === 0 || tierOf(PALETTE_SLOTS[index - 1] ?? slot) !== tier

        return (
          <div key={slot}>
            {startsTier ? (
              <p className="text-ink-faint border-edge border-b px-3 py-2 text-xs tracking-wide uppercase">
                {TIER_LABELS[tier] ?? tier}
              </p>
            ) : null}
            <div className="border-edge grid grid-cols-[minmax(9rem,1fr)_repeat(3,minmax(0,1fr))] items-start gap-3 border-b px-3 py-2 last:border-b-0">
              <span className="text-ink font-mono text-xs break-all">{slot}</span>
              {shownPalettes.map((palette) => (
                <Swatch key={palette.id} colour={palette.slots[slot] ?? ""} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  </div>
)

/** The size of the registered vocabulary, counted rather than remembered. */
export const themeVocabularySize = {
  slots: PALETTE_SLOTS.length,
  palettes: STARTER_PALETTES.length,
}
