"use client"

import { useState } from "react"

import type { LessonPointer } from "../_lib/links"
import { lessonWorkedThrough, withLessonWorkedThrough } from "../_lib/progress"
import * as style from "./style"
import { today, useProgress } from "./store"

/**
 * When each lesson was worked through — the one fact the queue cannot derive.
 *
 * Everything else on this surface follows from a date: a set is due two days
 * after its lesson, a part is finished when its last lesson is. Nothing can
 * observe that a person read something and understood it, so this is asked for
 * plainly rather than inferred from a page view, which would schedule reviews
 * for a tab somebody opened and closed.
 *
 * Backdating is allowed, and has to be: a reader who worked through four lessons
 * before this page existed would otherwise be told all four reviews are due on
 * the same day, which is the massed practice the course is built to avoid.
 */

export const LessonLog = ({ lessons }: { readonly lessons: readonly LessonPointer[] }) => {
  const { progress, ready, update } = useProgress()
  const [editing, setEditing] = useState<number | undefined>(undefined)

  if (!ready) return <p style={style.note}>Reading your progress&hellip;</p>

  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, ...style.column(3) }}>
      {lessons.map((lesson) => {
        const on = lessonWorkedThrough(progress, lesson.number)

        return (
          <li key={lesson.number} style={{ ...style.column(2), borderBlockEnd: `1px solid ${style.edge}`, paddingBlockEnd: "var(--loom-spacing-3)" }}>
            <div style={{ ...style.row(3), justifyContent: "space-between" }}>
              <a
                href={lesson.href}
                style={{ color: style.ink, fontFamily: style.bodyFamily, textDecoration: "none" }}
              >
                <strong>{String(lesson.number).padStart(2, "0")}</strong> — {lesson.title}
              </a>
              <span style={style.note}>{on === undefined ? "not yet" : `worked through ${on}`}</span>
            </div>

            <div style={style.row(2)}>
              {on === undefined ? (
                <button
                  type="button"
                  style={style.button(false)}
                  onClick={() => update((state) => withLessonWorkedThrough(state, lesson.number, today()))}
                >
                  I worked through this today
                </button>
              ) : (
                <button
                  type="button"
                  style={{ ...style.button(false), color: style.inkMuted }}
                  onClick={() => update((state) => withLessonWorkedThrough(state, lesson.number, undefined))}
                >
                  Clear
                </button>
              )}

              {editing === lesson.number ? (
                <input
                  type="date"
                  defaultValue={on ?? today()}
                  max={today()}
                  style={{ ...style.button(false), cursor: "text" }}
                  onChange={(event) => {
                    const value = event.target.value
                    if (value === "") return

                    update((state) => withLessonWorkedThrough(state, lesson.number, value))
                    setEditing(undefined)
                  }}
                />
              ) : (
                <button
                  type="button"
                  style={{ ...style.button(false), color: style.inkMuted }}
                  onClick={() => setEditing(lesson.number)}
                >
                  {on === undefined ? "It was earlier" : "Change the date"}
                </button>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
