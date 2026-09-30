"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { describeRenderDiagnostic, renderLoomTree } from "@jam-overture/loom/react"

import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import type { Version } from "@/app/(portal)/_lib/progression"
import { portalRegistry } from "@/app/(portal)/_lib/registry"
import { versionHeading } from "@/app/(portal)/_lib/version"

import { VersionNote } from "./version-note"

/**
 * A page, at every version it has been, with a way to watch it get there.
 *
 * ## Why this is the clearest thing Loom can show anybody
 *
 * The maintainer asked for it in those terms — *"seeing a progression of the
 * history, almost like I am watching a movie of it changing and morphing would be
 * cool"* — and `docs/portal.md` phase 3 takes him at his word and says why it is
 * more than a nice screen: **a page that was never written, seen becoming
 * itself.** Nothing in this ecosystem can draw it. There is no markup in any
 * repository to check out at an old commit; `git log` has never seen this page;
 * the build log has one version of it. The states only exist as a record of
 * changes, and the only way to look at one is to fold the record and draw the
 * result.
 *
 * ## Two rules it must not break, both from the plan
 *
 * **It must not smooth.** A version is a discrete state and anything between two
 * of them is a picture of something that never existed. So there is no
 * transition, no cross-fade and no tween anywhere near the stage: a step
 * replaces the drawing. `version-player.test.tsx` pins that as a property rather
 * than as taste, because a cross-fade is the first thing anybody would reach for
 * to make this feel finished.
 *
 * **It must not silently skip.** A version the record cannot rebuild is named in
 * place by the screen above, which is where it belongs — the player is handed
 * the versions that exist and never a gap to step over.
 *
 * ## Where it starts, and the one obvious action
 *
 * It opens on the **newest** version, because that is the page a reader
 * recognises: the one being served. Opening on version 0 would answer a question
 * nobody asked yet and make a reader work out which end they were at.
 *
 * So the primary action is not "play" in the middle of a timeline, it is
 * **watch it change**: it jumps to the oldest version this screen holds and runs
 * forward to the newest. One button, one obvious thing to press, and pressing it
 * does the thing the screen is for — which is the test every screen in this
 * portal is now held to. It is a single button through all three of its states
 * rather than a play and a stop side by side, because a reader who has just
 * pressed a thing looks for the way to undo it where they pressed.
 *
 * ## Every frame is already here
 *
 * The trees arrive with the page and the drawing happens in the browser, which is
 * the same decision `picked-parts.tsx` argues at length and the only one that can
 * be played at all: a round trip per frame is a slideshow that buffers. It is
 * available because the render seam is pure — `renderLoomTree` is a total
 * projection over a tree in memory, 0008 makes it degrade rather than throw, and
 * the primitives this deployment registers are plain components over plain props.
 * 0018 is satisfied because this reaches the framework exactly where a host does.
 *
 * The options are the page screen's own — `resolver` and `validator`, nothing
 * else — for the reason `PageThumbnail` gives: a picture that resolves more than
 * the preview it sits beside would show a reader something the page does not.
 */

/**
 * How long one version stays on screen while it is playing.
 *
 * Slow enough to read a heading change and fast enough that eight versions is
 * not a wait. Pressing a step button while it plays stops it, so this is the
 * pace of the thing playing itself and never the pace of anything a reader is
 * doing by hand.
 */
const FRAME_MS = 900

const STEP =
  "border-edge-subtle text-ink-secondary hover:bg-surface-hover hover:text-ink " +
  "disabled:text-ink-placeholder disabled:hover:bg-transparent rounded-md border px-2.5 py-1 text-sm disabled:cursor-not-allowed"

export const VersionPlayer = ({
  versions,
  newest,
}: {
  /** Oldest first, contiguous, never empty. */
  readonly versions: readonly Version[]
  /** The highest version the page's record names, which may be one this screen does not hold. */
  readonly newest: number
}) => {
  const last = versions.length - 1
  const [at, setAt] = useState(last)
  const [playing, setPlaying] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  const stop = useCallback(() => setPlaying(false), [])

  useEffect(() => {
    if (!playing) return

    timer.current = setInterval(() => {
      setAt((was) => {
        if (was >= last) {
          setPlaying(false)

          return was
        }

        return was + 1
      })
    }, FRAME_MS)

    return () => clearInterval(timer.current)
  }, [playing, last])

  /**
   * Pressing it from anywhere goes back to the beginning first. A reader at the
   * newest version who presses *watch it change* means the whole thing, and a
   * button that ran from wherever the slider happened to be would do nothing at
   * all on the version it opens on.
   */
  const watch = () => {
    setAt(0)
    setPlaying(true)
  }

  const showing = versions[at]!
  const drawn = renderLoomTree(showing.tree, {
    resolver: portalRegistry,
    validator: portalRegistry,
  })

  return (
    <section className="flex flex-col gap-3">
      {/*
        * What is being looked at, before it is looked at. `Version 3 of 8` is
        * the whole of it: the number is identity and travels — into a URL, a
        * message, a report — so it stays on the surface, and the count beside it
        * is what stops a reader assuming the newest one they can see is the
        * newest there is.
        */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-lg tracking-tight">{versionHeading(showing.version)}</h2>
        {/*
          * "The newest one" and not "the page as it is being served". They are
          * the same thing on a page whose record still adds up and they are not
          * the same claim, and this screen is in no position to make the second
          * one: every picture here is folded from the record, and whether the
          * record still produces what is actually being served is the question
          * `/portal/checkup` exists to answer. A caption that quietly asserted
          * it would be this screen telling a reader the one thing it cannot
          * check.
          */}
        <p className="text-ink-muted text-xs">
          {showing.version === newest
            ? "This is the newest one."
            : `The newest one is ${newest}.`}
        </p>
      </div>

      <div className="bg-surface-preview border-edge-subtle rounded-md border p-6" data-stage>
        {drawn.element}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            stop()
            setAt((was) => Math.max(0, was - 1))
          }}
          disabled={at === 0}
          className={STEP}
        >
          ←<span className="sr-only"> Go back one</span>
        </button>

        {/*
          * A range with a step of one, so there is nothing between two versions
          * to land on. Dragging it stops the playback for the same reason a step
          * button does: two things moving the same slider is a reader fighting
          * the screen.
          */}
        <input
          type="range"
          min={0}
          max={last}
          step={1}
          value={at}
          onChange={(event) => {
            stop()
            setAt(Number(event.target.value))
          }}
          aria-label="Jump to a version"
          aria-valuetext={versionHeading(showing.version)}
          className="accent-affirm-edge min-w-32 flex-1"
        />

        <button
          type="button"
          onClick={() => {
            stop()
            setAt((was) => Math.min(last, was + 1))
          }}
          disabled={at === last}
          className={STEP}
        >
          →<span className="sr-only"> Go forward one</span>
        </button>
        {/*
          * The one obvious action, and it stays one button through all three of
          * its states. `versions.length > 1` is the honest condition: a page
          * that has only ever been one thing has nothing to watch, and offering
          * to play it would be a control that does nothing.
          */}
        {versions.length > 1 && (
          <button
            type="button"
            onClick={playing ? stop : watch}
            className="bg-affirm text-affirm-ink border-affirm-edge rounded-md border px-3 py-1.5 text-sm"
          >
            {playing ? "Stop" : at === last ? "Watch it change" : "Watch it from the start"}
          </button>
        )}
      </div>

      {drawn.diagnostics.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-ink-muted text-xs">
            {drawn.diagnostics.length === 1
              ? "One part of the page didn’t draw at this version."
              : `${drawn.diagnostics.length} parts of the page didn’t draw at this version.`}{" "}
            The rest is exactly as it was — Loom leaves out what it can’t draw rather than failing
            the whole page.
          </p>
          <TechnicalDetail summary="What the renderer said">
            <ul className="flex flex-col gap-1">
              {drawn.diagnostics.map((diagnostic, index) => (
                <li key={index} className="font-mono">
                  {describeRenderDiagnostic(diagnostic)}
                </li>
              ))}
            </ul>
          </TechnicalDetail>
        </div>
      )}

      {showing.change === undefined ? (
        /*
         * The oldest one this screen holds, which is two different facts and the
         * screen says which. Version 0 is where the page began and nothing
         * produced it. Any other oldest version is simply where the window
         * starts, and what produced it is real and one tab away.
         */
        <StateNotice tone="notice">
          {showing.version === 0 ? (
            <p>This is where the page started. Nothing had happened to it yet.</p>
          ) : (
            <p>
              This is as far back as this screen goes. What made this one, and everything before
              it, is still kept — it is in the list of changes.
            </p>
          )}
        </StateNotice>
      ) : (
        <VersionNote change={showing.change} />
      )}
    </section>
  )
}
