"use client"

import Link from "next/link"

import { calibrationOf } from "../_lib/calibration"
import { correctionQueue, dueCorrections } from "../_lib/corrections"
import { dueNow, queueFor, type PartLessons, type QueueEntry, type ScheduledSet } from "../_lib/queue"
import { CorrectionsPanel } from "./corrections"
import * as style from "./style"
import { useProgress } from "./store"

/**
 * The tracking table at the bottom of `review-schedule.md`, kept by the thing
 * that already knows the answers.
 *
 * That table has three columns — do it on, done, confident-and-wrong — and every
 * one of them is a fact the reader is asked to work out and write down: what day
 * two days after lesson 09 was, whether they did it, and which questions they
 * were sure about and wrong about. The first is arithmetic, the second is a
 * memory, and the third is a rating they no longer have. None of that is hard,
 * and all of it is why a spacing schedule turns into a document you have read.
 */

type QueueProps = {
  readonly sets: readonly ScheduledSet[]
  readonly parts: PartLessons
}

const BANDS: readonly (readonly [QueueEntry["status"], string, string])[] = [
  ["upcoming", "Coming up", "Not yet. The gap is the mechanism, so arriving early wastes it."],
  [
    "unscheduled",
    "Waiting on a lesson",
    "These have no date until the lesson they follow is worked through.",
  ],
  ["done", "Behind you", ""],
]

const days = (count: number): string => `${count} ${count === 1 ? "day" : "days"}`

const when = (entry: QueueEntry): string => {
  if (entry.status === "due") {
    return entry.overdueBy === 0 ? "due today" : `due ${days(entry.overdueBy)} ago`
  }

  if (entry.status === "upcoming") return `in ${days(entry.inDays ?? 0)}, on ${entry.dueOn}`
  if (entry.status === "done") return "done"

  return entry.set.anchor.kind === "lesson"
    ? `when lesson ${String(entry.set.anchor.lesson).padStart(2, "0")} is done`
    : `when Part ${entry.set.anchor.part} is done`
}

const Row = ({ entry }: { readonly entry: QueueEntry }) => (
  <li style={{ ...style.row(3), justifyContent: "space-between", padding: "var(--loom-spacing-2) 0" }}>
    <Link
      href={`/lessons/review/${entry.set.slug}`}
      style={{ color: style.ink, fontFamily: style.bodyFamily, textDecoration: "none" }}
    >
      <strong>Set {entry.set.letter}</strong> — {entry.set.timing}
    </Link>
    <span style={{ ...style.note, color: entry.status === "due" ? style.inkMuted : style.inkSubtle }}>
      {when(entry)}
    </span>
  </li>
)

export const Queue = ({ sets, parts }: QueueProps) => {
  const { progress, ready, today } = useProgress()

  if (!ready) return <p style={style.note}>Working out what is due&hellip;</p>

  const entries = queueFor(sets, progress, parts, today)
  const calibration = calibrationOf(progress)
  const [next, ...backlog] = dueNow(entries)
  const corrections = dueCorrections(correctionQueue(progress, today))

  return (
    <div style={style.column(6)}>
      {next === undefined ? (
        <p style={style.note}>
          No set is due today. That is the schedule working, not the schedule empty — a set you do
          early is a set you remember instead of retrieve.
          {corrections.length > 0
            ? " Questions you missed are a separate queue and one of them is due; it is below."
            : ""}
        </p>
      ) : (
        <section
          style={{
            ...style.panel,
            ...style.column(3),
            background: style.highlightTint,
            borderColor: style.highlightEdge,
          }}
        >
          <h2 style={{ ...style.label, color: style.highlight }}>Today&rsquo;s sitting</h2>
          <Link
            href={`/lessons/review/${next.set.slug}`}
            style={{ color: style.ink, fontFamily: style.bodyFamily, fontSize: "var(--loom-scale-5)" }}
          >
            Set {next.set.letter} — {next.set.timing}
          </Link>
          <p style={style.note}>
            {next.overdueBy === 0 ? "Due today." : `Due ${days(next.overdueBy)} ago.`} Closed book,
            written answers, about ten minutes.
          </p>
        </section>
      )}

      {/*
        * The other queue, and it is deliberately a separate one. A set comes
        * round once and is then behind you; a question you missed comes round
        * until you have got it three times. Folding the two together would make
        * the second look like a backlog of the first — something to clear —
        * when it is the opposite: the list that is supposed to keep coming back.
        */}
      <CorrectionsPanel />

      {/*
        * Everything else that is late is listed, and listed second. A queue that
        * offered thirteen overdue sets as one afternoon's work would be handing
        * the reader massed practice — the thing this whole schedule exists to
        * avoid — dressed up as catching up.
        */}
      {backlog.length > 0 ? (
        <section style={style.column(2)}>
          <h2 style={style.label}>Also overdue ({backlog.length})</h2>
          <p style={style.note}>
            One sitting a day. Doing six of these this afternoon is massed practice, and it is worth
            less than doing one a day for six days — including the days you would rather not.
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {backlog.map((entry) => (
              <Row key={entry.set.slug} entry={entry} />
            ))}
          </ul>
        </section>
      ) : undefined}

      {BANDS.map(([status, title, blurb]) => {
        const band = entries.filter((entry) => entry.status === status)
        if (band.length === 0) return undefined

        return (
          <section key={status} style={style.column(2)}>
            <h2 style={style.label}>
              {title} ({band.length})
            </h2>
            {blurb === "" ? undefined : <p style={style.note}>{blurb}</p>}
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {band.map((entry) => (
                <Row key={entry.set.slug} entry={entry} />
              ))}
            </ul>
          </section>
        )
      })}

      {calibration.attempts > 0 ? (
        <section style={{ ...style.panel, ...style.column(3) }}>
          <h2 style={style.label}>Your calibration</h2>
          <p style={style.note}>
            {calibration.right} of {calibration.attempts} questions got, across every set you have
            done. What matters in that pair is not the ratio.
          </p>
          <p style={style.note}>
            <strong style={{ color: style.ink }}>
              Confident and wrong: {calibration.confidentAndWrong.length}
            </strong>{" "}
            {calibration.confidentAndWrong.length === 0
              ? "— nothing yet. That is the number to watch, because being sure and wrong is the one that does not fix itself."
              : `— ${calibration.confidentAndWrong
                  .slice(0, 6)
                  .map((miss) => `${miss.set.replace("set-", "set ").toUpperCase()} q${miss.question}`)
                  .join(", ")}. These are first in the corrections queue, and a later go at one does not remove it from this list — being sure and wrong happened.`}
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, ...style.column(1) }}>
            {calibration.bands
              .filter((band) => band.attempts > 0)
              .map((band) => (
                <li key={band.confidence} style={style.note}>
                  Rated {band.confidence}: {band.right} of {band.attempts} got
                </li>
              ))}
          </ul>
        </section>
      ) : undefined}
    </div>
  )
}

/** The one line the index page needs: whether there is anything to do today. */
export const DueSummary = ({ sets, parts }: QueueProps) => {
  const { progress, ready, today } = useProgress()

  if (!ready) return <p style={style.note}>&nbsp;</p>

  const due = dueNow(queueFor(sets, progress, parts, today))
  const corrections = dueCorrections(correctionQueue(progress, today))

  const setsLine =
    due.length === 0
      ? "No set is due for review today. "
      : `Due for review: Set ${due[0]?.set.letter}${
          due.length > 1 ? `, and ${due.length - 1} more behind it` : ""
        }. `

  return (
    <p style={style.note}>
      {setsLine}
      {corrections.length > 0
        ? `${corrections.length} question${
            corrections.length === 1 ? "" : "s"
          } you missed ${corrections.length === 1 ? "has" : "have"} come back. `
        : ""}
      <Link href="/lessons/review" style={{ color: style.highlight }}>
        The review queue
      </Link>
    </p>
  )
}
