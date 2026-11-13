# 0392. A segment's form arrives in the same pull as its rules, and a form that cannot be applied costs the reader their segment rather than their page

**Status:** Accepted
**Date:** 2026-11-13
**Section:** §2 — Composition Runtime; §5 (portal), the read door

## Context

[0371](0371-a-segment-is-an-audience-the-site-sorts-its-readers-into-and-loom-keeps-only-its-rules-and-its-name.md)
clause 7 builds segments in four pieces. Pieces 1 to 3 are on `main`: the
portal writes each page's ordered rule list through 0376's store, the read door
answers those lists beside the live pages (#866), the pull client holds them
and sorts each reader in the host's own process
([0385](0385-a-reader-two-segments-match-is-counted-in-the-last-ones-and-the-page-carries-it-to-its-signals.md),
#870), and the portal's figures can be narrowed to one segment (#868).

So a deployment can name a segment, sort its readers into it, and count what
they did. **It cannot yet serve them anything different**, which is what 0263
clause 4 and 0371 clause 5 are for: a segment's *form* of a page is a delta
that applies when that segment matches. Everything to compose one has existed
since 0263 — `composeTreeForContext`, and 0376's `loom_audience_forms` holding
one delta per audience per page — and nothing joins them. `src/live/pages.ts`
said so in its own docblock: *"A segment's form of a page is not something the
door answers yet, so sorting a reader names their segment and changes nothing
they see."*

This is the serve half of clause 7's piece 4. It settles how a form reaches a
reader. It deliberately does **not** settle who may write one — see
*Consequences*.

Three questions had no answer anywhere, and the wire could not be written
without them:

1. **What a reader gets when a form will not apply.** A delta authored against
   a revision the base has moved past, or one whose operations no longer fit,
   is the ordinary end state of every form: 0359's consequences say *a base
   edit stales every audience delta*. Two rules this repository already holds
   point opposite ways. A failed pull costs freshness and never the page (0358
   clause 4), so there is always a tree to render. A composition **refuses**
   rather than falling back to the base (0263 clause 4), because a reader
   served the base whose page views are filed under `aud_eu` turns *compare
   these two audiences* into a comparison between one audience's form and
   another audience's name over the base.
2. **What a rule whose segment has no form means.** It is the state every
   segment is made in, and pieces 1 to 3 shipped sorting readers into one.
   `composeTreeForContext` calls it `no-form` and refuses the request.
3. **Which forms the door sends.** 0376 keeps a form until somebody removes the
   rule that serves it — *"an audience stops being served by leaving the rules,
   not by having its form removed"* — so a project accumulates forms that match
   nobody.

## Decision

1. **The door answers `{ pages, rules, forms }`, read together and failing
   together.** `GET /api/pages/live` adds `forms`: one entry per live page
   that has a delta to serve, `{ treeId, forms }`, each form `{ audienceId,
   delta }`. The request still carries the project's key and nothing else — no
   reader, no audience, no query (0262). One read of 0376's store per page
   answers both halves (`AudienceOverlayReader.overlay`), replacing the door's
   rules-only read, because rules and forms have to describe one moment: a site
   holding one pull's rules beside another pull's forms would compose a page
   for a segment its rules no longer name.

2. **The door sends only the forms the page's rules name, in the rules'
   order.** A form whose segment is in no rule matches nobody, so sending it
   would ship a draft the site can never serve, on every pull, for as long as
   it sat in the store. The order is the rules' and not the store's because
   two deltas reaching one part resolve by the order they are applied in (0359
   clause 3), and that order is the deployment's to set. A segment named by two
   rules is sent **one** form, for `audiencesFor`'s reason: its delta is one
   delta, and applying it twice doubles whatever it inserted.

3. **A rule whose segment has no form is left out of the composition, not
   refused.** The client narrows the overlay it composes with to the rules
   whose audience has a form. A reader is still sorted into a formless segment
   — `segmentOf` reads every rule — and is served the base, which is what they
   were served on the day the segment was named. `no-form` exists for an
   overlay assembled by one writer, where a missing delta is a lost write; a
   live pull assembles its overlay from two lists the door answers
   independently, and the absence is ordinary rather than a fault.

4. **A form that cannot be applied costs the reader their segment, not their
   page.** `pageForReader(held, built, context)` answers a tree, an audience
   and a refusal. On a refusal the tree is the live base, the audience is
   `undefined`, and the `ComposeError` is handed back for the host to log. The
   reader gets a page; their signals say what they were actually shown; the
   deployment's figures stay a comparison of forms readers were served. The
   refusal is not swallowed, because a stale form is silent otherwise — and
   silently serving the base under a segment's name is the one thing 0263
   clause 4 refuses.

5. **One call is what a render path makes.** `pageForReader` subsumes
   `livePageOf(held, id) ?? built` and `segmentOf` for any host that has
   segments: the fallback to the built page, the sorting and the composition
   are one answer, so a host cannot do two of the three. `livePageOf` and
   `segmentOf` stay published and unchanged for a host with no context to give
   and for reading one half on its own.

## Consequences

- **The 11 November finding's remaining half is closed.** Point 2 of it —
  *sort each request in the host's process and compose with
  `composeTreeForContext`* — is the only one that was outstanding after #870.
  A site wiring a context now changes what readers see, where before it only
  changed what they were called.
- **Every pull carries every form of every page**, deltas included, which is
  the first thing in the answer whose size is set by how much work a project
  has done rather than by how many pages it has. That is 0263 clause 3's bargain
  — the overlay is cacheable beside the base precisely so no call is made per
  request — and it is bounded by clause 2 above rather than by the store. The
  figure to watch is the body of `/api/pages/live`; nothing measures it today
  and no deployment has a form in it yet.
- **`@jam-overture/loom/live` publishes three names that are new to the
  package** — `pageForReader`, `ServedPage` and `LivePageForms` — and carries
  three more that `/store` already published: `describeComposeError`,
  `ComposeError` and `AudienceForm`. The re-export is deliberate: a site's
  server imports `/live` and `/react`, and making it import the control plane's
  door to say why a page was served as the base would be the wrong dependency
  for one line of logging. It is the first door `/live` shares a name with, so
  its `doorsSharingNothing` moves from 18 to 17.
- **The door's `rulesOf` is now `overlaysOf`**, and `PageRulesHead` is gone in
  favour of `PageOverlay`. Both were two days old and entirely inside
  `app/_lib/pages/`. Adding forms as a second read would have been three
  queries a page per pull where two will do.
- **Whether a form is judged by the Gate is still open**, and is deliberately
  not settled here. 0371 clause 5 left it to this record; the 10 November
  finding (*a form an audience is served is a change a reader sees that no
  policy judged*) put it to the maintainer with a recommendation to leave it
  and write the asymmetry down. **Nothing above depends on the answer**: judging
  a form is a condition on `setForm`, in the portal, at the moment somebody
  writes one. This record governs the path a written form takes to a reader,
  which is the same path either way. The finding stays open.
- **Piece 4's other two halves are the portal's**: *Only for: &lt;segment&gt;*
  on a change, and the split of before and after on *Page history*. Neither is
  started, and both now have a door to read from.
- `docs/deployment.md` and the marketing site's *Connect your site* lines are
  unchanged: a deployment with no forms gets exactly the answer it got
  yesterday, with `forms: []` beside it.

## Alternatives considered

**Fall back to the base and keep the segment's name.** The smallest change, and
it is the measurement fault 0263 clause 4 was written to prevent: a segment
whose form went stale would compare as *worse than the base* for ever, and the
only trace would be that somebody once authored a delta. Rejected.

**Refuse the request outright on a stale form.** The strict reading of 0263
clause 4, and it breaks the property that makes `src/live` worth having: a site
that serves a page as it was built when Loom is unreachable should not serve a
500 because a delta somebody authored last month no longer fits. 0358 clause 4
is the older promise and the more important one.

**Treat a rule with no form as `no-form` and refuse.** Would make every segment
unserveable between being named and being given a delta — the state pieces 1 to
3 shipped, and the state a project is in for as long as somebody is deciding
what to put in it. Rejected as a regression on behaviour already on `main`.

**Send every form the store holds and let the site pick.** One fewer rule in the
door, and it ships work-in-progress for an audience nobody is being sorted into
to a customer's server, for as long as the row exists. The store keeps a
formless audience's work on purpose; that is a reason to keep the row, not a
reason to broadcast it.

**A second request for the forms, after the pages.** Keeps `rulesOf` as it is,
and loses the property that pages, rules and forms describe one moment. Two
requests can straddle an accepted change, and the client would then hold a form
authored against a revision it does not have — which is indistinguishable, at
the point of composition, from a stale form nobody rebased. Rejected.

**`pageForReader` answering a `Result`.** Symmetric with the rest of `src/`,
and wrong for a render path: the caller has a page either way, so a `Result`
would make every host write a branch whose failure arm renders the same tree as
its success arm. The refusal is a field beside the tree because it is something
to log, not something to handle.
