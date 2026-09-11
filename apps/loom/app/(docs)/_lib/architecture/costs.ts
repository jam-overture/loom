import { alternativesFor, type ConsideredAlternative } from "./alternatives"
import { decisionRecord, type DecisionRecord } from "./records"

/**
 * What Loom takes away, in the plainest sentence each one can be put in.
 *
 * The rest of this section explains what the system *is*. This is the same
 * system from the other side: eight things you can no longer do, which is what
 * somebody deciding whether to adopt is actually asking about, and what a
 * framework's own documentation is least inclined to say.
 *
 * Two halves, and the split is the point. **The plain sentence is written
 * here** — it is orientation, it is allowed to be lossy, and no record is
 * obliged to phrase its consequence in a way a stranger can hold. **What was
 * turned down is read from the record**, so the list of roads not taken under
 * each cost is the ruling's own and cannot drift from it.
 *
 * A cost whose record has no alternatives section throws at module load rather
 * than rendering as a heading with nothing under it: the derived half is the
 * half that makes this page worth more than an essay, and a silent empty list
 * would leave the essay looking like evidence.
 */

type CostSource = {
  readonly id: string
  readonly title: string
  /** What it means, before any runtime word is used. */
  readonly plain: string
  /** What you do about it, which is the half that keeps this from being a complaint. */
  readonly instead: string
  readonly record: number
  /** Where on this site it is shown happening, if anywhere does. */
  readonly shownAt?: { readonly href: string; readonly title: string }
}

const SOURCES: readonly CostSource[] = [
  {
    id: "no-generated-code",
    title: "Loom will not write your components",
    plain:
      "The thing most AI tools do — hand you a new component, freshly written — is the one thing Loom does not do. It rearranges and reconfigures the pieces you already built. If a page needs a seating plan and nobody has ever built a seating plan, no amount of asking will produce one.",
    instead:
      "You build it once, in the ordinary way, and register it. After that it is a word anybody can use, for ever. This is the trade the whole framework is: generated code is code nobody read, and what you get for giving it up is a change small enough to review in a few seconds.",
    record: 1,
  },
  {
    id: "the-vocabulary-is-yours",
    title: "A change can only use words that are already yours",
    plain:
      "Every name a change is allowed to say comes off a list you wrote — your heading, your card, your checkout. Asking for something that is not on it does not produce a broken page later; it produces a change that could not be written down in the first place.",
    instead:
      "Add the word. Registering a primitive is a deploy rather than a conversation, so your vocabulary grows at the speed of your release process — which is the speed you already trust.",
    record: 13,
    shownAt: {
      href: "/docs/building-with-loom/primitives",
      title: "Primitives and the registry",
    },
  },
  {
    id: "props-arrive-in-a-bag",
    title: "Your component cannot pass a change's settings straight through",
    plain:
      "A primitive is handed its settings as one object, and it has to read them by name. The familiar one-line shortcut — take everything you were given and spread it onto the element you return — is not available here, because the thing being spread was written by a model and the element it lands on is real HTML.",
    instead:
      "Read the props you declared, and pass on only what you meant to. It is a few more lines in a file you write once, and it is what stops a proposal reaching an attribute nobody designed for it.",
    record: 9,
  },
  {
    id: "a-missing-word-is-a-gap",
    title: "A word your registry has forgotten leaves a gap, and nothing crashes",
    plain:
      "Render a page that names a primitive you did not register and the page still renders. The unknown node is left out and a note is filed saying which one and where. Nothing throws, so nothing wakes anybody up — a page missing a whole section can look completely fine.",
    instead:
      "Read what a render hands back. Every render returns its notes beside the output, and a deployment that ignores them is choosing to find out from a reader instead.",
    record: 8,
    shownAt: {
      href: "/docs/getting-started/rendering-a-tree",
      title: "Rendering a tree",
    },
  },
  {
    id: "stakes-are-yours-to-declare",
    title: "Loom has no idea which parts of your page matter",
    plain:
      "Rewording a heading and changing a price are the same move: one setting, on one node. Nothing in the runtime has heard of your shop, so out of the box it cannot tell those apart, and nothing on your page is protected until you say so.",
    instead:
      "Write the policy. It is the second list you write after the registry, it is usually a few lines long, and it is what turns “an AI can change this page” into “an AI can change these parts of this page”.",
    record: 2,
    shownAt: {
      href: "/docs/building-with-loom/what-ai-may-change",
      title: "What AI may change",
    },
  },
  {
    id: "written-against-one-revision",
    title: "A change is written against one version of the page, and the page will not wait",
    plain:
      "Somebody asks for a change at ten past nine. Between then and the moment it is applied, two other changes land. The first one does not quietly re-aim itself at the page as it now stands — it names the version it was written against, and when that version has moved on, it does not apply.",
    instead:
      "Ask again. That sounds like a cost and is mostly a refusal to guess: a change that re-targets itself is a change nobody reviewed, because the thing that was reviewed is not the thing that would happen.",
    record: 3,
    shownAt: {
      href: "/docs/the-runtime/when-something-looks-wrong",
      title: "When something looks wrong",
    },
  },
  {
    id: "no-rewind",
    title: "There is no rewind",
    plain:
      "Undo does not wind the page back to how it was. It works out the change that would return things to how they were, and then that change goes through everything any other change goes through — including being refused, if it would throw away work somebody has done since.",
    instead:
      "Nothing, usually: an undo is a button like any other, and the difference only shows when it is refused. What you get is a history that only ever grows, so the page can always say who did what and when.",
    record: 32,
    shownAt: {
      href: "/docs/the-runtime/the-history-of-a-page",
      title: "The history of a page",
    },
  },
  {
    id: "no-hand-edits",
    title: "You cannot fix a live page by editing the database",
    plain:
      "The page you can see is worked out from the list of changes that produced it. Reach past that and correct the stored page directly — one quick statement in a database console, the way anybody would — and the page will look right and stop matching its own history. Loom has a check that finds this, and finding it is all it can do.",
    instead:
      "Propose the correction, even from a script. There is one way in and it is the same one a person uses, so the fix arrives as a change with a name on it rather than as a mystery six weeks later.",
    record: 16,
    shownAt: {
      href: "/docs/the-runtime/what-your-app-has-to-do",
      title: "What your app has to do",
    },
  },
]

export type ArchitectureCost = {
  readonly id: string
  readonly title: string
  readonly plain: string
  readonly instead: string
  /** Where the ruling is, and where its reasoning stays. */
  readonly record: DecisionRecord
  /** What that ruling turned down instead, in the record's own words. */
  readonly turnedDown: readonly ConsideredAlternative[]
  readonly shownAt?: { readonly href: string; readonly title: string }
}

const resolve = (source: CostSource): ArchitectureCost => {
  const record = decisionRecord(source.record)

  if (record === undefined) {
    throw new Error(
      `loom: the cost "${source.id}" points at decision record ${source.record}, which does not exist`
    )
  }

  const turnedDown = alternativesFor(source.record)

  if (turnedDown.length === 0) {
    throw new Error(
      `loom: the cost "${source.id}" cites record ${record.id}, whose alternatives could not be read`
    )
  }

  return {
    id: source.id,
    title: source.title,
    plain: source.plain,
    instead: source.instead,
    record,
    turnedDown,
    ...(source.shownAt === undefined ? {} : { shownAt: source.shownAt }),
  }
}

export const ARCHITECTURE_COSTS: readonly ArchitectureCost[] = SOURCES.map(resolve)
