# 2026-07-30 (day 12) — addressing: listing, the outline, and what a click can land on

**Build order section:** §5 — Portal, second step of its internal order
(read path → **addressing** → write path → history → calibration).

**Visual:** [what an outline row addresses](2026-07-30-day-12-addressing.svg) ·
screenshots of the running build:
[a text row delegating](2026-07-30-day-12-selection-delegated.png) ·
[an element selected directly](2026-07-30-day-12-selection-direct.png)

**Branch:** `day-12-addressing`, off `main` at `e379d25`

---

## Review feedback

None. PR #16 merged with no comments from @jonathanbravecredit, so this run
continued the build order.

---

## What was completed

Three things, in the order the last report said to do them.

### 1. `TreeStore.list` — the framework gap day 11 left open

Recorded as **0020**, because it fixes a contract every future store has to
implement and because the shape has three coupled questions in it.

- **The handle is the scope.** `list` takes no scope argument, because `head` and
  `history` take none either — a store handle can already read anything it can
  name. A tenant gets a narrowed handle, which is a decision a host makes once
  rather than one every caller has to remember to pass.
- **Keyset pagination, ordered by `treeId` ascending.** The cursor is opaque and
  passed back unread; `null` means there is no next page. `clampListingLimit`
  lives in the contract module, so a caller cannot get an unbounded read by
  omitting a limit.
- **A listing is a summary** — `treeId` and `revision` — not a tree. `revision`
  is enough on its own, since it is also the number of entries in the log.

Ordering by id rather than by recency is the real cost, taken deliberately: the
store has no timestamp to sort on, because §1 kept time out of the document and
`create` takes no `createdAt` the way `append` takes an `appliedAt`. 0020 records
what would have to change to get recency later.

`/trees` is now a real listing with a working `next page →`, and the portal has
stopped exporting the id of the tree it seeded. That was the last place it knew
something because it had put it there.

### 2. `outlineTree` and `addressNode` — the framework half of the outline

- **`src/tree/outline.ts`** flattens a tree into reading order, carrying the two
  facts a list needs and cannot recover afterwards: `depth`, and `index` among
  siblings. `index` is the same number an `insert` or a `move` names, so an
  outline row is enough to address a *position*, not only a node.
- **`src/render/addressing.ts`** answers the question the outline actually raises:
  *the set of nodes a user can see is not the set the DOM can address.* Edit mode
  decorates elements only (0010), so text and slot nodes leave nothing to click;
  and 0012 lets a registered primitive ignore `loom.editable` entirely. 0019
  already fixed what to do about it — fall back to the nearest decorated ancestor
  and say so — and this is that rule as a pure function.
- It takes a **`DecorationLookup` predicate rather than a registry**, so the module
  depends on nothing. **`decorationFromAudit`** in the SDK bridges it to a real
  conformance audit.

### 3. Selection, across both panes

The outline and the preview select each other. Clicking a row highlights the node
in the preview; clicking in the preview selects the row. What is stored is the
node the user *asked for*, not the node the DOM can reach — so a text row stays
selected as a text row and the delegation stays visible, instead of being quietly
rewritten into the selection itself.

Selection reaches the DOM as one attribute on the element that already carries
`data-loom-node`. There is no wrapper and no re-render: the preview's children are
elements a Server Component produced, and 0010's rule that edit mode never
restructures is what makes a single attribute sufficient.

---

## Decisions I made that weren't specified

1. **`decorationFromAudit` errs towards claiming a node is addressable.** A
   primitive the probe could not judge (`not-probeable`) counts as decorating,
   because "could not answer" is not "answered no" and the DOM is the last word —
   `PreviewSurface` degrades on a miss. A type that is *not registered at all*
   counts as not decorating, which is not the opposite call: an unregistered type
   renders as nothing, so its whole subtree is absent from the DOM and delegating
   to an ancestor is exactly right.
2. **`TreeReader` (`head` + `history`).** Adding `list` widened `TreeStore` for
   every implementer, and the first thing that broke was two test doubles that had
   to grow a method the code under test never calls. That is the interface telling
   you it is too wide for its readers, so `auditSnapshot` and `treeSourceFromStore`
   now take the read half. Noted in 0020 rather than given its own record — it is
   a consequence of the widening, not an independent decision.
3. **`pathToNode` is now derived from a new `nodePath`.** Addressing needs the
   chain of *nodes*, not of ids; two near-identical recursive walks would have been
   the alternative.
4. **The outline keeps rows it cannot point at**, marked, rather than hiding them.
   A text node is a node the runtime can move and re-author, so it belongs in an
   address book; what it cannot do is receive a click.
5. **`outlineRows` calls `addressNode` per row**, which walks to the root each
   time. Quadratic over a page-sized tree, and deliberate: the alternative is a
   second implementation of the delegation rule that happens to fold over the
   outline, and two copies of that rule is a worse bug than the traversal.
6. **The audit runs once at module scope in the portal.** `auditRegistry` is a
   function a host calls rather than something registration does behind its back;
   this is that call made deliberately, in the one place where the answer is a
   property of the registry rather than of a request.
7. **`data-loom-selected` is the portal's attribute, not the runtime's.** The
   runtime emits identity; state over that identity is a consumer's business.

---

## A bug the screenshot caught, not the tests

The hover outline was drawn on **every ancestor of the pointer**, because `:hover`
matches the whole chain — so hovering a card outlined the card, the page, and
everything between. Fixed with
`[data-loom-node]:hover:not(:has([data-loom-node]:hover))`, which leaves only the
innermost hovered node outlined, which is the only one a click would select.

Second run in a row where looking at the rendered page found something no test
was going to. Day 11's was a missing gap between stacked children.

---

## Test coverage / status

```
@loom/runtime   53 files, 478 tests   green
@loom/portal     3 files,  18 tests   green + build
```

`pnpm verify` green across the workspace. **+32 tests** (27 runtime, 5 portal),
nothing skipped, nothing failing. The live-API smoke test ran (a key was present)
and passes; it still skips cleanly without one.

What the new tests pin down:

- **listing** — id order rather than insertion order; the cursor appears only while
  there is another page, including the boundary where a page exactly empties the
  store; a cursor naming a removed tree resumes rather than erroring; the limit is
  clamped, not honoured; `revision` is the log length.
- **outline** — pre-order, depth, parent, sibling index; a childless root.
- **addressing** — an element addresses itself; text and slot delegate to the
  nearest element; an undecorated primitive is delegated *past*; a run of
  undecorated ancestors is skipped; nothing decorated anywhere is `unaddressable`
  rather than a wrong answer; an absent node is `absent` rather than a guess; the
  reason reported is the *requested* node's, not the ancestor's.
- **the portal's own tree** — every element in the seed is addressable directly and
  only text delegates, which is what makes the preview clickable in fact rather
  than by intention.

Verified in a browser as well as in tests: selecting the text node `n_seed1`
highlights `n_seed2` (its heading) and states the fallback; clicking the card
selects it directly, with exactly one node outlined.

---

## Open questions for the next session

1. **The write path is next** — 0017 already designed it: `EditIntent` →
   `composeChange` → `append`, with an optimistic client reconciling a
   `revision-conflict`. Selection now gives it `scopeNodeId` for free.
2. **The compile step.** Unchanged from day 11 and still the highest-value
   non-feature work in the repo: `next.config.ts` carries an `extensionAlias`
   workaround that pins the portal to webpack rather than Turbopack.
3. **Keyboard traversal of the outline.** Rows are buttons, so they are reachable
   by tab, but arrow-key navigation of a tree is what makes an address book usable
   at depth. Not started; not blocking the write path.
4. **The schema is at 3381 of a 3500 guard.** Untouched. Carried.
5. **Node-level provenance.** (Carried from day 1.) Still unforced.
