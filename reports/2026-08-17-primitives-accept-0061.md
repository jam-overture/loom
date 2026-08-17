# 17 August 2026 — 0061 accepted, 0054 partially superseded

**Routine:** `Loom primitives` · **Section:** §4b · **Branch:** `primitives-03-accept-0061`

A governance change and nothing else. No primitive was added, removed or altered
in behaviour; `pnpm verify` is green and the test count is unchanged at **1228 /
484**, which is the point — accepting a record that the code already followed
should move no tests.

## What this closes

#81 shipped the `loom.perk` → `loom.perk-list-item` rename at the maintainer's
direction, and shipped [0061](../decisions/0061-a-suffix-that-names-the-markup-earns-its-place.md)
as **`Proposed`**, because the rename contradicts
[0054](../decisions/0054-a-container-is-its-childs-name-plus-the-arrangement.md)'s
*"No `-item` suffix, ever"* and `decisions/README.md` forbids a routine from
overturning an `Accepted` record on its own.

That left `main` in a deliberate inconsistency for a day: shipped code following
a `Proposed` record, with an `Accepted` one saying otherwise. The maintainer's
instruction on 17 August was to accept, *"unless there is a valid reason not
to."* There is not one — accepting was this routine's own recommendation on #81,
the cost is documented and pinned by a test, and nothing has changed since.

## What changed

| File | Before | After |
| --- | --- | --- |
| `decisions/0061` | `Proposed — contradicts 0054…` | `Accepted — partially supersedes 0054` |
| `decisions/0054` | `Accepted` | `Accepted — partially superseded by 0061` |

**Both halves, and in the repo's own format.** 0027/0029 is the existing
precedent for a partial supersede and it writes the pair as *"partially
superseded by NNNN"* / *"partially supersedes NNNN"* — a bare `Accepted` on the
replacement would have lost the link back. `pnpm decisions:index` regenerates
clean, which is also the check that a status naming a non-existent record would
have failed.

**0054's text is untouched**, per *"Mark the old one … leave its text intact."*
Only its status line moved. That leaves `0054`'s Decision section still reading
"No `-item` suffix, ever" as an absolute, which is exactly why
`decisions/README.md` requires the replacement to say which part it takes over —
so 0061 now names the superseded clause verbatim rather than referring to it by
position:

> Concretely, and replacing **0054's first consequence** — *"No `-item` suffix,
> ever"* — and only that one:

**One paragraph inside 0061 was updated**, in its Alternatives section, because
it described the record's own status: it said "this record is `Proposed` and 0054
is untouched", which stopped being true the moment it was accepted. It now
records the sequence instead — written `Proposed`, shipped in #81 while it
waited, accepted on 17 August. This is not editing a record to change direction;
the argument is unchanged. It is the record ceasing to misdescribe itself.

**Four source comments and one test comment** referred to 0061 as pending. Those
now read as settled. The test comment is the one worth naming: it used to say
that if 0061 were rejected, that test should be deleted rather than adjusted. It
now says the opposite thing that is true — 0054's stem rule still holds
everywhere else, which is why the *other* test is unchanged. **0061 supersedes
one clause, not the record.**

## What is still true of 0054

Both of its other consequences stand, and both are still enforced:

- **A container is never a bare plural.** `loom.stats` / `loom.stat` remains
  refused.
- **The arrangement word is descriptive and drawn from a small set** — `grid`,
  `list`, `cloud`, `table`, `row`, `carousel`. Every container in the library
  still complies, and the test that walks the registry checking it is unchanged.

Worth stating plainly because the question was asked directly during this run:
**a `-list` suffix was never the problem and was never discouraged.** 0054
*requires* it on a container. The banned suffix was `-item`, on a child, and it
is now banned only when it names the parent rather than the markup.

## Findings

None filed, none closed. Nothing in this change reached the framework, the
runtime or another routine's lane.

## Open questions

None. This was the last thing outstanding from #75 and #81.

## Next

Unchanged, and now unblocked: **the compose-and-arrange layer** — `loom.stack`,
`loom.grid`, `loom.card`. Every container in the library is a *named band*, so
"these things, in a column, with this gap" has to borrow a band that means
something else. It is the basic end of the maintainer's "basic to extremely well
designed" range and the gap that most limits what the other 24 can be assembled
into. Chrome — nav and footer — after it.
