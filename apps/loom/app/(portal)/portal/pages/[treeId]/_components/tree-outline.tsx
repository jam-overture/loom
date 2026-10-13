"use client"

import { useMemo, useState } from "react"

import type { NodeId } from "@jam-overture/loom"

import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { ROWS_BEFORE_FOLDING, initiallyOpen, outlineView } from "@/app/(portal)/_lib/outline-view"

import { OutlineRowButton } from "./outline-row"
import { useSelection } from "./selection-context"

/**
 * The third pane, built second (0019): an address book, not a layers panel.
 *
 * Every row is selectable, including the rows that cannot be pointed at in the
 * DOM. Hiding them would be the wrong kind of honesty — a text node is a node the
 * runtime can move and re-author, so it belongs in the address book; what it
 * cannot do is receive a click, and the row says so with a marker rather than
 * disappearing.
 *
 * It was headed `outline` over `42 nodes`, which is a data structure and its
 * cardinality. A person opening their own page has parts of a page, and the
 * count is only worth printing at all because it says how much of the page this
 * list covers.
 *
 * The three markers are the part of this pane that most needed a legend and
 * never had one. They are kept — a symbol is faster to scan than a word once you
 * know it — and what they mean now sits under the list rather than in nobody's
 * head. The same disclosure carries the arrow, which is the marker that would
 * otherwise leave a reader thinking a row was broken.
 *
 * ## The one line phase 2 added, and why it is not an instruction
 *
 * Rows toggle, so a reader can end up with more picked than they meant, and the
 * count is what tells them. `2 of 42 picked` beside the heading answers it
 * without a sentence, in the place the total already was — and the way out sits
 * next to it rather than being something to work out.
 *
 * What is deliberately *not* here is *"click another part to pick it too"*.
 * Clicking a second row and having it join the first is the behaviour a person
 * discovers by doing it once; a line of instructions above a list is what a
 * surface writes when its behaviour needs explaining, and this one does not.
 * The legend below says what a picked part is *for*, which is the thing nobody
 * discovers.
 *
 * ## It folds and it can be searched, as of this run
 *
 * The audit of 12 October photographed this list at **189 rows**, every one of
 * them open, on a screen 5,594px tall — and named two things that follow from
 * it. One is that there was no way to find a part by name. The other is that
 * nothing below the list was on the same screen as the list: measured on this
 * branch with these files reverted, the list was 4,594px and `Nothing picked
 * yet` started at y 5,298, which is five screens below the row that changes
 * it.
 *
 * So the list arrives folded to its top levels, has a box over it to find a
 * part by name, and scrolls inside a bounded box instead of growing the column
 * it sits in. `_lib/outline-view.ts` holds the reading and the reasons; the
 * three things this component decides are:
 *
 * - **The box is the same height whatever is in it.** A list that grew and
 *   shrank as a reader typed would move everything under it on every keystroke,
 *   which is the content jump the audit found, one cause along.
 * - **Nothing is removed.** A folded row carries the number of parts inside it,
 *   a search shows every match *and* every row it is inside, and the line under
 *   the list says how many of the page's parts are drawn. The count in the
 *   heading stays the whole page's, because that is what it was answering.
 * - **The way back is a control and not a gesture.** A search that found
 *   nothing, or found something, offers the same button to put the whole list
 *   back.
 */

/**
 * How tall the list is, on a page long enough to fold.
 *
 * Roughly sixteen rows. The number that matters is not this one but what is
 * under it: the pane that says what you picked has to be on the same screen as
 * the row you picked it with, and a list that can be any height at all is the
 * one arrangement where that cannot be guaranteed.
 *
 * **It is a height and not a maximum**, and that is the second half of the same
 * finding. A `max-h` bounds the top and lets the box collapse, so a reader
 * typing into the search box watches everything under the list move on every
 * keystroke — 346px folded, 384px on a search that matched, 10px on one that
 * did not, all measured. A reserved height is the arrangement where the pane
 * below holds still.
 *
 * A page short enough to arrive whole gets no height at all. There is nothing
 * to fold on it, so nothing moves, and a 384px box around seven rows would be
 * padding a list out to look like a problem it does not have.
 */
const LIST_HEIGHT = "h-[24rem]"

export const TreeOutline = () => {
  const { rows, picked, pick, clear } = useSelection()

  const [query, setQuery] = useState("")
  const [open, setOpen] = useState<ReadonlySet<NodeId>>(() => initiallyOpen(rows))

  const view = useMemo(
    () =>
      outlineView(rows, {
        query,
        open,
        revealed: picked.map((one) => one.nodeId),
      }),
    [rows, query, open, picked]
  )

  const toggle = (nodeId: string) =>
    setOpen((held) => {
      const next = new Set(held)

      if (!next.delete(nodeId as NodeId)) next.add(nodeId as NodeId)

      return next
    })

  const folded = view.entries.length < rows.length

  return (
    <nav aria-label="Parts of this page" className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm tracking-tight">Parts of this page</h2>
        <span className="text-ink-placeholder text-2xs">
          {picked.length === 0
            ? `${rows.length} ${rows.length === 1 ? "part" : "parts"}`
            : `${picked.length} of ${rows.length} picked`}
        </span>
      </div>

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Find a part…"
        aria-label="Find a part of this page"
        data-outline="find"
        className="border-edge-subtle bg-surface-base placeholder:text-ink-placeholder w-full rounded-md border px-2.5 py-1.5 text-xs"
      />

      <ul
        data-outline="list"
        className={`border-edge-subtle bg-surface-base flex flex-col overflow-y-auto rounded-md border p-1 ${
          rows.length > ROWS_BEFORE_FOLDING ? LIST_HEIGHT : ""
        }`}
      >
        {view.entries.map((entry) => (
          <OutlineRowButton
            key={entry.row.nodeId}
            entry={entry}
            isPicked={picked.some((one) => one.nodeId === entry.row.nodeId)}
            onPick={pick}
            onToggle={toggle}
          />
        ))}
      </ul>

      {view.matched === 0 && (
        <p className="text-ink-muted text-2xs">
          No part of this page is called &ldquo;{query.trim()}&rdquo;.
        </p>
      )}

      {view.matched !== null && view.matched > 0 && (
        <p className="text-ink-placeholder text-2xs">
          {view.matched === 1 ? "1 part matches" : `${view.matched} parts match`} &ldquo;
          {query.trim()}&rdquo;.
        </p>
      )}

      {view.matched !== null && (
        <button
          type="button"
          onClick={() => setQuery("")}
          className="text-ink-muted hover:text-ink self-start text-2xs underline"
        >
          Show the whole page again
        </button>
      )}

      {view.matched === null && folded && (
        <p className="text-ink-placeholder text-2xs">
          Showing {view.entries.length} of {rows.length} parts.
        </p>
      )}

      {picked.length > 0 && (
        <button
          type="button"
          onClick={clear}
          className="text-ink-muted hover:text-ink self-start text-2xs underline"
        >
          Let go of {picked.length === 1 ? "it" : "all of them"}
        </button>
      )}

      <TechnicalDetail summary="What the marks mean">
        <dl className="flex flex-col gap-1">
          <div className="flex gap-2">
            <dt className="text-ink-placeholder w-3 shrink-0 text-center">◆</dt>
            <dd>A piece of the page — a heading, a card, a block of writing.</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-placeholder w-3 shrink-0 text-center">◇</dt>
            <dd>A space inside a piece, holding whatever has been put in it.</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-placeholder w-3 shrink-0 text-center">·</dt>
            <dd>Words.</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-placeholder w-3 shrink-0 text-center">›</dt>
            <dd>
              This piece holds others. The number beside it is how many, and the arrow opens
              them.
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-placeholder w-3 shrink-0 text-center">↑</dt>
            <dd>
              You can&rsquo;t click this one on the page itself — pick it here instead. Asking for
              a change to it still works.
            </dd>
          </div>
        </dl>
        <p className="text-ink-secondary">
          Loom calls these an <span className="font-mono">element</span>, a{" "}
          <span className="font-mono">slot</span> and a <span className="font-mono">text</span>{" "}
          node, and the arrow marks one whose selection delegates to an ancestor.
        </p>
        {/*
          * The rows used to print the registered type — `loom.card` — and now
          * print what it is. The type is still here, under the pane below, and
          * this is the sentence that says where it went: a reader who came to
          * this rail *for* the type should not have to find that out by
          * clicking around.
          */}
        <p className="text-ink-secondary">
          Pick a row to see its registered type, its id and what a click on the page would reach.
          Pick more than one and they are drawn together under the page, in the order the page
          holds them.
        </p>
        {/*
          * The box over the list reads this too, which is the one thing about it
          * a reader cannot discover by typing in it.
          */}
        <p className="text-ink-secondary">
          The box above matches a registered type as well as the plain name, so{" "}
          <span className="font-mono">loom.card</span> finds the same rows as{" "}
          <span className="font-mono">card</span>.
        </p>
      </TechnicalDetail>
    </nav>
  )
}
