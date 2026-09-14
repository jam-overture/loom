# 0146 — A reader signal stays anonymous, and a funnel is correlated inside one page view

**Status:** Accepted
**Date:** 2026-09-13
**Section:** §4c (reader signals), §6 (telemetry)

## Context

Broadcasting reader signals shipped on 12 September ([0136](0136-a-published-page-broadcasts-reader-signals-when-its-host-asks.md)):
four closed kinds, no content, every batch naming its tree and revision, off
unless a host starts it. Capture, storage, aggregation and interpretation were
deferred the same day.

On 13 September the maintainer lifted that deferral and set the goal: a
deployment should be able to see, app by app, how the framework is responding to
its readers — engagement, **funnel penetration**, conversion — and the portal is
where that is shown. `docs/signals.md` is the approved plan.

The word *funnel* is the reason this record exists. The obvious way to build one
is the way every product-analytics tool builds one: identify the visitor, order
their events, stitch across pages. That is what "something analogous to Hotjar"
means if taken literally, and adopting it would reverse the property 0136 was
built around.

A reader signal today names a **node at a revision** and nothing else. It carries
no text, no URL, no typed value, and nothing about the person — the same rule
telemetry already keeps for utterances (0023). That is not an immaturity to grow
out of. It is what makes a signal safe to hand to a model, cheap to keep, and
free of the consent machinery that a record of a person requires.

But a funnel genuinely needs correlation. *Of the readers who reached the
pricing band, how many pressed the button?* cannot be computed from per-node
totals: N reached A and M activated B is not the same fact as M-of-N. Without
some key, the portal can show engagement and cannot show conversion, which is
half of what this is for.

So the question is not *whether* to correlate but **what the smallest unit of
correlation is that buys a funnel without buying surveillance.**

## Decision

**A reader signal remains anonymous and node-shaped.** No visitor id, no device
id, no IP, no fingerprint, no cross-page stitching, no session replay, no
cursor coordinates. Nothing that identifies a person, and nothing that would
become identifying when joined with something else. A kind that would carry
content is a change to 0136 and to this record, not a config option.

**Correlation is scoped to one page view.** A batch may carry a `view` key: an
opaque random value minted in the browser when a broadcast starts, identical
across the batches of that one page view, and never derived from anything about
the reader or their device. It is not a cookie, it is not stored in the browser,
and it does not survive a reload.

**The view key is aggregation input, not a stored field.** Rollup computes
per-node-per-revision counters and the funnel pairs a deployment asked for, and
the key is dropped when the raw window expires. Nothing in the portal reads it;
nothing joins on it.

**A funnel is a question about the tree, not about a person.** It is phrased as
*of the views that produced signal X on node A at revision R, how many produced
signal Y on node B* — two node addresses the deployment names, answered from
counters. There is no path, no ordering beyond the two ends, and no way to ask
about an individual.

**Retention is a per-deployment policy, not a constant.** The raw window and the
rollup horizon are configured per deployment and enforced by the runtime, with a
short default. Longer retention is expected to become something a deployment
pays for, so the number is a setting from the first commit rather than a literal
somebody has to migrate away from later.

## Consequences

- **The portal can show conversion, not cohorts.** *Of everyone who saw the
  pricing band, 23% pressed the button* is answerable. *Which visitors came back
  on Tuesday* is not, and will not become answerable by adding a field.
- **No consent banner is required by Loom itself.** A deployment may still need
  one for its own reasons, but nothing the framework broadcasts or stores is
  personal data, so adopting signals does not by itself move a host into that
  regime. Reversing this decision would, which is most of why it is a record.
- **Retention as a product tier is a supported shape rather than a later
  migration.** Because the window is configuration, selling a longer one is a
  number change per deployment. Had it shipped as a constant, the same offer
  would have meant a schema migration on live data.
- **Aggregates are the durable artefact; raw batches are a short-lived buffer.**
  A 6,000-node page with ten concurrent readers emits a batch every few seconds,
  so raw signals kept indefinitely would dwarf every other table in the database.
  `src/telemetry/retention.ts` already implements this pattern for telemetry and
  is the model to follow.
- **The view key is the one genuinely new privacy-relevant value in the seam.**
  It is written down here, with its bounds, so that a future change that widens
  it — persisting it, deriving it from anything, letting it outlive a page view —
  has to supersede this record rather than edit a field.
- **A fifth signal kind stays expensive.** 0136 made the vocabulary closed; this
  record does not open it. `completed` is approved in `docs/signals.md` as a
  named exception because it closes the funnel and carries no more than the
  existing four.

## Alternatives considered

**A visitor id, as every analytics product has.** It is what "like Hotjar" most
directly implies, and it would make cohorts, retention curves and
multi-session funnels possible. Rejected: it converts a signal into a record of a
person, which drags in consent, subject-access and deletion obligations for every
host that turns signals on, and it contradicts the rule 0136 and 0023 both keep.
The value it adds is analytics depth; the value it costs is the reason a host can
switch this on without a legal review.

**No correlation at all — per-node totals only.** The safest option and what
exists today. Rejected because it cannot answer *of the readers who saw A*, which
is the specific number the maintainer asked for and the one that makes the portal
worth paying for. A framework that can only report gross totals reports
engagement and never conversion.

**A session id scoped to the tab, surviving navigation.** Between the two, and
tempting because client-side navigation is common. Rejected for now: it starts to
resemble identity as soon as it spans pages, and the same funnel question can be
asked per view. Worth revisiting when a real multi-page funnel is asked for, as a
supersession with its own argument.

**Hashing an IP or a user agent into a key.** Rejected outright. A hash of
identifying material is identifying material; it is stable across views, and its
only advantage over the random key is that it survives a reload, which is the
property that makes it unsafe.

**Sampling instead of a correlation key.** Keeping full paths for 1% of views
would answer more questions with less volume. Rejected on the same ground as the
visitor id: a full path for one reader is a record of that reader, and being
rare does not change what it is.
