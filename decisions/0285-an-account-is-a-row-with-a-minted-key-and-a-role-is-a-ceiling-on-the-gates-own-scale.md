# 0285. An account is a row with a minted key, and a role is a ceiling on the Gate's own scale

**Status:** Accepted
**Date:** 2026-10-15
**Section:** §5 (portal), §2 (the Gate)

## Context

The portal's roster is an environment variable. `LOOM_PORTAL_REVIEWERS` holds
`actor:key` pairs, and its own note says exactly what it is and why that was
right:

> The roster is configuration rather than a table, which is the honest shape for
> what it is: a handful of people with commit-equivalent access to a
> pre-production alpha. A users table would imply a lifecycle — invitation,
> recovery, deactivation — that nothing in this portal implements, and an
> implied lifecycle nobody built is worse than an explicit list.

That argument held while the portal had one deployment and no projects a person
could own. The one job ends it: *sign in as an account that exists in a table,
not in an environment variable*, because the workspace screen lists **your**
projects and registration mints a key against **your** application. An actor
that only exists in a deployment's configuration cannot own a row.

What has to be decided is narrower than *build a users system*, and the
roster's warning still applies to everything this record does not do: an
implied lifecycle nobody built is worse than an explicit list.

## Decision

**An account is a row. Its key is minted by the portal, stored as a digest, and
shown once. A role is held in a project and is a ceiling on the Gate's stake
scale.**

1. **`loom_portal_accounts` replaces the roster.** An actor id, a key digest, a
   created-at. The table belongs to the portal, not the runtime, on the terms
   the attempt log already took: the runtime takes an actor on an intent and
   never asks how a host established one (0018).

2. **The portal mints the key; a person never chooses one.** 32 hex characters
   from `crypto.getRandomValues`, shown once at creation and never recoverable.
   A chosen key is a password, and a password needs a password's storage.

3. **The digest is a plain SHA-256 of the key, and that is safe *because* of
   clause 2.** The key is 128 bits of generated entropy, so there is no
   dictionary to run and no rainbow table that reaches it. It is deliberately
   **not** keyed by the session secret: that would make rotating the secret
   lock every account out permanently rather than merely ending every session.

4. **A role is `viewer`, `approver` or `owner`, held in one project**
   (`loom_portal_memberships`), and it means exactly one thing — **the highest
   stake level this actor may accept**:

   | Role | Ceiling | Also |
   | --- | --- | --- |
   | `viewer` | none | reads the record |
   | `approver` | `medium` | |
   | `owner` | `critical` | policy, credentials, deleting the project |

   The comparison is `isAbove(stake, ceiling)` from `stake-level.ts` — the
   Gate's own arithmetic, not a second copy of it.

5. **Creating a project is not governed by a project role**, because there is no
   project to hold one in. Any signed-in account may create one and is its
   owner. Deleting one needs `owner` *of that project*.

6. **The session token still carries only the actor.** A role is looked up
   per request, against the row. `session.ts` says why — *everything a bearer
   token asserts is something an attacker who steals one gets to assert* — and a
   role in a token is a role that keeps working for twelve hours after it is
   revoked.

7. **The first account is minted by a script**, `pnpm portal:account`, run by
   whoever has the database. There is no sign-up page and no invitation flow.

## Consequences

- **`currentActor` and `requireActor` keep their signatures**, which is the
  seam `identity.ts` promised: *replacing the roster with an OIDC provider is a
  change to what mints the cookie, and no page or action moves.* Authorisation
  is a new reader beside them, not a change to them.
- **`LOOM_PORTAL_REVIEWERS` is gone**, and with it four of the five
  `RosterProblem` codes. `LOOM_PORTAL_SESSION_SECRET` stays and still fails
  closed (0027): a portal with no secret signs nobody in.
- **A deployment with an empty accounts table admits nobody**, which is the same
  failure as an empty roster and reads the same way on the sign-in page. The
  remedy is a command rather than an edit to the environment.
- **The sign-in path now touches the database**, where it used to compare
  against memory. It was already unavailable when the attempt log was, so the
  failure mode is one the page already states.
- **No lifecycle is implied that is not built.** There is no recovery, no
  deactivation, no invitation and no rotation screen. Minting a second key for
  an actor replaces the first, and that is the whole of what exists.
- **The Gate does not move.** A role is read where a held change is released,
  and nothing in §2 learns that accounts exist.

## Alternatives considered

**Keep the roster and add a roles variable beside it.** The smallest change and
it fails on the one job: an environment variable cannot own a project row, so
*your projects* would have to mean *the projects whose owner string matches
yours*, with nothing enforcing that the string names anybody. It also puts
credentials in a place that is copied into every deployment log and shell
history that touches the service.

**Store a password hash — argon2, bcrypt, scrypt.** The right answer for a
chosen secret and the wrong shape here. Those exist to make a *low-entropy*
guess expensive; against 128 generated bits they buy nothing a digest does not
already have, and they would add a native dependency to a module that runs on
the edge.

**Put the role in the session token.** One lookup cheaper per request, and it
makes revocation take up to twelve hours. `session.ts` already settled the
general form of this and this record declines to make it an exception.

**A global role per account rather than per project.** Simpler, and it cannot
say the sentence the workspace screen is built on — *waiting on an owner* means
an owner **of this project**. A global role would make one person's authority
over their own project depend on what somebody granted them elsewhere.

**An `account` table in the runtime, beside `application` and `project`.**
Rejected on 0018: the portal is a consumer. A framework that shipped a users
table would be asserting that its consumers authenticate people, and a host
embedding Loom in an existing product already has accounts of its own.
