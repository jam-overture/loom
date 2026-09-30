import {
  INTERPRETER_SYSTEM_PROMPT,
  measurePrompt,
  renderCatalogue,
  renderThemeCatalogue,
  renderTree,
  sequentialIdFactory,
  type EditIntent,
  type LoomTree,
  type PromptMeasurement,
} from "@jam-overture/loom"
import { catalogueOf } from "@jam-overture/loom/sdk"

import { docsExamples } from "../examples/catalogue"
import { docsRegistry, docsThemes } from "../loom/registry"

/**
 * The request this site would send a model, printed instead of sent.
 *
 * Every page so far has shown the runtime being certain. This is the one step
 * that guesses, and the honest way to document it is to stop describing the
 * prompt and show it: the blocks below are built by `buildUserMessage`'s own
 * renderers — `renderCatalogue`, `renderThemeCatalogue`, `renderTree` — against
 * the same registry, the same theme registry and the same example tree the
 * reader has in front of them.
 *
 * **Nothing here calls a model, and nothing here needs a key.** A projection of
 * a request is a pure function of the deployment and the tree (0008), which is
 * exactly why it can be a documentation page at all: the site would otherwise
 * have to either mock the prompt — a second copy that goes stale — or spend a
 * model call per page build.
 *
 * The sizes are **not** measured off the text below. They come from
 * `measurePrompt`, which measures what is actually sent — each block wrapped in
 * the sentences of instruction that make it usable — so a preview that elides a
 * list still reports what the whole list costs.
 */

/** How many lines of a long block a reader sees before the elision. */
const PREVIEW_LINES = 6

/**
 * The one thing on this page that is neither the runtime's nor the reader's.
 *
 * It is the utterance of the first chip in the propose-a-change box, verbatim,
 * so a reader who has just clicked it is looking at the request that click
 * would have made if a model had been on the other end of it.
 */
export const DOCS_PROMPT_UTTERANCE = "Add a closing line to the end of this page."

export type PromptBlock = {
  /** Stable, and what a heading and a `key` are made from. */
  readonly id: "system" | "primitives" | "themes" | "tree" | "request"
  /** What this block is, in the site's voice. */
  readonly title: string
  /** One sentence: why the model is being told this. */
  readonly summary: string
  /** The lines a reader sees. */
  readonly preview: readonly string[]
  /** What was left out, when the block is longer than the preview. */
  readonly elided?: { readonly count: number; readonly noun: string }
  /** What the whole block costs, in characters, as `measurePrompt` counts it. */
  readonly characters: number
}

export type DocsModelRequest = {
  readonly exampleId: string
  readonly utterance: string
  readonly blocks: readonly PromptBlock[]
  readonly measurement: PromptMeasurement
  /** How many primitives and how many theme ids this deployment registered. */
  readonly registered: { readonly primitives: number; readonly themeIds: number }
}

const lines = (text: string): readonly string[] => text.split("\n")

/**
 * The first few lines, and an honest count of the rest.
 *
 * The noun is passed rather than derived because "54 more primitives" and "54
 * more lines" are different claims and only one of them is true of a list whose
 * entries are one line each.
 */
const previewOf = (
  text: string,
  noun: string
): Pick<PromptBlock, "preview" | "elided"> => {
  const all = lines(text)

  if (all.length <= PREVIEW_LINES) return { preview: all }

  return {
    preview: all.slice(0, PREVIEW_LINES),
    elided: { count: all.length - PREVIEW_LINES, noun },
  }
}

/**
 * The intent the request is built from.
 *
 * Fixed in every field that reaches the message — the origin and the utterance —
 * and fixed in the ones that do not, so that two builds of this page produce
 * byte-identical output. A timestamp from a clock would make the page's own
 * snapshot test a coin toss for no reader-visible gain.
 */
const promptIntent = (tree: LoomTree): EditIntent => {
  const ids = sequentialIdFactory("docsprompt")

  return {
    intentId: ids.intentId(),
    treeId: tree.treeId,
    baseRevision: tree.revision,
    origin: "user-instruction",
    actor: "the reader",
    utterance: DOCS_PROMPT_UTTERANCE,
    observedAt: "2026-01-01T00:00:00.000Z",
  }
}

/**
 * The whole request for one named example.
 *
 * Throws on an unknown id, at build time, which is where a broken example
 * reference belongs: the alternative is a page that renders an empty box and
 * says nothing was wrong.
 */
export const docsModelRequest = (exampleId: string): DocsModelRequest => {
  const example = docsExamples.get(exampleId)

  if (example === undefined) {
    throw new Error(`loom: the documentation has no example called "${exampleId}"`)
  }

  const tree = example.build()
  const catalogue = catalogueOf(docsRegistry)
  const themes = docsThemes.catalogue()
  const intent = promptIntent(tree)
  const measurement = measurePrompt(intent, tree, { catalogue, themeCatalogue: themes })
  const themeIds =
    themes.palettes.length + themes.fontPacks.length + themes.stylePresets.length

  const blocks: readonly PromptBlock[] = [
    {
      id: "system",
      title: "The standing instructions",
      summary:
        "The same words on every request, so a provider's cache can hold them and so what Loom asks for is one string somebody can read.",
      ...previewOf(INTERPRETER_SYSTEM_PROMPT, "lines"),
      characters: measurement.system,
    },
    {
      id: "primitives",
      title: "What it may build with",
      summary:
        "Your registry, one line each. A model cannot invent a primitive because it is never shown one it does not have.",
      ...previewOf(renderCatalogue(catalogue), "primitives"),
      characters: measurement.primitives,
    },
    {
      id: "themes",
      title: "What it may theme with",
      summary:
        "Palettes, font packs and style presets by id and description — never a color, which is the whole of the theming bargain.",
      ...previewOf(renderThemeCatalogue(themes), "lines"),
      characters: measurement.themes,
    },
    {
      id: "tree",
      title: "The page as it stands",
      summary:
        "The tree above, as an indented outline. Every line begins with the node id an operation would have to name.",
      ...previewOf(renderTree(tree), "lines"),
      characters: measurement.tree,
    },
    {
      id: "request",
      title: "What was asked",
      summary: "The sentence somebody typed, and who was doing the typing.",
      preview: [`Request (${intent.origin}): ${intent.utterance}`],
      characters: measurement.request,
    },
  ]

  return {
    exampleId,
    utterance: intent.utterance,
    blocks,
    measurement,
    registered: { primitives: catalogue.length, themeIds },
  }
}

/**
 * What one request would cost if this deployment had registered nothing.
 *
 * The comparison is the point of printing either number: the tree and the
 * sentence are what the reader asked about, and on a site with a real library
 * they are a rounding error beside the vocabulary. A host reading this is being
 * shown where their bill goes before they meet it.
 */
export const docsBareRequest = (exampleId: string): PromptMeasurement => {
  const example = docsExamples.get(exampleId)

  if (example === undefined) {
    throw new Error(`loom: the documentation has no example called "${exampleId}"`)
  }

  const tree = example.build()

  return measurePrompt(promptIntent(tree), tree)
}
