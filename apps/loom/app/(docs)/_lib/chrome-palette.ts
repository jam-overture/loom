import { minimalPalette, type Palette } from "@jam-overture/loom"

import { selectorDeclarations } from "./chrome-css"

/**
 * The colours of this site's furniture, held against the palette they were
 * copied from.
 *
 * ## The plain version
 *
 * Everything on this site that is an **example** is a real Loom tree, so it
 * takes its colours from a registered theme and changes the day that theme
 * changes. Everything **around** the examples — the sidebar, the header, the
 * search box, the callouts — is not a tree. It is ordinary CSS, and its colours
 * were typed into `globals.css` by hand, copied out of the same registered
 * palette the examples wear.
 *
 * Copying is allowed. It is the only thing available: a stylesheet cannot
 * import TypeScript, and chrome is application furniture with no theme mounted
 * on it ([0067](../../../../decisions/0067-the-four-surfaces-are-one-application.md)).
 * What is not allowed is **copying with nothing watching**, because then the
 * palette can move and the furniture stays where it was, and no page looks
 * broken enough for anybody to notice.
 *
 * This module is what watches. It names, for every colour in the stylesheet's
 * two palette blocks, the palette slot it is a copy of — and `pnpm verify`
 * reads the real palette out of the registry and the real stylesheet off disk
 * and compares them.
 *
 * ## What it was replacing, which is the part worth reading
 *
 * The chrome was already "held together by a test". `house-theme.test.ts` had
 * three assertions on these colours and every one of them was of this shape:
 *
 * ```ts
 * expect(globals()).toContain("--surface-page: #ffffff")
 * ```
 *
 * **That is a copy checked against a second copy.** It fails when somebody
 * edits the stylesheet, which is the case nobody was worried about, and passes
 * for ever when the palette moves underneath it, which is the only case the
 * assertion was written for. The same is true of
 * `browser-bar-chrome.test.ts`, which holds the browser-bar colour against
 * `--surface-page` in the stylesheet: a real check of a real chain, with the
 * palette at neither end of it.
 *
 * **It had already gone wrong once, and had been wrong for ten weeks.**
 * `--ink-faint` was declared `#6f6f7a` with a comment saying the palette's
 * `fg-subtle` was `#8a8a94`, missed AA at 3.42:1, and that the chrome was
 * therefore departing from it. The palette's `fg-subtle` was changed to
 * `#6e6e78` on **20 August** by
 * [0074](../../../../decisions/0074-a-palette-slot-that-carries-text-meets-aa.md),
 * which is the finding that comment is about — so the reason for the departure
 * was fixed at the source, the departure stayed, and the comment went on
 * describing a value that exists nowhere in this repository.
 *
 * The `(portal)` lane hit exactly this on the same day and answered it exactly
 * this way; `FINDINGS.md`'s entry for 20 August records three of its tokens
 * moving `#8a8a94` → `#6e6e78` *because a test read the registered palette and
 * went red*. Its sentence is the one this module exists to apply here: **a test
 * that fails when a fact changes is not a tax, it is the fact being checked.**
 *
 * ## The three lists, and why there are three
 *
 * Every hex-valued declaration in `:root` and in `[data-theme="dark"]` is in
 * exactly one of them, and the check that says so is the one that keeps this
 * module from quietly stopping to cover the sheet:
 *
 * - `CHROME_SLOTS` — a copy of a palette slot. Must equal it.
 * - `CHROME_DEPARTURES` — names a slot and deliberately differs from it, with
 *   the reason. **Must differ**, so an exemption is a claim rather than a hole,
 *   which is `house-theme.test.ts`' own convention for its exempt examples.
 * - `CHROME_OWN` — a colour the palette does not have, with the reason it is
 *   here anyway. Nothing to compare; the claim is that there is nothing.
 *
 * ## What this does not reach
 *
 * **The dark block is held to no palette at all**, and that is correct rather
 * than a gap. `minimal` is white paper and there is no registered dark minimal,
 * so the dark theme is this site's own inversion of the rules — one ink, one
 * paper, structure in borders, the one green — and there is nothing to copy it
 * from. What is checked instead is that the two blocks declare **the same set
 * of names**, because a colour added to light and forgotten in dark is not a
 * missing colour, it is light's value silently serving a dark page. The absence
 * of a dark minimal is itself asserted, so the day somebody registers one this
 * paragraph goes red rather than stale.
 */

/** The three ids this site's trees and this site's furniture both wear. */
export const HOUSE_THEME = { palette: "minimal", fontPack: "minimal-sans", stylePreset: "precise" } as const

/** The palette the furniture is a copy of, read from the registry's own module. */
export const housePalette: Palette = minimalPalette

/**
 * Its slots, by name.
 *
 * Widened to `string | undefined` on purpose rather than cast to `string`: a
 * palette's slots are a `Partial`, and `no-such-slot` exists precisely because
 * a table can name one the palette has stopped declaring. Casting that away
 * would turn this module's second fault kind into an unreachable branch.
 */
export const HOUSE_SLOTS: Readonly<Record<string, string | undefined>> = housePalette.slots

/** The two blocks that carry this site's colours, as the stylesheet writes them. */
export const LIGHT_SELECTOR = ":root"
export const DARK_SELECTOR = '[data-theme="dark"]'

export type ChromeTranscription = {
  readonly variable: string
  readonly slot: string
  /** Why this slot, where the pairing is not its own explanation. */
  readonly note?: string
}

export type ChromeDeparture = {
  readonly variable: string
  readonly slot: string
  readonly reason: string
}

export type ChromeOwn = {
  readonly variable: string
  readonly reason: string
}

/**
 * Every light-theme colour that is a copy of a palette slot.
 *
 * Read top to bottom it is also the clearest statement of what the minimal
 * conversion did: three surfaces that are all the canvas, one fill left, and
 * two border steps carrying the structure the fills used to.
 */
export const CHROME_SLOTS: readonly ChromeTranscription[] = [
  { variable: "--surface-page", slot: "bg-canvas" },
  {
    variable: "--surface-sunken",
    slot: "bg-surface",
    note: "the whole outline-first decision: the palette sets bg-surface to the canvas, so a frame is defined by its border",
  },
  { variable: "--surface-raised", slot: "bg-overlay" },
  {
    variable: "--surface-muted",
    slot: "bg-surface-muted",
    note: "the one fill left, and functional rather than structural — a table's header row is telling the reader something",
  },
  { variable: "--surface-hover", slot: "bg-surface-muted" },
  { variable: "--edge", slot: "border-default", note: "load-bearing now that no fill separates one box from the next" },
  { variable: "--edge-strong", slot: "border-strong" },
  { variable: "--ink", slot: "fg-default" },
  { variable: "--ink-muted", slot: "fg-muted" },
  {
    variable: "--ink-faint",
    slot: "fg-subtle",
    note: "a departure until 3 November, for an AA miss 0074 had already fixed in the palette on 20 August",
  },
  { variable: "--ink-inverse", slot: "fg-on-accent" },
  { variable: "--accent", slot: "accent", note: "black, so the green is a highlight and not the largest thing on the page" },
  { variable: "--accent-ring", slot: "border-accent", note: "the green a reader actually sees: rules, rings and tinted marks" },
  { variable: "--accent-strong", slot: "accent-strong" },
  { variable: "--accent-subtle", slot: "accent-subtle" },
  { variable: "--note-surface", slot: "accent-subtle", note: "a note is this site's one recurring highlight, so it is where the green goes" },
  { variable: "--note-edge", slot: "border-accent" },
  { variable: "--note-ink", slot: "accent-strong" },
  {
    variable: "--verdict-accepted-edge",
    slot: "border-accent",
    note: "an accepted verdict is the one of the three the theme has a colour for",
  },
  { variable: "--verdict-accepted-ink", slot: "accent-strong" },
  { variable: "--code-surface", slot: "bg-surface-muted" },
  { variable: "--code-ink", slot: "fg-default" },
]

/**
 * Colours that name a slot and deliberately are not it.
 *
 * **Empty, and it has been empty since the one entry it held was retired.**
 * `--ink-faint` was the entry and it is now a plain copy, because the reason it
 * gave — `fg-subtle` missing AA — was a finding the framework closed in the
 * palette itself.
 *
 * An empty list is kept rather than deleted, because the next departure is a
 * question of taste that will arrive and the shape for answering it should not
 * have to be invented then. It is also the reason `chromeFaults` takes its
 * tables as an argument: **a list that is empty by design makes every
 * assertion over it true**, which this lane paid for on 2 November when two
 * mutations to the plain-language rule went through forty-six tests unharmed.
 * So the rule about departures is tested against a situation this site does not
 * have, exactly as `plain.ts`' `faultIn` is.
 */
export const CHROME_DEPARTURES: readonly ChromeDeparture[] = []

/**
 * Colours the palette does not have, and the reason each one is here anyway.
 *
 * Eleven of them, and ten are the same argument: a Gate says one of three
 * things, the theme is whites, black and one green, and *held* and *refused*
 * rendered in green-or-grey would be restrained and unreadable. The
 * distinction between an applied change and a refused one is information. So
 * two hues the theme does not name are spent, and spent only on a ring and a
 * label over a near-white ground.
 */
export const CHROME_OWN: readonly ChromeOwn[] = [
  {
    variable: "--surface-selected",
    reason: "the palette has no selected-row slot; this is the step past the one fill, and it lands on border-subtle's value",
  },
  {
    variable: "--verdict-accepted-surface",
    reason: "a near-white ground for the one verdict whose ring and label the palette does supply",
  },
  { variable: "--verdict-held-surface", reason: "a hold is a hue minimal does not name" },
  { variable: "--verdict-held-edge", reason: "a hold is a hue minimal does not name" },
  { variable: "--verdict-held-ink", reason: "a hold is a hue minimal does not name" },
  { variable: "--verdict-refused-surface", reason: "a refusal is a hue minimal does not name" },
  { variable: "--verdict-refused-edge", reason: "a refusal is a hue minimal does not name" },
  { variable: "--verdict-refused-ink", reason: "a refusal is a hue minimal does not name" },
  { variable: "--warning-surface", reason: "the hold family, because a caution and a hold are the same note" },
  { variable: "--warning-edge", reason: "the hold family, because a caution and a hold are the same note" },
  { variable: "--warning-ink", reason: "the hold family, because a caution and a hold are the same note" },
]

/**
 * What a check of the furniture is handed.
 *
 * The tables are arguments rather than imports, so that the rules below can be
 * put to a stylesheet and a palette this site does not have. Every fault kind
 * has a case built that way in `chrome-palette.test.ts`, which is what keeps
 * the rules alive while the real answer is the empty list.
 */
export type ChromeSituation = {
  /** The colours one block declares, as the stylesheet writes them. */
  readonly declared: ReadonlyMap<string, string>
  /** The palette's slots, as the registry has them. */
  readonly slots: Readonly<Record<string, string | undefined>>
  readonly transcriptions: readonly ChromeTranscription[]
  readonly departures: readonly ChromeDeparture[]
  readonly own: readonly ChromeOwn[]
}

export type ChromeFault =
  /** A copy that is no longer equal to the thing it copies. */
  | { readonly kind: "drifted"; readonly variable: string; readonly slot: string; readonly declared: string; readonly palette: string }
  /** A table entry naming a slot the palette does not have — a renamed slot. */
  | { readonly kind: "no-such-slot"; readonly variable: string; readonly slot: string }
  /** A table entry naming a variable the stylesheet does not declare. */
  | { readonly kind: "undeclared"; readonly variable: string }
  /** A colour in the stylesheet that no table accounts for. */
  | { readonly kind: "unclassified"; readonly variable: string; readonly declared: string }
  /** A colour two tables both claim, so neither rule is the one in force. */
  | { readonly kind: "classified-twice"; readonly variable: string }
  /** A declared departure that is equal to its slot, so it exempts nothing. */
  | { readonly kind: "vacuous-departure"; readonly variable: string; readonly slot: string; readonly value: string }

const HEX = /^#[0-9a-f]{3,8}$/i

/** The hex-valued declarations of one block. A length or a keyword is not a colour. */
export const coloursIn = (declared: ReadonlyMap<string, string>): ReadonlyMap<string, string> =>
  new Map([...declared].filter(([, value]) => HEX.test(value)))

/**
 * Every way the furniture and the palette can have come apart.
 *
 * Six kinds and not one, because the remedies differ and an author reading a
 * red suite should be told which one they have: a drifted copy is a value to
 * update, a renamed slot is a table to update, and an unclassified colour is a
 * decision somebody has not written down yet.
 */
export const chromeFaults = (situation: ChromeSituation): readonly ChromeFault[] => {
  const { declared, slots, transcriptions, departures, own } = situation
  const faults: ChromeFault[] = []

  const claims = [
    ...transcriptions.map((entry) => entry.variable),
    ...departures.map((entry) => entry.variable),
    ...own.map((entry) => entry.variable),
  ]

  for (const variable of new Set(claims)) {
    if (claims.filter((named) => named === variable).length > 1) {
      faults.push({ kind: "classified-twice", variable })
    }
    if (!declared.has(variable)) faults.push({ kind: "undeclared", variable })
  }

  for (const entry of transcriptions) {
    const value = declared.get(entry.variable)
    const slot = slots[entry.slot]

    if (slot === undefined) {
      faults.push({ kind: "no-such-slot", variable: entry.variable, slot: entry.slot })
      continue
    }
    if (value !== undefined && value.toLowerCase() !== slot.toLowerCase()) {
      faults.push({ kind: "drifted", variable: entry.variable, slot: entry.slot, declared: value, palette: slot })
    }
  }

  for (const entry of departures) {
    const value = declared.get(entry.variable)
    const slot = slots[entry.slot]

    if (slot === undefined) {
      faults.push({ kind: "no-such-slot", variable: entry.variable, slot: entry.slot })
      continue
    }
    if (value !== undefined && value.toLowerCase() === slot.toLowerCase()) {
      faults.push({ kind: "vacuous-departure", variable: entry.variable, slot: entry.slot, value })
    }
  }

  for (const [variable, value] of declared) {
    if (!claims.includes(variable)) faults.push({ kind: "unclassified", variable, declared: value })
  }

  return faults
}

/** One line a person could act on, which is what a red suite here has to hand back. */
export const describeChromeFault = (fault: ChromeFault): string => {
  switch (fault.kind) {
    case "drifted":
      return `${fault.variable} is ${fault.declared} and copies the palette's ${fault.slot}, which is now ${fault.palette} — move the stylesheet, or move the entry if the pairing was wrong`
    case "no-such-slot":
      return `${fault.variable} names the palette slot "${fault.slot}" and the palette has no such slot — it was renamed or removed`
    case "undeclared":
      return `${fault.variable} is in a chrome-palette table and globals.css declares no such colour`
    case "unclassified":
      return `${fault.variable} is declared as ${fault.declared} and no chrome-palette table accounts for it — say which slot it copies, or why it is this site's own`
    case "classified-twice":
      return `${fault.variable} is in two chrome-palette tables, so neither rule is the one in force`
    case "vacuous-departure":
      return `${fault.variable} is declared a departure from ${fault.slot} and is equal to it at ${fault.value} — it exempts nothing`
  }
}

/** The real situation: this site's stylesheet, against the registered palette. */
export const siteChromeSituation = (css: string): ChromeSituation => ({
  declared: coloursIn(selectorDeclarations(css, LIGHT_SELECTOR)),
  slots: HOUSE_SLOTS,
  transcriptions: CHROME_SLOTS,
  departures: CHROME_DEPARTURES,
  own: CHROME_OWN,
})
