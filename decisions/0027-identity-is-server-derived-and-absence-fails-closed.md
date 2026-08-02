# 0027. Identity is server-derived, and its absence fails closed

**Status:** Accepted — partially superseded by 0029
**Date:** 2026-08-01
**Section:** §5 → §2, §6

## Context

`Provenance.actor` has existed since day 1 and has never been set. Every change
the portal has ever written is attributed to an origin (`user-instruction`) and
to nobody. The audit trail the whole runtime is built around — inspectable,
gateable, attributable, reversible — has been three of those four.

Two things forced it now. The portal is deployed on a public URL with a model key
behind it, which day 18's deployment note already called out as somebody else's
spend available to anyone with the link. And `/history` (0026) made the gap
visible: the page renders `provenance.actor ?? provenance.origin`, and it has
always rendered the fallback.

The question is not only "add auth". It is three questions that had to be
answered together, because answering any one of them differently changes the
other two:

1. Where does an actor come from, and who is allowed to assert one?
2. A held proposal has two people — the one who asked and the one who approved.
   Where is the second one recorded?
3. What happens when a deployment has no identity configured at all?

## Decision

**An actor is derived on the server from a session, never accepted from a caller.
The answer to a held proposal is attributed separately from the ask. A
deployment with no identity configured admits nobody.**

### The actor is derived, not claimed

`EditIntent` gains an optional `actor`, which the interpreter copies into
`Provenance.actor` exactly as it already copies `origin`. Nothing in the runtime
parses it: it is an opaque string a host defines, which is what the maintainer
settled on day 22.

Optional in the runtime, because `system-signal` and `scheduled-adaptation` have
nobody to name. Not optional in the portal, where the three server actions each
obtain it from `requireActor()` and there is no code path to `commitIntent`
without one.

The credential *is* the identity. A reviewer presents an access key and the
roster says who that is; there is no name field beside it. A name that can be
typed is a name that can be typed by anyone, and 0017's argument against
client-asserted `origin` — that an unfalsifiable claim is not evidence — applies
with more force to who is making the claim.

### The approval is attributed separately from the ask

A hold exists precisely to put a second person in the way of a change. Recording
only `provenance.actor` would make every confirmed change look like somebody
waving through their own request.

So `confirmHeld` and `discardHeld` take a `ProposalAnswer` — the proposal id and
who answered — and the `hold-confirmed` / `hold-discarded` events carry the
actor. It travels together with the id rather than as an optional trailing
argument, so a host omits it deliberately rather than by forgetting there was a
second parameter.

**The approval lands in the journal, not in the revision log.** The log records
what changed and where it came from; who allowed it is something that happened,
and 0023 already made the event stream the place events live. `episodesOf` folds
it back as `answeredBy`, kept distinct from `provenance.actor` at every stage.

### Absence fails closed

Everywhere else in this portal, missing configuration degrades honestly: no
`DATABASE_URL` means memory, no API key means the prompt box says so. Auth is
the deliberate exception. Those degradations announce themselves — a write
vanishes, a box is disabled. A portal that quietly degrades to open access looks
exactly like a portal that is working correctly, and the only signal that it is
not is somebody else's activity in your journal.

So: no session secret, or no roster, and nobody signs in. The sign-in page names
the variable that is missing, because an operator who has just deployed this
needs the name of the thing they forgot rather than "not recognised".

## Consequences

- **Everything written before today is unattributed, and stays that way.** The
  log is append-only and 0016 makes it the truth; back-filling an actor onto
  revisions nobody can prove the author of would put a fact in the record that
  was never observed. `/history` will show a mix of attributed and unattributed
  revisions indefinitely. That is the correct history.
- **"Who approved this revision" requires the journal as well as the log.** A
  revision alone cannot answer it. This is the direct cost of keeping the
  approval out of the log, and it is real: a deployment that loses its journal
  keeps the change and loses who allowed it. Recording an `answeredBy` on the
  stored revision would fix it and is the obvious counter-proposal — see below.
- The roster is configuration, so adding or removing a reviewer is a redeploy,
  and revoking one is a value edited in a dashboard. Acceptable for a handful of
  alpha reviewers; not acceptable for anything larger, which is the boundary at
  which this record should be revisited rather than stretched.
- **There is no rate limit on sign-in.** The key is long and compared in
  constant time, but nothing slows down an attacker guessing. Tracked as an open
  question rather than pretended away.
- A single key per reviewer means a leaked key is a leaked identity, and the only
  revocation is rotating it. There is no session invalidation short of rotating
  the signing secret, which invalidates everyone's.
- The session is a bearer cookie: HttpOnly, SameSite=Lax, `Secure` outside
  development, twelve hours, no sliding renewal.
- Both the guard and the value-producing check exist — the proxy turns
  unauthenticated requests away, and `requireActor` runs inside every page and
  action. Two checks that could disagree is the failure worth preventing, so
  neither is optional: the proxy covers the page somebody forgets to guard, and
  `requireActor` covers the matcher somebody edits.

## Alternatives considered

**An identity provider — Supabase Auth, Auth.js, OIDC.** Rejected for now, not
on principle. The store is already on Supabase, so its auth is the closest thing
to free available. But 0022 deliberately reached Postgres by SQL rather than
adopting the Supabase client, and adopting it here would pull that dependency in
through a side door. More decisively: an IdP implies a lifecycle — invitation,
recovery, deactivation, consent — and an implied lifecycle nobody built is worse
than an explicit list of four people. `currentActor` / `requireActor` is the seam
this is behind, so replacing the roster later changes what mints the cookie and
moves no page and no action.

**One shared password, with the reviewer typing their name.** Rejected: it makes
every attribution in the journal a claim anyone holding the password can forge,
which is most of the value of having it.

**Recording `answeredBy` on the stored revision**, so the log alone answers who
approved a change. Genuinely better on the merits and rejected only on scope: it
is a column, a migration and a `TreeStore` contract change, one run after 0026
changed that contract, and this run had a portal to make safe first. The reasons
to want it are recorded above as a consequence rather than buried, and it should
be the first thing reconsidered if anything ever depends on the log without the
journal.

**A development escape hatch — open access when `NODE_ENV !== "production"`.**
Rejected outright. An escape hatch that opens on an environment variable is an
escape hatch that ships, and the failure is silent by construction. Local
development sets two variables in `.env.local` instead, which is documented.

**Trusting the presence of a session cookie in the proxy and verifying only in
pages.** Rejected: a guard that checks a cookie exists is a guard anyone passes
by setting one. The signature is verified in both places.
