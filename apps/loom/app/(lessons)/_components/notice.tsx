"use client"

import Link from "next/link"
import { useState, type ReactNode } from "react"

import type { UnreadableReason } from "../_lib/reading"
import * as style from "./style"
import { useProgress } from "./store"

/**
 * The one thing on this surface whose subject is the browser rather than Loom.
 *
 * It says nothing almost always, and that is the design: a reader whose record
 * is being read and written has no use for a paragraph about storage, and a
 * banner they learn to scroll past is worth less than no banner at all. It
 * speaks in exactly the three situations where **the reader is about to lose
 * something and cannot tell**:
 *
 * - storage refused the read, so nothing this sitting produces will survive it;
 * - storage answered and will not take a write, which is the same loss arriving
 *   from the other direction and is the arrangement that looks most normal —
 *   the page reads as a clean slate and behaves as one until the tab closes;
 * - something is stored, nothing could read it, and the next answer written
 *   would replace it.
 *
 * The third is the reason this component has controls rather than a sentence.
 * A value that is not a record may still be somebody's record — written by a
 * version of this page that no longer exists, or truncated by a browser that
 * ran out of room mid-write — and the only repair available from inside a
 * browser is to hand the string back and let its owner decide. So the page
 * stops writing, shows what is there, and waits. It does not discard the record
 * to unblock itself: it cannot know the string is worthless, and the reader can.
 *
 * It lives in the layout, so it is on the lesson pages too. That is deliberate.
 * Predictions and confidence ratings are written from a lesson, and a lesson is
 * where a reader spends the longest before finding out whether any of it was
 * kept.
 */

const REASONS: Readonly<Record<UnreadableReason, string>> = {
  "storage-blocked":
    "This browser will not let the course store anything — site data is turned off for this address, or the page is inside a frame that blocks it.",
  "not-json": "Something is stored under this course’s key in this browser, and it is not JSON.",
  "not-a-record":
    "Something is stored under this course’s key in this browser. It is JSON, and there is no study history in it — not one field this course writes.",
}

const Panel = ({ children }: { readonly children: ReactNode }) => (
  <section
    role="status"
    aria-label="Your study record"
    style={{
      ...style.panel,
      ...style.column(3),
      background: style.highlightTint,
      borderColor: style.highlightEdge,
    }}
  >
    {children}
  </section>
)

export const RecordNotice = () => {
  const { record, saving, startFresh } = useProgress()
  const [showing, setShowing] = useState(false)
  const { reading } = record

  const held = reading.kind === "unreadable" ? reading.held : undefined

  /**
   * Nothing is wrong, or nothing is wrong *yet*. A write that fails on a full
   * store passes every check at load and only announces itself afterwards, so
   * the saved state is the third thing that can bring this panel out.
   */
  if (reading.kind !== "unreadable" && record.writable && saving !== "lost") return undefined

  if (reading.kind !== "unreadable") {
    return (
      <Panel>
        <h2 style={{ ...style.label, color: style.highlight }}>Nothing is being saved</h2>
        <p style={style.note}>
          {record.writable
            ? "This browser took the record when the page loaded and has just refused it — usually a full store rather than a blocked one."
            : "This browser answered when the page asked what it held, and will not take anything back. The course reads fine and records nothing."}{" "}
          What you have done in this tab is still here and still counts; it will be gone when you
          close it.
        </p>
        <p style={style.note}>
          <Link href="/lessons/record" style={{ color: style.highlight }}>
            Your record
          </Link>{" "}
          can still hand you this sitting as a file, and bring it back in somewhere that will keep
          it.
        </p>
      </Panel>
    )
  }

  return (
    <Panel>
      <h2 style={{ ...style.label, color: style.highlight }}>
        {held === undefined ? "Nothing can be saved here" : "Your record could not be read"}
      </h2>
      <p style={style.note}>{REASONS[reading.reason]}</p>

      {held === undefined ? (
        <p style={style.note}>
          So the review queue is not saying you have done nothing — it is saying it has no way to
          find out. Work through what you like; nothing of it will be here tomorrow.{" "}
          <Link href="/lessons/record" style={{ color: style.highlight }}>
            Your record
          </Link>{" "}
          can still save this sitting as a file.
        </p>
      ) : (
        <>
          <p style={style.note}>
            <strong style={{ color: style.ink }}>Nothing is being saved until you decide.</strong>{" "}
            Whatever that string is, it is the only copy, and the next answer you write would
            replace it. It may still be something the{" "}
            <Link href="/lessons/record" style={{ color: style.highlight }}>
              record page
            </Link>{" "}
            can import — that reading is the more forgiving of the two, and it takes a paste.
          </p>

          <div style={style.row(3)}>
            <button
              type="button"
              onClick={() => setShowing((was) => !was)}
              style={style.button(false)}
              aria-expanded={showing}
            >
              {showing ? "Hide it" : "Show me what is there"}
            </button>
            <button type="button" onClick={startFresh} style={style.button(true)}>
              Discard it and start a new record
            </button>
          </div>

          {showing ? (
            <textarea
              readOnly
              value={held}
              aria-label="What is stored under this course’s key"
              style={{ ...style.textarea, minHeight: "8rem" }}
            />
          ) : undefined}
        </>
      )}
    </Panel>
  )
}
