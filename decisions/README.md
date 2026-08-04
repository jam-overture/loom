# Decision records

Numbered records of the decisions that define what Loom is. Read this index at
the start of a session: it is the fastest way to learn why the code is shaped
the way it is, and which constraints are deliberate rather than accidental.

## When to write one

Write a record when the decision would be expensive to reverse, or when it
defines what Loom is. In practice, when it does one of these:

- constrains the tree schema or the delta model
- fixes a contract another component has to implement
- decides what AI may produce, or what it may do unsupervised
- rules out an approach a reasonable engineer would otherwise reach for

Do **not** write one for implementation detail inside an already-agreed design.
That belongs in the day's report.

## Format

Status, Date, Section, then Context, Decision, Consequences, Alternatives
considered. Record what was rejected and why, not only what was chosen — the
rejected options are the part a future reader cannot reconstruct.

`Status` is one of `Proposed`, `Accepted`, or `Superseded by NNNN`.

A record that answered several questions at once can be replaced in part. Then
the status is `Accepted — partially superseded by NNNN`, and the replacement says
which part it takes over. Retiring a record that is mostly still in force would
lose more than it clarified. 0027 is the first of these.

## Changing direction

**Never edit a record to reflect a change of direction.** Mark the old one
`Superseded by NNNN`, leave its text intact, and write a new record explaining
what changed and why the earlier reasoning no longer holds. The trail is the
artefact.

A change that contradicts an `Accepted` record is an escalation, not a
refactor: write the replacement with status `Proposed`, flag it for review, and
leave the existing record standing until someone decides.

## The index below is generated

Write the record, then run `pnpm decisions:index`. Do not edit the table by
hand — it is rebuilt from the `**Status:**` and `**Section:**` lines of the
files themselves, and an edit here is overwritten on the next run.

`pnpm verify` fails if the committed table has drifted, if two records claim the
same number, if a number is missing, or if a status names a record that does not
exist. That last set is not hypothetical: two concurrent sessions each wrote an
`0032` on the same day, and nothing noticed until their branches met.

Everything above this line is prose a person wrote, and stays that way.

## Index

| # | Title | Status | Section |
| --- | --- | --- | --- |
| [0001](0001-tree-and-delta-as-the-unit-of-change.md) | The tree and the delta are the unit of AI-authored change | Accepted | §1 |
| [0002](0002-gate-is-a-pure-function-of-two-axes.md) | The Gate is a pure function of two independent axes | Accepted | §2 |
| [0003](0003-ai-drafts-the-runtime-names.md) | AI drafts a change; the runtime names what it creates | Accepted | §2 |
| [0004](0004-model-facing-schema-is-a-projection.md) | The model-facing schema is a projection, not the AST | Superseded by [0014](0014-the-reply-schema-must-fit-a-grammar-budget.md) | §2 |
| [0005](0005-model-access-is-an-optional-adapter.md) | Model access is a narrow seam with an optional adapter | Accepted | §2 |
| [0006](0006-one-repair-attempt-and-both-halves-recorded.md) | A refused proposal gets exactly one repair attempt, and both halves are recorded | Accepted | §2 |
| [0007](0007-confidence-is-self-graded-and-must-be-calibrated.md) | Confidence is self-graded, trusted on purpose, and must be calibrated | Accepted | §2, binding on §6 |
| [0008](0008-the-renderer-is-a-total-pure-projection.md) | The renderer is a total, pure projection of the tree | Accepted | §3 |
| [0009](0009-primitives-receive-props-in-a-bag.md) | Primitives receive AI-authored props in a bag, never spread | Accepted | §3 → §4 |
| [0010](0010-edit-mode-decorates-it-does-not-restructure.md) | Edit mode decorates; it never invents DOM | Accepted | §3 → §5 |
| [0011](0011-a-primitive-declares-its-props-and-the-seam-enforces-them.md) | A primitive declares its props, and the render seam enforces them | Accepted | §4 |
| [0012](0012-conformance-is-probed-and-reported-not-enforced.md) | Conformance is probed and reported, never enforced by registration | Accepted | §4 |
| [0013](0013-the-registry-is-what-the-model-is-told-it-may-build.md) | The registry is what the model is told it may build | Accepted | §4 → §2 |
| [0014](0014-the-reply-schema-must-fit-a-grammar-budget.md) | The reply schema must fit a compiled-grammar budget | Accepted — supersedes 0004 | §2 (interpretation) |
| [0015](0015-the-registry-is-generated-and-a-filename-is-a-type.md) | The registry is generated from the directory, and a module's name is its type | Accepted | §4 (CLI) |
| [0016](0016-the-log-is-the-truth-and-the-snapshot-is-a-view.md) | The log is the truth and the snapshot is a materialised view | Accepted | §5 |
| [0017](0017-every-write-goes-through-one-server-side-path.md) | Every write goes through one server-side path | Accepted | §5 |
| [0018](0018-the-portal-is-a-consumer-not-an-insider.md) | The portal is a consumer, not an insider | Accepted | §5 |
| [0019](0019-the-portal-is-a-review-queue-not-a-design-tool.md) | The portal is a review queue, not a design tool | Accepted | §5 |
| [0020](0020-a-store-handle-is-the-scope-and-a-listing-is-a-page.md) | A store handle is the scope, and a listing is a keyset page | Accepted | §5 |
| [0021](0021-a-held-proposal-stays-server-side-and-answers-are-by-id.md) | A held proposal stays server-side, and an answer names its id | Accepted | §5 |
| [0022](0022-the-backing-store-is-postgres-reached-by-sql.md) | The backing store is Postgres, reached by SQL | Accepted | §5 |
| [0023](0023-telemetry-narrows-the-stream-and-never-copies-the-log.md) | Telemetry narrows the event stream and never copies the log | Accepted | §6 |
| [0024](0024-emission-never-does-io-and-the-host-flushes-once.md) | Emission never does IO, and the host flushes once | Accepted | §6 |
| [0025](0025-a-journal-page-is-taken-from-an-end-and-names-both.md) | A journal page is taken from an end, and names both of its ends | Accepted | §6 |
| [0026](0026-the-revision-log-is-read-a-page-at-a-time.md) | The revision log is read a page at a time, from either end | Accepted | §5 |
| [0027](0027-identity-is-server-derived-and-absence-fails-closed.md) | Identity is server-derived, and its absence fails closed | Accepted — partially superseded by 0029 | §5 → §2, §6 |
| [0028](0028-a-tree-is-auditable-only-if-its-host-can-reproduce-the-seed.md) | A tree is auditable only if its host can reproduce the seed | Accepted | §5 → §1 |
| [0029](0029-the-approval-belongs-on-the-revision.md) | The approval belongs on the revision, not only in the journal | Accepted — partially supersedes 0027 | §5 → §6 |
| [0030](0030-the-package-ships-compiled-output.md) | The package ships compiled output | Accepted | §4 → §5 |
| [0031](0031-calibration-is-a-reader-not-a-controller.md) | Calibration is a reader, not a controller | Accepted | §6 → §2 |
| [0032](0032-an-undo-is-a-proposal-not-a-rewind.md) | An undo is a proposal, not a rewind | Accepted — partially superseded by 0035 | §2 → §5 |
| [0033](0033-the-policy-is-resolved-per-change-and-named-on-the-verdict.md) | The policy is resolved per change, and named on the verdict | Accepted | §2 → §6 |
| [0034](0034-a-sign-in-that-cannot-be-counted-is-refused.md) | A sign-in that cannot be counted is refused | Accepted | §5 |
| [0035](0035-discarded-work-is-a-stake-and-only-the-runtime-declares-it.md) | Discarded work is a stake, and only the runtime may declare it | Accepted — partially supersedes 0032 | §2 → §5 |
