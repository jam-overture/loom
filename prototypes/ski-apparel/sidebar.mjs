/**
 * The instrument, and deliberately not part of the page.
 *
 * Everything in the tree is a registered primitive rendered by Loom. This is
 * hand-written markup bolted alongside it, and that separation is the honest
 * one: the sidebar is a person watching the page being read, not something the
 * page contains. Putting it in the tree would make the observer part of what it
 * observes, and the first proposal would start moving the instrument around.
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
    padding: 14px 16px; border-bottom: 1px solid #1e2734;
    position: sticky; top: 0; background: #0b0f16;
  }
  #rail h2 { margin: 0; font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: #6ee7d7; }
  #rail .sub { margin: 4px 0 0; font-size: 11.5px; color: #61708a; }
  #rail section { padding: 14px 16px; border-bottom: 1px solid #161e29; }
  #rail h3 {
    margin: 0 0 10px; font-size: 10.5px; letter-spacing: .12em;
    text-transform: uppercase; color: #61708a; font-weight: 400;
  }

  .row { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; align-items: center; margin-bottom: 7px; }
  .row .name { color: #9fb0c6; }
  .row .secs { color: #e6edf6; font-variant-numeric: tabular-nums; }
  .row .hits {
    font-size: 11px; color: #0b0f16; background: #6ee7d7; border-radius: 8px;
    padding: 1px 6px; font-variant-numeric: tabular-nums;
  }
  .row .hits.none { background: none; color: #2b3646; }
  .bar { grid-column: 1 / -1; height: 3px; background: #16202c; border-radius: 2px; overflow: hidden; }
  .bar i { display: block; height: 100%; background: #2f81f7; }
  .row.top .bar i { background: #6ee7d7; }
  .row.unseen .name, .row.unseen .secs { color: #3f4b5c; }

  .verdict { border-radius: 4px; padding: 11px 12px; margin-bottom: 10px; }
  .verdict.held { background: #2a2115; border: 1px solid #4a3a1c; }
  .verdict.applied { background: #16281f; border: 1px solid #234d38; }
  .verdict .k { font-weight: 700; letter-spacing: .06em; text-transform: uppercase; font-size: 11px; }
  .verdict.held .k { color: #d3a75f; }
  .verdict.applied .k { color: #6fbd94; }
  .verdict p { margin: 7px 0 0; color: #b6c4d6; font-size: 12.5px; }

  .said { color: #e6edf6; font-size: 12.5px; line-height: 1.5; margin: 0 0 10px; }
  .said b { color: #6ee7d7; font-weight: 400; }
  dl { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 4px 10px; font-size: 12px; }
  dt { color: #61708a; }
  dd { margin: 0; color: #d6e0ec; word-break: break-word; }
  .idle { color: #4e5c70; font-size: 12.5px; margin: 0; }
  .acts { display: flex; gap: 8px; margin-top: 12px; }
  .acts button {
    font: inherit; font-size: 12px; padding: 7px 12px; border-radius: 4px; cursor: pointer;
    border: 1px solid transparent; flex: 1;
  }
  .acts .yes { background: #6ee7d7; color: #06231f; font-weight: 700; }
  .acts .yes:hover { background: #8df0e3; }
  .acts .no { background: transparent; border-color: #2b3646; color: #8496ad; }
  .acts .no:hover { border-color: #3d4c60; color: #b6c4d6; }
  .acts button:focus-visible { outline: 2px solid #6ee7d7; outline-offset: 2px; }
  .rev { color: #4e5c70; font-size: 11px; margin: 0; }
  .rev b { color: #6ee7d7; font-weight: 400; }
  .ev { color: #4e5c70; font-size: 11px; word-break: break-word; }

  .q { display: grid; grid-template-columns: 1fr auto; gap: 8px; margin-bottom: 6px; font-size: 12px; }
  .q .qt { color: #9fb0c6; }
  .q .qc { color: #6ee7d7; font-variant-numeric: tabular-nums; }

  .did { font-size: 12px; color: #7f8ea3; margin: 0 0 8px; padding-left: 14px; position: relative; }
  .did:before { content: "✓"; position: absolute; left: 0; color: #6fbd94; }
  .did b { color: #a9b8cb; font-weight: 400; }

  #rail header { display: grid; grid-template-columns: 1fr auto; align-items: start; gap: 8px; }
  #rail header .ht { grid-column: 1; }
  .again {
    font: inherit; font-size: 11px; background: none; color: #61708a;
    border: 1px solid #2b3646; border-radius: 4px; padding: 4px 8px; cursor: pointer;
  }
  .again:hover { color: #b6c4d6; border-color: #3d4c60; }
`

export const SIDEBAR_MARKUP = `
<aside id="rail" aria-label="Signal collector">
  <header>
    <div class="ht">
      <h2>Signals</h2>
      <p class="sub">What this page notices about being read</p>
    </div>
    <button class="again" id="again" title="Rebuild the page and clear the readings">Start over</button>
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
    <h3>What it concluded</h3>
    <div id="verdict"><p class="idle">Watching. Scroll and read — it needs two sections and eight seconds before it will say anything.</p></div>
  </section>
  <section id="dwrap" hidden>
    <h3>Already changed</h3>
    <div id="done"></div>
  </section>
  <section>
    <h3>Runtime events</h3>
    <p class="ev" id="events">—</p>
  </section>
  <section>
    <h3>The page</h3>
    <p class="rev" id="rev">revision <b>0</b></p>
    <p class="rev" id="order"></p>
  </section>
</aside>
`

/**
 * The collector.
 *
 * `IntersectionObserver` for what is on screen and a one-second tick for how
 * long it stayed — which is the cheapest honest measure of reading. A scroll
 * position would count a section somebody flew past.
 *
 * Hidden tabs are not reading, so the tick stops on `visibilitychange`. Without
 * that, leaving the page open over lunch is the strongest signal on the page.
 */
export const SIDEBAR_SCRIPT = `
(() => {
  const SECTIONS = ["top", "layers", "helmets", "goggles", "fit"]
  const onScreen = new Set()
  let latest = null

  /**
   * How much of the *screen* a section fills — not how much of the section is on
   * screen. \`intersectionRatio\` is the second thing, and it caps at
   * viewport ÷ section height: the goggles section is 2575px tall against a
   * 768px window, so it can never exceed 0.30 no matter how squarely a reader is
   * looking at it. A threshold of 0.25 was one browser-window resize away from
   * counting nothing at all, and a longer section would never have registered.
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

  /**
   * Clicks, read off the page rather than wired into it.
   *
   * One listener on the document, matching on what the reader actually hit. The
   * page is a Loom tree and nothing in it knows this collector exists — which is
   * the property worth keeping, because the moment a primitive has to be
   * instrumented to be measurable, only instrumented primitives get measured.
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

  const post = async (body) => {
    const response = await fetch("/signals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
    return response.json()
  }

  const send = async (events) => paint(await post({ events }))

  const act = async (path, answering) => {
    const response = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answering }),
    })
    const body = await response.json()
    if (body.applied) location.reload()
    else {
      painted = null
      paint(await post({ events: [] }))
    }
  }

  let painted = null

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
        return \`<div class="\${cls}"><span class="name">\${r.label}</span>\${hits}<span class="secs">\${r.seconds}s</span><span class="bar"><i style="width:\${width}%"></i></span></div>\`
      })
      .join("")

    const questions = state.questions || []
    document.getElementById("qwrap").hidden = questions.length === 0
    document.getElementById("questions").innerHTML = questions
      .map((q) => \`<div class="q"><span class="qt">\${q.question}</span><span class="qc">\${q.count}×</span></div>\`)
      .join("")

    const done = state.done || []
    document.getElementById("dwrap").hidden = done.length === 0
    document.getElementById("done").innerHTML = done
      .map((d) => \`<p class="did">\${d.utterance} <b>(\${d.asked ? "you accepted it" : "applied on its own"}, rev \${d.revision})</b></p>\`)
      .join("")

    document.getElementById("rev").innerHTML = "revision <b>" + state.revision + "</b>"
    document.getElementById("order").textContent = (state.order || []).join(" › ")

    const p = state.proposal
    const verdict = document.getElementById("verdict")

    /**
     * Only redraw the verdict when it actually changed.
     *
     * The rail repaints every second, and innerHTML builds new buttons each
     * time — so a click that lands in the same tick as a repaint hits an element
     * that no longer exists and does nothing. The numbers above can be rewritten
     * freely; anything a person aims at has to hold still.
     */
    const signature = !p || p.status !== "proposed" ? "idle" : p.derivation.id + ":" + p.awaitingYou
    if (signature === painted) return
    painted = signature

    if (!p || p.status !== "proposed") {
      verdict.innerHTML = '<p class="idle">Watching. Scroll and read — it needs two sections and eight seconds before it will say anything.</p>'
      document.getElementById("events").textContent = "—"
      return
    }

    const waiting = p.awaitingYou === true
    verdict.innerHTML =
      \`<p class="said"><b>It said:</b> "\${p.derivation.utterance}"</p>\` +
      \`<div class="verdict \${waiting ? "held" : "applied"}">\` +
      \`<span class="k">\${waiting ? "waiting on you" : "applied on its own"}</span>\` +
      \`<p>\${p.detail || ""}</p></div>\` +
      \`<dl>\` +
      \`<dt>rule</dt><dd>\${p.rule}</dd>\` +
      \`<dt>origin</dt><dd>system-signal</dd>\` +
      \`<dt>stakes</dt><dd>\${p.stakes}\${p.factors.length ? " — " + p.factors.join("; ") : ""}</dd>\` +
      \`<dt>reversible</dt><dd>\${p.reversible ? "yes" : "no"}</dd>\` +
      \`<dt>undo</dt><dd>\${p.inverse.length ? p.inverse.join(", ") : "—"}</dd>\` +
      \`</dl>\` +
      (waiting
        ? '<div class="acts"><button class="yes" id="yes">Make the change</button><button class="no" id="no">Not now</button></div>'
        : "")

    if (waiting) {
      document.getElementById("yes").onclick = () => act("/confirm", p.derivation.id)
      document.getElementById("no").onclick = () => act("/dismiss", p.derivation.id)
    }

    document.getElementById("events").textContent = (p.events || []).join(" → ")
  }

  document.getElementById("again").onclick = async () => {
    await fetch("/reset")
    location.reload()
  }

  let awake = document.visibilityState === "visible"
  document.addEventListener("visibilitychange", () => { awake = document.visibilityState === "visible" })

  /**
   * Two jobs, deliberately not the same job.
   *
   * Reporting what was read needs a section actually on screen. *Asking what
   * the page concludes* does not — a suggestion can arrive from a reading
   * posted a while ago, and a reader who has stopped scrolling is exactly the
   * reader with something to look at. Gating the poll on there being new dwell
   * to report froze the rail wherever no section happened to fill the screen,
   * and a proposal sitting on the server was never collected.
   *
   * A hidden tab does neither. It is not reading, and it is not looking at the
   * rail — and a page the browser has kept alive after navigating away goes on
   * ticking otherwise, which shows up as several documents polling at once.
   */
  setInterval(async () => {
    if (!awake) return

    const events =
      onScreen.size === 0
        ? []
        : [...onScreen].map((section) => ({ kind: "dwell", section, ms: 1000 / onScreen.size }))

    latest = await post({ events })
    paint(latest)
  }, 1000)

  post({ events: [] }).then(paint)
})()
`
