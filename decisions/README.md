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

## Correcting a record that is still right

The other thing that happens to a record: the decision stands, and a fact about
the shape it produced moves underneath it. 0002 records that the Gate is an
ordered list of rules and says how many — the first half is still exactly true
and the second was wrong for three weeks.

Superseding that would be false, because nothing was reversed. So **a record is
amended in place when only the shape moved** (0096): a dated block under the
header, before `## Context`, naming what moved, which records moved it, and
saying that nothing is reversed. The record keeps its number, its status and its
trail. The test is what a reader would do differently — a reader who would now
*act* differently needs a superseding record; a reader who would write down the
wrong number needs an amendment.

A count a record states about a list in `src/` is registered in
`src/record-claims.test.ts` and held against that list, so it fails `pnpm verify`
rather than a reader.

## The index below is generated

Write the record, then run `pnpm decisions:index`. Do not edit the table by
hand — it is rebuilt from the `**Status:**` and `**Section:**` lines of the
files themselves, and an edit here is overwritten on the next run.

`pnpm verify` fails if the committed table has drifted, if two records claim the
same number, or if a status names a record that does not exist. That set is not
hypothetical: two concurrent sessions each wrote an `0032` on the same day, and
nothing noticed until their branches met.

A number that no record claims is **reported and does not fail**
([0097](0097-a-hole-in-the-numbering-is-reported-and-a-clash-is-fatal.md)). It
appears in the table below as `*No record on this branch*`, which is what a hole
looks like when it is stated rather than stopped for — either a record was
deleted, which the process forbids, or the number is claimed on a branch that
has not merged, which is ordinary. Whichever branch lands first fills the row.

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
| [0036](0036-a-table-loom-creates-is-locked-when-it-is-created.md) | A table Loom creates is locked when it is created | Accepted | §5 → §6 |
| [0037](0037-the-journal-may-forget-and-only-a-whole-episode-at-a-time.md) | The journal may forget, and only a whole episode at a time | Accepted | §6 |
| [0038](0038-an-id-names-one-node-and-a-return-is-not-a-reuse.md) | An id names one node, and a return is not a reuse | Accepted | §1 → §5 |
| [0039](0039-the-attempt-log-is-counted-never-enumerated.md) | The attempt log is counted, never enumerated | Accepted | §5 |
| [0040](0040-a-failure-names-the-actor-who-must-clear-it.md) | A failure names the actor who must clear it | Accepted | §2 → §5 |
| [0041](0041-authorship-is-derived-from-the-log-not-carried-on-a-node.md) | Authorship is derived from the log, not carried on a node | Accepted | §1 → §5 |
| [0042](0042-a-sink-observes-and-the-runtime-contains-it.md) | A sink observes, and the runtime contains it | Accepted | §2 |
| [0043](0043-a-revision-is-a-position-a-caller-may-name.md) | A revision is a position a caller may name | Accepted | §5 → §1 |
| [0044](0044-a-move-relocates-a-subtree-and-the-analysis-measures-the-subtree.md) | A move relocates a subtree, and the analysis measures the subtree, not the phrasing | Accepted | §2 |
| [0045](0045-a-telemetry-field-added-later-is-optional-forever.md) | A telemetry field added later is optional, and never defaulted | Accepted | §6 |
| [0046](0046-a-render-test-crosses-no-boundary-the-framework-would-not.md) | A render test crosses no boundary the framework would not | Accepted | §5 |
| [0047](0047-a-verdict-belongs-to-the-gate-that-reached-it.md) | A verdict belongs to the gate that reached it | Accepted | §6 → §2 |
| [0048](0048-a-name-is-checked-by-a-fingerprint-beside-it.md) | A policy's name is checked by a fingerprint stored beside it | Accepted | §2 → §6 |
| [0049](0049-a-theme-is-three-ids-in-the-tree.md) | A theme is three registered ids, carried in the tree | Accepted | §4b → §1, §3 |
| [0050](0050-the-runtimes-props-are-namespaced-and-the-root-mounts-the-theme.md) | The runtime's props are namespaced, and the root primitive mounts the theme | Accepted | §3 → §4b |
| [0051](0051-a-slot-is-a-region-the-primitive-places.md) | A slot is a region the primitive places, not content inline in its children | Accepted | §3 → §4b |
| [0052](0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md) | A repeated item is a node; a fixed field is a prop | Accepted | §4b |
| [0053](0053-a-url-in-the-tree-is-checked-against-a-scheme-allowlist.md) | A URL in the tree is checked against a scheme allowlist | Accepted | §4b |
| [0054](0054-a-container-is-its-childs-name-plus-the-arrangement.md) | A container is its child's name plus the arrangement it puts them in | Accepted — partially superseded by 0061 | §4b |
| [0055](0055-motion-is-a-static-stylesheet-the-primitive-emits.md) | Motion is a static stylesheet the primitive emits, never a prop in the tree | Accepted | §4b |
| [0056](0056-the-demo-is-public-and-shares-nothing-but-the-deployment.md) | The demo is public, and shares nothing with the portal but the deployment | Accepted | §4b → §5 |
| [0057](0057-a-preset-is-a-deterministic-interpreter.md) | A demonstrated change is a deterministic interpreter, not a script beside the runtime | Accepted | §4b → §4c |
| [0058](0058-a-binding-is-a-question-the-tree-asks-answered-before-the-walk.md) | A binding is a question the tree asks, answered before the walk | Accepted | §4e → §3, §4b |
| [0059](0059-a-leaf-whose-whole-content-is-one-string-takes-it-as-a-child.md) | A leaf whose whole content is one string takes it as a child | Accepted | §4b |
| [0060](0060-a-primitive-owns-a-string-and-a-deployment-may-replace-it.md) | A primitive owns a string, and a deployment may replace it | Accepted — partially superseded by 0063 | §4f → §3, §4 |
| [0061](0061-a-suffix-that-names-the-markup-earns-its-place.md) | A suffix that names the markup earns its place; a suffix that names the parent does not | Accepted — partially supersedes 0054 | §4b |
| [0062](0062-a-general-arranger-is-named-for-the-arrangement-alone.md) | A general arranger is named for the arrangement alone, and a named band wins where one exists | Accepted | §4b |
| [0063](0063-a-declared-string-travels-with-the-primitive.md) | A declared string travels with the primitive; a dictionary is what a host adds | Accepted — partially supersedes 0060 | §4f → §3 |
| [0064](0064-a-primitive-says-whether-it-is-a-target-and-the-gate-derives-the-nesting.md) | A primitive says whether it is a target, and the Gate derives the nesting | Accepted | §2 → §4 |
| [0065](0065-a-submission-names-a-destination-and-never-carries-one.md) | A submission names a destination, and never carries one | Accepted | §4g → §3, §4b |
| [0066](0066-a-card-is-the-target-when-it-is-read-and-the-control-is-the-target-when-it-is-bought.md) | A card is the target when it is read; the control is the target when it is acted on | Accepted | §4b |
| [0067](0067-the-four-surfaces-are-one-application.md) | The four surfaces are one application, and a route group is a lane | Accepted | §4c, §4d, §5 |
| [0068](0068-a-primitive-is-a-target-when-the-reader-aims-at-the-whole-of-it.md) | A primitive is a target when the reader aims at the whole of it | Accepted | §4b |
| [0069](0069-a-root-relative-path-is-a-destination-a-tree-may-name.md) | A root-relative path is a destination a tree may name | Proposed — **ARCHITECTURAL, needs review.** It contradicts a clause | §4b |
| [0070](0070-the-portal-is-a-segment-and-the-marketing-site-is-the-front-door.md) | The portal is a segment, and the marketing site is the front door | Accepted | §4c, §4d, §5 |
| [0071](0071-moving-a-forms-destination-is-a-stake-of-its-own.md) | Moving a form's destination is a stake of its own | Accepted | §2 → §4g |
| [0072](0072-a-page-paints-its-ink-and-its-canvas-together.md) | A page paints its ink and its canvas together, or neither | Accepted | §4b |
| [0073](0073-a-form-with-nowhere-to-post-renders-disabled-and-says-so.md) | A form with nowhere to post renders disabled, and says so | Accepted | §4b → §4g |
| [0074](0074-a-palette-slot-that-carries-text-meets-aa.md) | A palette slot that carries text meets AA, and the palette moves rather than the bar | Accepted | §4b |
| [0075](0075-a-primitive-is-audited-under-every-shape-its-schema-closes-over.md) | A primitive is audited under every shape its schema closes over | Accepted | §4 |
| [0076](0076-loom-offers-a-host-the-contrast-bar-and-does-not-impose-it.md) | Loom offers a host the contrast bar and does not impose it | Accepted | §4b |
| [0077](0077-a-palette-is-derived-once-and-committed-as-literals.md) | A palette is derived once and committed as literals | Accepted | §4b |
| [0078](0078-the-front-door-speaks-the-visitors-language.md) | The front door speaks the visitor's language, and a test holds it there | Accepted | §4d |
| [0079](0079-a-layout-css-alone-can-express-belongs-in-the-stylesheet.md) | A layout only CSS can express belongs in the stylesheet, width query and all | Accepted | §4b |
| [0080](0080-a-doc-comment-in-src-is-written-to-a-stranger.md) | A doc comment in `src/` is written to a stranger | Accepted | §4c |
| [0081](0081-the-front-door-demonstrates-statelessly-and-the-address-is-the-state.md) | The front door demonstrates statelessly, and the address is the whole of the state | Accepted | §4d |
| [0082](0082-a-refusal-says-what-became-of-the-repair.md) | A refusal says what became of the repair | Accepted | §2 |
| [0083](0083-a-scoped-request-sends-the-scope.md) | A scoped request sends the scope, not the page it sits on | Accepted | §2 |
| [0084](0084-in-a-two-dimensional-band-rows-are-nodes-and-columns-are-positions.md) | In a two-dimensional band, rows are nodes and columns are positions | Accepted | §4b |
| [0085](0085-a-font-pack-declares-a-face-when-something-reads-it.md) | A font pack declares a face when something reads it | Accepted | §4b |
| [0086](0086-a-behaviour-is-a-control-the-runtime-builds-and-a-primitive-places.md) | A behaviour is a control the runtime builds and a primitive places | Accepted | §4b |
| [0087](0087-a-primitive-that-posts-declares-it-and-the-audit-checks.md) | A primitive that posts declares it, and the audit checks the declaration against what it renders | Accepted | §4b |
| [0088](0088-a-hold-is-a-row-and-a-take-is-one-statement.md) | A hold is a row, and taking it is one statement | Accepted | §3 |
| [0089](0089-the-text-ramp-is-held-to-four-grounds.md) | The text ramp is held to four grounds, and a pairing is measured whether one primitive paints it or two compose it | Accepted | §4b |
| [0090](0090-a-probe-that-declines-says-whether-it-got-as-far-as-calling.md) | A probe that declines says whether it got as far as calling the component | Accepted | §4 |
| [0091](0091-motion-stops-in-edit-mode-and-that-is-where-a-decorative-duplicate-belongs.md) | Motion stops in edit mode, and that is where a decorative duplicate belongs | Accepted | §4b |
| [0092](0092-a-disclosure-control-owns-its-button-and-the-primitive-owns-the-region.md) | A disclosure control owns its button and the primitive owns the region | Accepted | §4b |
| [0093](0093-a-decorative-copy-is-the-same-children-without-identity.md) | A decorative copy is the same children without identity | Accepted | §4b |
| [0094](0094-a-cards-prose-is-a-child-when-the-card-has-a-flow.md) | A card's prose is a child when the card has a flow, and a prop when it does not | Accepted | §4b |
| [0095](0095-a-frame-carries-its-url-and-the-deployment-carries-the-origins.md) | A frame carries its URL, and the deployment carries the origins | Accepted | §3, §4b |
| [0096](0096-a-behaviour-publishes-a-value-on-the-element-the-primitive-placed-it-in.md) | A behaviour publishes a value on the element the primitive placed it in | Accepted | §4b |
| [0097](0097-a-hole-in-the-numbering-is-reported-and-a-clash-is-fatal.md) | A hole in the decision numbering is reported, and a clash is fatal | Accepted | §1 (process) |
| [0098](0098-an-anchor-is-a-reserved-key-the-runtime-checks-and-a-primitive-places.md) | An anchor is a reserved key the runtime checks and a primitive places | Accepted | §4b |
| [0099](0099-a-record-is-amended-when-only-the-count-moved.md) | A record is amended in place when only the count moved | Accepted | §2 |
| [0100](0100-a-same-origin-path-is-not-a-scheme.md) | A same-origin path is not a scheme | Proposed — **ARCHITECTURAL, needs review.** It contradicts a clause | §4b |
| [0101](0101-the-loom-namespace-is-the-frameworks-and-the-cli-will-not-write-in-it.md) | The `loom.` namespace is the framework's, and the CLI will not write in it | Accepted | §4 (CLI), §4c |
| [0102](0102-a-same-origin-path-is-decided-by-resolving-it.md) | A same-origin path is decided by resolving it, not by matching it | Proposed — **ARCHITECTURAL, needs review.** It shares | §4b |
| 0103 | *No record on this branch* | — | — |
| 0104 | *No record on this branch* | — | — |
| 0105 | *No record on this branch* | — | — |
| [0106](0106-a-band-asks-its-own-container-for-a-width-not-the-window.md) | A band asks its own container for a width, not the window | Proposed — **ARCHITECTURAL, needs review.** It reverses a named | §4b |
| 0107 | *No record on this branch* | — | — |
| 0108 | *No record on this branch* | — | — |
| 0109 | *No record on this branch* | — | — |
| [0110](0110-an-entrance-the-reader-drives-is-a-wrapper-not-a-prop-on-every-band.md) | An entrance the reader drives is a wrapper primitive, not a prop on every band | Accepted | §4b |
| 0111 | *No record on this branch* | — | — |
| 0112 | *No record on this branch* | — | — |
| 0113 | *No record on this branch* | — | — |
| 0114 | *No record on this branch* | — | — |
| [0115](0115-three-fields-of-one-shape-are-a-list-wearing-three-names.md) | Three fields of one shape are a list wearing three names | Proposed — `ARCHITECTURAL — needs review` | §4b |
