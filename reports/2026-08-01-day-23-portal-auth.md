# 2026-08-01 (day 23) — the portal learns who is asking

**Build order section:** §5 — the Portal. Reaches back into §2 (the intent and
its provenance) and §6 (what the journal keeps).

**Branch:** `day-23-portal-auth`, off `main` at `24c6a08`

---

## Where this run started

No open PR — #30 merged. The maintainer replied on it: **"sounds good for next
steps."** That confirms day 22's three recommendations in order, and this run
took the first: **portal auth**.

Nothing else on #30 needed addressing.

---

## What was built

**The portal knows who you are, and every change now says so.**

`Provenance.actor` has existed since day 1 and had never once been set. Every
change the portal has ever written was attributed to an origin and to nobody —
`/history` renders `provenance.actor ?? provenance.origin`, and it has always
rendered the fallback. The runtime's claim is that a change is inspectable,
gateable, attributable and reversible; it has been three of those four.

It is now four:

- **`/sign-in`** — a reviewer pastes an access key and the roster says who that
  is. There is no name field. The key *is* the identity, because a name that can
  be typed is a name anyone can type.
- **Nothing else is reachable without a session.** The proxy guard verifies the
  cookie's signature — not its presence — and sends everything else to sign-in,
  remembering where it was going.
- **The actor comes from the session, in every write.** `EditIntent.actor`
  travels beside `origin`, the interpreter copies it into provenance exactly as
  it already copies `origin`, and the three server actions each get theirs from
  `requireActor()`. Nothing accepts an actor from a form, a header, or a query
  string.
- **The answer to a held proposal is attributed separately from the ask.** These
  are two people, and that is the entire reason a hold exists.

Recorded as **0027**. The screenshots alongside this report are a real run
against the real model: one ask accepted at confidence 0.72, one held at 0.55 and
confirmed, both attributed to `ana@loom.local` — the ask and the answer on
separate lines, as different facts.

---

## The three decisions inside "add auth"

Auth sounds like one decision. It is three, and answering any of them differently
changes the other two.

### 1. Where does an actor come from?

From a session, server-side, or it does not exist. 0017 already rejected a
client-asserted `origin` on the grounds that an unfalsifiable claim is not
evidence; who is making the claim deserves the same treatment, more so.

So the credential is the identity. A reviewer presents a key; the roster maps it
to a name. The alternative — one shared password and a name field — would make
every attribution in the journal forgeable by anyone holding the password, which
is most of the value of having attribution at all.

### 2. Who is recorded when a human answers a hold?

A hold exists precisely to put a **second** person in the way of a change.
Recording only `provenance.actor` would make every confirmed change look like
somebody waving through their own request.

So `confirmHeld` and `discardHeld` take a `ProposalAnswer` — the proposal id and
who answered, together in one object rather than as an optional trailing
argument, so a host omits the actor deliberately rather than by forgetting there
was a second parameter. The `hold-confirmed` and `hold-discarded` events carry
it, `episodesOf` folds it back as `answeredBy`, and it is kept distinct from
`provenance.actor` at every stage including the page that renders it.

**The approval lands in the journal, not in the revision log.** The log records
what changed and where it came from; who allowed it is something that *happened*,
and 0023 already made the event stream where events live. The cost is real and
0027 records it as a consequence rather than burying it: "who approved this
revision" now needs both stores, and a deployment that loses its journal keeps
the change and loses who allowed it. The fix — an `answeredBy` on the stored
revision — is a column, a migration and a `TreeStore` contract change one run
after 0026 changed that contract, so it is written up as the leading alternative
rather than done in passing. See the open questions.

### 3. What happens when nothing is configured?

**Nobody signs in.** This is the deliberate exception to how the rest of this
portal behaves.

Everywhere else, absence degrades honestly: no `DATABASE_URL` means memory, no
API key means the prompt box says so. Those degradations announce themselves — a
write vanishes, a box is disabled. A portal that quietly degraded to *open
access* would look exactly like a portal that is working correctly, and the only
signal that it is not is somebody else's activity in your journal.

A development escape hatch (`NODE_ENV !== "production"` means open) was
considered and rejected outright: an escape hatch that opens on an environment
variable is an escape hatch that ships, and its failure is silent by
construction. Local development sets two variables in `.env.local`, and
`apps/portal/.env.example` now exists to say which.

---

## Decisions I made that weren't specified

1. **A roster in configuration, not a users table.** An IdP — Supabase Auth is
   nearly free here, since the database is already Supabase — implies a lifecycle
   (invitation, recovery, deactivation) that nothing in this portal implements,
   and an implied lifecycle nobody built is worse than an explicit list of four
   people. It would also pull the Supabase client in through a side door, which
   0022 deliberately avoided. `currentActor` / `requireActor` is the seam it sits
   behind, so swapping the roster for OIDC later changes what mints the cookie
   and moves no page and no action.

2. **Both a proxy guard and an in-page check, and neither is optional.** The
   guard gives the blanket property that a per-page check cannot: the page
   somebody adds next month is covered without anyone remembering. `requireActor`
   gives the value a page actually needs, covers a server action (a POST to a
   route the matcher could be edited out from under), and covers a session that
   expires between rendering a form and submitting it. Two checks that could
   disagree is the failure worth preventing, so they verify identically —
   signature, then expiry, one implementation.

3. **`middleware.ts` is `proxy.ts`.** Next 16.2 deprecated the old filename and
   warned on every build. Same hook, and it now always runs on the Node runtime.

4. **Signature before expiry, in that order.** Expiry is read out of the token,
   so checking it first means trusting a number an unauthenticated caller wrote.
   A forged token claiming a distant expiry would be answered "expired: no"
   before anything established it was a token at all. There is a test for exactly
   this.

5. **Every roster entry is compared even after one matches.** Stopping early
   makes the response time a measure of how far down the roster a key matched,
   which for a short list is a usable oracle — a caller could learn the position
   of a valid key without ever holding one.

6. **One message for a wrong key, whoever it did or did not belong to.** "No such
   reviewer" would turn the sign-in form into a way to enumerate the roster. A
   *missing configuration* is the opposite case and names the variable, because
   an operator who has just deployed this needs the name of the thing they forgot.

7. **`safeReturnPath` is an allow-list with its own tests.** `//evil.example` is
   read by browsers as protocol-relative, so a leading-slash check alone turns
   the portal's own sign-in form into an open redirector. It also refuses to send
   a freshly signed-in reviewer back to `/sign-in`, which would be a loop.

8. **The actor is `EditIntent.actor`, optional in the runtime and mandatory in
   the portal.** Optional because `system-signal` and `scheduled-adaptation` have
   nobody to name — not so a host may skip it for a human ask. In the portal
   there is no code path to `commitIntent` without one.

9. **Who you are is shown in the top bar on every page.** A name you are acting
   under without being able to see it is one you cannot check before you act.
   Sign-out is a form, not a link: it clears a cookie, which is a write, and a GET
   that ends a session can be triggered by any page that makes the browser fetch
   it.

10. **`/activity` now renders both halves.** The fold was carrying `actor` and
    `answeredBy` and the page was showing neither, which would have been the
    whole feature landing invisibly. `describeAnswer` distinguishes *nobody has
    answered yet* (a queue) from *answered with no name recorded* (a gap in the
    record) — rendering those the same way would hide the second.

11. **The session is twelve hours with no sliding renewal.** A window that
    extends itself whenever it is used never closes.

---

## Decision records

| #    | Title                                                     | Status   |
| ---- | --------------------------------------------------------- | -------- |
| 0027 | Identity is server-derived, and its absence fails closed   | Accepted |

Nothing superseded. **No ARCHITECTURAL escalation:** 0027 adds an optional field
to `EditIntent` and changes the argument shape of two `write/` functions. It does
not touch the tree schema or the delta model, nothing already stored changes
shape, and it contradicts no Accepted record — 0017 (one server-side write path)
is what it extends, and 0023 (telemetry narrows the stream) is what puts the
approval in the journal rather than the log.

---

## Test coverage / status

```
@loom/runtime   63 files, 640 tests   green   (was 63 / 630)
@loom/portal    12 files,  99 tests   green + build   (was 8 / 48)
```

`pnpm verify` green across the workspace, offline, with no database and no API
key required. Nothing skipped, nothing weakened, no test disabled.

The 10 new runtime tests: an actor accepted and an empty one refused on the
intent schema (2); provenance carrying the intent's actor and leaving it absent
when there was none (2); `confirmHeld` naming who answered, leaving it absent
when the host names nobody, and `discardHeld` naming the reviewer who said no
(3); the narrowing keeping who asked and who answered (2); the fold keeping the
asker and the answerer apart (1).

The 51 new portal tests are four new files:

- **`session.test.ts` (16)** — mint and read back; an actor with characters a URL
  would escape; a token whose actor was edited; one whose issue time was pushed
  forward; one signed by another deployment's secret; the expiry boundary
  exactly; six malformed shapes; a forgery told apart from an unreadable token;
  a forgery with an open claimed window still called a forgery; and
  `timingSafeEqual` including that it does not stop at the first differing byte.
- **`roster.test.ts` (13)** — one reviewer, several, separators and whitespace, an
  email as an actor id, a key containing colons; and the five refusals: empty,
  not `actor:key`, an actor that would not survive display, a key under the
  minimum, the same actor twice. Plus `authenticate` matching, not matching, and
  refusing a truncated key.
- **`config.test.ts` (8)** — including the one that states the decision: nothing
  configured fails closed rather than admitting everyone.
- **`paths.test.ts` (8)** — the public allow-list, segment boundaries, and the
  four return-path refusals including protocol-relative.

Plus 5 on `describeIntent` / `describeAnswer` in `episode-view.test.ts`.

**Verified in a browser against the live model,** not only in tests: a deep link
redirected to sign-in and came back to where it was going; a forged cookie was
refused (`curl` with a hand-written token → 307); two asks were interpreted by
`claude-opus-5`, one accepted at 0.72 and one held at 0.55 and confirmed; both
appear on `/activity` and `/history` attributed to `ana@loom.local`, with the ask
and the answer on separate lines. Sign-out restored the guard. Four screenshots
alongside this report.

The model is unchanged — `DEFAULT_INTERPRETER_MODEL` is `claude-opus-5`, chosen
on day 3 and not revisited. No test requires a key.

---

## Open questions for the next session

1. **`answeredBy` on the stored revision.** Right now "who approved this
   revision" needs the log *and* the journal, and a deployment that loses its
   journal keeps the change and loses who allowed it. 0027 records this as a
   known cost. **Recommend** taking it next: it is a column on `loom_revisions`,
   a `StoredRevision` field, and both store implementations — the same shape of
   change as 0026, and the reason to do it now is the same reason 0026 was worth
   doing now, that nothing outside this repo implements `TreeStore` yet.

2. **Nothing rate-limits sign-in.** The keys are long and compared in constant
   time, but a guesser is not slowed down. **Recommend** leaving it for now and
   keeping Vercel's Deployment Protection in front of the deployment — a real
   limiter needs shared state across serverless instances, which means the
   database, and that is a bigger unit than it looks.

3. **Revocation is coarse.** Removing a reviewer is a redeploy; invalidating one
   session means rotating the secret and signing everyone out. Acceptable for
   four alpha reviewers, and the boundary at which 0027 should be revisited
   rather than stretched. No action recommended yet.

4. **`/primitives` and an on-demand `/audit`** — day 22's second and third
   recommendations, both still open and both approved. **Recommend** `/primitives`
   next after item 1, with the nav entry restored in the same commit.

5. **Nothing has read a *stored* log or journal yet**, and `loom_telemetry` still
   needs `db:push` and RLS before the next deploy. (Carried from day 20.) This
   run makes it slightly more pointed: the approval trail lives in the journal
   now, so a journal that was never migrated is a journal that loses it.

6. **The deployment needs its two new variables set before the next deploy**, or
   it will correctly admit nobody. `docs/deployment.md` and
   `apps/portal/.env.example` both say how.

7. **No retention policy** (carried, deliberately unchanged), **the compile
   step**, **the schema at 3381 of a 3500 guard**, and **node-level provenance**
   (all carried, all unchanged by this run).
