"use client"

import { useEffect, useState, type ReactNode } from "react"

import type { HeldRef } from "../_lib/held"
import * as style from "./style"

/**
 * Content that was not in the page, arriving because it has been earned.
 *
 * This component is mounted only once a gate is open, and that is the whole
 * mechanism: an answer this course holds back is not rendered-and-hidden, it is
 * *absent*, and the fetch below is the first moment it exists in the browser at
 * all. Before that the page carries a URL.
 *
 * The distinction matters more than it sounds. Every test in
 * `lesson-reader.test.tsx` asserts that an answer is not on the screen, and
 * every one of them passed while the answer sat in the flight payload of the
 * same document, one `Ctrl-U` and one `Ctrl-F` away. A lock that governs
 * painting is a lock on the reader's attention, which is exactly the thing the
 * honour system already governs and exactly the thing this surface was built to
 * stop relying on.
 *
 * It is still not secrecy — the address is guessable and the answers are in
 * `lessons/NN-*.md`, which the reader owns. It is the standard the review sets
 * have always met: going to get an answer is a deliberate act, and the document
 * in front of you does not contain one.
 */

/**
 * One request per address, however many slots read from it.
 *
 * Six transcripts unlock together and are six slots of one document; without
 * this they would be six requests for the same file. Keyed by href and kept for
 * the life of the page, because the response is a static build artefact and
 * cannot change under a reader who is mid-lesson.
 */
const documents = new Map<string, Promise<unknown>>()

const documentAt = (href: string): Promise<unknown> => {
  const already = documents.get(href)

  if (already !== undefined) return already

  const fetching = fetch(href).then((response) => {
    if (!response.ok) {
      throw new Error(`${response.status} from ${href}`)
    }

    return response.json() as Promise<unknown>
  })

  documents.set(href, fetching)

  return fetching
}

/** Dropped on failure, so a reader who reloads is not stuck with one bad request. */
const forget = (href: string): void => {
  documents.delete(href)
}

/**
 * The whole memory, dropped.
 *
 * A page has one of these and never needs to clear it — the responses are build
 * artefacts. A test file has one shared by every test in it, which is a
 * different thing: the second test's `fetch` is not called for an address the
 * first test already resolved, and a test asserting *when* a request happens
 * would be reading the previous test's state.
 */
export const forgetHeld = (): void => {
  documents.clear()
}

type State =
  | { readonly kind: "fetching" }
  | { readonly kind: "held"; readonly node: ReactNode }
  | { readonly kind: "failed"; readonly message: string }

export const Held = ({ held, label }: { readonly held: HeldRef; readonly label: string }) => {
  const [state, setState] = useState<State>({ kind: "fetching" })

  useEffect(() => {
    let live = true

    const load = async (): Promise<void> => {
      try {
        /**
         * The renderer is fetched here too, not bundled with the lesson. It
         * carries the starter primitive library, and a page nobody has unlocked
         * anything on has no use for it.
         */
        const [{ renderHeld }, document] = await Promise.all([
          import("../_lib/held-render"),
          documentAt(held.href),
        ])

        if (!live) return

        setState({ kind: "held", node: renderHeld(document, held.slot) })
      } catch (error) {
        forget(held.href)

        if (!live) return

        setState({
          kind: "failed",
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }

    void load()

    return () => {
      live = false
    }
  }, [held.href, held.slot])

  if (state.kind === "held") return <>{state.node}</>

  if (state.kind === "fetching") {
    return (
      <p style={style.note} aria-live="polite">
        {label}&hellip;
      </p>
    )
  }

  return (
    <div style={{ ...style.panel, ...style.column(2) }} aria-live="polite">
      <p style={style.label}>This did not arrive</p>
      <p style={style.note}>
        It is not in the page — it never was, which is the point — and the request for it failed:{" "}
        {state.message}. That is a defect in this surface rather than in your understanding of
        anything. The same words are in the lesson&rsquo;s markdown under `## Answers`, and reloading
        is worth one try before going there.
      </p>
    </div>
  )
}
