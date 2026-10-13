import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"

import { sequentialIdFactory } from "../../src/ids.js"
import { colour, family, monospace, size, space } from "../../src/primitives/tokens.js"
import type { LoomPrimitiveProps } from "../../src/render/primitive.js"
import { THEME_PROP_KEY } from "../../src/reserved-props.js"
import { fixedPolicy } from "../../src/runtime/policy-source.js"
import { defaultGatePolicy } from "../../src/runtime/policy.js"
import type { Provenance } from "../../src/runtime/proposal.js"
import { definePrimitive } from "../../src/sdk/definition.js"
import { memoryTreeStore } from "../../src/store/memory.js"
import { collectingEventSink, FIXED_INSTANT, fixedClock } from "../../src/testing/doubles.js"
import { sampleTree } from "../../src/testing/fixtures.js"
import { themeSelectionSchema, type ThemeSelection } from "../../src/theme/theme.js"
import { applyOperation } from "../../src/tree/apply.js"
import { buildElement, buildText } from "../../src/tree/builders.js"
import { memoryHoldStore } from "../../src/write/held.js"
import { describeReseedOutcome, reseedPage, type ReseedOutcome } from "../../src/write/reseed.js"
import { createTree, withRoot, type LoomTree } from "../../src/tree/tree.js"

import { defineSpecimen, WIDE } from "./specimen.js"

/**
 * The same call, on two pages, and the Gate deciding who has to press it.
 *
 * `planReseed` could say *here are the operations that put this page back* since
 * 0268, and nothing proposed them. `Loom marketing` filed the gap on 12 October
 * with one question attached: **who presses it** — only a person, every deploy,
 * or a button beside the page's history.
 *
 * This is the answer, and the point of the picture is that it is not a switch.
 * Both columns are one `reseedPage` call with the same `origin: "developer"` —
 * the origin with the most latitude of the four. What differs is only what the
 * log behind each page holds, and the Gate reads that:
 *
 * - **left**, nobody has edited the stored page, so the reseed takes nothing
 *   away from anybody and applies;
 * - **right**, somebody accepted an edit through the portal, so the reseed
 *   declares the revision it would overwrite and is **held** for a person.
 *
 * A deploy step may therefore call this on every release and still cannot
 * quietly discard an editor's change — 0035 made discarded work a rule rather
 * than a level precisely so that the safety does not depend on who asked.
 *
 * **Nothing in either column is typed into this file.** Both run `reseedPage`
 * against a real `memoryTreeStore` with a real hold store in front of it, at
 * module load, and print the outcome that comes back. Take the log read out of
 * the write path and the right-hand column turns into the left one.
 */

const spare = sequentialIdFactory("shot")

const provenance: Provenance = {
  origin: "user-instruction",
  interpreter: "test",
  authoredBy: "model",
  confidence: 0.9,
  interpretedAt: FIXED_INSTANT,
}

const { ids } = sampleTree()

/** The builder in the repository, edited: a new headline where the old one was. */
const authored = (): LoomTree => {
  const start = sampleTree().tree
  const edited = applyOperation(start.root, {
    op: "configure",
    nodeId: ids.headline,
    set: { value: "A headline the repository now carries" },
    unset: [],
  })

  if (!edited.ok || edited.value.kind !== "element") throw new Error("authored")

  return withRoot(start, edited.value)
}

type Run = {
  readonly outcome: ReseedOutcome
  readonly head: number
}

/**
 * Seeds the page, optionally lets somebody edit it, then presses the reseed.
 *
 * The head is read *after* the call rather than before, because the left column
 * and the right one differ in exactly that number: one moved and one did not.
 */
const pressed = async (editedInThePortal: boolean): Promise<Run> => {
  const { tree } = sampleTree()
  const store = memoryTreeStore()
  await store.create(tree)

  if (editedInThePortal) {
    const appended = await store.append(tree.treeId, {
      proposalId: spare.proposalId(),
      delta: {
        deltaId: spare.deltaId(),
        treeId: tree.treeId,
        baseRevision: 0,
        operations: [
          {
            op: "configure",
            nodeId: ids.headline,
            set: { value: "A headline an editor wrote" },
            unset: [],
          },
        ],
      },
      provenance,
      appliedAt: FIXED_INSTANT,
    })
    if (!appended.ok) throw new Error(appended.error.code)
  }

  const outcome = await reseedPage(
    {
      store,
      holds: memoryHoldStore(),
      runtime: {
        interpreter: { interpret: () => Promise.reject(new Error("interpreted")) },
        policySource: fixedPolicy(defaultGatePolicy),
        events: collectingEventSink(),
        clock: fixedClock(),
        idFactory: spare,
      },
    },
    { treeId: tree.treeId, authored: authored(), origin: "developer", actor: "maintainer" }
  )

  const head = await store.head(tree.treeId)
  if (!head.ok) throw new Error(head.error.code)

  return { outcome, head: head.value.revision }
}

const UNTOUCHED = await pressed(false)
const EDITED = await pressed(true)

const LABEL: CSSProperties = {
  display: "block",
  marginBottom: space(2),
  fontFamily: family("body"),
  fontSize: size(1),
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: colour("fg-subtle"),
}

const LISTING: CSSProperties = {
  margin: 0,
  fontFamily: monospace(),
  fontSize: size(2),
  lineHeight: 1.7,
  color: colour("fg-default"),
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
}

const block = (label: string, body: string, key: string): ReactNode =>
  createElement(
    "div",
    { key, style: { marginBottom: space(4) } },
    createElement("span", { style: LABEL }, label),
    createElement("p", { style: LISTING }, body)
  )

/** What the Gate said, when it got as far as saying anything. */
const dispositionOf = (outcome: ReseedOutcome): readonly [string, string] => {
  if (outcome.kind === "held") {
    return [outcome.held.disposition.kind, outcome.held.disposition.reason.code]
  }

  return outcome.kind === "committed" || outcome.kind === "refused"
    ? [outcome.disposition.kind, outcome.disposition.reason.code]
    : ["—", "—"]
}

const declaredIn = (outcome: ReseedOutcome): string => {
  const discards =
    outcome.kind === "held"
      ? outcome.held.proposal.discards
      : outcome.kind === "committed"
        ? outcome.proposal.discards
        : undefined

  return discards === undefined || discards.length === 0
    ? "nothing — the log was read and no entry touched these nodes"
    : discards
        .map((work) => `revision ${work.revision} (${work.nodeIds.length} node)`)
        .join(", ")
}

const rationaleOf = (outcome: ReseedOutcome): string =>
  outcome.kind === "held"
    ? outcome.held.proposal.rationale
    : outcome.kind === "committed"
      ? outcome.proposal.rationale
      : describeReseedOutcome(outcome)

type Side = "untouched" | "edited"

const sideSchema = z.object({ side: z.enum(["untouched", "edited"]) })

const panel = definePrimitive({
  type: "spec.pressed",
  description: "One reseedPage call, on a page nobody edited or on a page somebody did.",
  props: sideSchema,
  component: ({ props }: LoomPrimitiveProps<{ side: Side }>) => {
    const run = props.side === "untouched" ? UNTOUCHED : EDITED
    const [kind, reason] = dispositionOf(run.outcome)

    return createElement(
      "div",
      null,
      block("how the call ended", run.outcome.kind, "kind"),
      block("what the Gate decided", `${kind}\n  because ${reason}`, "gate"),
      block("what it declared it would overwrite", declaredIn(run.outcome), "discards"),
      block("the page afterwards", `head is revision ${run.head}`, "head"),
      block("what a reviewer is shown", rationaleOf(run.outcome), "rationale")
    )
  },
})

const column = (
  idFactory: ReturnType<typeof sequentialIdFactory>,
  heading: string,
  note: string,
  which: Side
) =>
  buildElement(idFactory, {
    type: "loom.card",
    props: { tone: "surface", padding: "loose" },
    children: [
      buildElement(idFactory, {
        type: "loom.heading",
        props: { level: 3 },
        children: [buildText(idFactory, heading)],
      }),
      buildElement(idFactory, {
        type: "loom.prose",
        props: { tone: "muted", size: "small" },
        children: [buildText(idFactory, note)],
      }),
      buildElement(idFactory, { type: "spec.pressed", props: { side: which } }),
    ],
  })

const build = (theme: ThemeSelection) => {
  const idFactory = sequentialIdFactory()

  const section = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "Specimen", width: "wide" },
    children: [
      buildElement(idFactory, {
        type: "loom.heading",
        props: { level: 1, balance: true },
        children: [buildText(idFactory, "The same reseed, and the Gate deciding who presses it")],
      }),
      buildElement(idFactory, {
        type: "loom.prose",
        props: { size: "lead" },
        children: [
          buildText(
            idFactory,
            "One reseedPage call, the same edited builder, the same origin — developer, the one with the most latitude of the four. The only difference is what the log behind each page holds. On the left nobody has edited the stored page, so the reseed takes nothing from anybody and applies. On the right somebody accepted an edit through the portal, so the reseed declares the revision it would overwrite and waits for a person. Nobody chose that; the cost of the change did."
          ),
        ],
      }),
      buildElement(idFactory, {
        type: "loom.grid",
        props: { columns: "two", gap: "loose" },
        children: [
          column(
            idFactory,
            "A page nobody has edited",
            "Seeded and left alone — the state of every page on a deployment nobody has used the portal on.",
            "untouched"
          ),
          column(
            idFactory,
            "A page somebody edited",
            "One accepted change in the log, on the same node the reseed is about to write.",
            "edited"
          ),
        ],
      }),
    ],
  })

  return createTree(
    buildElement(idFactory, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide" },
      children: [section],
    }),
    idFactory
  )
}

export default defineSpecimen({
  name: "reseed-pressed",
  title: "The same reseed, and the Gate deciding who presses it",
  build,
  primitives: [panel],
  viewports: [WIDE],
  themes: [
    {
      label: "editorial",
      selection: themeSelectionSchema.parse({
        palette: "editorial",
        fontPack: "editorial-serif",
        stylePreset: "comfortable",
      }),
    },
  ],
})
