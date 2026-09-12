"use client"

import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"

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
 */
export const TreeOutline = () => {
  const { rows, selected, select } = useSelection()

  return (
    <nav aria-label="Parts of this page" className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm tracking-tight">Parts of this page</h2>
        <span className="text-ink-placeholder text-2xs">
          {rows.length} {rows.length === 1 ? "part" : "parts"}
        </span>
      </div>

      <ul className="border-edge-subtle bg-surface-base flex flex-col rounded-md border p-1">
        {rows.map((row) => (
          <OutlineRowButton
            key={row.nodeId}
            row={row}
            isSelected={selected?.nodeId === row.nodeId}
            onSelect={select}
          />
        ))}
      </ul>

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
        </p>
      </TechnicalDetail>
    </nav>
  )
}
