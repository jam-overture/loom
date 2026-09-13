"use client"

import { type LoomTree } from "@loom/runtime"
import { renderLoomTree } from "@loom/runtime/react"
import { READER_SIGNALS_EVENT, broadcastReaderSignals } from "@loom/runtime/signals/broadcast"
/**
 * A `type` import, which is erased before a bundler sees it — so naming the
 * schema-carrying entry point here costs the browser nothing. The value import
 * above is the one the page's callout is about.
 */
import type { ReaderSignalBatch } from "@loom/runtime/signals"
import { useEffect, useRef, useState } from "react"

import { docsExamples } from "@/app/(docs)/_lib/examples/catalogue"
import { docsRegistry, docsThemes } from "@/app/(docs)/_lib/loom/registry"

/**
 * The broadcaster, running, on a page the reader is reading.
 *
 * Every other block on this page is produced on a server, because everything
 * else about this seam can be. This one cannot: a broadcaster's entire subject
 * is a browser with somebody in front of it, and the honest way to document it
 * is to start a real one on a real addressed tree and print whatever it says.
 *
 * **It is the runtime's broadcaster, imported the way the page tells you to
 * import it** — from `@loom/runtime/signals/broadcast` rather than from
 * `@loom/runtime/signals`, which is the difference between about 5 KB and about
 * 66 KB in a browser bundle (0136). The page makes that point in prose two
 * paragraphs up, and this file is where it would be caught lying.
 *
 * Nothing is captured, stored or sent anywhere. `send` is a `setState` on this
 * component and the batches live for as long as the tab does, which is also the
 * most a documentation page should ever do with a record of how somebody read
 * it.
 */

const SUBJECT_ID = "a-page-a-reader-scrolls"

/**
 * What this demonstration asks for, and why it is not simply everything.
 *
 * It is the shape the ski prototype wanted and could not have until 0136 was
 * amended: time on screen for the things that *are* the page, and activations
 * for the things inside them a reader aims at. Asking for all four kinds on all
 * types would bury the interesting signals under a `dwelled` for every link on
 * screen, several times a minute — which is the cost the amendment was about.
 */
const KINDS = ["viewed", "dwelled", "activated", "disclosed"] as const

const TYPES = {
  viewed: ["loom.section", "loom.faq-list"],
  dwelled: ["loom.section"],
  activated: ["loom.action", "loom.link"],
  disclosed: ["loom.faq"],
} as const

/** A second rather than the default five, because a reader is watching this one. */
const FLUSH_MS = 1000

/** How many deliveries are kept on screen. The rest have made their point. */
const KEPT = 6

const example = () => {
  const found = docsExamples.get(SUBJECT_ID)

  if (found === undefined) {
    throw new Error(`loom: no documented example is registered as "${SUBJECT_ID}"`)
  }

  return found
}

type Seen = {
  readonly batch: ReaderSignalBatch
  readonly n: number
}

export const ReaderSignalsLive = () => {
  const subject = example()
  const [tree] = useState<LoomTree>(subject.build)
  const [seen, setSeen] = useState<readonly Seen[]>([])
  const [fault, setFault] = useState<string | undefined>(undefined)
  const [running, setRunning] = useState(false)

  const frame = useRef<HTMLDivElement>(null)
  const control = useRef<{ readonly flush: () => void; readonly stop: () => void }>(null)

  const rendered = renderLoomTree(tree, {
    resolver: docsRegistry,
    validator: docsRegistry,
    themes: docsThemes,
    addressed: true,
  })

  useEffect(() => {
    const root = frame.current?.querySelector("[data-loom-tree]")

    if (root === null || root === undefined) {
      setFault("nothing under this frame carries a tree id, so there is nothing to broadcast from")
      return
    }

    /**
     * Counted here rather than from the list's length, so the number beside a
     * batch is which delivery it was — not which of the six still on screen.
     */
    let delivered = 0

    const started = broadcastReaderSignals(root, {
      kinds: [...KINDS],
      types: { ...TYPES },
      flushEveryMs: FLUSH_MS,
      send: (batch) => {
        delivered += 1
        const n = delivered
        setSeen((previous) => [{ batch, n }, ...previous].slice(0, KEPT))
      },
    })

    if (!started.ok) {
      setFault(started.error.detail)
      return
    }

    control.current = started.value
    setRunning(true)

    return () => {
      started.value.stop()
      control.current = null
      setRunning(false)
    }
  }, [])

  return (
    <figure className="not-prose my-8 flex flex-col gap-0" data-live-signals={SUBJECT_ID}>
      <div className="border-edge bg-surface-sunken flex items-center justify-between gap-3 rounded-t-lg border px-3 py-2">
        <span className="text-ink-muted text-xs font-medium">
          The same page, rendered with <code className="font-mono">addressed: true</code>
        </span>
        <span className="text-ink-faint font-mono text-[0.65rem] tracking-wide uppercase">
          {running ? "broadcasting · live" : "not broadcasting"}
        </span>
      </div>

      <div
        ref={frame}
        className="border-edge bg-surface-page max-h-[24rem] overflow-auto border-x px-2 py-4 sm:px-4"
      >
        {rendered.element}
      </div>

      <div className="border-edge bg-surface-sunken flex flex-wrap items-center gap-x-4 gap-y-1 border-x border-t px-3 py-2">
        <p className="text-ink-faint m-0 text-xs">
          Scroll it, press <span className="text-ink">See the frames</span>, open a question.
        </p>
        <button
          type="button"
          onClick={() => control.current?.flush()}
          className="border-edge text-ink hover:bg-surface-page rounded border px-2 py-1 font-mono text-xs"
        >
          deliver now
        </button>
      </div>

      {fault !== undefined && (
        <p className="border-edge bg-warning-surface text-warning-ink m-0 border-x border-t px-3 py-2 text-xs">
          The broadcaster refused to start: {fault}
        </p>
      )}

      <div className="border-edge bg-surface-sunken max-h-[20rem] overflow-auto rounded-b-lg border">
        {seen.length === 0 ? (
          <p className="text-ink-faint m-0 px-3 py-3 text-xs">
            Nothing delivered yet. A batch goes out every second, and only when there is something
            in it — a page nobody is reading sends nothing at all.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-0 p-0">
            {seen.map(({ batch, n }) => (
              <li key={n} className="border-edge border-b px-3 py-2 last:border-b-0">
                <p className="text-ink-faint m-0 font-mono text-[0.65rem]">
                  delivery {n} · {batch.treeId} · revision {batch.revision} · {batch.signals.length}{" "}
                  {batch.signals.length === 1 ? "signal" : "signals"}
                </p>
                <ul className="m-0 mt-1 flex list-none flex-col gap-0.5 p-0">
                  {batch.signals.map((signal, index) => (
                    <li key={index} className="text-ink-muted m-0 font-mono text-xs">
                      <span className="text-ink">{signal.kind}</span> {signal.type}{" "}
                      {signal.kind === "dwelled"
                        ? `${signal.ms}ms`
                        : signal.kind === "disclosed"
                          ? signal.open
                            ? "opened"
                            : "closed"
                          : ""}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>

      <figcaption className="text-ink-muted mt-2 text-sm">
        A real broadcaster on a real tree. Nothing is stored and nothing leaves this tab — every
        batch above is also on the page as a <code className="font-mono">{READER_SIGNALS_EVENT}</code>{" "}
        event, which is how anything else on a page reads them without being wired to the
        broadcaster.
      </figcaption>
    </figure>
  )
}
