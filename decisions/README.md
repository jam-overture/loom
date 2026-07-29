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

## Changing direction

**Never edit a record to reflect a change of direction.** Mark the old one
`Superseded by NNNN`, leave its text intact, and write a new record explaining
what changed and why the earlier reasoning no longer holds. The trail is the
artefact.

A change that contradicts an `Accepted` record is an escalation, not a
refactor: write the replacement with status `Proposed`, flag it for review, and
leave the existing record standing until someone decides.

## Index

| #                                                            | Title                                                        | Status   | Section |
| ------------------------------------------------------------ | ------------------------------------------------------------ | -------- | ------- |
| [0001](0001-tree-and-delta-as-the-unit-of-change.md)         | The tree and the delta are the unit of AI-authored change     | Accepted | §1      |
| [0002](0002-gate-is-a-pure-function-of-two-axes.md)          | The Gate is a pure function of two independent axes           | Accepted | §2      |
| [0003](0003-ai-drafts-the-runtime-names.md)                  | AI drafts a change; the runtime names what it creates         | Accepted | §2      |
| [0004](0004-model-facing-schema-is-a-projection.md)          | The model-facing schema is a projection, not the AST          | Accepted | §2      |
| [0005](0005-model-access-is-an-optional-adapter.md)          | Model access is a narrow seam with an optional adapter        | Accepted | §2      |
| [0006](0006-one-repair-attempt-and-both-halves-recorded.md)  | A refused proposal gets exactly one repair attempt            | Accepted | §2      |
| [0007](0007-confidence-is-self-graded-and-must-be-calibrated.md) | Confidence is self-graded, trusted on purpose, and must be calibrated | Accepted | §2 → §6 |
| [0008](0008-the-renderer-is-a-total-pure-projection.md)      | The renderer is a total, pure projection of the tree           | Accepted | §3      |
| [0009](0009-primitives-receive-props-in-a-bag.md)            | Primitives receive AI-authored props in a bag, never spread    | Accepted | §3 → §4 |
| [0010](0010-edit-mode-decorates-it-does-not-restructure.md)  | Edit mode decorates; it never invents DOM                      | Accepted | §3 → §5 |
| [0011](0011-a-primitive-declares-its-props-and-the-seam-enforces-them.md) | A primitive declares its props, and the render seam enforces them | Accepted | §4      |
| [0012](0012-conformance-is-probed-and-reported-not-enforced.md) | Conformance is probed and reported, never enforced by registration | Accepted | §4      |
| [0013](0013-the-registry-is-what-the-model-is-told-it-may-build.md) | The registry is what the model is told it may build              | Accepted | §4 → §2 |
