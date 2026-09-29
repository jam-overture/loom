import { paletteSchema, type Palette } from "./theme.js"

/**
 * The eighteen palettes the starter library ships beyond the first three.
 *
 * They are **derived rather than picked**, and the derivation is the reason to
 * trust them. `derive.ts` authors a palette in HSL from a
 * canvas hue, an accent hue and a secondary hue, then binary-searches the
 * lightness of every slot a primitive reads as text until it clears 4.75:1
 * against the tightest ground it is ever rendered on — a margin over
 * [0074](../../decisions/0074-a-palette-slot-that-carries-text-meets-aa.md)'s
 * 4.5:1, so a later nudge to a background does not silently drop one under the
 * bar. `auditPalette` then checks the result against the twelve pairings the
 * primitives actually put together, and `library.test.ts` checks it again on
 * every run.
 *
 * **The values below are the source of truth, not the tool.** They are literals
 * because a palette is reviewed by looking at it and diffed by reading it, and
 * because a palette generated at import time is a page whose colours depend on
 * a function nobody read. The tool is how a *new* one is derived — a host with
 * a brand colour and no time to solve twelve contrast constraints by hand — and
 * it is documented for that, not run here.
 *
 * Two conventions worth knowing before editing one, both learned the expensive
 * way (see 0072 and the aurora finding of 20 August):
 *
 * - **`accent` is ink.** Eyebrows, kickers, the disclosure marker, the current
 *   nav item. It is dark on a light palette and light on a dark one, and it is
 *   the slot people are most tempted to fill with their brand colour. If the
 *   brand colour cannot carry text, it belongs in `border-accent` or
 *   `brand-secondary`, which is exactly what `minimal` does with its mint.
 * - **`accent-strong` and `brand-secondary` are areas.** `loom.hero`'s aurora
 *   is the one place in the library that paints a slot as a large field, and it
 *   reads those two. Every palette here gives both real chroma for that reason.
 *
 * Ten are light and eight are dark. A dark palette is not a mode — nothing
 * switches on `prefers-color-scheme` — it is a palette whose canvas is dark,
 * chosen by id like any other (0049).
 */

export const paperPalette: Palette = paletteSchema.parse({
  id: "paper",
  name: "Paper",
  description: "Warm ivory with a terracotta accent. A printed page rather than a screen.",
  slots: {
    "bg-canvas": "#faf7f5",
    "bg-surface": "#ffffff",
    "bg-surface-muted": "#f5f0eb",
    "bg-overlay": "#ffffff",
    "fg-default": "#15120e",
    "fg-muted": "#665442",
    "fg-subtle": "#7a6755",
    "fg-on-accent": "#fcfcfb",
    accent: "#ae4d29",
    "accent-strong": "#b2471f",
    "accent-subtle": "#f8ece7",
    "brand-secondary": "#dd9c2c",
    "brand-secondary-strong": "#ac7515",
    "border-default": "#e7dbcf",
    "border-strong": "#291f14",
    "border-subtle": "#efe8e0",
    "border-accent": "#d67551",
  },
})

export const slatePalette: Palette = paletteSchema.parse({
  id: "slate",
  name: "Slate",
  description: "Cool grey with an indigo accent. Restrained, technical, quiet.",
  slots: {
    "bg-canvas": "#f9fafb",
    "bg-surface": "#ffffff",
    "bg-surface-muted": "#f0f2f4",
    "bg-overlay": "#ffffff",
    "fg-default": "#0e1115",
    "fg-muted": "#4a5875",
    "fg-subtle": "#5e6b87",
    "fg-on-accent": "#dcdde4",
    accent: "#3649c9",
    "accent-strong": "#2b42d4",
    "accent-subtle": "#e7eaf8",
    "brand-secondary": "#6639d0",
    "brand-secondary-strong": "#471fa3",
    "border-default": "#d5d9e2",
    "border-strong": "#191d24",
    "border-subtle": "#e7e9ee",
    "border-accent": "#5666d2",
  },
})

export const sagePalette: Palette = paletteSchema.parse({
  id: "sage",
  name: "Sage",
  description: "Soft green paper with a moss accent. Calm and horticultural.",
  slots: {
    "bg-canvas": "#f6f8f6",
    "bg-surface": "#ffffff",
    "bg-surface-muted": "#edf2ed",
    "bg-overlay": "#ffffff",
    "fg-default": "#0e150e",
    "fg-muted": "#3d5f3d",
    "fg-subtle": "#507250",
    "fg-on-accent": "#fbfcfb",
    accent: "#26784d",
    "accent-strong": "#1f7b4a",
    "accent-subtle": "#e8f8ef",
    "brand-secondary": "#79bf4a",
    "brand-secondary-strong": "#56952d",
    "border-default": "#d5e2d5",
    "border-strong": "#192419",
    "border-subtle": "#e4ece4",
    "border-accent": "#5ccc90",
  },
})

export const blushPalette: Palette = paletteSchema.parse({
  id: "blush",
  name: "Blush",
  description: "Pale rose with a burgundy accent. Warm without being loud.",
  slots: {
    "bg-canvas": "#fbf9f9",
    "bg-surface": "#ffffff",
    "bg-surface-muted": "#f5eff0",
    "bg-overlay": "#ffffff",
    "fg-default": "#150e0f",
    "fg-muted": "#764b53",
    "fg-subtle": "#885f66",
    "fg-on-accent": "#fcfcfc",
    accent: "#c13357",
    "accent-strong": "#c2284e",
    "accent-subtle": "#f8e7eb",
    "brand-secondary": "#df4e2a",
    "brand-secondary-strong": "#ae3213",
    "border-default": "#e5d2d5",
    "border-strong": "#271719",
    "border-subtle": "#f0e6e7",
    "border-accent": "#d25675",
  },
})

export const harbourPalette: Palette = paletteSchema.parse({
  id: "harbour",
  name: "Harbour",
  description: "White with a navy accent and a teal secondary. Institutional confidence.",
  slots: {
    "bg-canvas": "#fcfcfd",
    "bg-surface": "#ffffff",
    "bg-surface-muted": "#f0f2f5",
    "bg-overlay": "#ffffff",
    "fg-default": "#0e1215",
    "fg-muted": "#465a6e",
    "fg-subtle": "#5a6d81",
    "fg-on-accent": "#fcfdfd",
    accent: "#266bbb",
    "accent-strong": "#1d68bf",
    "accent-subtle": "#e7eff8",
    "brand-secondary": "#31c2d8",
    "brand-secondary-strong": "#1995a9",
    "border-default": "#d4dbe2",
    "border-strong": "#181f25",
    "border-subtle": "#e7ebee",
    "border-accent": "#4d8fdb",
  },
})

export const citrusPalette: Palette = paletteSchema.parse({
  id: "citrus",
  name: "Citrus",
  description: "Cream with an olive accent and an amber secondary. Agricultural, sunlit.",
  slots: {
    "bg-canvas": "#faf9f5",
    "bg-surface": "#ffffff",
    "bg-surface-muted": "#f4f2e7",
    "bg-overlay": "#ffffff",
    "fg-default": "#15150e",
    "fg-muted": "#5c583b",
    "fg-subtle": "#6f6c4d",
    "fg-on-accent": "#fcfdfc",
    accent: "#5f7220",
    "accent-strong": "#60751a",
    "accent-subtle": "#f4f8e7",
    "brand-secondary": "#e9ad20",
    "brand-secondary-strong": "#b6830c",
    "border-default": "#e9e6ce",
    "border-strong": "#2a2813",
    "border-subtle": "#f0efde",
    "border-accent": "#b4d058",
  },
})

export const lilacPalette: Palette = paletteSchema.parse({
  id: "lilac",
  name: "Lilac",
  description: "Pale violet with a plum accent. Soft-spoken and a little editorial.",
  slots: {
    "bg-canvas": "#faf9fb",
    "bg-surface": "#ffffff",
    "bg-surface-muted": "#f3eff5",
    "bg-overlay": "#ffffff",
    "fg-default": "#130e15",
    "fg-muted": "#694c78",
    "fg-subtle": "#7b6089",
    "fg-on-accent": "#fbfbfb",
    accent: "#9842bd",
    "accent-strong": "#9a37c4",
    "accent-subtle": "#f3e8f7",
    "brand-secondary": "#ce3b9d",
    "brand-secondary-strong": "#a12176",
    "border-default": "#ded2e5",
    "border-strong": "#211727",
    "border-subtle": "#ece6f0",
    "border-accent": "#a860c7",
  },
})

export const graphitePalette: Palette = paletteSchema.parse({
  id: "graphite",
  name: "Graphite",
  description: "Greyscale with no chroma anywhere. The palette that proves a page works on shape alone.",
  slots: {
    "bg-canvas": "#fafafa",
    "bg-surface": "#ffffff",
    "bg-surface-muted": "#f0efef",
    "bg-overlay": "#ffffff",
    "fg-default": "#131111",
    "fg-muted": "#625353",
    "fg-subtle": "#746666",
    "fg-on-accent": "#9c8282",
    accent: "#121212",
    "accent-strong": "#776666",
    "accent-subtle": "#f0f0f0",
    "brand-secondary": "#858585",
    "brand-secondary-strong": "#675b5b",
    "border-default": "#dddada",
    "border-strong": "#201d1d",
    "border-subtle": "#e8e6e6",
    "border-accent": "#949494",
  },
})

export const clayPalette: Palette = paletteSchema.parse({
  id: "clay",
  name: "Clay",
  description: "Sand with a rust accent and a deep green secondary. Earthenware.",
  slots: {
    "bg-canvas": "#f7f5f2",
    "bg-surface": "#ffffff",
    "bg-surface-muted": "#f0ece5",
    "bg-overlay": "#ffffff",
    "fg-default": "#15130e",
    "fg-muted": "#60533e",
    "fg-subtle": "#746550",
    "fg-on-accent": "#f9f8f7",
    accent: "#aa4b2d",
    "accent-strong": "#b24624",
    "accent-subtle": "#f8ebe7",
    "brand-secondary": "#54b68e",
    "brand-secondary-strong": "#348d6a",
    "border-default": "#e6ddd1",
    "border-strong": "#282015",
    "border-subtle": "#ebe4db",
    "border-accent": "#d27356",
  },
})

export const linenPalette: Palette = paletteSchema.parse({
  id: "linen",
  name: "Linen",
  description: "Undyed cloth with a deep umber accent and a slate secondary. The warmest of the near-whites.",
  slots: {
    "bg-canvas": "#f7f6f2",
    "bg-surface": "#fdfdfc",
    "bg-surface-muted": "#f0ede5",
    "bg-overlay": "#fdfdfc",
    "fg-default": "#15130e",
    "fg-muted": "#5f543d",
    "fg-subtle": "#72674f",
    "fg-on-accent": "#f9f8f7",
    accent: "#816246",
    "accent-strong": "#8a613e",
    "accent-subtle": "#f4efeb",
    "brand-secondary": "#5196b8",
    "brand-secondary-strong": "#32708f",
    "border-default": "#e5dfd1",
    "border-strong": "#272216",
    "border-subtle": "#eae6da",
    "border-accent": "#b49274",
  },
})

export const midnightPalette: Palette = paletteSchema.parse({
  id: "midnight",
  name: "Midnight",
  description: "Deep navy with a cyan accent. A dark mode that is blue rather than black.",
  slots: {
    "bg-canvas": "#111827",
    "bg-surface": "#172036",
    "bg-surface-muted": "#0d1321",
    "bg-overlay": "#172036",
    "fg-default": "#f3f4f7",
    "fg-muted": "#97a3bd",
    "fg-subtle": "#808ba6",
    "fg-on-accent": "#303c3e",
    accent: "#1fc0e0",
    "accent-strong": "#14c7eb",
    "accent-subtle": "#1d3135",
    "brand-secondary": "#538fea",
    "brand-secondary-strong": "#1466e1",
    "border-default": "#1f2e51",
    "border-strong": "#dae1f1",
    "border-subtle": "#19243e",
    "border-accent": "#5acbe2",
  },
})

export const carbonPalette: Palette = paletteSchema.parse({
  id: "carbon",
  name: "Carbon",
  description: "Near-black with a lime accent. Terminal energy, kept legible.",
  slots: {
    "bg-canvas": "#141613",
    "bg-surface": "#1f201d",
    "bg-surface-muted": "#0f110e",
    "bg-overlay": "#1f201d",
    "fg-default": "#f5f6f4",
    "fg-muted": "#98a689",
    "fg-subtle": "#809071",
    "fg-on-accent": "#464c3c",
    accent: "#98db24",
    "accent-strong": "#9be61a",
    "accent-subtle": "#2c351d",
    "brand-secondary": "#62dab2",
    "brand-secondary-strong": "#27ce96",
    "border-default": "#383e32",
    "border-strong": "#e6e8e3",
    "border-subtle": "#2b2f27",
    "border-accent": "#b0e25a",
  },
})

export const plumPalette: Palette = paletteSchema.parse({
  id: "plum",
  name: "Plum",
  description: "Dark purple with a magenta accent. Nocturnal and a little theatrical.",
  slots: {
    "bg-canvas": "#1d1320",
    "bg-surface": "#291a2d",
    "bg-surface-muted": "#170f1a",
    "bg-overlay": "#291a2d",
    "fg-default": "#f6f3f7",
    "fg-muted": "#b498bd",
    "fg-subtle": "#9e80a7",
    "fg-on-accent": "#1a141a",
    accent: "#df47df",
    "accent-strong": "#e849e8",
    "accent-subtle": "#351d35",
    "brand-secondary": "#9958e4",
    "brand-secondary-strong": "#741bda",
    "border-default": "#412749",
    "border-strong": "#eadeed",
    "border-subtle": "#321f38",
    "border-accent": "#e25ae2",
  },
})

export const forestPalette: Palette = paletteSchema.parse({
  id: "forest",
  name: "Forest",
  description: "Dark green with a mint accent. The dark counterpart to sage.",
  slots: {
    "bg-canvas": "#13201b",
    "bg-surface": "#1b2c25",
    "bg-surface-muted": "#0f1a15",
    "bg-overlay": "#1b2c25",
    "fg-default": "#f3f7f5",
    "fg-muted": "#89b4a2",
    "fg-subtle": "#709c8a",
    "fg-on-accent": "#33413b",
    accent: "#30cf85",
    "accent-strong": "#26d985",
    "accent-subtle": "#1d352a",
    "brand-secondary": "#93d468",
    "brand-secondary-strong": "#6bc62f",
    "border-default": "#28483b",
    "border-strong": "#deede7",
    "border-subtle": "#20372e",
    "border-accent": "#62daa2",
  },
})

export const emberPalette: Palette = paletteSchema.parse({
  id: "ember",
  name: "Ember",
  description: "Charcoal with an orange accent. Heat on a cold ground.",
  slots: {
    "bg-canvas": "#1a1614",
    "bg-surface": "#26201d",
    "bg-surface-muted": "#15110f",
    "bg-overlay": "#26201d",
    "fg-default": "#f7f4f3",
    "fg-muted": "#b79f8e",
    "fg-subtle": "#a08776",
    "fg-on-accent": "#292420",
    accent: "#eb7814",
    "accent-strong": "#f5780a",
    "accent-subtle": "#35281d",
    "brand-secondary": "#e6566a",
    "brand-secondary-strong": "#dc1833",
    "border-default": "#42362e",
    "border-strong": "#eae5e1",
    "border-subtle": "#332a24",
    "border-accent": "#e29a5a",
  },
})

export const duskPalette: Palette = paletteSchema.parse({
  id: "dusk",
  name: "Dusk",
  description: "Dark slate with a rose accent. Evening rather than night.",
  slots: {
    "bg-canvas": "#1a1924",
    "bg-surface": "#222130",
    "bg-surface-muted": "#15141f",
    "bg-overlay": "#222130",
    "fg-default": "#f3f3f7",
    "fg-muted": "#a3a1c3",
    "fg-subtle": "#8c8aad",
    "fg-on-accent": "#1e1819",
    accent: "#e0657a",
    "accent-strong": "#e76278",
    "accent-subtle": "#351d21",
    "brand-secondary": "#9a64d8",
    "brand-secondary-strong": "#752acb",
    "border-default": "#2d2c44",
    "border-strong": "#e1e0eb",
    "border-subtle": "#252437",
    "border-accent": "#de5e73",
  },
})

export const obsidianPalette: Palette = paletteSchema.parse({
  id: "obsidian",
  name: "Obsidian",
  description: "Greyscale on black. Graphite's dark twin, and the same proof.",
  slots: {
    "bg-canvas": "#141414",
    "bg-surface": "#212121",
    "bg-surface-muted": "#100f0f",
    "bg-overlay": "#212121",
    "fg-default": "#f5f4f4",
    "fg-muted": "#aea0a0",
    "fg-subtle": "#968989",
    "fg-on-accent": "#7b6161",
    accent: "#f7f7f7",
    "accent-strong": "#a09090",
    "accent-subtle": "#292929",
    "brand-secondary": "#9e9e9e",
    "brand-secondary-strong": "#827373",
    "border-default": "#3a3636",
    "border-strong": "#e7e4e4",
    "border-subtle": "#2d2a2a",
    "border-accent": "#9e9e9e",
  },
})

export const tidePalette: Palette = paletteSchema.parse({
  id: "tide",
  name: "Tide",
  description: "Deep teal with a sand accent. Cold water, warm light.",
  slots: {
    "bg-canvas": "#132125",
    "bg-surface": "#1a2e32",
    "bg-surface-muted": "#0f1c1f",
    "bg-overlay": "#1a2e32",
    "fg-default": "#f3f6f7",
    "fg-muted": "#94b3ba",
    "fg-subtle": "#7a9ba3",
    "fg-on-accent": "#38342c",
    accent: "#db9e24",
    "accent-strong": "#e6a21a",
    "accent-subtle": "#352d1d",
    "brand-secondary": "#60dcd0",
    "brand-secondary-strong": "#25d0bf",
    "border-default": "#24444c",
    "border-strong": "#dcebef",
    "border-subtle": "#1c343b",
    "border-accent": "#e2b55a",
  },
})

/**
 * In the order a catalogue reads best: the light palettes, then the dark ones,
 * each run from the most neutral to the most committed. A model reading down
 * this list meets `paper` and `slate` before `plum`, which is the order a
 * person would offer them in.
 */
export const DERIVED_PALETTES: readonly Palette[] = [
  paperPalette,
  slatePalette,
  sagePalette,
  blushPalette,
  harbourPalette,
  citrusPalette,
  lilacPalette,
  graphitePalette,
  clayPalette,
  linenPalette,
  midnightPalette,
  carbonPalette,
  plumPalette,
  forestPalette,
  emberPalette,
  duskPalette,
  obsidianPalette,
  tidePalette,
]
