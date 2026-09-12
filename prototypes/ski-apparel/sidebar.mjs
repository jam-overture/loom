/**
 * The instrument, and deliberately not part of the page.
 *
 * Everything in the tree is a registered primitive rendered by Loom. This is
 * hand-written markup bolted alongside it, and that separation is the honest
 * one: the rail is a person watching the page being read, not something the
 * page contains.
 *
 * It is a development tool. Nothing here ships to a visitor. What drives it is
 * `rail.client.mjs`, bundled by the dev server.
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
  .feed .k.activated { color: #2f81f7; }
  .feed .k.opened, .feed .k.closed { color: #d3a75f; }
  .feed .k.viewed { color: #6fbd94; }
  .feed li.batch .k, .feed li.batch .s { color: #3f4b5c; }
  .totals { margin: -4px 0 10px; font-size: 11px; color: #4e5c70; }
  #rail .sub code { font: inherit; color: #6ee7d7; }
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
      <p class="sub">From <code>@loom/runtime/signals</code></p>
    </div>
    <button class="again" id="again" title="Clear what the rail has counted">Start over</button>
  </header>
  <section>
    <h3>Time on each section &middot; jumps to it</h3>
    <div id="dwell"></div>
  </section>
  <section id="qwrap" hidden>
    <h3>Questions opened</h3>
    <div id="questions"></div>
  </section>
  <section>
    <h3>Signals, newest first</h3>
    <p class="totals" id="totals"></p>
    <ul class="feed" id="feed"><li><span class="idle">Scroll or click something.</span></li></ul>
  </section>
</aside>
`
