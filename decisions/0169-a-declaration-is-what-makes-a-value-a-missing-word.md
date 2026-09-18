# 0169. A declaration is what makes a value a missing word

**Status:** Accepted
**Date:** 2026-09-18
**Section:** §2 — Composition Runtime (the authoring SDK's copy seam)

## Context

[0122](0122-a-primitive-says-which-of-its-props-a-reader-reads.md) built `copyIn`
around one promise: a reading of a node's words never rounds *I cannot tell you*
down to *there are none*. `NodeCopy` returns a shape rather than a list for that
reason alone — `words`, and `unread` for the parts whose author has said nothing.

`Loom lessons` filed it on 13 September while writing lesson 24, which teaches
this seam and prints its answers. There is a case where the seam does exactly
what 0122 forbids, and it is reached by two rules that are each individually
right:

- `declaredWords` skipped a declared copy prop whose value is not a string,
  rather than coercing it. Correct. `loom.stat` renders `3400` as *3,400*, the
  component owns the separator and the runtime does not, so `String(value)`
  would print a figure the page does not show.
- `unread` carries only types that declared **nothing**, because a declaration is
  trusted about its exclusions. Also correct.

Composed, a `loom.stat` that has declared `value` as copy and holds the number
`3400` read as:

```
  value: 3400, declared
    words:  ["appointments"]
    unread: none
```

The figure is gone and nothing says so. `unread: none` is not silence — it is a
positive claim that every type under this node declared, which a caller is
entitled to read as *`words` is complete*. So the one reading built to make a
missing word visible made this one invisible, and `copy.test.ts` pinned the
behaviour with an assertion about `words` and none about anything else.

**How it is reached.** `loom.stat`'s schema requires strings, so a validated tree
cannot hold it. The two callers 0122 was filed for are a queue row about a
proposal and a preview of a node **nobody has approved** — which is exactly where
props have not been through a schema. It is the same argument `resolveAnchor`
makes when it answers `42` and `null` with readings instead of throwing.

## Decision

**1. A third answer, `unspoken`.** A declared copy prop holding a value that is
not a string is reported per node: the node id, its type, and the props in
declaration order. The value is still never coerced. What changed is that the
gap is handed back rather than dropped.

Three cases on the declared side, and only the third is unspoken:

| the prop | the reading |
| --- | --- |
| not set | nothing — a `caption` nobody wrote is not a word this reading lost |
| a blank or whitespace-only string | nothing — the page shows nothing there, so the reading and the page agree |
| set, and not a string | **`unspoken`** — a word is owed and cannot be given |

**2. It is a new field, not a new member of `unread`.** `unread` means *nobody
has told me whether these are words*. `unspoken` means *somebody told me these
are words, and what is in them is not one*. Folding the second into the first
makes one field mean two things — which is this seam's own complaint about
defaults — and silently changes what an empty `unread` asserts for every caller
that already reads it. `(portal)` is one such caller today.

**3. The undeclared side keeps its string filter, and the reason is written
down.** `UnreadCopy.props` names a node's string-valued props and goes on naming
only those. Where nothing has been declared, a value that is not a string is not
a candidate word at all: a `loom.divider` holding `weight: 2` would otherwise be
reported as a part whose words a reader might lose, and every layout primitive in
the library would join it. The finding called this the same hole from the other
direction, and it is not — on the undeclared side the **node is already named**,
so a caller knows not to trust `words` for it. On the declared side the node
appeared nowhere.

That is the title. **A declaration is what makes a non-string value a missing
word.** Absent one, it is a setting.

## Consequences

`NodeCopy` has a third field, and a caller that has neither `unread` nor
`unspoken` entries has read everything the node says. `NO_WORDS` — the shared
frozen reading — carries it too, so the identity a reading with nothing to report
returns is unchanged.

**Existing callers keep working and do not yet surface it.**
`(portal)/_lib/proposal-effect.ts` reads `words` and `unread` and is unaffected
by the addition; it will go on printing nothing for a figure it cannot show,
which is the state before this record rather than a regression from it. Making
that visible on the card is the portal's, and is filed.

**The reference published a new exported type**, `UnspokenCopy`, so
`pnpm --filter @loom/app docs:api` regenerated. That file is `Loom docs`' by
content and the drift check makes regenerating it part of any diff that changes
an export.

**A test that pinned the silence now pins the report.** The 13 September finding
observed that `copy.test.ts:156` asserted `words` for this case and nothing
else — so the silence was tested in rather than overlooked. It now asserts all
three fields.

Nothing about which props are copy changed, no coercion was added, and no
primitive declares copy yet (0 of 96 — `Loom primitives`' standing finding of 10
September). So every reading in the repository today still goes down the
`unread` branch, and this closes the branch that opens the day the first
primitive declares.

## Alternatives considered

**Name the prop in `unread`.** The smallest diff, and the finding named it and
rejected it in the same breath. Rejected: it makes one field mean *nobody has
said* and *said, and I could not read it*, and it changes what an empty `unread`
asserts for a shipped caller. A field that means two things is what this seam
exists to complain about.

**Give `UnreadCopy` a reason, so one list carries both.** More faithful to the
idea that both are *the reading fell short here*, and it is one list to iterate.
Rejected on the grouping a caller actually does: `(portal)` groups `unread` by
**type**, because *declare `copy` on `loom.stat`* is the one thing somebody does
about it. The remedy for an unspoken prop is not a declaration — the declaration
already exists — it is a formatted string or a note on the card, and it is per
node rather than per type. Two lists that are grouped differently and acted on
differently are two lists.

**Coerce with `String(value)` and mark it.** Rejected, and 0122 already rejected
it: the runtime knows the number and not the separator. A missing word is a gap;
a wrong one is a lie. Marking it does not help — the figure is on the reviewer's
screen either way, and the mark is what nobody reads.

**Widen `UnreadCopy.props` to every prop, so the undeclared side reports the
figure too.** Symmetric, and briefly convincing. Rejected on the evidence in the
test suite: `copy.test.ts` already pins that a `loom.divider` holding
`weight: 2` reports nothing, and with 0 of 96 primitives declaring copy, *every*
reading in the repository today takes this branch. Widening would put a numeric
setting from every layout primitive in the library into a list a reader is shown
as words a change might take away. The string filter is the seam saying *this
could be a word*, which is the most it can say when nobody has told it anything.

**Call it `unreadable`.** The `un-` participle matches `unread` and
`unprobedProps`, and it is the accurate English. Rejected on collision:
`(portal)/_lib/proposal-effect.ts` already calls `copyIn`'s **`unread`** list
`UnreadablePart` on the screen a reviewer reads. A second concept one letter of
attention away from the first, in the seam and on the surface at once, is a
review nobody wins. `unspoken` is the same idea in a word that cannot be
misread: declared to be words, and this reading cannot say them.

**Leave it, and let lesson 24 print the case as a known limit.** Rejected. The
lesson would be teaching the seam's one promise beside the case that breaks it,
and a limit a teaching page has to apologise for is a defect with an audience.
