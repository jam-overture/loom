import type { PrimitiveCatalogue } from "../catalogue.js"
import { THEME_PROP_KEY } from "../render/theme.js"
import type { EditIntent } from "../runtime/intent.js"
import type { RepairRequest } from "../runtime/interpreter.js"
import type { ThemeCatalogue } from "../theme/registry.js"
import type { LoomTree } from "../tree/tree.js"

import { renderCatalogue, renderDelta, renderThemeCatalogue, renderTree } from "./render.js"

/**
 * Prompt assembly, kept pure so the exact bytes sent to a model are a value a
 * test can assert on rather than a side effect of calling one.
 *
 * The system prompt is deliberately a constant: it is the same for every intent
 * and every tree, so it sits at the front of the request where a cache can hold
 * it, and so that "what were we asking the model to do" is answerable by
 * reading one string rather than reconstructing a template.
 */

export const INTERPRETER_SYSTEM_PROMPT = `You translate a request about a user interface into discrete edits to a component tree.

The tree is given as an indented outline. Every line starts with a node id. There are three node kinds:
- element — an instance of a primitive, with props and ordered children
- text — a leaf string
- slot — a named region whose children are fallback content

You reply with one of three outcomes:
- "change" — the intent is satisfiable, and you give the operations that satisfy it
- "no-change" — you understood the intent and the tree already satisfies it
- "not-understood" — the intent is ambiguous, or asks for something the operations cannot express

There are exactly four operations:
- insert — a new node at a position under an existing parent
- remove — an existing node and its whole subtree
- move — an existing node to a new parent and position
- configure — set or unset props on an existing node

Rules you must follow:
- Address existing nodes only by ids copied exactly from the outline. Never invent an id.
- Never give an id to a node you are inserting. The runtime assigns it.
- Operations apply in order, and each one sees the effects of the ones before it.
- move is a detach followed by an insert, so its index counts positions in the child list the node has already left.
- props is the node's props as a JSON object, JSON-encoded into a string: "{\"tone\":\"quiet\",\"count\":2}". Use "{}" for no props. configure's set is written the same way. Values are ordinary JSON — strings, numbers, booleans, null, arrays, objects — with no tags or wrappers.
- You may insert element and text nodes. You cannot insert a slot: a slot is a region a primitive declares, not content an edit adds. Slots already in the tree can be configured, moved into, and inserted into like anything else.
- Propose the smallest set of operations that satisfies the intent. Do not tidy, restructure, or improve anything you were not asked about.
- Reuse primitive types already present in the tree unless the intent clearly calls for a new one.
- confidence is your own estimate that these operations satisfy the intent, from 0 to 1. Report it honestly; a low number is more useful than a wrong high one.

Sometimes you will be shown a proposal that was refused, and the reason. You get one revision, and the rules above still apply. A revision must be a more conservative way to satisfy the same request — smaller in what it destroys, or narrower in what it touches. It must not be the same change split into a smaller piece so that the remainder can be asked for again: if the request cannot be satisfied within the stated objection, say "not-understood" and explain what would have to change. Reproposing what was already refused, or working around the objection rather than respecting it, is the one thing a revision must never do.`

/**
 * The catalogue block, and why it leads the message rather than following the
 * tree: it is the most stable thing here — a property of the deployment, not of
 * the request — so it sits where a cache can hold it across intents.
 *
 * Absent when the host wired no catalogue, in which case the model is told
 * nothing about what exists beyond what the tree already shows. That is the
 * honest fallback: inventing a list would be worse than admitting there isn't
 * one, and the closing instruction below only applies when a list was given.
 */
const catalogueBlock = (catalogue: PrimitiveCatalogue | undefined): string =>
  catalogue === undefined || catalogue.length === 0
    ? ""
    : `Primitives this deployment has registered. A prop marked with "?" is optional; every other listed prop is required.

${renderCatalogue(catalogue)}

Insert only primitives from that list — a type that is not on it has nothing to render it, so the node would be dropped. Set only props a primitive declares, and put children in the slots it names.

`

/**
 * The theme block, and the one instruction that makes it actionable.
 *
 * A model shown three lists of ids and nothing else would have no way to use
 * them: the theme is not a primitive, not a slot, and not a prop any primitive
 * declares — it is a reserved key on the root node, and every rule above tells
 * the model to set only props a primitive declares. So the exception is stated
 * where the vocabulary is given, or the vocabulary is decoration.
 *
 * All three ids are required together because the selection schema requires
 * all three; a `configure` that set one would fail to resolve and the page
 * would render unthemed, which is a worse answer than "I did not understand".
 */
const themeBlock = (themes: ThemeCatalogue | undefined): string => {
  const rendered = themes === undefined ? "" : renderThemeCatalogue(themes)
  if (rendered === "") return ""

  return `Themes this deployment has registered. A theme is three registered ids — one palette, one font pack, one style preset — carried on the root node under the reserved prop "${THEME_PROP_KEY}". It is the one prop that is not declared by a primitive.

${rendered}

To re-theme the page, configure the root node and set "${THEME_PROP_KEY}" to an object with all three keys: {"${THEME_PROP_KEY}":{"palette":"…","fontPack":"…","stylePreset":"…"}}. Give all three every time, even when only one changes — a selection missing a key does not resolve and the page renders unthemed. Use only ids from the lists above. Colours, fonts and spacing come from the theme; never set a colour on a primitive.

`
}

export const buildUserMessage = (
  intent: EditIntent,
  tree: LoomTree,
  catalogue?: PrimitiveCatalogue,
  themes?: ThemeCatalogue
): string => {
  const scopeLine = intent.scopeNodeId
    ? `\nConfine the change to the subtree rooted at ${intent.scopeNodeId}, marked "<- scope" above.`
    : ""

  return `${catalogueBlock(catalogue)}${themeBlock(themes)}Current tree:

${renderTree(tree, intent.scopeNodeId)}

Request (${intent.origin}): ${intent.utterance}${scopeLine}`
}

export const buildRepairMessage = (
  request: RepairRequest,
  tree: LoomTree,
  catalogue?: PrimitiveCatalogue,
  themes?: ThemeCatalogue
): string => `${buildUserMessage(request.intent, tree, catalogue, themes)}

You proposed this, and it was refused:

${renderDelta(request.refused.delta)}

Your reasoning was: ${request.refused.rationale}

It was refused because — ${request.disposition.reason.code}: ${request.disposition.reason.detail}

Propose a more conservative way to satisfy the same request, or say "not-understood" if there is none.`

const HEX = Array.from({ length: 256 }, (_, byte) => byte.toString(16).padStart(2, "0"))

/**
 * Provenance records a hash rather than the prompt, so an audit trail can prove
 * two proposals came from the same question without storing what was asked.
 */
export const hashPrompt = async (system: string, userMessage: string): Promise<string> => {
  const encoded = new TextEncoder().encode(`${system}\n\n${userMessage}`)
  const digest = await globalThis.crypto.subtle.digest("SHA-256", encoded)

  return Array.from(new Uint8Array(digest), (byte) => HEX[byte] ?? "00").join("")
}
