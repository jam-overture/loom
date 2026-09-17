"use client"

import { broadcastReaderSignals, deliverReaderSignals } from "@loom/runtime/signals/broadcast"
import type { ReaderSignalBatch } from "@loom/runtime/signals"
import { useEffect } from "react"

import { SITE_SIGNAL_TYPES } from "@/app/(marketing)/_lib/readers/asked"

/**
 * The one piece of this site that runs in a browser.
 *
 * Every other thing on these ten pages is a tree built on a server, and that is
 * the site's own argument about itself. This is the exception the argument
 * requires: a reader signal is a fact about somebody reading, and nothing on a
 * server can see somebody reading. So one component, mounted once, drawing
 * nothing.
 *
 * **It draws nothing on purpose.** A visible element here would be markup this
 * site does not build out of registered primitives, which is the one claim the
 * layout's own comment says cannot be fudged — *the whole page is data* has to
 * be true at the edges too. It returns `null`, and what it leaves on the page
 * instead is an attribute on the document (below).
 *
 * **It is mounted only when this deployment collects** (`readersCountedHere`),
 * which is also when the pages are rendered `addressed`. The two agree by
 * reading one function, because a broadcaster on an unaddressed page is exactly
 * the misconfiguration nobody notices — the runtime says so where it refuses to
 * start one.
 *
 * **What it sends and where.** The kinds and types are `asked.ts`, which is
 * this site's promise about what it wants to know. The delivery is the runtime's
 * `deliverReaderSignals`: a beacon when the browser will take one, a `fetch`
 * with `keepalive` when it will not, to `/api/reader-signals` on this same
 * origin — the address this application already answers, and no service
 * anywhere else. Nothing about the response is read, because a page has no
 * retry to attempt and no reader to tell.
 *
 * The import is `@loom/runtime/signals/broadcast` rather than
 * `@loom/runtime/signals`: about 5 KB in a browser bundle rather than about
 * 66 KB, because the second carries the schemas (0136). `ReaderSignalBatch`
 * comes from the heavier entry point as a **type**, which is erased before a
 * bundler sees it.
 */

/**
 * What the page says about itself once this has run, for anything that can read
 * the DOM and nothing that can read the page.
 *
 * A broadcaster that started against the wrong element, or against a page
 * rendered without its addresses, behaves exactly like a site nobody is
 * visiting: no batch, no error, no difference. That is unfalsifiable from
 * outside, and this attribute is what makes it falsifiable — a test asserts it,
 * and a real browser pointed at a real deployment can be asked the same
 * question without a debugger.
 *
 * It is not `data-loom-…`: that prefix is the runtime's, for the addresses a
 * signal names, and a surface inventing a fifth one would make the set of
 * attributes that mean something to Loom a matter of who wrote them.
 */
export const COUNTING_ATTRIBUTE = "data-reader-signals"

export type CountingState = "broadcasting" | "unaddressed"

export type CountReadersProps = {
  /**
   * Where a batch goes. The runtime's delivery when absent, which is what the
   * layout mounts; a test passes its own so it can read the batches back
   * without a network.
   */
  readonly send?: (batch: ReaderSignalBatch) => void
}

/** The root of the rendered tree — the element carrying the tree's own address. */
const TREE_ROOT = "[data-loom-tree]"

export const CountReaders = ({ send }: CountReadersProps = {}) => {
  useEffect(() => {
    const document = globalThis.document
    const page = document.documentElement
    const root = document.querySelector(TREE_ROOT)

    const mark = (state: CountingState): void => page.setAttribute(COUNTING_ATTRIBUTE, state)

    if (root === null) {
      mark("unaddressed")
      return
    }

    const started = broadcastReaderSignals(root, {
      types: SITE_SIGNAL_TYPES,
      send: send ?? deliverReaderSignals(),
    })

    if (!started.ok) {
      mark("unaddressed")
      return
    }

    mark("broadcasting")

    return () => {
      started.value.stop()
      page.removeAttribute(COUNTING_ATTRIBUTE)
    }
  }, [send])

  return null
}
