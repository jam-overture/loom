"use client"

import { useState } from "react"

import type { Progress } from "../_lib/progress"
import {
  describeMerge,
  mergeRecords,
  packRecord,
  summariseRecord,
  unpackRecord,
  type MergeReport,
} from "../_lib/record"
import * as style from "./style"
import { useProgress } from "./store"

/**
 * The one page on this surface that is about the record rather than the course.
 *
 * Everything else here asks the reader a question. This asks them to make a copy
 * of what their answers have added up to, because the surface has quietly become
 * the only place several months of that exists — and it exists in a browser
 * profile, which is a thing people clear.
 *
 * Two rules hold the design together:
 *
 * 1. **Nothing on this page is an answer.** The record is shown as counts and
 *    dates. The reader has missed questions that are coming back, and a page
 *    that printed what they wrote last time would be the corrections queue
 *    answering itself. The one place the raw record appears is behind a control
 *    that says what it is about to show and why that costs something.
 * 2. **An import is checked before it is applied.** It says what it would bring
 *    in and what is already here, and then waits. A merge is not reversible from
 *    inside the page, and the number it could quietly inflate — how many times a
 *    missed question has been retrieved — is the number that decides when the
 *    course stops asking it.
 */

type Pending = {
  readonly progress: Progress
  readonly report: MergeReport
  readonly from: string
}

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`

/** A day, said the way a sentence says one. Dates are stored sortable, not read. */
const day = (on: string | undefined): string => on ?? "—"

const FILENAME = (on: string): string => `loom-lessons-${on}.json`

const listed = (
  counted: readonly (readonly [number, string, string])[]
): readonly string[] =>
  counted.filter(([count]) => count > 0).map(([count, one, many]) => plural(count, one, many))

const bringing = (report: MergeReport): readonly string[] =>
  listed([
    [report.lessons.added, "lesson", "lessons"],
    [report.attempts.added, "answer", "answers"],
    [report.predictions.added, "prediction", "predictions"],
    [report.corrections.added, "correction", "corrections"],
  ])

const alreadyHere = (report: MergeReport): readonly string[] =>
  listed([
    [report.lessons.alreadyHeld, "lesson", "lessons"],
    [report.attempts.alreadyHeld, "answer", "answers"],
    [report.predictions.alreadyHeld, "prediction", "predictions"],
    [report.corrections.alreadyHeld, "re-answer", "re-answers"],
  ])

export const StudyRecord = () => {
  const { progress, ready, today, update } = useProgress()
  const [pending, setPending] = useState<Pending | undefined>(undefined)
  const [problem, setProblem] = useState<string | undefined>(undefined)
  const [done, setDone] = useState<string | undefined>(undefined)
  const [showing, setShowing] = useState(false)
  const [pasted, setPasted] = useState("")

  if (!ready) return <p style={style.note}>Reading what this browser holds&hellip;</p>

  const summary = summariseRecord(progress)
  const held = packRecord(progress, today)
  const asText = JSON.stringify(held, undefined, 2)
  const empty = summary.days === 0

  const check = (text: string, from: string): void => {
    setDone(undefined)
    setPending(undefined)

    const parsed = ((): unknown => {
      try {
        return JSON.parse(text) as unknown
      } catch {
        return undefined
      }
    })()

    if (parsed === undefined) {
      setProblem("That is not JSON. A record is the file this page saves, or the text you copied out of it.")

      return
    }

    const incoming = unpackRecord(parsed)

    if (incoming === undefined) {
      setProblem(
        "That is JSON, but there is no study history in it — no lessons, no sittings, no corrections. Nothing has been changed."
      )

      return
    }

    setProblem(undefined)
    /**
     * Emptied the moment it parses, because a pasted record is a screenful of
     * the answers in it — the reader's own, but to questions this course is
     * about to ask them again. It stays put when it does not parse, since then
     * it is something to correct rather than something to look away from.
     */
    setPasted("")
    setPending({ progress: incoming, report: describeMerge(progress, incoming), from })
  }

  const apply = (): void => {
    if (pending === undefined) return

    const brought = bringing(pending.report)

    update((state) => mergeRecords(state, pending.progress))
    setPending(undefined)
    setDone(
      brought.length === 0
        ? "Merged. Nothing in it was new, which is what a second import of the same file should do."
        : `Merged: ${brought.join(", ")} brought in. Your review queue and your corrections have been recomputed from the result.`
    )
  }

  /**
   * The file, saved. `createObjectURL` is missing in enough places — an old
   * browser, a locked-down one, a test environment — that the text below it is
   * not a fallback so much as the other half: if this does nothing, the record
   * is still on the page and still copyable, which is the property that actually
   * matters.
   */
  const save = (): void => {
    if (typeof URL.createObjectURL !== "function") {
      setShowing(true)

      return
    }

    const url = URL.createObjectURL(new Blob([asText], { type: "application/json" }))
    const anchor = document.createElement("a")

    anchor.href = url
    anchor.download = FILENAME(today)
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={style.column(6)}>
      <section style={{ ...style.panel, ...style.column(3) }} aria-label="What this browser holds">
        <h2 style={style.label}>What this browser holds</h2>

        {empty ? (
          <p style={style.note}>
            Nothing yet. Work through a lesson or a review set and there will be something here worth
            keeping — which is the point at which this page stops being informational.
          </p>
        ) : (
          <>
            <p style={style.note}>
              <strong style={{ color: style.ink }}>
                {plural(summary.lessons, "lesson", "lessons")} worked through
              </strong>
              , {plural(summary.sets, "review sitting", "review sittings")},{" "}
              {plural(summary.attempts, "written answer", "written answers")},{" "}
              {plural(summary.predictions, "prediction", "predictions")} and{" "}
              {plural(summary.corrections, "re-answer", "re-answers")} — across{" "}
              {plural(summary.days, "day", "days")}, between {day(summary.firstDay)} and{" "}
              {day(summary.lastDay)}.
            </p>
            <p style={style.note}>
              {summary.confidentAndWrong === 0
                ? "Nothing confident and wrong yet."
                : `${plural(summary.confidentAndWrong, "answer", "answers")} you were sure about and wrong about.`}{" "}
              That number is the one thing here you cannot get back by working harder: it is a rating
              you gave before you knew, and it only exists because something recorded it at the
              moment it was honest.
            </p>
          </>
        )}

        <p style={style.note}>
          None of this has been sent anywhere. It is in this browser, under one key, and nowhere
          else — so clearing site data for this domain deletes it, and the same course opened on
          another machine starts from nothing and will offer you sets you have already done.
        </p>
      </section>

      <section style={style.column(3)} aria-label="Save a copy">
        <h2 style={style.label}>Save a copy</h2>
        <p style={style.note}>
          A JSON file you keep. It is the whole record, including what you wrote, which is why it is
          a file rather than an upload.
        </p>

        <div style={style.row(3)}>
          <button type="button" onClick={save} style={style.button(true)} disabled={empty}>
            Save a copy
          </button>
          <button
            type="button"
            onClick={() => setShowing((was) => !was)}
            style={style.button(false)}
            aria-expanded={showing}
            disabled={empty}
          >
            {showing ? "Hide it" : "Show it as text"}
          </button>
        </div>

        {showing ? (
          <div style={style.column(2)}>
            <p style={style.note}>
              This is the record itself, and it contains the answers you have written —{" "}
              <strong style={{ color: style.ink }}>
                including to questions that are coming back
              </strong>
              . Reading it is a way of looking up an answer you are about to be asked for, which is
              the one thing the rest of this surface is built to make you not do. Copy it; try not to
              read it.
            </p>
            <textarea
              readOnly
              value={asText}
              aria-label="Your record, as text"
              style={{ ...style.textarea, minHeight: "12rem" }}
            />
          </div>
        ) : undefined}
      </section>

      <section style={style.column(3)} aria-label="Bring a record in">
        <h2 style={style.label}>Bring one in</h2>
        <p style={style.note}>
          A record from another browser is merged, not pasted over this one: a later answer to a
          question replaces an earlier one, a lesson keeps the earlier day you worked through it,
          and re-answers are added up rather than overwritten. Importing the same file twice does
          nothing the second time.
        </p>

        <label style={{ ...style.note, ...style.column(2) }}>
          A file you saved
          <input
            type="file"
            accept="application/json,.json"
            aria-label="A record file"
            onChange={(event) => {
              const file = event.target.files?.[0]

              if (file === undefined) return

              void file.text().then(
                (text) => check(text, file.name),
                () => setProblem("That file could not be read.")
              )
            }}
          />
        </label>

        <label style={{ ...style.note, ...style.column(2) }}>
          Or paste one — which puts a record, answers and all, on the screen until it is checked.
          The file above does not.
          <textarea
            value={pasted}
            onChange={(event) => setPasted(event.target.value)}
            aria-label="A record, as text"
            style={{ ...style.textarea, minHeight: "6rem" }}
          />
        </label>

        <div style={style.row(3)}>
          <button
            type="button"
            onClick={() => check(pasted, "what you pasted")}
            style={style.button(false)}
            disabled={pasted.trim() === ""}
          >
            Check it
          </button>
        </div>

        {problem === undefined ? undefined : (
          <p style={{ ...style.note, color: style.ink }} role="alert">
            {problem}
          </p>
        )}

        {pending === undefined ? undefined : (
          <div
            style={{
              ...style.panel,
              ...style.column(3),
              background: style.highlightTint,
              borderColor: style.highlightEdge,
            }}
          >
            <h3 style={{ ...style.label, color: style.highlight }}>From {pending.from}</h3>
            {pending.report.nothingNew ? (
              <p style={style.note}>
                Everything in it is already here. Merging it would change nothing, and you can do it
                anyway.
              </p>
            ) : (
              <p style={style.note}>
                Brings in {bringing(pending.report).join(", ")}.
                {alreadyHere(pending.report).length === 0
                  ? ""
                  : ` Already here: ${alreadyHere(pending.report).join(", ")}.`}
              </p>
            )}
            <div style={style.row(3)}>
              <button type="button" onClick={apply} style={style.button(true)}>
                Merge it into this record
              </button>
              <button type="button" onClick={() => setPending(undefined)} style={style.button(false)}>
                Leave it
              </button>
            </div>
          </div>
        )}

        {done === undefined ? undefined : (
          <p style={{ ...style.note, color: style.ink }} role="status">
            {done}
          </p>
        )}
      </section>
    </div>
  )
}
