"use client"

import { useId, useRef, useState, type ReactNode } from "react"

/**
 * A code block too long to stand at full height in the middle of a page.
 *
 * The quickstart file is three hundred lines. It is the one block on this site a
 * reader is told to copy **whole**, so it cannot be abridged, linked to, or split
 * into two blocks — and at full height it is several screens of code between the
 * sentence that introduces it and the sentence that says what it prints. The
 * maintainer's instruction on 29 September is that it takes up too much of the
 * screen and should open and close.
 *
 * **Clamped, never truncated.** The block inside is the complete file at every
 * moment. Nothing is removed from the markup, so the copy button still reads the
 * whole of it, find-in-page still matches the part below the fold, and the search
 * index — which reads the rendered page — is unaffected. Only the height of the
 * box around it changes.
 *
 * **Collapsed is the initial state rather than a correction to it.** Rendering
 * the wall and clamping it after hydration is a visible jump on every load, so
 * the clamp is in the first byte of markup the server sends and the button only
 * ever widens it. The cost is the one every interactive thing on this site
 * already has: the button needs JavaScript, as `Example`, `ProposalBox` and the
 * search box do.
 */
export const LongCode = ({
  children,
  lines,
  collapsedClassName = "max-h-[26rem]",
  label = "the file",
}: {
  readonly children: ReactNode
  /** How many lines there are, so the button can say what it is offering. */
  readonly lines: number
  /** The clamped height. A tall block and a short one want different numbers. */
  readonly collapsedClassName?: string
  /** What the button calls the thing, in a few words. */
  readonly label?: string
}) => {
  const [open, setOpen] = useState(false)
  const region = useRef<HTMLDivElement>(null)
  const id = useId()

  const toggle = (): void => {
    const next = !open

    setOpen(next)

    /*
     * Collapsing a block a reader has scrolled to the bottom of leaves them
     * somewhere below where it now ends, looking at the sentence after it with
     * no idea what moved. Going back to the top of the panel is the only
     * position that means anything afterwards.
     *
     * Called optionally because it is a nicety and not every environment
     * implements it — jsdom does not, and a fold that threw there would be a
     * component nothing could test.
     */
    if (!next) region.current?.scrollIntoView?.({ block: "start", behavior: "auto" })
  }

  return (
    <div ref={region}>
      <div
        id={id}
        className={`relative overflow-hidden ${open ? "" : collapsedClassName}`}
        data-long-code={open ? "open" : "collapsed"}
      >
        {children}

        {!open && (
          <div
            aria-hidden="true"
            className="from-surface-page pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t to-transparent"
          />
        )}
      </div>

      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={id}
        className="border-edge bg-surface-sunken text-ink-muted hover:text-ink -mt-px flex w-full items-center justify-center gap-2 rounded-b-lg border px-3 py-2 text-xs font-medium"
      >
        {open ? "Show less" : `Show all ${lines} lines of ${label}`}
      </button>
    </div>
  )
}
