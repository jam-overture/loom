import {
  applyDelta,
  buildElement,
  buildText,
  compareTrees,
  ok,
  sequentialIdFactory,
  textOf,
  walkTree,
  type IdFactory,
  type LoomNode,
  type LoomTree,
  type NodeId,
  type TreeDifference,
} from "@loom/runtime"
import {
  attributeTree,
  auditSnapshot,
  describeStoreError,
  type NodeAttribution,
  type RevisionPage,
  type SnapshotAudit,
  type TreeReader,
} from "@loom/runtime/store"
import { describeHoldError, type WriteOutcome } from "@loom/runtime/write"

import {
  addASentence,
  demoteTheHeading,
  moveTheCardUp,
  quietenTheSentence,
} from "../bench/changes"
import { applied, DANA, heldIn, nodeOfType, openBench, plans, RAVI, type Bench } from "../bench/page"

/**
 * The three questions an operator asks about a page that has already shipped,
 * each answered by asking it.
 *
 * The page this feeds is the first one on the site written for somebody who is
 * not building any more. They have a deployment, something on it looks wrong,
 * and what they need is the call to make — not a description of a call. So
 * nothing below is a scenario written up in prose: one page is opened, five
 * ordinary asks are sent through `commitIntent`, and every row the page prints
 * is what `attributeTree`, `auditSnapshot` and `confirmHeld` said about that
 * history as the page was built.
 *
 * The cost of doing it the other way is the one §4c keeps naming. A table of
 * outcomes typed beside the functions that produce them is right on the day it
 * is written and free to drift afterwards, and the reader who finds out is the
 * one running the command in an incident.
 *
 * **Two of the three answers need something to have gone wrong**, and nothing in
 * the runtime will damage a store on request. Both are staged through
 * `TreeReader`, which is the read half of the store contract and exists exactly
 * so a consumer can be handed something other than a live store. A reader whose
 * snapshot has been edited behind the log's back is what a hand-run `UPDATE`
 * leaves; a reader with a hole in its log is what a restore from two backups
 * leaves. Neither is invented: they are the two ways an audit has anything to
 * report, and staging them is how the page can print the runtime's own verdict
 * on each rather than a sentence about what it would probably say.
 *
 * The store, the asks and the two ways of answering a hold are
 * `../bench/page` — shared with *Answering a held change*, which needs the same
 * deployment and asks it different questions.
 */

/**
 * One insert carrying three nodes, only one of which anybody asked for.
 *
 * This is the ask the attribution table is built around. A card with a sentence
 * in it is one operation and three nodes, so the log says one thing and the
 * tree has three nodes that need explaining — which is the difference between
 * "dana added a card" and "dana added the sentence inside the card she added".
 */
const addACard = plans(
  "One insert. A loom.card at the end of the page, carrying a sentence.",
  (tree, ids) => [
    {
      op: "insert",
      parentId: tree.root.id,
      index: tree.root.children.length,
      node: buildElement(ids, {
        type: "loom.card",
        props: { tone: "surface", padding: "normal" },
        children: [
          buildElement(ids, {
            type: "loom.prose",
            props: { tone: "muted", size: "small" },
            children: [buildText(ids, "Published while the page was live.")],
          }),
        ],
      }),
    },
  ]
)

/**
 * The history every answer on the page is about: three asks, two people.
 *
 * Revision 1 is dana's card, which is one operation and three nodes. Revision 2
 * is ravi touching a node that was on the page before either of them arrived.
 * Revision 3 is dana moving the card she added.
 *
 * Small on purpose. The point is not that a log can be long — it is that three
 * ordinary changes are already enough for "who put this here" to have four
 * different answers.
 */
const buildHistory = async (namespace: string): Promise<Bench> => {
  const bench = await openBench(namespace)

  applied(
    await bench.ask({ actor: DANA, utterance: "add a card at the bottom", interpret: addACard }),
    "the card"
  )
  applied(
    await bench.ask({
      actor: RAVI,
      utterance: "make the opening sentence quieter",
      interpret: quietenTheSentence,
    }),
    "the tone change"
  )
  applied(
    await bench.ask({ actor: DANA, utterance: "move the card to the top", interpret: moveTheCardUp }),
    "the move"
  )

  return bench
}

/**
 * A reader that hands back one revision at a time.
 *
 * Not a fake store — it is the real one, with a page size of one clamped over
 * it, which is a thing a store is allowed to do: a page is where the read
 * stopped, and the contract fixes the order rather than the size. It exists so
 * the page can show `undetermined` happening for real. Attribution is a
 * **bounded** read (five pages by default), and the fourth outcome is what a
 * caller gets when the budget runs out before the answer does — which on a real
 * deployment is a page with years of history, not a page with three revisions.
 */
const oneAtATime = (store: TreeReader): TreeReader => ({
  head: store.head,
  revisions: (treeId, request = {}) => store.revisions(treeId, { ...request, limit: 1 }),
})

export type PlacementOutcome = NodeAttribution["outcome"]

/** One node of the page, and everything the log can say about how it got there. */
export type Placement = {
  readonly nodeId: NodeId
  /** What a reader would call it, rather than what the schema calls it. */
  readonly label: string
  readonly outcome: PlacementOutcome
  /** Who asked for the change that placed it, when a change did. */
  readonly placedBy?: string
  readonly placedAt?: number
  /**
   * Whether the operation named this node or carried it in. The distinction the
   * whole table is for.
   */
  readonly named?: boolean
  /** Everything that happened to it after it was placed, oldest first. */
  readonly since: readonly { readonly effect: string; readonly actor: string; readonly revision: number }[]
}

/**
 * What to call a node in the table, which is its own words and never its
 * children's.
 *
 * `textOf` gathers a whole subtree, so the root would be labelled with every
 * sentence on the page and the card with the sentence inside it — two rows
 * quoting the same words, in a table whose whole job is telling nodes apart.
 * The text a node holds *itself* is the shortest true label there is.
 */
const labelFor = (node: LoomNode): string => {
  if (node.kind === "text") return `“${node.value}”`
  if (node.kind === "slot") return `the ${node.name} slot`

  const own = node.children
    .filter((child) => child.kind === "text")
    .map((child) => textOf(child))
    .join("")
    .trim()

  return own === "" ? node.type : `${node.type} — “${own}”`
}

const actorOf = (attribution: NodeAttribution): string | undefined =>
  attribution.outcome === "placed" ? attribution.placed.entry.provenance.actor : undefined

const sinceOf = (attribution: NodeAttribution): Placement["since"] =>
  attribution.since.map((touch) => ({
    effect: touch.effect,
    actor: touch.entry.provenance.actor ?? "nobody named",
    revision: touch.entry.revision,
  }))

/**
 * Every node on the page, attributed against the real log.
 *
 * Text nodes are dropped from what the page prints, and only from what the page
 * prints: `attributeTree` answers for them too, and a table where every sentence
 * appeared twice — once as the prose element and once as the words inside it —
 * would be a table about the tree's shape rather than about who changed what.
 */
export const producePlacements = async (): Promise<readonly Placement[]> => {
  const bench = await buildHistory("ops")
  const head = await bench.head()
  const attributed = await attributeTree(bench.store, head)

  if (!attributed.ok) {
    throw new Error(`loom: the page could not be attributed — ${describeStoreError(attributed.error)}`)
  }

  return Array.from(walkTree(head.root))
    .filter((node) => node.kind !== "text")
    .flatMap<Placement>((node) => {
      const attribution = attributed.value.nodes.get(node.id)

      if (attribution === undefined) return []

      const actor = actorOf(attribution)

      return [
        {
          nodeId: node.id,
          label: labelFor(node),
          outcome: attribution.outcome,
          ...(actor === undefined ? {} : { placedBy: actor }),
          ...(attribution.outcome === "placed"
            ? { placedAt: attribution.placed.entry.revision, named: attribution.placed.named }
            : {}),
          since: sinceOf(attribution),
        },
      ]
    })
}

/**
 * What a bounded read says when the budget runs out before the answer does.
 *
 * One page of one revision, against a log of three. Produced rather than
 * described, because the number that makes it actionable — `examinedTo`, the
 * oldest revision the walk actually read — is the kind of field a hand-written
 * page gets subtly wrong.
 */
export type BoundedRead = {
  /** How many of the rows above the walk could not reach an answer for. */
  readonly undetermined: number
  readonly examinedTo: number | null
  readonly reachedStart: boolean
}

export const produceBoundedRead = async (): Promise<BoundedRead> => {
  const bench = await buildHistory("ops")
  const head = await bench.head()
  const attributed = await attributeTree(oneAtATime(bench.store), head, { pages: 1 })

  if (!attributed.ok) {
    throw new Error(`loom: the bounded read failed — ${describeStoreError(attributed.error)}`)
  }

  /**
   * Counted over the same nodes the table shows, and not over the tree.
   * `attributeTree` answers for text nodes too; a number that counted them
   * would be right about the tree and unverifiable against the rows a reader is
   * looking at, which is the wrong kind of true for a page.
   */
  const shown = Array.from(walkTree(head.root)).filter((node) => node.kind !== "text")

  const undetermined = shown.filter(
    (node) => attributed.value.nodes.get(node.id)?.outcome === "undetermined"
  )

  return {
    undetermined: undetermined.length,
    examinedTo: attributed.value.examinedTo,
    reachedStart: attributed.value.reachedStart,
  }
}

export type AuditOutcome = SnapshotAudit["outcome"]

/** One thing that can be true of a page and its log, and how the runtime says it. */
export type AuditCase = {
  readonly outcome: AuditOutcome
  /** The situation in a reader's words, not the runtime's. */
  readonly story: string
  /** What an operator does about it. This is the site's half. */
  readonly yourMove: string
  /** The revision the audit reports, where the audit got far enough to have one. */
  readonly revision?: number
  /** How the two trees differ, for the one outcome that can say. */
  readonly differences: readonly TreeDifference[]
  /** The runtime's own account of why a log could not be folded. */
  readonly mismatch?: string
}

/**
 * A reader whose snapshot has been edited behind the log's back.
 *
 * This is a hand-run `UPDATE` on `loom_trees`, or a restore that put the
 * snapshot table back and not the revisions table. The delta is applied to the
 * head and never appended, which is precisely what "the snapshot is not what
 * the log says" means — and the only honest way to produce it, because every
 * door the runtime offers writes to both.
 */
const withEditedSnapshot = (store: TreeReader, head: LoomTree, ids: IdFactory): TreeReader => {
  const edited = applyDelta(head, {
    deltaId: ids.deltaId(),
    treeId: head.treeId,
    baseRevision: head.revision,
    operations: [
      {
        op: "configure",
        nodeId: nodeOfType(head, "loom.card").id,
        set: { tone: "accent" },
        unset: [],
      },
    ],
  })

  if (!edited.ok) {
    throw new Error(`loom: the staged snapshot edit did not apply — ${edited.error.code}`)
  }

  /**
   * The revision number is left where it was, which is the detail that makes
   * this the real failure rather than a different one. An edit that also bumped
   * the count would be caught by the log's own consecutiveness; the one that
   * survives to be found by an audit is the one that changed the page and told
   * nobody.
   */
  const snapshot = edited.value

  return {
    head: () => Promise.resolve(ok({ ...snapshot, revision: head.revision })),
    revisions: store.revisions,
  }
}

/**
 * A reader with a hole in its log: revision 2 is not there.
 *
 * What a restore from two backups taken minutes apart leaves behind. The fold
 * stops at the gap rather than skipping it, because a fold that carried on
 * would produce a tree nobody's history describes and compare it confidently
 * against the snapshot.
 */
const withAGapInTheLog = (store: TreeReader, missing: number): TreeReader => ({
  head: store.head,
  revisions: async (treeId, request) => {
    const page = await store.revisions(treeId, request)

    if (!page.ok) return page

    const kept: RevisionPage = {
      ...page.value,
      revisions: page.value.revisions.filter((entry) => entry.revision !== missing),
    }

    return ok(kept)
  },
})

const auditOf = async (reader: TreeReader, seed: LoomTree): Promise<SnapshotAudit> => {
  const audited = await auditSnapshot(reader, seed.treeId, seed)

  if (!audited.ok) {
    throw new Error(`loom: the audit could not read the store — ${describeStoreError(audited.error)}`)
  }

  return audited.value
}

const STORIES: Record<AuditOutcome, { readonly story: string; readonly yourMove: string }> = {
  agrees: {
    story: "Nothing is wrong. The log replays to exactly the page that is being served.",
    yourMove:
      "Nothing. This is the answer you want from a scheduled audit, and the reason to run one on a schedule is so that the day it says something else, you find out from a job rather than from a reader.",
  },
  diverged: {
    story:
      "Somebody changed the page without going through the runtime — a hand-run UPDATE, or a restore that put one table back and not the other.",
    yourMove:
      "The log is the one that is right. Read the differences, decide whether the edit was wanted, and if it was, ask for it properly so it lands as a revision with a name on it.",
  },
  unreplayable: {
    story:
      "The log itself cannot be folded: an entry is missing, or one of them no longer applies to the tree the entry before it produced.",
    yourMove:
      "Stop and get the log back before anything else. This is the one failure where the snapshot may be the only intact copy of the page, and an audit cannot tell you whether it is right.",
  },
}

/**
 * The three things an audit can say, each produced by an audit.
 *
 * `Record<AuditOutcome, …>` on the stories is the same guard `endings.ts` uses:
 * a fourth outcome in the runtime stops this file compiling rather than
 * quietly leaving a page with three sections.
 */
export const produceAudits = async (): Promise<readonly AuditCase[]> => {
  const bench = await buildHistory("ops")
  const head = await bench.head()
  const ids = sequentialIdFactory("opsaudit")

  const audits: readonly SnapshotAudit[] = [
    await auditOf(bench.store, bench.seed),
    await auditOf(withEditedSnapshot(bench.store, head, ids), bench.seed),
    await auditOf(withAGapInTheLog(bench.store, 2), bench.seed),
  ]

  return audits.map((audit) => {
    const told = STORIES[audit.outcome]

    if (audit.outcome === "unreplayable") {
      return {
        outcome: audit.outcome,
        ...told,
        differences: [],
        mismatch:
          audit.mismatch.code === "revision-gap"
            ? `revision-gap: expected ${audit.mismatch.expected}, found ${audit.mismatch.found}`
            : `delta-rejected at revision ${audit.mismatch.revision}: ${audit.mismatch.detail}`,
      }
    }

    return {
      outcome: audit.outcome,
      ...told,
      revision: audit.revision,
      differences: audit.outcome === "diverged" ? compareTrees(audit.replayed, audit.stored) : [],
    }
  })
}

/**
 * A change that waited while the page moved on, and what answering it does.
 *
 * The sequence is the ordinary one and that is the point: the Gate holds a
 * change, somebody else's change lands first, and the person who was asked
 * finally clicks yes. Everything below is what the runtime did about that,
 * including the sentence it produced.
 */
export type WaitingTooLong = {
  /** How many changes were waiting for a person before the page moved. */
  readonly queuedBefore: number
  /** The revision the held change was judged against. */
  readonly heldAgainst: number
  /** Where the page had got to by the time somebody answered. */
  readonly headWhenAnswered: number
  /** The ending `confirmHeld` reached. */
  readonly kind: WriteOutcome["kind"]
  /** The runtime's own account of it. */
  readonly said: string
  /** How many changes are waiting afterwards. */
  readonly queuedAfter: number
}

const saidAbout = (outcome: WriteOutcome): string => {
  if (outcome.kind === "not-written") return describeStoreError(outcome.error)
  if (outcome.kind === "not-answerable") return describeHoldError(outcome.error)

  throw new Error(`loom: a stale answer was expected to fail, and it ended ${outcome.kind}`)
}

export const produceWaitingTooLong = async (): Promise<WaitingTooLong> => {
  const bench = await buildHistory("opshold")

  const held = heldIn(
    await bench.ask({
      actor: RAVI,
      utterance: "make the title smaller",
      interpret: demoteTheHeading,
    }),
    "the change nobody answered"
  )

  const queuedBefore = (await bench.waiting()).length

  applied(
    await bench.ask({ actor: DANA, utterance: "add a sentence at the end", interpret: addASentence }),
    "the change that landed first"
  )

  const headWhenAnswered = (await bench.head()).revision
  const answered = await bench.confirm(held.proposalId, DANA)

  return {
    queuedBefore,
    heldAgainst: held.baseRevision,
    headWhenAnswered,
    kind: answered.kind,
    said: saidAbout(answered),
    queuedAfter: (await bench.waiting()).length,
  }
}
