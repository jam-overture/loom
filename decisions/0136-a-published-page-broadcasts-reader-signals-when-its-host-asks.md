# 0136. A published page broadcasts reader signals when its host asks

**Status:** Accepted
**Date:** 2026-09-12
**Section:** §3 — Rendering, §6 — Telemetry

> **Amended 2026-09-12**, under [0099](0099-a-record-is-amended-when-only-the-count-moved.md).
> `types` may now be set per kind as well as once for all of them —
> `{ dwelled: ["loom.section"], activated: ["loom.link"] }` — and a kind it does
> not name reports every type. A list still applies to every kind. Found by the
> ski prototype, whose rail wanted time on screen for sections and activations
> for links and could only ask for both on all five types. The same change
> fixed `kinds: ["dwelled"]` also sending `viewed`: kinds and types are now
> applied to every signal at the moment a batch is built. Nothing here is
> reversed — the configuration is still the host's and never the tree's.

## Context

Loom is an adaptive UI runtime. The pipeline that lets a page change from how it
is used has existed since §2: an intent may come from `system-signal`, the Gate
gives that origin its own lower ceiling (0002), and a held change is confirmed
against the tree as it stands. What never existed is the other end — anything on
a published page that could say what a reader did.

Two facts made that impossible rather than merely unbuilt.

**A published page cannot name its nodes.** Identity reaches the markup only in
edit mode (0010), and 0010 promises that markup is byte-identical with edit mode
off. So a click on a live page lands on an element that says nothing about which
node of which tree it belongs to, and a change proposed from that click has
nothing to address.

**Nothing says what may be reported.** A prototype (`prototypes/ski-apparel`)
collected dwell and clicks by hand in about forty lines and proved the signals
are cheap to gather. It also proved how quickly they go wrong without a
contract: its section order was a constant, and after one accepted reorder every
signal it gathered was filed against a position that no longer existed.

## Decision

**A render may be asked to stamp identity on a published page, and a host may
start a broadcaster that reports a closed vocabulary of reader signals from it.
Both are off unless the host turns them on. The framework broadcasts; capturing,
storing and interpreting the signals are not decided here.**

**`addressed: true` on a render** — and on a `RenderRequest` — writes exactly the
attributes edit mode writes: node id and type on each decorated element, tree id
and revision on the root. Nothing else edit mode means comes with it. Absent, the
markup is unchanged, so 0010's promise holds for every page that does not ask.

**Four kinds of signal, and only four.**

| Kind | Means |
| --- | --- |
| `viewed` | The node came into view, the first time in the page's life |
| `dwelled` | Milliseconds it was on screen since the previous batch |
| `activated` | A reader used a link, button or field inside it |
| `disclosed` | A region was opened or closed |

A signal names a node and its primitive type. **It carries no content** — no
text, no URL, no field value, nothing that identifies the reader — for the reason
telemetry does not keep an utterance (0023): the tree already holds the content at
the revision named, and a record of what a person read is a record of the person.

**Every batch names the tree and revision.** A node id without its revision is a
position, and a position stops meaning anything the moment a change is applied.

**The broadcaster reads the page, not the components.** `broadcastReaderSignals`
takes the root element and finds everything on the markup: identity from the
addressed attributes, targets from the elements HTML defines as targets, and a
disclosure from `details` and from the attribute the disclose control already
stamps. No primitive is instrumented, so no primitive can fail to be.

**It is configured by the host, never by the tree.** Which kinds and which
primitive types are broadcast, how often, and where batches go are arguments to
the call. None of it is a prop, because a prop is something a model may propose
and the Gate weighs as a small reversible change — and "start measuring readers"
is not a change to a page.

**A batch goes out two ways.** It is dispatched as a bubbling `loom:signals` DOM
event on the root, so anything on the page can read it without being wired to
the broadcaster, and it is handed to the host's `send` if there is one. A `send`
that throws or rejects is contained, for 0042's reason: an observer does not get
a vote.

**`parseReaderSignalBatch` is how a batch is read back.** A browser is not a
trusted author, so a receiver parses rather than trusting the shape, and an
invalid batch is a value rather than a throw.

## Consequences

- A live Loom page can, for the first time, say which node of which revision a
  reader looked at or used. That is the precondition for every `system-signal`
  intent the runtime already knows how to gate.
- The runtime ships browser code outside a React control for the first time. The
  entry point, `@loom/runtime/signals`, loads under plain Node — it touches the
  DOM only when the broadcaster is called — so a server that only parses batches
  can import it.
- `DISCLOSED_ATTRIBUTE` moved to `render/disclosed.ts`, a module with no React in
  it, and is re-exported from `behaviour.ts` where it was. The broadcaster needs
  the name and must not pull React into a page to get it.
- An addressed page exposes node ids and primitive types in its markup. Both are
  opaque identifiers the tree already assigns; neither is content.
- Adding a fifth kind is a change to a closed union and to this record, not a
  configuration option.
- Deliberately undecided: where batches are stored, how they are aggregated, how
  long they are kept, and how signals become intents. Each is its own record.

## Alternatives considered

**Instrument each primitive.** Give every primitive an event hook and let it
report its own interactions. Rejected: it makes measurement a conformance
obligation on every primitive, including third-party ones, and the first
primitive that forgets is invisible in exactly the data meant to find problems.
The page already carries every fact needed.

**Broadcast by default.** Rejected. It would give every page a script it did not
ask for, and every host a consent obligation it did not choose.

**A prop on the root to switch it on.** Rejected for the reason given above: the
tree is what a model proposes changes to, and the decision to observe readers
belongs to whoever deploys the page.

**Put the revision on each signal.** Rejected as redundant. A rendered page is
one revision; a shape that lets two signals in one batch disagree about it
invites a consumer to check whether they do.

**Reuse edit mode.** Rejected. Edit mode is a request to decorate for a portal,
and a host that wanted addresses would inherit whatever edit mode comes to mean
next.
