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

`Status` is one of `Proposed`, `Accepted`, `Superseded by NNNN`, or `Refused`.

`Refused` is for a proposal that was decided against rather than overtaken. It
says what `Proposed` for ever cannot — that somebody answered — and what
`Superseded by NNNN` gets wrong, which is that the record was accepted first.
Where a successor holds instead, name it after the opener; the reference is
reciprocal like any other (0193). 0220 is the first.

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
amended in place when only the shape moved** (0099): a dated block under the
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
| [0020](0020-a-store-handle-is-the-scope-and-a-listing-is-a-page.md) | A store handle is the scope, and a listing is a keyset page | Accepted — partially superseded by 0278 | §5 |
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
| [0081](0081-the-front-door-demonstrates-statelessly-and-the-address-is-the-state.md) | The front door demonstrates statelessly, and the address is the whole of the state | Superseded by [0328](0328-the-marketing-site-has-no-demonstration-and-no-mechanism-page.md) | §4d |
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
| [0103](0103-a-control-carries-a-class-and-its-display-is-a-custom-property.md) | A control carries a class, and its display is a custom property | Accepted | §4b |
| [0104](0104-the-runtime-publishes-its-fixtures-and-its-contract-suites.md) | The runtime publishes its fixtures and its contract suites | Accepted | §1, §2, §6 |
| [0105](0105-a-render-can-hand-back-values-instead-of-references.md) | A render can hand back values instead of references | Accepted | §3 |
| [0106](0106-a-band-asks-its-own-container-for-a-width-not-the-window.md) | A band asks its own container for a width, not the window | Proposed — **ARCHITECTURAL, needs review.** It reverses a named | §4b |
| [0107](0107-a-font-pack-may-say-where-a-face-is-and-the-runtime-never-fetches-it.md) | A font pack may say where a face is, and the runtime never fetches it | Accepted | §3 |
| [0108](0108-a-repair-restates-the-request-and-the-runtime-measures-it.md) | A repair restates the request, and the runtime measures it rather than making it cheaper | Accepted | §2 |
| [0109](0109-an-inverse-in-hand-is-proposable-without-a-store-and-it-is-never-stamped-loom-revert.md) | An inverse in hand is proposable without a store, and the runtime never puts its own name on one it did not plan | Superseded by [0137](0137-an-undo-already-computed-is-assembled-by-the-runtime-and-stamped-by-its-caller.md) | §2 |
| [0110](0110-an-entrance-the-reader-drives-is-a-wrapper-not-a-prop-on-every-band.md) | An entrance the reader drives is a wrapper primitive, not a prop on every band | Accepted | §4b |
| [0111](0111-the-revision-an-undo-puts-back-is-a-field-on-provenance.md) | The revision an undo puts back is a field on provenance, because provenance is the part of a proposal a log keeps | Accepted | §2 |
| [0112](0112-a-second-listing-on-the-hold-store-scoped-by-the-handle-and-keyed-by-two-columns.md) | A hold store lists what the handle can see, and its cursor is two columns because an instant is not a key | Accepted | §5 |
| [0113](0113-the-pairings-probe-reports-where-it-stops-looking-rather-than-inventing-a-price.md) | The pairings probe reports where it stops looking, rather than inventing a price | Accepted | §4b |
| [0114](0114-a-primitive-declares-what-part-it-plays-and-the-registry-is-asked.md) | A primitive declares what part it plays, and the registry is what gets asked | Accepted | §1 |
| [0115](0115-three-fields-of-one-shape-are-a-list-wearing-three-names.md) | Three fields of one shape are a list wearing three names | Proposed — `ARCHITECTURAL — needs review` | §4b |
| [0116](0116-a-screenshot-is-taken-by-the-repository-and-playwright-is-never-a-dependency.md) | A screenshot is taken by the repository, and Playwright is never a dependency | Accepted | §1 (process) |
| [0117](0117-one-harness-two-subjects-a-tree-it-renders-and-an-address-you-serve.md) | One harness, two subjects: a tree it renders and an address you serve | Accepted — partially superseded by [0191](0191-the-harness-may-start-the-application-because-there-is-now-only-one.md) | §1 (process) |
| [0118](0118-a-citation-is-a-claim-and-only-a-link-can-be-checked.md) | A citation is a claim, and only a link can be checked | Accepted | §1 (process) |
| [0119](0119-the-page-a-reader-gets-is-the-one-pnpm-verify-reads-last.md) | The page a reader gets is the one `pnpm verify` reads last | Accepted | §1 (process) |
| [0120](0120-a-starting-composition-is-a-subtree-a-catalogue-hands-to-the-ordinary-seam.md) | A starting composition is a subtree a catalogue hands to the ordinary seam | Accepted | §4b |
| [0121](0121-part-of-a-tree-is-rendered-by-the-seam-and-the-seam-mounts-the-theme.md) | Part of a tree is rendered by the seam, and the seam is what mounts the theme | Accepted | §1 |
| [0122](0122-a-primitive-says-which-of-its-props-a-reader-reads.md) | A primitive says which of its props a reader reads, and empty is not silence | Accepted | §1 |
| 0123 | *No record on this branch* | — | — |
| 0124 | *No record on this branch* | — | — |
| [0125](0125-a-geometric-property-is-asserted-over-the-page-not-the-primitive.md) | A geometric property is asserted over the page, not the primitive | Accepted | §4b |
| 0126 | *No record on this branch* | — | — |
| 0127 | *No record on this branch* | — | — |
| 0128 | *No record on this branch* | — | — |
| 0129 | *No record on this branch* | — | — |
| [0130](0130-atmosphere-is-a-wrapper-and-the-paints-are-one-vocabulary.md) | Atmosphere is a wrapper primitive, and the paints are one shared vocabulary | Accepted | §4b |
| [0131](0131-what-a-palette-cannot-say-about-itself-is-measured-from-it.md) | What a palette cannot say about itself is measured from it, never declared on it | Accepted | §4b |
| [0132](0132-a-type-that-mirrors-a-schema-is-derived-from-it.md) | A type that mirrors a schema is derived from it | Accepted | §2 |
| 0133 | *No record on this branch* | — | — |
| 0134 | *No record on this branch* | — | — |
| [0135](0135-a-same-origin-frame-is-granted-what-its-own-document-needs.md) | A same-origin frame is granted what its own document needs | Accepted — it changes no schema, no tree and no delta model, and | §4d |
| [0136](0136-a-published-page-broadcasts-reader-signals-when-its-host-asks.md) | A published page broadcasts reader signals when its host asks | Accepted | §3, §6 |
| [0137](0137-an-undo-already-computed-is-assembled-by-the-runtime-and-stamped-by-its-caller.md) | An undo already computed is assembled by the runtime, and stamped by its caller | Accepted — supersedes 0109 | §2 |
| [0138](0138-a-queue-can-be-told-which-of-its-holds-are-already-dead.md) | A queue can be told which of its holds are already dead, and a head it could not read is a third answer rather than an optimistic one | Accepted | §2 |
| [0139](0139-a-shared-ledger-is-union-merged-and-a-generated-file-is-regenerated.md) | A shared ledger is union-merged, and a generated file is regenerated | Accepted | §1 (process) |
| [0140](0140-a-call-into-foreign-code-has-a-ceiling-and-the-runtime-owns-it.md) | A call into foreign code has a ceiling, and the runtime owns it | Accepted | §2 (interpretation), §4c (the data seam) |
| 0141 | *No record on this branch* | — | — |
| 0142 | *No record on this branch* | — | — |
| 0143 | *No record on this branch* | — | — |
| 0144 | *No record on this branch* | — | — |
| [0145](0145-a-light-that-marks-one-of-several-is-a-wrapper-and-it-is-carried-by-distance.md) | A light that marks one of several is a wrapper, and it is carried by distance rather than by colour | Accepted | §4b |
| [0146](0146-a-reader-signal-stays-anonymous-and-a-funnel-is-correlated-inside-one-page-view.md) | A reader signal stays anonymous, and a funnel is correlated inside one page view | Accepted | §4c (reader signals), §6 (telemetry) |
| [0147](0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md) | A rollup is added to what is stored, and a distinct-view count is therefore approximate | Accepted | §4c (reader signals), §6 (telemetry) |
| 0148 | *No record on this branch* | — | — |
| 0149 | *No record on this branch* | — | — |
| [0150](0150-a-container-that-must-aggregate-publishes-a-custom-property-and-the-browser-does-the-arithmetic.md) | A container that must aggregate over its children publishes a custom property, and the browser does the arithmetic | Accepted | §4b |
| 0151 | *No record on this branch* | — | — |
| 0152 | *No record on this branch* | — | — |
| 0153 | *No record on this branch* | — | — |
| 0154 | *No record on this branch* | — | — |
| [0155](0155-a-container-may-only-add-to-its-children-what-they-left-unspoken.md) | A container may only add to its children what they left unspoken, so a shared treatment lives in a class and never on the element | Accepted | §4b |
| [0156](0156-the-two-states-a-bound-region-is-in-are-primitives-and-not-props-on-every-container.md) | The two states a bound region is in are primitives, and not props on every container | Accepted | §4b |
| [0157](0157-the-catalogues-public-surface-is-the-list-and-the-lookup-not-every-band-by-name.md) | The catalogue's public surface is the list and the lookup, not every band by name | Accepted | §4b |
| [0158](0158-counting-a-window-of-reader-signals-and-forgetting-it-are-one-operation.md) | Counting a window of reader signals and forgetting it are one operation | Accepted | §4c (reader signals) |
| [0159](0159-an-instrument-may-reach-a-state-and-may-never-assert-one.md) | An instrument may reach a state, and may never assert one | Accepted | §1 (process) |
| [0160](0160-a-prop-that-unblocks-a-rendering-names-the-content-and-never-the-layout.md) | Where a rendering depends on a fact about the content that no rule can observe, the tree declares the fact and never the layout | Accepted | §4b |
| [0161](0161-a-public-page-writes-to-one-application-endpoint-and-is-counted-by-a-key-that-outlives-nothing.md) | A public page writes to one application endpoint, and is counted by a key that outlives nothing | Accepted | §4c (reader signals), §5 (the application) |
| [0162](0162-the-catalogue-is-a-phrasebook-and-the-page-is-one-path-through-it.md) | The catalogue is a phrasebook of designs, and the page is one derived path through it | Accepted | §4b |
| [0163](0163-a-binding-is-weighed-like-a-destination.md) | A binding is weighed like a destination, and its params are half of it | Accepted | §2 |
| [0164](0164-a-resolution-that-cannot-answer-is-not-a-node-that-did-not-ask.md) | A resolution that cannot answer is not a node that did not ask | Accepted | §2 |
| [0165](0165-an-anchor-belongs-to-the-part-and-is-unique-over-the-assembled-page.md) | An anchor belongs to the part, and uniqueness is asserted over the assembled page | Accepted | §4b |
| [0166](0166-a-level-the-scale-cannot-place-is-the-heaviest-one.md) | A list that ranks is checked where it is written, and a level the scale cannot place is the heaviest one | Accepted for the first half (the completeness check), **Proposed for | §2 |
| [0167](0167-a-delegated-signal-names-the-regions-it-happened-inside.md) | A delegated signal names the regions it happened inside, and a region is counted in views rather than in presses | Accepted | §6 |
| [0168](0168-a-band-links-into-the-page-it-is-assembled-into.md) | A band links into the page it is assembled into, and the page is where that is checked | Accepted | §4b |
| [0169](0169-a-declaration-is-what-makes-a-value-a-missing-word.md) | A declaration is what makes a value a missing word | Accepted | §2 (the authoring SDK's copy seam) |
| [0170](0170-a-library-is-a-set-to-choose-from-and-a-vocabulary-is-priced-per-entry.md) | A library is a set to choose from, and a vocabulary is priced per entry | Accepted | §4, measured through the §2 interpretation prompt |
| [0171](0171-a-page-part-is-earned-by-the-region-it-occupies.md) | A page part is earned by the region it occupies, not by the content it holds | Accepted | §4b |
| [0172](0172-what-a-deployment-offers-a-model-is-one-value.md) | What a deployment can offer a model is one value, and three more vocabularies go in it | Accepted | §2 (interpretation), reaching §4d, §5 and §6 |
| [0173](0173-a-change-may-not-add-a-node-the-deployment-cannot-draw.md) | A change may not add a node the deployment cannot draw | Accepted | §2 |
| [0174](0174-a-band-wears-the-treatment-its-own-content-earns.md) | A band wears the treatment its own content earns, and adds to its ground rather than replacing it | Accepted | §4b |
| [0175](0175-a-listing-skips-the-row-it-cannot-read-and-fails-the-one-it-cannot-place.md) | A listing skips the row it cannot read and fails the one it cannot place, and a store that did not answer is a different word from a row that did not parse | Accepted | §5, reaching §2 and the portal's front door |
| [0176](0176-a-control-may-be-answerable-to-another-control-and-they-agree-through-the-dom.md) | A control may be answerable to another control, and the two agree through the DOM rather than through the seam | Accepted | §4h — the behaviour seam |
| [0177](0177-the-specification-is-a-page-part-and-it-sits-between-the-figure-and-the-price.md) | The specification is a page part, and it sits between the figure that persuades and the price | Accepted | §4b |
| [0178](0178-a-ground-is-not-always-an-ancestor-and-bg-overlay-is-the-fifth-ground-the-text-ramp-is-held-to.md) | A ground is not always an ancestor, and `bg-overlay` is the fifth ground the text ramp is held to | Accepted | §4b — the palette contrast bar and the derivation behind it |
| [0179](0179-what-a-primitive-accepts-is-a-vocabulary-the-write-path-is-handed-not-a-field-on-a-policy.md) | What a primitive accepts is a vocabulary the write path is handed, not a field on a policy | Accepted | §2 |
| [0180](0180-a-primitive-that-draws-an-answer-declares-the-shape-it-can-draw.md) | A primitive that draws an answer declares the shape it can draw, and a row that came from a database is never a node | Accepted | §4b → §4e |
| [0181](0181-a-primitive-declares-the-binding-names-it-reads-and-saying-nothing-is-not-saying-none.md) | A primitive declares the binding names it reads, and saying nothing is not saying none | Accepted | §2, reaching the catalogue, the interpreter's prompt and the render walk |
| [0182](0182-a-shot-may-reach-a-state-it-does-not-photograph-and-may-name-the-document-it-reaches-into.md) | A shot may reach a state it does not photograph, and may name the document it reaches into | Accepted | §1 (process) |
| [0183](0183-a-page-for-another-kind-of-business-is-the-same-sequence-with-different-nodes-in-it.md) | A page for another kind of business is the same sequence with different nodes in it | Accepted | §4b |
| [0184](0184-a-primitive-may-read-under-whichever-name-a-prop-gives.md) | A primitive may read under whichever name a prop gives, and says so as a declaration rather than a name | Accepted | §2, reaching the catalogue, the interpreter's prompt and the render walk |
| [0185](0185-a-probe-is-handed-answers-the-way-it-is-handed-props.md) | A probe is handed answers the way it is handed props, and a specimen declares the reply rather than the source | Accepted | §4, not the library |
| [0186](0186-a-whats-on-band-occupies-the-come-back-region.md) | A what's-on band occupies the come-back region, so it is a design of `articles` and not a twenty-third part | Accepted | §4b |
| [0187](0187-a-frame-with-no-picture-in-it-is-not-the-pictures-shape.md) | A frame with no picture in it does not take the picture's shape | Accepted | §4b |
| [0188](0188-a-specimen-may-ask-to-be-hydrated-and-one-function-builds-the-page-for-both-renders.md) | A specimen may ask to be hydrated, and one function builds the page for both renders | Accepted | §4, not the library |
| [0189](0189-a-portrait-with-no-photograph-is-the-persons-initials-and-a-portrait-with-nobody-named-is-nothing.md) | A portrait with no photograph is the person's initials, and a portrait with nobody named is nothing | Accepted | §4b |
| [0190](0190-a-route-group-may-contribute-a-sitemap-and-may-not-contribute-a-robots-txt.md) | A route group may contribute a sitemap and may not contribute a robots.txt | Accepted | §4d |
| [0191](0191-the-harness-may-start-the-application-because-there-is-now-only-one.md) | The harness may start the application, because there is now only one | Accepted — partially supersedes 0117 | §1 (process) |
| [0192](0192-a-region-a-primitive-places-is-a-region-it-may-ground.md) | A region a primitive places is a region it may ground | Accepted | §4b |
| [0193](0193-a-status-line-is-data-and-a-supersession-is-written-at-both-ends.md) | A status line is data: its opener is a closed set, and a supersession is written at both ends | Accepted | §1 (process) |
| [0194](0194-the-framework-is-the-package-and-everything-that-uses-it-ships-separately.md) | The framework is the package, and everything that uses it ships separately | Accepted | §1 (process), §4 (SDK) |
| [0195](0195-a-shot-may-say-what-the-browser-started-with-and-it-says-it-as-data.md) | A shot may say what the browser started with, and it says it as data | Accepted | §1 (process) |
| [0196](0196-a-paint-is-sized-by-the-box-it-is-given-and-says-so-when-it-cannot-be.md) | A paint is sized by the box it is given, and says so when it cannot be | Accepted | §4b |
| [0197](0197-a-host-may-ask-which-way-round-a-palette-is-and-a-frame-standing-in-for-the-page-is-handed-both-ends.md) | A host may ask which way round a palette is, and a frame standing in for the page is handed both ends | Accepted | §4b |
| [0198](0198-a-refusal-records-which-rules-it-broke-and-the-rules-names-are-a-closed-vocabulary.md) | A refusal records which rules it broke, and the rules' names are a closed vocabulary | Accepted | §6 (telemetry), binding on §2 |
| [0199](0199-the-outline-may-render-what-it-addresses-and-a-hand-may-yet-move-a-node.md) | The outline may render what it addresses, and a hand may yet move a node | Proposed | §5 |
| [0200](0200-the-portal-may-place-a-lever-beside-the-evidence-and-a-model-may-never-pull-one.md) | The portal may place a lever beside the evidence, and a model may never pull one | Proposed | §5 |
| [0201](0201-a-display-line-and-a-reading-line-are-two-measures.md) | A display line and a reading line are two measures | Accepted | §4b |
| [0202](0202-the-harness-measures-the-content-a-clip-hides-and-it-is-not-scrollwidth.md) | The harness measures the content a clip hides, and it is not `scrollWidth` | Accepted | §1 (process) |
| [0203](0203-a-props-vocabulary-is-handed-the-props-a-primitive-is-handed.md) | A props vocabulary is handed the props a primitive is handed | Accepted | §2 |
| [0204](0204-a-rule-with-no-fill-beside-it-is-measured-in-delta-e.md) | A rule with no fill beside it is measured in ΔE, not in contrast ratio | Accepted | §4b |
| [0205](0205-a-line-the-library-declares-is-measured-against-every-ground-it-is-drawn-on.md) | A line the library declares is measured against every ground it is drawn on | Accepted | §4b |
| [0206](0206-a-primitive-declares-what-it-could-not-show-and-the-runtime-decides-whether-to-say-so.md) | A primitive declares what it could not show, and the runtime decides whether to say so | Accepted | §3 |
| [0207](0207-a-primitive-that-arranges-only-glyphs-inherits-its-alignment.md) | A primitive that arranges only glyphs inherits its alignment | Accepted | §4b |
| [0208](0208-a-question-nothing-reads-is-refused-before-it-is-written.md) | A question nothing reads is refused before it is written | Accepted | §2 |
| [0209](0209-what-an-adapter-owes-the-runtime-is-a-suite-not-a-sentence.md) | What an adapter owes the runtime is a suite, not a sentence | Accepted | §2 |
| [0210](0210-a-primitive-may-lock-the-pages-scroll-from-the-stylesheet-and-only-while-its-own-region-is-open.md) | A primitive may lock the page's scroll from the stylesheet, and only while its own region is open | Accepted | §4b |
| [0211](0211-a-completion-is-a-form-the-browser-let-go.md) | A completion is a form the browser let go, and it carries the bands it was the end of | Accepted | §6 |
| [0212](0212-what-a-reader-signal-means-is-joined-to-the-tree-when-it-is-read.md) | What a reader signal means is joined to the tree when it is read, and the tree is what makes silence a measurement | Accepted | §6 |
| [0213](0213-the-harness-reads-a-box-it-prints-the-number-and-the-judgement-stays-in-the-report.md) | The harness reads a box, it prints the number, and the judgement stays in the report | Accepted | §1 (process) |
| [0214](0214-where-readers-are-is-a-floored-bucket-counted-at-the-door-and-a-page-view-says-when-it-began.md) | Where readers are is a floored bucket counted at the door, and a page view says when it began | Accepted | §4c (reader signals) |
| [0215](0215-a-stake-rule-either-reads-a-policy-or-is-fixed-at-its-code-and-only-the-first-kind-can-be-asked-again.md) | A stake rule either reads a policy or is fixed at its code, and only the first kind can be asked again | Accepted | §6 (telemetry), binding on §2 |
| [0216](0216-a-published-double-derives-whatever-the-runtime-derives.md) | A published double derives whatever the runtime derives | Accepted | §2 |
| [0217](0217-choosing-a-two-region-primitive-is-itself-an-insert-decision.md) | Choosing a two-region primitive is itself an insert decision | Accepted | §4b |
| [0218](0218-what-a-counter-means-is-published-and-the-browser-pays-for-the-number-and-not-its-name.md) | What a counter means is published, and the browser pays for the number and not its name | Accepted | §4c (reader signals) |
| [0219](0219-a-page-view-is-counted-once-at-the-door-and-the-over-count-in-the-node-counters-is-a-measurement.md) | A page view is counted once at the door, and the over-count in the node counters is a measurement | Accepted | §4c (reader signals) |
| [0220](0220-an-app-is-a-registry-a-policy-and-a-store-and-loom-has-one-of-each.md) | An app is a registry, a policy and a store — and Loom has one of each | Refused — [0260](0260-a-project-is-the-unit-loom-stores-governs-and-measures-under.md) holds instead | §1, §5 |
| [0221](0221-where-reading-stops-is-a-fall-between-two-siblings-and-a-ratio-of-two-counts-off-one-row-set.md) | Where reading stops is a fall between two siblings, and a ratio of two counts off one row set | Accepted | §4c (reader signals) |
| [0222](0222-a-structured-reason-travels-with-the-judgment-and-the-prose-is-for-readers-only.md) | A structured reason travels with the judgment, and the prose is for readers only | Accepted | §2 |
| [0223](0223-a-prop-is-copy-when-a-reader-could-quote-it.md) | A prop is copy when a reader could quote it, and a glyph is not a quote | Accepted | §1 |
| [0224](0224-a-before-and-after-reading-compares-two-shares-and-a-pair-the-change-dissolved-is-an-answer.md) | A before-and-after reading compares two shares, and a pair the change dissolved is an answer | Accepted | §4c (reader signals) |
| [0225](0225-a-judgment-is-joined-to-a-revision-by-a-bounded-lookup-and-the-lookup-says-what-it-did-not-reach.md) | A judgment is joined to a revision by a bounded lookup, and the lookup says what it did not reach | Accepted | §6 |
| [0226](0226-a-primitive-declares-where-its-control-rests-and-the-control-publishes-nothing-until-the-reader-moves-it.md) | A primitive declares where its control rests, and the control publishes nothing until the reader moves it | Accepted | §4b |
| [0227](0227-an-inline-link-is-its-own-primitive-and-its-colour-is-the-paragraphs.md) | An inline link is its own primitive, and its colour is the paragraph's | Accepted | §4b |
| [0228](0228-the-tree-as-it-was-is-a-fold-bounded-at-both-ends-and-the-head-is-answered-from-the-log.md) | The tree as it was is a fold bounded at both ends, and the head is answered from the log | Accepted | §2 |
| [0229](0229-a-share-of-readers-is-estimated-against-the-appearances-and-bounded-against-the-openings.md) | A share of readers is estimated against the appearances and bounded against the openings | Accepted | §4c (reader signals) |
| [0230](0230-a-part-was-read-when-readers-had-time-for-its-words-and-only-the-skim-is-a-safe-claim.md) | A part was read when readers had time for its words, and only the skim is a safe claim | Accepted | §4c (reader signals) |
| [0231](0231-a-funnel-is-three-shares-of-the-arrivals-and-the-straddle-is-the-one-error-here-that-leans-down.md) | A funnel is three shares of the arrivals, and the straddle is the one error here that leans down | Accepted | §4c (reader signals) |
| [0232](0232-the-shell-mounts-a-theme-and-registers-no-primitives.md) | The shell mounts a theme and registers no primitives | Accepted | §4 (the application shell) |
| [0233](0233-a-bound-twin-is-earned-by-a-system-of-record-and-a-row-shape-the-primitive-can-declare.md) | A bound twin is earned by a system of record and a row shape the primitive can declare | Accepted | §4b |
| [0234](0234-a-primitive-may-name-a-control-from-the-tree-and-its-declared-string-is-the-floor.md) | A primitive may name a control from the tree, and its declared string is the floor | Accepted | §4h — the behaviour seam |
| [0235](0235-how-much-of-a-page-gets-read-is-a-share-of-words-that-partition-it-and-the-typical-reader-is-a-ceiling.md) | How much of a page gets read is a share of words that partition it, and the typical reader's figure is a ceiling | Accepted | §4c (reader signals) |
| [0236](0236-a-viewport-names-a-device-and-the-pointer-is-part-of-it.md) | A viewport names a device, and the pointer is part of it | Accepted | §1 (process) |
| [0237](0237-a-presentation-returns-the-reader-to-its-trigger-and-only-from-inside-the-region-it-closed.md) | A presentation returns the reader to its trigger, and only from inside the region it closed | Accepted | §4h — the behaviour seam |
| [0238](0238-a-funnel-end-the-revision-no-longer-has-is-a-standing-and-what-is-withheld-is-per-figure.md) | A funnel end the revision no longer has is a standing, and what is withheld is per figure | Accepted | §4c (reader signals) |
| [0239](0239-a-change-is-read-against-the-words-both-revisions-say-and-a-floor-costs-the-page-total-and-not-the-passage.md) | A change is read against the words both revisions say, and a floor costs the page total and not the passage | Accepted | §4c (reader signals) |
| [0240](0240-a-silence-is-a-condition-and-a-subject-and-the-two-names-for-one-state-were-not-synonyms.md) | A silence is a condition and a subject, and the two names for one state were not synonyms | Accepted | §4c (reader signals) |
| [0241](0241-a-policy-is-a-logged-object-and-what-changed-is-a-view-over-the-log.md) | A policy is a logged object, and what changed is a view over the log | Accepted | §2 → §5 |
| [0242](0242-what-readers-did-is-a-share-off-one-row-and-a-leaf-has-no-inside.md) | What readers did is a share off one row, and a leaf has no inside | Accepted | §4c (reader signals) |
| [0243](0243-a-picture-is-proved-against-an-older-library-photographed-with-this-harness.md) | A picture is proved against an older library, photographed with this harness | Accepted | §1 (process) |
| [0244](0244-a-pace-moved-because-the-words-moved-or-the-readers-did-and-a-counterfactual-says-which.md) | A pace moved because the words moved or the readers did, and a counterfactual says which | Accepted | §4c (reader signals) |
| [0245](0245-a-second-page-sequence-is-earned-by-regions-in-a-different-order-and-the-sites-own-regions-are-shared.md) | A second page sequence is earned by regions in a different order, and the site's own regions are shared | Proposed — **ARCHITECTURAL, needs review** | §4b |
| [0246](0246-a-bound-primitives-failure-region-is-a-slot-over-its-declared-sentence.md) | A bound primitive's failure region is a slot over its declared sentence, and one slot serves both failure answers | Accepted | §4b |
| [0247](0247-a-readership-comparison-is-built-from-two-floored-maps-and-the-mix-is-the-only-figure-with-no-window.md) | A readership comparison is built from two floored maps, and the mix is the only figure that survives having no window | Accepted | §4c (reader signals) |
| [0248](0248-which-optional-checks-were-in-place-is-named-on-the-judgment-beside-the-rules-that-were-consulted.md) | Which optional checks were in place is named on the judgment, beside the rules that were consulted | Accepted | §2 → §5 |
| [0249](0249-a-region-the-primitive-does-not-place-is-a-diagnostic.md) | A region the primitive does not place is a diagnostic, and the declaration is the promise | Accepted | §3 (render seam) |
| [0250](0250-a-deployment-is-ordered-by-readers-lost-at-the-doors-scale-and-a-page-the-door-cannot-scale-is-out-of-the-order.md) | A deployment is ordered by readers lost at the door's scale, and a page the door cannot scale is out of the order | Accepted | §4c (reader signals) |
| [0251](0251-a-change-to-what-readers-did-is-a-ratio-of-two-shares-and-an-inside-a-change-gave-a-part-is-not-a-reader.md) | A change to what readers did is a ratio of two shares, and an inside a change gave a part is not a reader | Accepted | §4c (reader signals) |
| [0252](0252-the-write-path-refuses-a-region-nothing-places-and-the-vocabularies-arrive-as-one-record.md) | The write path refuses a region nothing places, and the vocabularies arrive as one record | Accepted | §2 (the write path), binding on §3 |
| [0253](0253-the-audit-reports-the-bound-primitives-it-was-not-handed-an-answer-for.md) | The audit reports the bound primitives it was not handed an answer for, and being answered under the wrong name is the same report | Accepted | §4, not the library |
| [0254](0254-the-testing-door-publishes-one-primitive-broken-in-whichever-way-the-caller-names.md) | The testing door publishes one primitive broken in whichever way the caller names, and the fault is named for what the author did | Accepted | §1 (process), §3 (render seam) |
| [0255](0255-a-primitive-is-blocked-by-what-its-schema-requires-and-not-by-what-its-description-pictures.md) | A primitive is blocked by what its schema requires, not by what its description pictures | Accepted | §5 |
| [0256](0256-a-kinds-share-of-the-readers-who-met-it-is-a-weighted-mean-of-sound-shares-at-the-doors-scale.md) | A kind's share of the readers who met it is a weighted mean of sound shares, and the weight is the door's | Accepted | §4c (reader signals) |
| [0257](0257-a-kind-of-part-is-read-across-the-places-it-stands-and-the-unit-is-the-placement.md) | A kind of part is read across the places it stands, and the unit is the placement and never the reader | Accepted | §4c (reader signals) |
| [0258](0258-a-refusal-names-the-nearest-registered-ids-and-says-how-many-it-stands-in-for.md) | A refusal names the nearest registered ids and says how many it stands in for | Accepted | §3 (render seam), §4 (data and submission seams) |
| [0259](0259-a-surface-the-portal-governs-renders-from-the-store-and-a-page-built-at-render-time-is-not-one.md) | A surface the portal governs renders from the store, and a page built at render time is not one | Accepted | §1, §5 |
| [0260](0260-a-project-is-the-unit-loom-stores-governs-and-measures-under.md) | A project is the unit Loom stores, governs and measures under | Accepted — refuses 0220 | §1, §5 |
| [0261](0261-a-portal-screen-shows-state-and-the-record-lives-in-one-place.md) | A portal screen shows state, and the record lives in one place | Accepted | §5 |
| [0262](0262-the-control-plane-is-hosted-and-the-render-path-stays-in-the-customers-app.md) | The control plane is hosted and the render path stays in the customer's app | Accepted | §1, §5 |
| [0263](0263-a-page-is-a-base-tree-and-the-deltas-an-audience-earns.md) | A page is a base tree and the deltas an audience earns | Accepted | §1, §3, §5 |
| [0264](0264-a-report-s-visual-is-stored-at-the-size-the-page-was-laid-out-at.md) | A report's visual is stored at the size the page was laid out at | Accepted | §1 (process) |
| [0265](0265-what-readers-do-inside-a-kind-of-part-is-a-share-of-the-readers-who-met-it-and-the-door-is-only-a-weight.md) | What readers do inside a kind of part is a share of the readers who met it, and the door is only a weight | Accepted | §4c (reader signals) |
| [0266](0266-a-change-to-a-kind-of-part-is-read-over-the-places-both-windows-bore.md) | A change to a kind of part is read over the places both windows bore, and that is the one denominator here with no reader in it | Accepted | §4c (reader signals) |
| [0267](0267-the-probe-reports-every-configuration-and-the-audit-judges-only-the-ones-the-schema-accepts.md) | The probe reports every configuration it tried, and the audit calls a fault only what the schema accepts | Accepted | §4, not the library |
| [0268](0268-a-page-is-put-back-by-proposing-the-change-that-puts-it-back-and-a-store-never-deletes.md) | A page is put back by proposing the change that puts it back, and a store never deletes | Accepted | §2, §6 |
| [0269](0269-an-application-is-the-unit-loom-governs-and-a-project-groups-them.md) | An application is the unit Loom governs, and a project groups them | Accepted | §3 (portal) |
| [0270](0270-a-change-to-the-words-a-kind-of-part-says-is-read-over-the-words-both-windows-say-and-a-floor-costs-the-signed-figure.md) | A change to the words a kind of part says is read over the words both windows say, and a floor costs the signed figure | Accepted | §4c (reader signals) |
| [0271](0271-a-fault-in-a-deployments-collection-is-named-by-what-it-costs-and-a-pages-readers-are-counted-once.md) | A fault in a deployment's collection is named by what it costs, with the hand it falls to, and a page's readers are counted once | Accepted | §4c (reader signals) |
| [0272](0272-who-presses-a-reseed-is-the-gate-s-question-and-the-answer-is-what-the-reseed-costs.md) | Who presses a reseed is the Gate's question, and the answer is what the reseed costs | Accepted | §2 (the store), §4 (the Gate), §6 (the log) |
| [0273](0273-the-reader-tables-take-the-application-now-and-the-audience-when-it-is-ratified.md) | The reader tables take the application now and the audience when it is ratified | Accepted | §5 (signals), §3 (portal) |
| [0274](0274-a-page-view-row-says-when-the-fold-last-touched-it-and-a-stall-is-judged-against-a-schedule-the-deployment-hands-in.md) | A page-view row says when the fold last touched it, and a stall is judged against a schedule the deployment hands in | Accepted | §4c (reader signals) |
| [0275](0275-a-connection-is-a-read-path-and-a-write-back-path-and-loom-never-writes-into-the-customers-store.md) | A connection is a read path and a write-back path, and Loom never writes into the customer's store | Accepted | §1, §5 |
| [0276](0276-a-patch-field-says-set-cleared-or-unchanged-and-clearing-removes-the-key.md) | A patch field says set, cleared or unchanged, and clearing removes the key | Accepted | §2 (the store), §3 (portal) |
| [0277](0277-a-listing-carries-when-the-page-last-changed-and-the-absence-means-never.md) | A listing carries when the page last changed, and an absent stamp means never | Accepted | §5 (the store), §3 (portal) |
| [0278](0278-a-listing-ordered-by-recency-is-a-second-ordering-and-a-second-cursor.md) | A listing ordered by recency is a second ordering, and a second cursor | Accepted — partially supersedes 0020 | §5 (the store), §3 (portal) |
| [0279](0279-a-kinds-share-of-the-readers-who-met-it-is-compared-at-each-windows-own-weights-and-a-counterfactual-says-which-side-moved.md) | A kind's share of the readers who met it is compared at each window's own weights, and a counterfactual says which side moved | Accepted | §4c (reader signals) |
| [0280](0280-the-words-of-a-kind-of-part-the-typical-reader-reached-are-weighted-once-per-page-and-a-floor-withholds-every-difference.md) | The words of a kind of part the typical reader reached are weighted once per page, and a floor withholds every difference | Accepted | §4c (reader signals) |
| [0281](0281-the-answers-a-resolution-was-built-from-are-published-as-data-and-the-far-side-re-plans.md) | The answers a resolution was built from are published as data, and the far side re-plans | Accepted | §4 (the binding seam) |
| [0282](0282-a-word-nothing-can-be-said-about-is-in-no-mass-and-a-page-that-reports-no-reach-has-no-mean.md) | A word nothing can be said about is in no mass, and a page that reports no reach has no mean | Accepted | §4c (reader signals) |
| [0283](0283-a-declared-ramp-step-is-a-maximum-and-the-browser-reads-the-width.md) | A declared ramp step is a maximum, and the browser is what reads the width | Accepted | §4b (the theme) |
| [0284](0284-a-signal-names-the-audience-it-was-collected-under-and-the-predicate-stays-in-the-control-plane.md) | A signal names the audience it was collected under, and the predicate stays in the control plane | Accepted | §5 (signals), §1 (schema) |
| [0285](0285-an-account-is-a-row-with-a-minted-key-and-a-role-is-a-ceiling-on-the-gates-own-scale.md) | An account is a row with a minted key, and a role is a ceiling on the Gate's own scale | Accepted | §5 (portal), §2 (the Gate) |
| [0286](0286-a-pinned-press-is-one-that-leaves-the-document-and-the-harness-says-which-presses-it-refused.md) | A pinned press is one that leaves the document, and the harness says which presses it refused | Accepted | §1 (process) |
| [0287](0287-a-share-of-a-pages-words-is-a-share-of-the-words-the-window-can-speak-for-and-spoken-for-is-one-predicate.md) | A share of a page's words is a share of the words the window can speak for, and *spoken for* is one predicate | Accepted | §4c (reader signals) |
| [0288](0288-a-change-to-a-funnel-is-two-shares-that-factor-and-a-difference-of-two-floors-is-a-bracket.md) | A change to a funnel is two shares that factor, and a difference of two floors is a bracket | Accepted | §4c (reader signals) |
| [0289](0289-a-project-is-closed-rather-than-deleted-and-closing-is-a-column-and-a-filter.md) | A project is closed rather than deleted, and closing is a column and a filter | Accepted | §5 (the store), §3 (portal) |
| [0290](0290-a-reading-is-of-one-audience-and-two-forms-of-a-page-are-two-readings-rather-than-one-handed-in-twice.md) | A reading is of one audience, and two forms of a page are two readings rather than one handed in twice | Accepted | §4c (reader signals) |
| [0291](0291-a-deployments-change-is-two-orders-at-the-doors-scale-because-a-page-has-no-net-movement.md) | A deployment's change is two orders at the door's scale, because a page has no net movement | Accepted | §4c (reader signals) |
| [0292](0292-a-project-holds-at-most-one-repository-and-a-repository-belongs-to-at-most-one-project.md) | A project holds at most one repository, and a repository belongs to at most one project | Accepted | §5 (portal), §3 (the connection) |
| [0293](0293-a-comparison-pairs-pages-by-form-and-the-pairing-rule-is-published-beside-the-reading-rule.md) | A comparison pairs pages by form, and the pairing rule is published beside the reading rule | Accepted | §4c (reader signals) |
| [0294](0294-a-comparison-is-of-one-readership-and-a-pair-that-proves-two-audiences-is-refused.md) | A comparison is of one readership, and a pair that proves two audiences is refused | Accepted | §4c (reader signals) |
| [0295](0295-a-library-comparison-reports-the-populations-it-was-taken-over-and-refuses-none-of-them.md) | A library comparison reports the populations it was taken over and refuses none of them, and a form gained is told from a page published | Accepted | §4c (reader signals) |
| [0296](0296-a-project-holds-exactly-one-application-and-the-portal-never-names-it.md) | A project holds exactly one application, and the portal never names it | Accepted | §5 (portal), §1 (the hierarchy) |
| [0297](0297-a-region-map-publishes-the-populations-it-summed-and-two-forms-arrivals-are-one-readership.md) | A region map publishes the populations it summed, and two forms' arrivals are one readership | Accepted | §4c (reader signals) |
| [0298](0298-a-projects-ingest-key-is-public-and-names-its-application-and-the-door-files-nothing-it-cannot-name.md) | A project's ingest key is public and names its application, and the door files nothing it cannot name | Accepted | §5 (portal), §4c (reader signals) |
| [0299](0299-a-deployment-wide-door-adds-every-forms-arrivals-and-waits-on-the-oldest-fold-under-it.md) | A deployment-wide door adds every form's arrivals, and waits on the oldest fold under it | Accepted | §4c (reader signals) |
| [0300](0300-what-audience-a-reading-is-of-is-a-three-way-answer-and-a-window-of-two-forms-is-read-as-neither.md) | What audience a reading is of is a three-way answer, and a window of two forms is read as neither | Accepted | §4c (reader signals) |
| [0301](0301-a-refused-reading-is-not-a-page-nobody-read-and-the-census-travels-with-the-progress.md) | A refused reading is not a page nobody read, and the census travels with the progress | Accepted | §4c (reader signals) |
| [0302](0302-two-forms-of-one-page-are-compared-at-each-forms-own-share-and-neither-side-is-earlier.md) | Two forms of one page are compared at each form's own share, and neither side is earlier | Accepted | §4c (reader signals) |
| [0303](0303-what-two-forms-readers-do-is-the-same-pair-at-a-different-counter-and-the-page-has-one-honest-figure.md) | What two forms' readers *do* is the same pair at a different counter, and the page has one honest figure | Accepted | §4c (reader signals) |
| [0304](0304-an-unwalked-window-has-no-share-and-nothing-untouched-to-give-and-the-rule-belongs-to-the-reading.md) | An unwalked window has no share and nothing untouched to give, and the rule belongs to the reading | Accepted | §4c (reader signals) |
| [0305](0305-what-two-forms-say-is-compared-over-the-text-they-share-and-the-page-figure-is-a-third-argument.md) | What two forms say is compared over the text they share, and the page figure is a third argument | Accepted | §4c (reader signals) |
| [0306](0306-a-ratio-names-the-state-it-has-no-quotient-in-and-the-rule-is-published-once.md) | A ratio names the state it has no quotient in, and the rule is published once | Accepted | §4c (reader signals) |
| [0307](0307-a-distance-between-a-mix-and-nothing-is-withheld-and-the-invariant-both-rolls-rest-on-is-asserted.md) | A distance between a mix and nothing is withheld, and the invariant both rolls rest on is asserted | Accepted | §4c (reader signals) |
| [0308](0308-a-comparison-of-two-populations-is-not-a-window-nobody-read.md) | A comparison of two populations is not a window nobody read | Proposed — **architectural, needs review.** It reverses one clause | §4c (reader signals) |
| [0309](0309-a-window-of-counters-is-read-into-the-readings-it-holds-and-the-trees-stay-the-callers.md) | A window of counters is read into the readings it holds, and the trees stay the caller's | Accepted | §4c (reader signals) |
| [0310](0310-a-person-signs-in-with-an-email-and-a-password-the-provider-holds-and-the-deployment-names-who-may.md) | A person signs in with an email and a password the provider holds, and the deployment names who may | Proposed | §5 (portal) |
| [0311](0311-a-refusal-whose-key-was-right-is-counted-against-its-project-and-one-without-one-is-not.md) | A refusal whose key was right is counted against its project, and one without one is not | Proposed | §5 (portal), §4c (reader signals) |
| [0312](0312-a-site-hands-loom-a-snapshot-of-its-pages-with-a-secret-key-and-loom-never-runs-its-code.md) | A site hands Loom a snapshot of its pages with a secret key, and Loom never runs its code | Accepted | §5 (portal), §1 |
| [0313](0313-what-a-page-collects-is-published-to-the-reader-it-collects-about.md) | What a page collects is published to the reader it collects about, derived from the configuration and never written by hand | Accepted | §4c (reader signals) |
| [0314](0314-a-batch-delivered-twice-is-folded-once-and-the-window-is-how-wide-that-promise-is.md) | A batch delivered twice is folded once, and the window is how wide that promise is | Accepted | §4c (reader signals) |
| [0315](0315-a-window-answers-where-its-readers-were-at-a-floor-it-is-handed-and-the-readership-is-published-beside-the-forms.md) | A window answers where its readers were, at a floor it is handed, and the readership is published beside the forms it splits into | Accepted | §4c (reader signals) |
| [0316](0316-a-windows-counters-are-one-write-because-a-window-written-per-audience-has-a-state-between-the-writes.md) | A window's counters are one write, because a window written per audience has a state between the writes | Accepted | §4c (reader signals) |
| [0317](0317-the-window-a-deployment-sweeps-on-is-read-where-its-other-settings-are-and-a-window-it-cannot-read-stops-the-sweep.md) | The window a deployment sweeps on is read where its other settings are, and a window it cannot read stops the sweep | Accepted | §4c (reader signals) |
| [0318](0318-a-windows-before-and-after-pairs-are-one-per-form-and-they-are-its-latest-two-revisions.md) | A window's before-and-after pairs are one per form, and they are its latest two revisions | Accepted | §4c (reader signals) |
| [0319](0319-the-two-libraries-a-window-holds-are-assembled-from-a-placing-the-deployment-hands-in.md) | The two libraries a window holds are assembled from a placing the deployment hands in, and a form nobody can place is on neither side | Accepted | §4c (reader signals) |
| [0320](0320-a-notice-publishes-when-a-delivery-goes-and-the-deployment-states-the-sweep-that-takes-it.md) | A notice publishes when a delivery goes, and the deployment states the sweep that takes it | Accepted | §4c (reader signals) |
| [0321](0321-a-sweep-judges-the-published-retention-ceiling-against-the-oldest-delivery-it-found.md) | A sweep judges the published retention ceiling against the oldest delivery it found | Accepted | §4c (reader signals) |
| [0322](0322-a-window-is-read-off-one-deployment-context-and-the-region-floor-is-not-optional.md) | A window is read off one deployment context, and the region floor is not optional | Accepted | §4c (reader signals) |
| [0323](0323-the-pages-a-places-readers-read-are-published-at-a-floor-on-the-cell.md) | The pages a place's readers read are published at a floor on the cell, and a place with no page above it is unattributable rather than unread | Accepted | §4c (reader signals) |
| [0324](0324-what-a-window-could-not-answer-is-a-census-over-its-silences-and-a-page-is-counted-once.md) | What a window could not answer is a census over its silences, and a page is counted once | Accepted | §4c (reader signals) |
| [0325](0325-a-kinds-pace-is-a-pooled-ratio-over-its-outermost-placements-and-an-unscaled-page-is-kept.md) | A kind's pace is a pooled ratio over its outermost placements, and an unscaled page is kept | Accepted | §4c (reader signals) |
| [0326](0326-a-quiet-window-and-a-refusing-door-are-two-states-and-a-refusal-names-no-page.md) | A quiet window and a refusing door are two states, and a refusal names no page | Accepted | §4c (reader signals) |
| [0327](0327-the-figures-a-window-holds-about-itself-are-a-second-rung-and-a-region-row-set-is-deduplicated-once.md) | The figures a window holds about itself are a second rung, and a region row set is deduplicated once | Accepted | §4c (reader signals) |
| [0328](0328-the-marketing-site-has-no-demonstration-and-no-mechanism-page.md) | The marketing site has no demonstration and no mechanism page | Accepted — supersedes 0081 | §4d |
| [0329](0329-loom-proposes-changes-to-a-published-page-from-what-its-readers-did-on-a-copy-that-starts-as-that-page.md) | Loom proposes changes to a published page from what its readers did, on a copy that starts as that page | Accepted | §5 (portal), §3 (write path), §4c (reader signals) |
| [0330](0330-the-page-to-fix-first-is-not-the-page-to-fix-when-its-own-fault-made-the-fall.md) | The page to fix first is not the page to fix when its own fault made the fall | Accepted | §4c (reader signals) |
| [0331](0331-a-marketing-page-is-served-per-request-because-the-store-governs-it.md) | A marketing page is served per request because the store governs it | Accepted | §4d, §5 |
| [0332](0332-every-model-call-for-a-project-is-paid-with-that-projects-own-key-kept-sealed.md) | Every model call for a project is paid with that project's own key, kept sealed | Accepted | §5 (portal), the reasoning plane |
| [0333](0333-the-browsers-own-furniture-is-outside-the-tree-so-a-host-is-handed-a-root-rule-for-its-document.md) | The browser's own furniture is outside the tree, so a host is handed a `:root` rule for its document | Accepted | §4b |
