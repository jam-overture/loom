import type { PrimitiveCatalogue } from "../catalogue.js"
import type { DataCatalogue } from "../data/catalogue.js"
import type { FrameCatalogue } from "../frame/catalogue.js"
import { DATA_PROP_KEY, SUBMIT_PROP_KEY, THEME_PROP_KEY } from "../reserved-props.js"
import type { EditIntent } from "../runtime/intent.js"
import type { RepairRequest } from "../runtime/interpreter.js"
import type { SubmissionCatalogue } from "../submit/catalogue.js"
import type { ThemeCatalogue } from "../theme/registry.js"
import type { LoomTree } from "../tree/tree.js"

import {
  renderCatalogue,
  renderDelta,
  renderFrameCatalogue,
  renderSourceCatalogue,
  renderSubmissionCatalogue,
  renderThemeCatalogue,
  renderTree,
} from "./render.js"

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

/**
 * The data block: what this deployment can be asked about, and the one
 * instruction that stops the answer being a guess.
 *
 * 0058 put the reason in the record — *"a source a model was never told about is
 * one it can only guess at"* — and `dataCatalogue` has projected exactly that
 * since, for a prompt that never carried it. A model asked to put somebody's
 * services on a page had no way to know `catalogue.services` exists, so the only
 * reachable answers were a binding it invented, refused at the seam as
 * `no-such-source`, or no binding at all.
 *
 * The closing paragraph says three things because the seam refuses on three
 * different grounds, and only one of them is visible in the list: an unregistered
 * source is refused, a param the source did not declare is refused, and a binding
 * *name* nothing reads is accepted and then read by nobody. The third is the one
 * worth the sentence — it is the only one of the three that fails silently, and
 * a name is not something the catalogue can enumerate, because it belongs to the
 * primitive rather than to the source.
 */
const dataBlock = (sources: DataCatalogue | undefined): string =>
  sources === undefined || sources.length === 0
    ? ""
    : `Data this deployment can answer questions about. A node asks under the reserved prop "${DATA_PROP_KEY}", which maps a binding name to a registered source and the params to ask it with. A param marked with "?" is optional; every other listed param is required.

${renderSourceCatalogue(sources)}

A binding is written {"${DATA_PROP_KEY}":{"<binding name>":{"source":"<id>","params":{…}}}}, and "params" may be left out when the source declares none. Use only source ids from the list above — one that is not on it is refused and the node renders without data. Do not invent a binding name: the name is how the primitive reading the answer finds it, so repoint or re-param a name already on the node rather than adding one of your own.

`

/**
 * The submission block: where a form may post, and nowhere else.
 *
 * Thinner than the data block because the seam is thinner (0065). A binding carries
 * params because a read genuinely varies; a write does not, so the whole of what
 * a model may say here is one registered id. The closing paragraph spends its
 * length on the two things the declaration schema is strict about — the single
 * `to` key, and the address that is not in the tree — because a model that
 * writes `{"to":…,"action":…}` is refused outright rather than having the extra
 * key stripped.
 */
const submissionBlock = (endpoints: SubmissionCatalogue | undefined): string =>
  endpoints === undefined || endpoints.length === 0
    ? ""
    : `Where this deployment will accept a form submission. A node says where it posts under the reserved prop "${SUBMIT_PROP_KEY}".

${renderSubmissionCatalogue(endpoints)}

To point a form at one, configure the node and set "${SUBMIT_PROP_KEY}" to {"to":"<id>"}. Use only ids from the list above. "to" is the only key the declaration accepts, and an address never appears in the tree — the deployment resolves the id to one after the choice is made.

`

/**
 * The framing block, and the sentence that keeps it from being read as the other
 * two.
 *
 * `frameCatalogue`'s own comment makes the distinction and it has to survive into
 * the prompt: an endpoint catalogue is the whole of what a model may name,
 * because an address never appears in a tree, and this one is not, because a
 * frame's URL does. Which video belongs on the page is a content decision the
 * model is supposed to make. What it cannot do is pick a host, and a model shown
 * a list with no word about which kind of list it is would reasonably read these
 * as the only values it may write.
 */
const framingBlock = (origins: FrameCatalogue | undefined): string =>
  origins === undefined || origins.length === 0
    ? ""
    : `Whose documents this deployment will put inside a frame.

${renderFrameCatalogue(origins)}

Those are origins rather than addresses. The URL of a framed document is an ordinary prop and it is yours to choose, but its scheme, host and port must match one of the lines above, or the primitive renders a refusal where the document would have been.

`

/**
 * Everything a deployment can offer a model, in one value.
 *
 * Five projections rather than five parameters, and the reason is the shape the
 * fifth one would have had: `buildUserMessage(intent, tree, undefined,
 * undefined, sources)` is a call nobody can read and a call site that silently
 * means something else if an argument is inserted. Each field is independently
 * optional because a deployment genuinely may wire any subset — §2 shipped with
 * none of them, and a site with a library and no data registry is the ordinary
 * case rather than a half-configured one.
 *
 * Every field is a *projection* rather than a registry: what reaches a model is
 * what `catalogueOf`, `dataCatalogue`, `submissionCatalogue`, `frameCatalogue`
 * and `ThemeRegistry.catalogue` chose to publish, which is how a registry keeps
 * internals — an adapter's connection, an endpoint's address — out of a prompt
 * by construction rather than by remembering to.
 *
 * The keys are the names a host already writes on `ModelInterpreterConfig`,
 * which composes this type rather than restating it. A second spelling of the
 * same five things would buy prettier block names — `sources` over
 * `dataCatalogue` — at the price of a mapping function between two shapes that
 * must stay in step, and that function is the thing a sixth vocabulary would be
 * forgotten in.
 */
export type PromptVocabularies = {
  /**
   * What this deployment can build with. Absent means the model is told only
   * what the tree shows, which is what §2 shipped with; a host that has a §4
   * registry projects it with `catalogueOf` and the model stops guessing at
   * primitive names it has no way to know.
   */
  readonly catalogue?: PrimitiveCatalogue
  /**
   * What this deployment may be themed with. Absent means the model is shown no
   * theme vocabulary and cannot re-theme anything: the ids in the tree are the
   * only ones it knows, so "make it warmer" has nowhere to go but an invented
   * id that fails to resolve. A host with a §4b theme registry passes
   * `themes.catalogue()`.
   */
  readonly themeCatalogue?: ThemeCatalogue
  /**
   * What this deployment can be asked about. Absent means the model is told
   * nothing about the data seam, so the only bindings it can propose are ones
   * it invented — refused at the seam as `no-such-source`, which is the right
   * refusal for a guess nobody gave it the information to avoid (0058). A host
   * with a source registry passes `dataCatalogue(registry)`.
   */
  readonly dataCatalogue?: DataCatalogue
  /**
   * Where this deployment will accept a submission. Absent means the model
   * cannot point a form anywhere, which is the safe default rather than a gap:
   * `loom:submit` names a registered endpoint and nothing else leaves the tree
   * (0065). A host with an endpoint registry passes
   * `submissionCatalogue(registry)`.
   */
  readonly submissionCatalogue?: SubmissionCatalogue
  /**
   * Whose documents this deployment will frame. Absent means the model is not
   * told, and a frame it proposes renders a refusal unless it happened to name
   * a registered origin. Unlike the four above this one narrows a value the
   * model still chooses, because which video belongs on a page is a content
   * decision and the URL stays in the tree (0095).
   */
  readonly frameCatalogue?: FrameCatalogue
}

const NO_VOCABULARIES: PromptVocabularies = Object.freeze({})

/**
 * The message in its parts, so that assembling it and measuring it read from
 * the same place. A measurement that rebuilt the blocks itself would be a
 * second assembly to keep in step, and the first thing to go stale.
 */
type UserMessageParts = {
  readonly primitives: string
  readonly themes: string
  readonly sources: string
  readonly endpoints: string
  readonly frames: string
  readonly tree: string
  readonly request: string
}

const userMessageParts = (
  intent: EditIntent,
  tree: LoomTree,
  vocabularies: PromptVocabularies
): UserMessageParts => {
  const scopeLine = intent.scopeNodeId
    ? `\nConfine the change to the subtree rooted at ${intent.scopeNodeId}, marked "<- scope" above.`
    : ""

  return {
    primitives: catalogueBlock(vocabularies.catalogue),
    themes: themeBlock(vocabularies.themeCatalogue),
    sources: dataBlock(vocabularies.dataCatalogue),
    endpoints: submissionBlock(vocabularies.submissionCatalogue),
    frames: framingBlock(vocabularies.frameCatalogue),
    tree: `Current tree:\n\n${renderTree(tree, intent.scopeNodeId)}\n\n`,
    request: `Request (${intent.origin}): ${intent.utterance}${scopeLine}`,
  }
}

/**
 * The five vocabulary blocks lead, then the tree, then the sentence somebody
 * typed.
 *
 * The order is by how often a part changes, least often first, so that the
 * longest stable prefix sits where a provider's cache can hold it: a deployment
 * registers once and asks many times, the tree changes with every accepted
 * change, and the request is different every time by definition.
 */
export const buildUserMessage = (
  intent: EditIntent,
  tree: LoomTree,
  vocabularies: PromptVocabularies = NO_VOCABULARIES
): string => {
  const parts = userMessageParts(intent, tree, vocabularies)

  return `${parts.primitives}${parts.themes}${parts.sources}${parts.endpoints}${parts.frames}${parts.tree}${parts.request}`
}

/**
 * What one proposal request costs, block by block, in characters.
 *
 * Characters rather than tokens, deliberately. A token count depends on a
 * tokenizer that belongs to a model and changes with it, so a number measured
 * here would be wrong somewhere else and stale eventually; the package would
 * also have to carry a tokenizer to produce it. Characters are exact, free, and
 * proportional enough for the question this exists to answer — which block is
 * the request made of, and what did registering more of something cost.
 *
 * `system` is the constant prompt. It is included because it is part of what is
 * sent, and separated because it is the one part a provider's cache can hold
 * across every intent: a large constant is a different kind of cost from a large
 * catalogue that arrives on every request behind a tree that keeps changing.
 *
 * A repair sends this message again, plus the refused delta and the objection.
 * What that costs is `measureRepairPrompt` below rather than a multiplier
 * quoted here, because the ratio moves with the page
 * (0108).
 */
export type PromptMeasurement = {
  readonly system: number
  readonly primitives: number
  readonly themes: number
  readonly sources: number
  readonly endpoints: number
  readonly frames: number
  readonly tree: number
  readonly request: number
  /** The sum of the eight, and what actually goes over the wire. */
  readonly total: number
}

/**
 * Measures a request without sending it.
 *
 * A host deciding what to register is the intended caller: `createThemeRegistry`
 * and the primitive registry both take exactly what a deployment wants, and this
 * is how the cost of taking all of it becomes a number rather than a feeling
 * (0077's cost, made countable).
 */
export const measurePrompt = (
  intent: EditIntent,
  tree: LoomTree,
  vocabularies: PromptVocabularies = NO_VOCABULARIES
): PromptMeasurement => {
  const parts = userMessageParts(intent, tree, vocabularies)

  const measured = {
    system: INTERPRETER_SYSTEM_PROMPT.length,
    primitives: parts.primitives.length,
    themes: parts.themes.length,
    sources: parts.sources.length,
    endpoints: parts.endpoints.length,
    frames: parts.frames.length,
    tree: parts.tree.length,
    request: parts.request.length,
  }

  return {
    ...measured,
    total: Object.values(measured).reduce((sum, part) => sum + part, 0),
  }
}

/**
 * The repair message in its parts, for the reason `UserMessageParts` exists: a
 * measurement that rebuilt these blocks itself would be a second assembly to
 * keep in step with this one.
 *
 * `proposal` is the whole first request, verbatim. That is the finding this
 * split was made to answer — a repair does not refer back to the tree, it sends
 * it again (0108).
 */
type RepairMessageParts = {
  readonly proposal: string
  readonly refused: string
  readonly objection: string
  readonly instruction: string
}

const repairMessageParts = (
  request: RepairRequest,
  tree: LoomTree,
  vocabularies: PromptVocabularies
): RepairMessageParts => ({
  proposal: buildUserMessage(request.intent, tree, vocabularies),
  refused: `

You proposed this, and it was refused:

${renderDelta(request.refused.delta)}

Your reasoning was: ${request.refused.rationale}`,
  objection: `

It was refused because — ${request.disposition.reason.code}: ${request.disposition.reason.detail}`,
  instruction: `

Propose a more conservative way to satisfy the same request, or say "not-understood" if there is none.`,
})

export const buildRepairMessage = (
  request: RepairRequest,
  tree: LoomTree,
  vocabularies: PromptVocabularies = NO_VOCABULARIES
): string => {
  const parts = repairMessageParts(request, tree, vocabularies)

  return `${parts.proposal}${parts.refused}${parts.objection}${parts.instruction}`
}

/**
 * What a second go costs, once the first one was refused.
 *
 * `proposal` is the measurement of the request that was refused — and, because a
 * repair restates it whole, also the measurement of the largest part of the
 * repair. Reading the same numbers twice is the point: the block that dominated
 * the first request dominates the second, and on a large page that block is the
 * tree.
 *
 * `total` is the repair request on the wire. `episode` is both requests together
 * — what asking once and being refused once actually cost — and it is the number
 * the doubling is about (0108).
 */
export type RepairMeasurement = {
  readonly proposal: PromptMeasurement
  /** The refused delta, rendered, and the reasoning offered for it. */
  readonly refused: number
  /** The Gate's reason code and its detail. */
  readonly objection: number
  /** The closing sentence that makes this a revision rather than a fresh ask. */
  readonly instruction: number
  /** `proposal.total` plus the three above: what the repair puts on the wire. */
  readonly total: number
  /** `proposal.total + total`: the whole refused-then-repaired episode. */
  readonly episode: number
}

/**
 * Measures a repair without sending it, on the same terms as `measurePrompt`.
 *
 * The intended caller is a host or a report deciding whether a refusal is worth
 * offering a second go on: a repair is never cheaper than the request it
 * revises, and how much dearer is a property of the page rather than a constant
 * (0108).
 */
export const measureRepairPrompt = (
  request: RepairRequest,
  tree: LoomTree,
  vocabularies: PromptVocabularies = NO_VOCABULARIES
): RepairMeasurement => {
  const parts = repairMessageParts(request, tree, vocabularies)
  const proposal = measurePrompt(request.intent, tree, vocabularies)

  const measured = {
    refused: parts.refused.length,
    objection: parts.objection.length,
    instruction: parts.instruction.length,
  }

  const total =
    proposal.total + Object.values(measured).reduce((sum, part) => sum + part, 0)

  return { proposal, ...measured, total, episode: proposal.total + total }
}

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
