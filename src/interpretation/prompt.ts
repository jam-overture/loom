import type { EditIntent } from "../runtime/intent.js"
import type { RepairRequest } from "../runtime/interpreter.js"
import type { LoomTree } from "../tree/tree.js"

import { renderDelta, renderTree } from "./render.js"

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
- Prop values are tagged: {"kind":"string","string":"Home"}, {"kind":"number","number":1}, {"kind":"boolean","boolean":true}, {"kind":"null"}, or {"kind":"json","json":"[1,2]"} for an array or object.
- Propose the smallest set of operations that satisfies the intent. Do not tidy, restructure, or improve anything you were not asked about.
- Reuse primitive types already present in the tree unless the intent clearly calls for a new one.
- confidence is your own estimate that these operations satisfy the intent, from 0 to 1. Report it honestly; a low number is more useful than a wrong high one.

Sometimes you will be shown a proposal that was refused, and the reason. You get one revision, and the rules above still apply. A revision must be a more conservative way to satisfy the same request — smaller in what it destroys, or narrower in what it touches. It must not be the same change split into a smaller piece so that the remainder can be asked for again: if the request cannot be satisfied within the stated objection, say "not-understood" and explain what would have to change. Reproposing what was already refused, or working around the objection rather than respecting it, is the one thing a revision must never do.`

export const buildUserMessage = (intent: EditIntent, tree: LoomTree): string => {
  const scopeLine = intent.scopeNodeId
    ? `\nConfine the change to the subtree rooted at ${intent.scopeNodeId}, marked "<- scope" above.`
    : ""

  return `Current tree:

${renderTree(tree, intent.scopeNodeId)}

Request (${intent.origin}): ${intent.utterance}${scopeLine}`
}

export const buildRepairMessage = (request: RepairRequest, tree: LoomTree): string => `${buildUserMessage(request.intent, tree)}

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
