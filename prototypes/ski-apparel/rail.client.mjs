import { broadcastReaderSignals, READER_SIGNALS_EVENT } from "@jam-overture/loom/signals/broadcast"

import { RAIL_TYPES } from "./legend.mjs"
import { emptyReadings, fold, questionsOpened, summarise } from "./readings.mjs"

/**
 * The rail, running on the framework's own broadcaster.
 *
 * Everything the page reports comes from `broadcastReaderSignals` — there is no
 * collector of its own any more. This file does the two things a host does:
 * starts the broadcaster with its settings, and reads what it sends.
 *
 * It reads it twice, on purpose. The rail listens for the `loom:signals` DOM
 * event, which is how anything on a page can see a batch without being wired to
 * the broadcaster. And `send` posts every batch to the dev server, which parses
 * it the way a real receiver would and prints what arrived.
 */

const legend = JSON.parse(document.getElementById("loom-legend").textContent)
const root = document.querySelector("[data-loom-tree]")

const escape = (value) =>
  String(value).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c])

const clock = (at) => new Date(at).toLocaleTimeString([], { hour12: false })

let readings = emptyReadings()

const paintSections = () => {
  const rows = summarise(readings, legend)
  const most = Math.max(1, ...rows.map((row) => row.seconds))

  document.getElementById("dwell").innerHTML = rows
    .map((row) => {
      const cls = !row.reached ? "row unseen" : row.seconds === most ? "row top" : "row"
      const hits = row.jumps > 0
        ? `<span class="hits">${row.jumps} jump${row.jumps === 1 ? "" : "s"}</span>`
        : '<span class="hits none">—</span>'
      return `<div class="${cls}"><span class="name">${escape(row.label)}</span>${hits}<span class="secs">${row.seconds}s</span><span class="bar"><i style="width:${Math.round((row.seconds / most) * 100)}%"></i></span></div>`
    })
    .join("")
}

const paintQuestions = () => {
  const questions = questionsOpened(readings, legend)
  document.getElementById("qwrap").hidden = questions.length === 0
  document.getElementById("questions").innerHTML = questions
    .map((q) => `<div class="q"><span class="qt">${escape(q.question)}</span><span class="qc">${q.count}×</span></div>`)
    .join("")
}

const paintFeed = () => {
  document.getElementById("totals").textContent =
    `${readings.batches} batch${readings.batches === 1 ? "" : "es"} · ${readings.signals} signals · revision ${legend.revision}`

  document.getElementById("feed").innerHTML = readings.feed.length === 0
    ? '<li><span class="idle">Scroll or click something.</span></li>'
    : readings.feed
        .map((line) => `<li class="${line.kind === "batch" ? "batch" : ""}"><span class="t">${clock(line.at)}</span><span class="k ${line.kind}">${line.kind}</span><span class="s">${escape(line.subject)}</span></li>`)
        .join("")
}

const paint = () => {
  paintSections()
  paintQuestions()
  paintFeed()
}

const started = broadcastReaderSignals(root, {
  types: RAIL_TYPES,
  flushEveryMs: 1000,
  send: (batch) =>
    fetch("/signals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(batch),
      keepalive: true,
    }),
})

if (!started.ok) {
  document.getElementById("feed").innerHTML = `<li><span class="idle">${escape(started.error.detail)}</span></li>`
} else {
  root.addEventListener(READER_SIGNALS_EVENT, (event) => {
    readings = fold(readings, event.detail, legend)
    paint()
  })

  document.getElementById("again").onclick = () => {
    readings = emptyReadings()
    paint()
  }

  paint()
}
