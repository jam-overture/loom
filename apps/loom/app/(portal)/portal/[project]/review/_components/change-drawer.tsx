import Link from "next/link"
import type { ReactNode } from "react"

import { GoalChip } from "@/app/(portal)/_components/goal-chip"
import { OutlinePair } from "@/app/(portal)/_components/outline-pair"
import type { Role } from "@/app/(portal)/_lib/auth/roles"
import type { HeldDrawn } from "@/app/(portal)/_lib/held-change"
import {
  expectationWords,
  measuredSentence,
  type Expectation,
} from "@/app/(portal)/_lib/expectation"
import type { Goal } from "@/app/(portal)/_lib/goals/goal"
import type { RequestParts } from "@/app/(portal)/_lib/proposing/brief"
import type { TurnedDown } from "@/app/(portal)/_lib/proposing/turned-down"
import type { QueueRow } from "@/app/(portal)/_lib/queue"
import { toneClasses } from "@/app/(portal)/_lib/vocabulary"
import { plainMoment } from "@/app/(portal)/_lib/when"

import { AnswerControls } from "./answer-controls"

/** Who may say yes to a change of this stake, in words. */
const whoAccepts = (role: Role): string =>
  role === "owner" ? "Only an owner can accept it." : "An approver or an owner can accept it."

/** What the drawer says in place of the two outlines where it does not draw them. */
const NOT_DRAWN: Readonly<Record<Exclude<HeldDrawn["kind"], "drawn">, string>> = {
  conflicts:
    "Not drawn, because the page this change was proposed for is no longer the one your site serves.",
  "not-drawn":
    "Not drawn, because the parts this change names are no longer on the page as Loom has it. Accepting it would be refused for the same reason.",
  unreadable:
    "The page could not be read, so the change is not drawn. Nothing here is a statement about it; try again in a moment.",
}

const Section = ({ title, children }: { readonly title: string; readonly children: ReactNode }) => (
  <section aria-label={title} className="flex flex-col gap-1">
    <h4 className="text-ink-muted m-0 text-xs font-medium">{title}</h4>
    {children}
  </section>
)

const Band = ({
  tone,
  children,
}: {
  readonly tone: "awaiting" | "rejected"
  readonly children: ReactNode
}) => (
  <div role="note" className={`flex flex-col gap-1 rounded-md p-3 text-xs ${toneClasses(tone)}`}>
    {children}
  </div>
)

/** Why a change turned down before is back, and the last change turned down on its page (0341). */
const TurnedDownBand = ({
  again,
  last,
}: {
  readonly again: string
  readonly last: TurnedDown | null
}) => (
  <Band tone="awaiting">
    <span className="font-medium">A change like this was turned down before.</span>
    <span>Loom proposes it again because: {again}</span>
    {last === null ? null : (
      <span>
        The last change turned down on this page, on {plainMoment(new Date(last.at).toISOString())}
        {last.reason === null ? ", gave no reason." : `: “${last.reason}”`}
      </span>
    )}
  </Band>
)

/**
 * Where the change's goal stands on its page, read when the drawer opens:
 * `unplaced` where the goal it serves is no longer one of the project's, and
 * `unreadable` where the goals or the page's counters did not answer.
 */
export type GoalStanding =
  | {
      readonly kind: "read"
      readonly goal: Pick<Goal, "name" | "kind">
      readonly expectation: Expectation
    }
  | { readonly kind: "unplaced" }
  | { readonly kind: "unreadable" }

/** What it expects: where its goal stands, the band a result has to leave, and how it is measured. */
const expectation = (
  row: QueueRow,
  goalsRead: boolean,
  standing: GoalStanding
): readonly string[] => {
  if (!goalsRead)
    return [
      "Which goal this change serves cannot be read here, so neither can what it would be measured on.",
    ]
  if (row.goal === null) return ["It names no goal, so once it is live it is not measured."]

  switch (standing.kind) {
    case "read":
      return expectationWords(standing.goal, standing.expectation)
    case "unplaced":
      return [
        `“${row.goal}” is no longer one of the project's goals, so where it stands on this page is not read here.`,
        measuredSentence(row.goal),
      ]
    case "unreadable":
      return [
        `Where “${row.goal}” stands on this page could not be read. Try again in a moment.`,
        measuredSentence(row.goal),
      ]
  }
}

/**
 * The drawer for one change waiting for review (`docs/portal-wireframes.md`,
 * *2 · For review*), beside the list, its subject in the address (`?change=`).
 *
 * It leads with the goal the change serves (0352) and the change as a heading,
 * then the page and when it was proposed; a band where it matters (amber for a
 * change proposed for an older version that still fits, or one turned down
 * before and proposed again, 0340 and 0341; red for one that no longer fits);
 * the page before and after as two outlines; why Loom proposes it, what it
 * expects (where its goal stands on the page and the band a result has to
 * leave, never a predicted effect), what is at stake and who may accept it; and the answers, with a
 * line on what each does next.
 */
export const ChangeDrawer = ({
  row,
  parts,
  drawn,
  lastTurnedDown,
  acceptedBy,
  goalsRead,
  standing,
  projectId,
  close,
}: {
  readonly row: QueueRow
  readonly parts: RequestParts
  readonly drawn: HeldDrawn
  /** The last change turned down on the page; `null` where there is none or it could not be read. */
  readonly lastTurnedDown: TurnedDown | null
  /** The least role that may accept a change of its stake. */
  readonly acceptedBy: Role
  readonly goalsRead: boolean
  /** Where the goal it serves stands on its page now. */
  readonly standing: GoalStanding
  readonly projectId: string
  /** *For review* without the drawer, every filter kept. */
  readonly close: string
}) => (
  <aside
    aria-label="The change"
    className="border-edge-subtle bg-surface-base flex w-full shrink-0 flex-col self-start rounded-lg border lg:w-[480px]"
  >
    <div className="border-edge-subtle flex items-start justify-between gap-3 border-b px-4 py-3">
      <div className="flex min-w-0 flex-col gap-1">
        {goalsRead && <GoalChip goal={row.goal} />}
        <h3 className="m-0 text-sm font-medium tracking-tight">{parts.change}</h3>
        <span className="text-ink-muted text-xs">
          <Link href={`/portal/${projectId}/pages/${row.pageId}`} className="text-ink-muted">
            {row.page}
          </Link>{" "}
          · proposed {row.since}
          {row.askedBy === null ? null : ` by ${row.askedBy}`}
        </span>
      </div>
      <Link href={close} className="text-ink-muted text-xs no-underline" aria-label="Close">
        ✕
      </Link>
    </div>

    <div className="flex flex-col gap-4 px-4 py-3">
      {row.standingSentence === null ? null : (
        <Band tone={row.standing === "conflicts" ? "rejected" : "awaiting"}>
          {row.standingSentence}
        </Band>
      )}
      {parts.again === null ? null : <TurnedDownBand again={parts.again} last={lastTurnedDown} />}

      <Section title="The page before and after">
        {drawn.kind === "drawn" ? (
          <OutlinePair comparison={drawn.comparison} />
        ) : (
          <p className="text-ink-secondary m-0 max-w-prose text-xs">{NOT_DRAWN[drawn.kind]}</p>
        )}
      </Section>

      <Section title="Why Loom proposes it">
        <p className="m-0 text-xs">
          {parts.why ?? "No figure was recorded with this change. What was asked is its heading."}
        </p>
      </Section>

      <Section title="What it expects">
        {expectation(row, goalsRead, standing).map((words) => (
          <p key={words} className="m-0 text-xs">
            {words}
          </p>
        ))}
      </Section>

      <Section title="At stake">
        <p className="m-0 text-xs">
          {row.stakes.label}. {row.stakes.meaning}
        </p>
        <p className="text-ink-secondary m-0 text-xs">{row.why}</p>
        <p className="text-ink-muted m-0 text-xs">{whoAccepts(acceptedBy)}</p>
      </Section>

      {row.waitsOn === null ? (
        <div className="flex flex-col gap-1.5">
          <AnswerControls
            projectId={projectId}
            proposalId={row.proposalId}
            acceptable={row.standing !== "conflicts"}
          />
          <p className="text-ink-muted m-0 text-xs">
            {row.standing === "conflicts"
              ? "Turning it down lets Loom look at your site's newer version."
              : "Accepting puts it on the live page, and your site has it from its next pull."}
          </p>
        </div>
      ) : (
        <p className="text-ink-muted m-0 text-xs">Waiting on an {row.waitsOn}.</p>
      )}
    </div>
  </aside>
)
