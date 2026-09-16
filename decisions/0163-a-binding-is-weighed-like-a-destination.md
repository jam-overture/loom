# 0163 — A binding is weighed like a destination, and its params are half of it

**Status:** Accepted
**Date:** 2026-09-16
**Section:** §2 — Composition Runtime

## Context

`loom:submit` and `loom:data` are the two ends of one pipe. One says where a
visitor's data goes; the other says which of the host's data arrives. Since
[0071](0071-moving-a-forms-destination-is-a-stake-of-its-own.md) the first has been a
stake factor of its own and a rung on the Gate's ladder, on the argument
`stakes.ts` still carries:

> Where a visitor's data goes should not depend on who asked for it to move.

The second had nothing. A `configure` moving a binding from `catalogue.services`
to `orders.mine` reached the Gate as a configured prop key like any other, and
`defaultGatePolicy` accepted it — low stakes, `within-policy`, applied with
nobody in the loop. The only defence was a host adding `loom:data` to
`protectedPropKeys`, which is a line no default deployment has, and which the
documentation page for bindings had started telling readers to add.

The asymmetry was filed by `Loom docs` on 12 September, with every clause of
0071's reasoning restated with one word changed and found still true: a binding
is the runtime's own key, both sources were registered by the host in either
case, and which of a deployment's data comes out should not depend on who asked.

## Decision

**A binding moved between two registered sources is a `high` stake factor and a
rung on the ladder**, in the shape `redirected-submission` already has:
`repointed-binding`, measured between the two trees, host-independent, with a
Gate rule below the refusal floor so a host that has declared this much damage
refusable still gets a refusal. The ladder goes from seven rungs to eight; 0002
and 0007 are amended under [0099](0099-a-record-is-amended-when-only-the-count-moved.md),
by the check that amendment installed rather than by anybody noticing.

**A change of params counts, and this is where the transcription stops.** A
submission names a destination and carries no parameters, so there is nothing
there to move. A binding's params are half of its question, and the framework's
own documented example selects which of a host's data comes out using nothing
else:

```json
"bio": { "source": "profile.field", "params": { "field": "bio" } }
```

Weighing the source alone would let `"bio"` become `"salary"` unremarked — the
exact change this factor exists to catch, on the very example the reference
documentation teaches bindings with. The finding recommended source-only; this
record declines that half of it, and says so.

**The runtime does not try to tell a selecting param from a shaping one.** That
would take vocabulary from the source registry, and both 0071 and
`redirection.ts` keep this class of fact host-independent on purpose. So an
ambiguous param change reads as selection. The cost of being wrong in that
direction is a confirmation on a widened `limit`; the cost in the other
direction is the salary field.

**What counts as a repointing is `redirection.ts`'s rule, unchanged**: a
question that persists at one node under one name and differs. A binding that
appears where there was none is a region that showed nothing before; one that
disappears is breakage the shape factors already measure; a declaration that
stops parsing reads as a loss, because that is what the page does with it.

**Identity is the plan's own request key**, not a fresh comparison. `planDataIn`
already canonicalises source and params into the string that decides whether two
bindings share an answer, which is exactly "these are the same question". Reading
it twice would be two notions of sameness that had to agree, and the second one
would drift.

## Consequences

- A proposal that repoints a binding is held for a person under every policy,
  including one that trusts every origin completely. That is the point.
- The `loom:data`-in-`protectedPropKeys` workaround still works and is no longer
  the only thing between a repointed binding and a silent apply. The
  documentation page written against the old behaviour needs one sentence
  changed; it belongs to `Loom docs` and is filed.
- Widening a `limit` or changing a sort order now asks for confirmation. This is
  the accepted cost of not needing source vocabulary, and the first thing to
  revisit if it proves noisy in practice — the fix would be a declared
  `selectingParams` on a source entry, which is a bigger decision than this one.
- `planDataIn` joins `planSubmissionsIn` as the node-level half of its module's
  planner, which is symmetry restored rather than surface added.
- The ladder is eight rungs. Any surface that counts them asks `ESCALATION_LADDER`.

## Alternatives considered

**Source only, as the finding recommended.** Rejected on the repository's own
documented example: `profile.field` selects with a param, so source-only would
miss the change the factor exists to catch, in the one place a reader is most
likely to have copied.

**The request key alone, with no `source`/`params` distinction.** Rejected for
the sentence a reviewer reads, which is 0044's argument for splitting
`protected-type-relocated` from `protected-type-touched`. Printing
`profile.field to profile.field` reads as a change that did not happen, so a
params move says *asks `profile.field` for something else* instead.

**A distinct factor, or a different level, for a params move.** Rejected: both
put different data in front of a stranger, which is the fact being weighed. Two
levels would invite a host to auto-apply one of them, and there is no reading of
`{ "field": "salary" }` under which that is safe.

**`critical`, so it is refused rather than held.** Rejected for 0071's reason:
repointing is often exactly right — a deployment that splits one catalogue into
two repoints its pages — and refusing it would mean no proposal could ever move a
binding. What must not happen is that it goes through unnoticed, which is a
question of who decides rather than of whether it may be done.

**A host vocabulary knob, like `protectedPropKeys`.** Rejected as the thing that
already existed and already failed: silence is the default (0002), and a fact
that holds for every deployment should not wait on every deployment to declare
it.
