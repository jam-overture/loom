/**
 * The instrument, and deliberately not part of the page.
 *
 * Everything in the tree is a registered primitive rendered by Loom. This is
 * hand-written markup bolted alongside it, and that separation is the honest
 * one: the rail is a person watching the page being read, not something the
 * page contains.
 *
 * It is a development tool. Nothing here ships to a visitor.
 */

export const SIDEBAR_STYLES = `
  :root { --rail: 340px; }
  body { margin: 0; }
  .loom-page-host { margin-right: var(--rail); }

  #rail {
    position: fixed; top: 0; right: 0; bottom: 0; width: var(--rail);
    display: flex; flex-direction: column;
    background: #0b0f16; border-left: 1px solid #1e2734; color: #c9d4e2;
    font: 13px/1.55 ui-monospace, "SF Mono", Menlo, monospace;
    overflow-y: auto; z-index: 9999;
  }
  #rail header {
    display: grid; grid-template-columns: 1fr auto; align-items: start; gap: 8px;
    padding: 14px 16px; border-bottom: 1px solid #1e2734;
    position: sticky; top: 0; background: #0b0f16; z-index: 1;
  }
  #rail h2 { margin: 0; font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: #6ee7d7; }
  #rail .sub { margin: 4px 0 0; font-size: 11.5px; color: #61708a; }
  #rail section { padding: 14px 16px; border-bottom: 1px solid #161e29; }
  #rail h3 {
    margin: 0 0 10px; font-size: 10.5px; letter-spacing: .12em;
    text-transform: uppercase; color: #61708a; font-weight: 400;
  }

  .again {
    font: inherit; font-size: 11px; background: none; color: #61708a;
    border: 1px solid #2b3646; border-radius: 4px; padding: 4px 8px; cursor: pointer;
  }
  .again:hover { color: #b6c4d6; border-color: #3d4c60; }
  .again:focus-visible { outline: 2px solid #6ee7d7; outline-offset: 2px; }

  .row { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; align-items: center; margin-bottom: 7px; }
  .row .name { color: #9fb0c6; }
  .row .secs { color: #e6edf6; font-variant-numeric: tabular-nums; min-width: 4ch; text-align: right; }
  .row .hits {
    font-size: 11px; color: #0b0f16; background: #6ee7d7; border-radius: 8px;
    padding: 1px 6px; font-variant-numeric: tabular-nums;
  }
  .row .hits.none { background: none; color: #2b3646; }
  .row.unseen .name, .row.unseen .secs { color: #3f4b5c; }
  .bar { grid-column: 1 / -1; height: 3px; background: #16202c; border-radius: 2px; overflow: hidden; }
  .bar i { display: block; height: 100%; background: #2f81f7; }
  .row.top .bar i { background: #6ee7d7; }

  .q { display: grid; grid-template-columns: 1fr auto; gap: 8px; margin-bottom: 6px; font-size: 12px; }
  .q .qt { color: #9fb0c6; }
  .q .qc { color: #6ee7d7; font-variant-numeric: tabular-nums; }

  .feed { list-style: none; margin: 0; padding: 0; }
  .feed li {
    display: grid; grid-template-columns: 7.5ch 9ch 1fr; gap: 8px;
    font-size: 11.5px; padding: 4px 0; border-bottom: 1px solid #121923;
  }
  .feed li:first-child { animation: arrive .6s ease-out; }
  .feed .t { color: #3f4b5c; font-variant-numeric: tabular-nums; }
  .feed .k { color: #61708a; }
  .feed .k.nav-click { color: #2f81f7; }
  .feed .k.faq-click { color: #d3a75f; }
  .feed .k.reached { color: #6fbd94; }
  .feed .s { color: #b6c4d6; word-break: break-word; }
  .idle { color: #4e5c70; font-size: 12.5px; margin: 0; }

  @keyframes arrive { from { background: #16283a; } to { background: transparent; } }
  @media (prefers-reduced-motion: reduce) { .feed li:first-child { animation: none; } }
`

export const SIDEBAR_MARKUP = `
<aside id="rail" aria-label="Signal collector">
  <header>
    <div>
      <h2>Signals</h2>
      <p class="sub">What this page notices about being read</p>
    </div>
    <button class="again" id="again" title="Clear the readings">Start over</button>
  </header>
  <section>
    <h3>Time on each section &middot; clicks</h3>
    <div id="dwell"></div>
  </section>
  <section id="qwrap" hidden>
    <h3>Questions opened</h3>
    <div id="questions"></div>
  </section>
  <section>
    <h3>Events, newest first</h3>
    <ul class="feed" id="feed"><li><span class="idle">Scroll or click something.</span></li></ul>
  </section>
</aside>
`

/**
 * The collector.
 *
 * \`IntersectionObserver\` for what is on screen and a one-second tick for how
 * long it stayed — which is the cheapest honest measure of reading. A scroll
 * position would count a section somebody flew past.
 */
export const SIDEBAR_SCRIPT = `
(() => {
  const SECTIONS = ["top", "layers", "helmets", "goggles", "fit"]
  const onScreen = new Set()

  /**
   * How much of the *screen* a section fills — not how much of the section is on
   * screen. \`intersectionRatio\` is the second thing, and it caps at
   * viewport ÷ section height: the goggles section is 2575px tall against a
   * 768px window, so it can never exceed 0.30 no matter how squarely a reader is
   * looking at it. A long section would never have registered.
   */
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const filled = entry.intersectionRect.height / Math.max(1, window.innerHeight)
        if (entry.isIntersecting && filled > 0.3) onScreen.add(entry.target.id)
        else onScreen.delete(entry.target.id)
      }
    },
    { threshold: Array.from({ length: 21 }, (_unused, step) => step / 20) }
  )

  for (const id of SECTIONS) {
    const node = document.getElementById(id)
    if (node) observer.observe(node)
  }

  const post = async (events) => {
    const response = await fetch("/signals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ events }),
    })
    return response.json()
  }

  const send = async (events) => paint(await post(events))

  /**
   * Clicks, read off the page rather than wired into it.
   *
   * One listener on the document, matching on what the reader actually hit. The
   * page is a Loom tree and nothing in it knows this collector exists — the
   * moment a primitive has to be instrumented to be measurable, only
   * instrumented primitives get measured.
   */
  document.addEventListener("click", (event) => {
    const link = event.target.closest && event.target.closest('a[href*="#"]')
    if (link) {
      const section = link.getAttribute("href").split("#")[1]
      if (SECTIONS.includes(section)) send([{ kind: "nav-click", section }])
      return
    }

    const summary = event.target.closest && event.target.closest("summary")
    if (summary) {
      const question = (summary.querySelector("span")?.textContent ?? "").trim()
      if (question) send([{ kind: "faq-click", question }])
    }
  })

  const escape = (value) =>
    String(value).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c])

  const clock = (at) => new Date(at).toLocaleTimeString([], { hour12: false })

  const LABELS = { "nav-click": "nav click", "faq-click": "question", reached: "reached" }

  /** The feed is only rebuilt when a new entry arrived, so its highlight marks an arrival, not a tick. */
  let newest = null

  const paint = (state) => {
    const rows = state.sections
    const most = Math.max(1, ...rows.map((r) => r.seconds))
    document.getElementById("dwell").innerHTML = rows
      .map((r) => {
        const cls = !r.reached ? "row unseen" : r.seconds === most && most > 0 ? "row top" : "row"
        const width = Math.round((r.seconds / most) * 100)
        const hits = r.clicks > 0
          ? \`<span class="hits">\${r.clicks} click\${r.clicks === 1 ? "" : "s"}</span>\`
          : '<span class="hits none">—</span>'
        return \`<div class="\${cls}"><span class="name">\${escape(r.label)}</span>\${hits}<span class="secs">\${r.seconds}s</span><span class="bar"><i style="width:\${width}%"></i></span></div>\`
      })
      .join("")

    const questions = state.questions
    document.getElementById("qwrap").hidden = questions.length === 0
    document.getElementById("questions").innerHTML = questions
      .map((q) => \`<div class="q"><span class="qt">\${escape(q.question)}</span><span class="qc">\${q.count}×</span></div>\`)
      .join("")

    const head = state.feed[0]
    const signature = head ? head.at + head.kind + head.subject + state.feed.length : "empty"
    if (signature === newest) return
    newest = signature

    document.getElementById("feed").innerHTML = state.feed.length === 0
      ? '<li><span class="idle">Scroll or click something.</span></li>'
      : state.feed
          .map((e) => \`<li><span class="t">\${clock(e.at)}</span><span class="k \${e.kind}">\${LABELS[e.kind]}</span><span class="s">\${escape(e.subject)}</span></li>\`)
          .join("")
  }

  document.getElementById("again").onclick = async () => {
    await fetch("/reset", { method: "POST" })
    newest = null
    paint(await post([]))
  }

  /**
   * A hidden tab is not reading, so it neither reports nor polls — and a page the
   * browser has kept alive after navigating away would otherwise go on ticking
   * alongside the one in front of you.
   */
  let awake = document.visibilityState === "visible"
  document.addEventListener("visibilitychange", () => { awake = document.visibilityState === "visible" })

  setInterval(async () => {
    if (!awake) return
    const events = [...onScreen].map((section) => ({ kind: "dwell", section, ms: 1000 / onScreen.size }))
    paint(await post(events))
  }, 1000)

  post([]).then(paint)
})()
`
