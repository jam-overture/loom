// Loom in one file.
//
// Save this as `quickstart.mts` — the `m` is not decoration. It is what tells
// Node this file is a module, and a fresh project's package.json does not say
// so. Named `quickstart.ts` in a new directory, this stops before it runs with
// an error about top-level await that explains nothing.
//
//     pnpm add @loom/runtime react react-dom zod
//     npx tsx quickstart.mts
//
// It registers a component of your own, writes a page down as data, draws that
// page into `quickstart.html`, and then lets somebody ask for three changes to
// it. Two of the three reach the page and one of them never will.
//
// Nothing here is a demo mode. It is the same runtime a deployment runs, with
// memory where a deployment would put a database.

import { writeFileSync } from "node:fs"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { z } from "zod"

import {
  buildElement,
  buildText,
  createTree,
  createThemeRegistry,
  err,
  fixedPolicy,
  gatePolicySchema,
  ok,
  sequentialIdFactory,
  systemClock,
  type ChangeInterpreter,
  type LoomTree,
  type TreeOperation,
} from "@loom/runtime"
import { createStarterPrimitiveRegistry } from "@loom/runtime/primitives"
import { renderLoomTree, THEME_PROP_KEY, type LoomPrimitiveProps } from "@loom/runtime/react"
import { definePrimitive, describeRegistryError } from "@loom/runtime/sdk"
import { memoryTreeStore } from "@loom/runtime/store"
import {
  commitIntent,
  confirmHeld,
  describeWriteOutcome,
  memoryHoldStore,
  type WriteOutcome,
  type WritePath,
} from "@loom/runtime/write"

/** Node ids. Sequential here so that two runs of this file produce the same page. */
const ids = sequentialIdFactory("quickstart")

// ── 1. A word of your own ────────────────────────────────────────────────────
//
// A primitive is three things: a name a page may say, a schema its props must
// satisfy, and a component that draws it. Until this exists, nothing anywhere
// can propose a notice — that is the whole bargain, in one declaration.

const noticeProps = z.object({ text: z.string().min(1).max(160) }).strict()

const notice = definePrimitive({
  type: "app.notice",
  description: "A short standing note, at the end of a page. One sentence, never two.",
  props: noticeProps,
  slots: [],
  component: ({ loom, props }: LoomPrimitiveProps<z.infer<typeof noticeProps>>) =>
    createElement(
      "p",
      { ...loom.editable, style: { border: "1px solid", padding: "0.75rem" } },
      props.text
    ),
})

// The starter library plus yours. It refuses rather than repairs, so a clash of
// names is an error here and not a surprise at render time.
const built = createStarterPrimitiveRegistry([notice])

if (!built.ok) throw new Error(describeRegistryError(built.error))

const registry = built.value

// ── 2. The page, written down as data ────────────────────────────────────────
//
// No markup, no components, no file of JSX. Three nodes, each naming a
// primitive the registry knows and carrying props that primitive declared.

const headline = buildElement(ids, {
  type: "loom.heading",
  props: { level: 1 },
  children: [buildText(ids, "Hello from a tree")],
})

const sentence = buildElement(ids, {
  type: "loom.prose",
  children: [buildText(ids, "Nothing here was written as markup.")],
})

const root = buildElement(ids, {
  type: "loom.page",
  props: {
    width: "readable",
    fills: true,
    // A theme is three registered ids on the root, not a stylesheet you import.
    [THEME_PROP_KEY]: { palette: "minimal", fontPack: "minimal-sans", stylePreset: "precise" },
  },
  children: [headline, sentence],
})

const page = createTree(root, ids)

// ── 3. Drawing it ────────────────────────────────────────────────────────────
//
// Rendering is synchronous, pure, and never fails. It hands back an element and
// a list of what it could not honour — empty, on a healthy render.

const draw = (tree: LoomTree): string => {
  const rendered = renderLoomTree(tree, {
    resolver: registry,
    validator: registry,
    themes: createThemeRegistry(),
  })

  for (const diagnostic of rendered.diagnostics) {
    console.warn(`  render diagnostic: ${diagnostic.code} at ${diagnostic.nodeId}`)
  }

  writeFileSync(
    "quickstart.html",
    `<!doctype html><meta charset="utf-8"><title>Loom quickstart</title>${renderToStaticMarkup(rendered.element)}`
  )

  return `revision ${tree.revision}, in quickstart.html`
}

// ── 4. Where the page lives ──────────────────────────────────────────────────
//
// A tree store keeps the page and its history; a hold store keeps changes that
// are waiting for a person. Both are in memory here. `@loom/runtime/postgres`
// implements the same two contracts, and nothing below this line would change.

const store = memoryTreeStore()
const created = await store.create(page)

if (!created.ok) throw new Error(created.error.code)

// ── 5. The part that would be a model ────────────────────────────────────────
//
// An interpreter turns a sentence into a written-down plan. A deployment points
// this at a model. A lookup table is a perfectly good interpreter, and it is
// what keeps this file runnable with no API key: the runtime does not care
// where a proposal came from, only what it says.

const PLANS: Record<string, readonly TreeOperation[]> = {
  "Add a notice to the end of the page.": [
    {
      op: "insert",
      parentId: root.id,
      index: root.children.length,
      node: buildElement(ids, {
        type: "app.notice",
        props: { text: "Nobody typed this line into a file." },
      }),
    },
  ],
  "Make the headline smaller.": [
    { op: "configure", nodeId: headline.id, set: { level: 3 }, unset: [] },
  ],
  "Delete the headline.": [{ op: "remove", nodeId: headline.id }],
}

const interpreter: ChangeInterpreter = {
  interpret: (intent, tree) => {
    const operations = PLANS[intent.utterance]

    return Promise.resolve(
      operations === undefined
        ? err({ code: "refused", detail: "this quickstart only knows three sentences" })
        : ok({
            proposalId: ids.proposalId(),
            intentId: intent.intentId,
            delta: {
              deltaId: ids.deltaId(),
              treeId: tree.treeId,
              baseRevision: tree.revision,
              operations,
            },
            rationale: "planned by a lookup table, where a model would go",
            provenance: {
              origin: intent.origin,
              // Copied from the ask rather than invented — and left out rather
              // than set to undefined, which the runtime counts as different.
              ...(intent.actor === undefined ? {} : { actor: intent.actor }),
              interpreter: "quickstart/table",
              // A computed plan is not a guess, so it is not the model's record.
              authoredBy: "runtime" as const,
              confidence: 1,
              interpretedAt: systemClock.now(),
            },
          })
    )
  },
}

// ── 6. Who is allowed to say yes ─────────────────────────────────────────────
//
// The policy is yours, not the runtime's. This one names the headline worth
// protecting. A real deployment would name its checkout, its prices, its
// consent notice. Everything else is the default.
//
// Watch what one word buys: *reconfiguring* something protected asks a person,
// and *destroying* it is refused outright. Same primitive, two verdicts.

const path: WritePath = {
  store,
  holds: memoryHoldStore(),
  runtime: {
    interpreter,
    policySource: fixedPolicy(
      gatePolicySchema.parse({
        policyId: "quickstart",
        protectedPrimitiveTypes: ["loom.heading"],
      })
    ),
    events: { emit: () => undefined },
    clock: systemClock,
    idFactory: ids,
  },
}

// ── 7. Asking ────────────────────────────────────────────────────────────────
//
// One call. Read the head, plan, judge, and — only if the Gate allowed it —
// append to the log. There is no second route into the page.

/**
 * A write can end seven ways. Three of them are the whole story of the Gate,
 * and the runtime has a sentence ready for the other four.
 */
const explain = (outcome: WriteOutcome): string => {
  switch (outcome.kind) {
    case "committed":
      return `the page is now at revision ${outcome.tree.revision}`
    case "held":
      return `${outcome.held.disposition.reason.detail} — nothing has changed yet`
    case "refused":
      return outcome.disposition.reason.detail
    default:
      return describeWriteOutcome(outcome)
  }
}

const ask = async (utterance: string): Promise<void> => {
  const head = await store.head(page.treeId)

  if (!head.ok) throw new Error(head.error.code)

  const outcome = await commitIntent(path, {
    intentId: ids.intentId(),
    treeId: page.treeId,
    baseRevision: head.value.revision,
    origin: "user-instruction",
    actor: "you",
    utterance,
    observedAt: systemClock.now(),
  })

  console.log(`\n  "${utterance}"`)
  console.log(`   ${outcome.kind} — ${explain(outcome)}`)

  // A held change is not a refused one. It is waiting for a person, and saying
  // yes hands it back to the Gate to be judged again against the page as it now
  // stands — it does not overrule anything.
  if (outcome.kind === "held") {
    const answered = await confirmHeld(path, { proposalId: outcome.held.proposalId, actor: "you" })

    console.log(`   you said yes → ${answered.kind} — ${explain(answered)}`)
  }
}

console.log(`Drew the page: ${draw(page)}`)

await ask("Add a notice to the end of the page.")
await ask("Make the headline smaller.")
await ask("Delete the headline.")

// ── 8. What is on the page now ───────────────────────────────────────────────

const head = await store.head(page.treeId)

if (!head.ok) throw new Error(head.error.code)

console.log(`\nDrew it again: ${draw(head.value)}`)

const log = await store.revisions(page.treeId, { direction: "older", limit: 10 })

if (log.ok) {
  console.log("\nThe log — every change that reached the page, and who asked:")

  for (const entry of log.value.revisions) {
    const verbs = entry.delta.operations.map((operation) => operation.op).join(", ")

    console.log(`   ${entry.revision}. ${verbs} — asked by ${entry.provenance.actor ?? "nobody"}`)
  }
}
